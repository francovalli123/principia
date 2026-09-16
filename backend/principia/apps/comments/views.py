from django.shortcuts import get_object_or_404
from rest_framework.views import APIView 
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from apps.common.permissions import IsOwnerOrReadOnly
from .models import Comment
from .serializers import CommentSerializer

#CommentView
class CommentView(APIView):
    permission_classes = [
        IsAuthenticatedOrReadOnly,
        IsOwnerOrReadOnly,
    ]
    def get(self,request,*args,**kwargs):
        comment_id = kwargs.get('id')

        if comment_id is not None:
            result = get_object_or_404(Comment, id=comment_id)
            self.check_object_permissions(request,result) #Chequea si tiene los permisos necesarios.Si falla retorna Forbidden
            serializer = CommentSerializer(result)
            return Response({"status": "success", "data":serializer.data}, status = status.HTTP_200_OK)
        
        publication_id = request.query_params.get("publication_id")
        
        if publication_id is None:
            return Response({"status": "error","message": "publication_id is required"},status=status.HTTP_400_BAD_REQUEST)
        
        result = Comment.objects.filter(publication_id=publication_id)
        serializer = CommentSerializer(result, many=True)

        return Response({"status": "success","data": serializer.data},status=status.HTTP_200_OK)


    def post(self,request,*args,**kwargs):
        serializer = CommentSerializer(data = request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "data": serializer.data}, status = status.HTTP_201_CREATED)
        return Response({"status": "error", "data": serializer.errors}, status = status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id=None, *args, **kwargs):
        result = get_object_or_404(Comment, id=id)
        self.check_object_permissions(request,result) 
        result.delete()
        return Response({"status": "success", "data": "Record Deleted"}, status=status.HTTP_200_OK)
