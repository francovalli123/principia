from django.shortcuts import get_object_or_404
from rest_framework import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import User, Profile
from .serializers import UserSerializer, ProfileSerializer

# Vista para el User: declara los métodos de acceso get, post, put, etc
class UserView(APIView):
    # Metodo get
    def get(self, request, *args, **kwargs):
        id = kwargs.get('id', None)
        if id:  
            # Devuelve el user con identificador id
            result = User.objects.get(id=id)
            serializers = UserSerializer(result)
            return Response({"status": "success", "data": serializers.data}, status=status.HTTP_200_OK)

        # Si no se pasa un id, devuelve todos los usuarios
        result = User.objects.all()
        serializers = UserSerializer(result, many = True)
        return Response({"status": "success", "data": serializers.data}, status=status.HTTP_200_OK)

    # Metodo post
    def post(self, request):
        serializer = UserSerializer(data=request.data) # Serializa la información 
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)
        else:
            return Response({"status": "error", "data": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    # Metodo patch
    def patch(self, request, id):
        result = User.objects.get(id=id)
        serializer = UserSerializer(result, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "data": serializer.data})
        else:
            return Response({"status": "error", "data": serializer.errors})

    # Metodo delete
    def delete(self, request, id=None):
        result = get_object_or_404(User, id=id)
        result.delete()
        return Response({"status": "success", "data": "Record Deleted"})

