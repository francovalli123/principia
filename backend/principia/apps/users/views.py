from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework.parsers import FormParser, MultiPartParser

from .models import User, Profile, LoginAttempt
from .serializers import RegisterSerializer, UserSerializer, ProfileSerializer
from apps.simulations.phRegistry import PHENOMENON_SERIALIZERS
from .security import hash_lookup_value

MAX_LOGIN_ATTEMPTS = 5
LOGIN_COOLDOWN_MINUTES = 30

def _normalize_username(username):
    if username is None:
        return ""
    return str(username).strip().casefold()

# UserView 
class UserView(APIView):
    # La informacion se descifra al serializarse, por lo que nunca debe exponerse
    # mediante un endpoint anonimo ni a usuarios distintos del propietario.
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user_id = kwargs.get('id')

        if request.user.is_staff:
            if user_id is not None:
                result = get_object_or_404(User, id=user_id)
                serializer = UserSerializer(result)
                return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

            result = User.objects.all()
            serializer = UserSerializer(result, many=True)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

        if user_id is not None and user_id != request.user.id:
            raise PermissionDenied("No tiene permiso para consultar este usuario.")

        serializer = UserSerializer(request.user)
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied("Solo el personal administrativo puede crear usuarios desde esta ruta.")
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"status": "error", "data": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, id=None, *args, **kwargs):
        if not request.user.is_staff and id != request.user.id:
            raise PermissionDenied("No tiene permiso para modificar este usuario.")
        result = get_object_or_404(User, id=id)
        serializer = UserSerializer(result, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)
        return Response({"status": "error", "data": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id=None, *args, **kwargs):
        if not request.user.is_staff and id != request.user.id:
            raise PermissionDenied("No tiene permiso para eliminar este usuario.")
        result = get_object_or_404(User, id=id)
        result.delete()
        return Response({"status": "success", "data": "Record Deleted"}, status=status.HTTP_200_OK)

class RegisterView(CreateAPIView):
    permission_classes = [AllowAny]
    # Indica el serializer que valida y crea las cuentas nuevas.
    serializer_class = RegisterSerializer
    
class LoginView(APIView):
    permission_classes = [AllowAny]

    # Post 
    def post(self, request):
        username = _normalize_username(request.data.get('username')) # Normaliza el username
        password = request.data.get('password')

        # Busca o crea el registro de intentos de login del usuario
        login_attempt, _ = LoginAttempt.objects.get_or_create(username=hash_lookup_value(username))  # Se normaliza el user y transforma mediante HMAC-SHA256 antes de guardarse

        # Si está bloqueado pero se cumplió el cool off, se desbloquea el usuario
        if login_attempt.locked_until and login_attempt.locked_until <= timezone.now():
            login_attempt.failed_attempts = 0
            login_attempt.locked_until = None
            login_attempt.save(update_fields=['failed_attempts', 'locked_until', 'updated_at'])

        # Si se alcanzó el max retry, se bloquea el usuario temporalmente y rechaza la peticion con 403 forbidden
        if login_attempt.is_locked():
            remaining_minutes = max(1, int((login_attempt.locked_until - timezone.now()).total_seconds() // 60))
            return Response(
                {'error': f'Muchos intentos fallidos. Intente nuevamente en {remaining_minutes} minutos.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = authenticate(username=request.data.get('username'), password=password)

        if user is None:
            # Si la contraseña es incorrecta , aumenta el contador de intentos fallidos
            login_attempt.failed_attempts += 1

            # Si la cantidad de intentos fallidos llegó a 5, la cuenta sufre un cool-off
            if login_attempt.failed_attempts >= MAX_LOGIN_ATTEMPTS:
                login_attempt.locked_until = timezone.now() + timedelta(minutes=LOGIN_COOLDOWN_MINUTES)
                login_attempt.save(update_fields=['failed_attempts', 'locked_until', 'updated_at'])
                return Response(
                    {'error': f'Cuenta bloqueada por {LOGIN_COOLDOWN_MINUTES} minutos por demasiados intentos fallidos.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            # Se guarda el intento
            login_attempt.save(update_fields=['failed_attempts', 'updated_at'])
            return Response(
                {'error': 'Credenciales invalidas'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Si el intento fue existoso, se reinicia el contador de intentos
        login_attempt.reset()

        # Genera un nuevo refresh token para el usuario
        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_200_OK)

# Consideraciones a tener en cuenta sobre el logout 
# JWT es stateless, o sea, una vez emitido un token sigue siendo valido hasta que expire.
# No hay una sesión en el servidor que puedas destruir. Pero si se puede revocar el refresh token porque
# ese si lo guarda en la base de datos. 
# Entonces el cliente envía el refresh token (/api/logout/) y se pone ese refresh token en la blacklist (ya no se podra utilizar ese refresh token)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token) # Lo decodifica para validar que sea un token JWT valido
        token.blacklist()   # Marca el token como negado. Se mantiene en la BD hasta que expire
        return Response({"detail": "Sesión cerrada exitosamente"})

# Blacklista todos los refresh tokens del usuario (todos los dispositivos) 
class LogoutAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Nota: Outstanding token es la tabla donde SimpleJWT registra todos los refresh tokens activos de todos los usuarios
        for token in OutstandingToken.objects.filter(user=request.user):   
            BlacklistedToken.objects.get_or_create(token=token) # Si ya está blacklisted no hace nada y sino lo blacklista
        return Response({"detail": "Sesión cerrada en todos los dispositivos"})

# El perfil se crea automaticamente en RegisterSerializer.create(). ProfileView permite consultar y modificar perfil post registro
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_profile(self, user):
        profile, _ = Profile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        phenomenon_type = request.query_params.get("phenomenon_type")
        
        if phenomenon_type is not None:
            phenomenon = PHENOMENON_SERIALIZERS.get(phenomenon_type)
            if phenomenon is None:
                return Response({"status": "error", "data": f"Phenomenon type '{phenomenon_type}' not found."}, status=status.HTTP_400_BAD_REQUEST)

            simulations = request.user.simulations.filter(phenomenon_type=phenomenon_type)
            serializer = SimulationSerializer(simulations, many=True)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

        profile = self.get_profile(request.user)
        serializer = ProfileSerializer(profile)
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

    def patch(self, request):
        profile = self.get_profile(request.user)
        serializer = ProfileSerializer(
            profile,
            data = request.data,
            partial=True,
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                {"status": "success", "data": serializer.data},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"status": "error", "data": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def put(self, request):
        profile = self.get_profile(request.user)
        serializer = ProfileSerializer(
            profile,
            data = request.data,
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                {"status": "success", "data": serializer.data},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"status": "error", "data": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
