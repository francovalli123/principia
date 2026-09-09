from django.shortcuts import get_object_or_404
from rest_framework import APIView, status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView

from .models import User
from .serializers import UserSerializer

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

# Para Auth conviene separar 
class RegisterView(CreateAPIView):
    # Implementar
    a = 1 # Pongo esto para que el IDE no me rompa las pelotas con clase vacia

class LoginView(APIView):
    # Implementar
    a = 1

class LogoutView(APIView):
    # Implementar
    a = 1

# Para manejar datos extras del perfil: bio, foto, etc
class ProfileView(APIView):
    #Implementar 
    a = 1

