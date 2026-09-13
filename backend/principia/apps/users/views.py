from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken


from .models import User
from .serializers import RegisterSerializer, UserSerializer

# UserView 
class UserView(APIView):
    def get(self, request, *args, **kwargs):
        user_id = kwargs.get('id')

        if user_id is not None:
            result = get_object_or_404(User, id=user_id)
            serializer = UserSerializer(result)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

        result = User.objects.all()
        serializer = UserSerializer(result, many=True)
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"status": "error", "data": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, id=None, *args, **kwargs):
        result = get_object_or_404(User, id=id)
        serializer = UserSerializer(result, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)
        return Response({"status": "error", "data": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id=None, *args, **kwargs):
        result = get_object_or_404(User, id=id)
        result.delete()
        return Response({"status": "success", "data": "Record Deleted"}, status=status.HTTP_200_OK)

class RegisterView(CreateAPIView):
    # Indica el serializer que valida y crea las cuentas nuevas.
    serializer_class = RegisterSerializer
    
class LoginView(APIView):
    permission_classes = [AllowAny]

    # Post 
    def post(self, request):
        # Extraigo credenciales de la request
        username = request.data.get('username')
        password = request.data.get('password')

        # Verifica las credenciales del usuario respecto a la base de datos
        user = authenticate(username = username, password=password)

        # autenticate devuelve un objeto User si las credenciales son validas
        # Entonces, si no es User (por ejemplo, None), las credenciales NO son validas
        if not User:    
            return Response(
                {'error': 'Credenciales invalidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Genera un nuevo refresh token para el usuario
        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status = status.HTTP_200_OK)

# Consideraciones a tener en cuenta sobre el logout 
# JWT es stateless, o sea, una vzez emitido un token sigue siendo valido hasta que expire.
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

# Para manejar datos extras del perfil: bio, foto, etc
class ProfileView(APIView):
    #Implementar 
    a = 1

