from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

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

        
class LogoutView(APIView):
    # Implementar
    a = 1

# Para manejar datos extras del perfil: bio, foto, etc
class ProfileView(APIView):
    #Implementar 
    a = 1

