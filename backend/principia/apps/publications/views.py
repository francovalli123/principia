from django.shortcuts import get_object_or_404
from rest_framework.views import APIView 
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly

from apps.common.permissions import IsOwnerOrReadOnly
from .models import Publication
from .serializers import PublicationSerializer

#PublicationView
class PublicationView(APIView):
    permission_classes = [
        IsAuthenticatedOrReadOnly,
        IsOwnerOrReadOnly,
    ]

    # Método get
    def get(self, request, *args, **kwargs):
        publication_id = kwargs.get("id")

        if publication_id is not None:
            publication = get_object_or_404(Publication, id=publication_id)
            serializer = PublicationSerializer(publication)
            return Response({"status": "success", "data": serializer.data},status=status.HTTP_200_OK)

        forum_id = request.query_params.get("forum_id")
       
        if forum_id is not None:
            result = Publication.objects.filter(forum_id=forum_id)
            serializer = PublicationSerializer(result, many = True)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)
  
        return Response({"status": "error","message": "forum_id is required"},status=status.HTTP_400_BAD_REQUEST)

    # Método post: publicar simulación con descripción y enunciado
    def post(self,request,*args,**kwargs):
        serializer = PublicationSerializer(data = request.data)

        if serializer.is_valid():
            serializer.save(owner=request.user)
            return Response({"status": "success", "data": serializer.data}, status = status.HTTP_201_CREATED)

        return Response({"status": "error", "data": serializer.errors}, status = status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id=None, *args, **kwargs):
        result = get_object_or_404(Publication, id=id)
        self.check_object_permissions(request,result) 
        result.delete()
        return Response({"status": "success", "data": "Record Deleted"}, status=status.HTTP_200_OK)
