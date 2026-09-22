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

    def get(self, request, *args, **kwargs):
        comment_id = kwargs.get("id")

        if comment_id is not None:
            result = get_object_or_404(Comment, id=comment_id)

            if not result.publication.forum.members.filter(id=request.user.id).exists():
                return Response({"status": "error", "message": "You are not a member of this forum."}, status=status.HTTP_403_FORBIDDEN)

            self.check_object_permissions(request, result)
            serializer = CommentSerializer(result)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

        publication_id = request.query_params.get("publication_id")

        if publication_id is None:
            return Response({"status": "error", "message": "publication_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        publication = get_object_or_404(Publication, id=publication_id)

        if not publication.forum.members.filter(id=request.user.id).exists():
            return Response({"status": "error", "message": "You are not a member of this forum."}, status=status.HTTP_403_FORBIDDEN)

        result = Comment.objects.filter(publication=publication).order_by("-creation_date")
        serializer = CommentSerializer(result, many=True)

        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)


def post(self, request, *args, **kwargs):
    serializer = CommentSerializer(data=request.data)

    if serializer.is_valid():
        publication = serializer.validated_data["publication"]

        if not publication.forum.members.filter(id=request.user.id).exists():
            return Response({"status": "error", "message": "You are not a member of this forum."}, status=status.HTTP_403_FORBIDDEN)

        serializer.save(owner=request.user)
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)

    return Response({"status": "error", "data": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

def delete(self, request, id=None, *args, **kwargs):
    result = get_object_or_404(Comment, id=id)
    self.check_object_permissions(request,result) 
    result.delete()
    return Response({"status": "success", "data": "Record Deleted"}, status=status.HTTP_200_OK)
