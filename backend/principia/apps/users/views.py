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
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework.parsers import FormParser, MultiPartParser

from .models import User, Profile, LoginAttempt
from .serializers import RegisterSerializer, UserSerializer, ProfileSerializer
from apps.simulations.phRegistry import PHENOMENON_SERIALIZERS
from .security import hash_lookup_value
from apps.simulations.serializers import SimulationSerializer
from apps.common.pagination import PaginatedAPIView

MAX_LOGIN_ATTEMPTS = 5
LOGIN_COOLDOWN_MINUTES = 30

def _normalize_username(username):
    if username is None:
        return ""
    return str(username).strip().casefold()

# UserView 
class UserView(PaginatedAPIView):
    #The information is decoded on serialization, for which it should never be exposed 
    #through an anonymous endpoint to users other than the owner
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user_id = kwargs.get('id')

        if request.user.is_staff:
            if user_id is not None:
                result = get_object_or_404(User, id=user_id)
                serializer = UserSerializer(result)
                return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

            result = User.objects.all().order_by("id")
            # Solo se serializan los usuarios de la página solicitada.
            page = self.paginate_queryset(result, request)
            serializer = UserSerializer(page if page is not None else result, many=True)
            if page is not None:
                return self.get_paginated_response(serializer.data)
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
        return Response({"status": "error", "message": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, id=None, *args, **kwargs):
        if not request.user.is_staff and id != request.user.id:
            raise PermissionDenied("No tiene permiso para modificar este usuario.")
        result = get_object_or_404(User, id=id)
        serializer = UserSerializer(result, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)
        return Response({"status": "error", "message": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id=None, *args, **kwargs):
        if not request.user.is_staff and id != request.user.id:
            raise PermissionDenied("No tiene permiso para eliminar este usuario.")
        result = get_object_or_404(User, id=id)
        result.delete()
        return Response({"status": "success", "data": "Record Deleted"}, status=status.HTTP_204_NO_CONTENT)

class RegisterView(CreateAPIView):
    permission_classes = [AllowAny]
    #Indicates the serializer that validates and creates new accounts
    serializer_class = RegisterSerializer
    
class LoginView(APIView):
    permission_classes = [AllowAny]

    # Post 
    def post(self, request):
        username = _normalize_username(request.data.get('username')) # Normalizes the username
        password = request.data.get('password')
        #searchs or creates the attempts registry of the user login
        login_attempt, _ = LoginAttempt.objects.get_or_create(username=hash_lookup_value(username))# User is normalized
        #and transformed through HMAC_SHA256 before saving.

        #If its blocked but the cool off is completed, user is unblocked
        if login_attempt.locked_until and login_attempt.locked_until <= timezone.now():
            login_attempt.failed_attempts = 0
            login_attempt.locked_until = None
            login_attempt.save(update_fields=['failed_attempts', 'locked_until', 'updated_at'])
        #if max retry has been reached, user is blocked temporarily and request is denied with 403 forbidden
        if login_attempt.is_locked():
            remaining_minutes = max(1, int((login_attempt.locked_until - timezone.now()).total_seconds() // 60))
            return Response(
                {'status': 'error', 'message': f'Muchos intentos fallidos. Intente nuevamente en {remaining_minutes} minutos.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = authenticate(username=request.data.get('username'), password=password)

        if user is None:
            # if password is incorrect, failed try's counter increases
            login_attempt.failed_attempts += 1
            #if falid try's counter reaches 5, account suffers cool-off
            if login_attempt.failed_attempts >= MAX_LOGIN_ATTEMPTS:
                login_attempt.locked_until = timezone.now() + timedelta(minutes=LOGIN_COOLDOWN_MINUTES)
                login_attempt.save(update_fields=['failed_attempts', 'locked_until', 'updated_at'])
                return Response(
                    {'status': 'error', 'message': f'Cuenta bloqueada por {LOGIN_COOLDOWN_MINUTES} minutos por demasiados intentos fallidos.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            # attempt is saved
            login_attempt.save(update_fields=['failed_attempts', 'updated_at'])
            return Response(
                {'status': 'error', 'message': 'Credenciales invalidas'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        # if the attemt is succesful, the counter resets
        login_attempt.reset()
        #Generates a new refresh token for user
        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_200_OK)

# Considerations regarding logout
# JWT is stateless, meaning that once a token is issued, it remains valid until it expires.
# There is no server-side session that can be destroyed. However, the refresh token can be revoked
# because it is stored in the database.
# Therefore, the client sends the refresh token to /api/logout/, and that refresh token is added
# to the blacklist, so it can no longer be used.

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        # Validates existence of token
        if not isinstance(refresh_token, str) or not refresh_token.strip():
            return Response(
                {"status": "error", "message": "El refresh token es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()   #Marks token as denied,it remains in the bd until expiration.
        # if token is invalid or revoked, returns error
        except TokenError:
            return Response(
                {"status": "error", "message": "El refresh token no es valido o ya fue revocado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"detail": "Sesión cerrada exitosamente"})
 #Blacklists all refresh tokens from user(all devices)
class LogoutAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Note: Outstanding token is the table where SimpleJWT registers every active refresh token of all the users
        for token in OutstandingToken.objects.filter(user=request.user):   
            BlacklistedToken.objects.get_or_create(token=token) # does nothing if its already blacklisted, else  blacklists
        return Response({"detail": "Sesión cerrada en todos los dispositivos"})

# Profile is automatically created in RegisterSerializer.create(). ProfileView allows to consult and modify profile post signuo
class ProfileView(PaginatedAPIView):
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
                return Response({"status": "error", "message": f"Phenomenon type '{phenomenon_type}' not found."}, status=status.HTTP_400_BAD_REQUEST)

            simulations = request.user.simulations.filter(phenomenon_type=phenomenon_type).order_by("-creation_date")
            page = self.paginate_queryset(simulations, request)
            serializer = SimulationSerializer(page if page is not None else simulations, many=True)
            if page is not None:
                return self.get_paginated_response(serializer.data)
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
            {"status": "error", "message": serializer.errors},
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
            {"status": "error", "message": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
