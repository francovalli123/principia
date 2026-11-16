import hashlib
import secrets
from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView 
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly

from apps.common.permissions import IsOwnerOrReadOnly, SimulationPermission
from apps.common.pagination import PaginatedAPIView
from apps.common.realtime import publish_forum_event
from apps.publications.models import Publication
from .models import Comment, CommentSocketTicket
from .serializers import CommentSerializer

class CommentSocketTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        now = timezone.now()
        CommentSocketTicket.objects.filter(expires_at__lte=now).delete()
        ticket = secrets.token_urlsafe(32)
        CommentSocketTicket.objects.create(
            user=request.user,
            token_hash=hashlib.sha256(ticket.encode("utf-8")).hexdigest(),
            expires_at=now + timedelta(seconds=30),
        )
        return Response({"ticket": ticket}, status=status.HTTP_201_CREATED)

#CommentView
class CommentView(PaginatedAPIView):
    permission_classes = [
        IsAuthenticatedOrReadOnly,
        IsOwnerOrReadOnly,
        SimulationPermission,
    ]

    # Validates that the post has a forum and that the requester is a member
    # Also, validates that the associated simulation is visible to the person who wants to comment
    def _check_publication_access(self, request, publication):
        if (
            publication.forum_id is None
            or not publication.forum.members.filter(id=request.user.id).exists()
        ):
            return False

        self.access_context = "forum"
        simulation_permission = SimulationPermission()
        if not simulation_permission.has_object_permission(
            request, self, publication.simulation
        ):
            raise PermissionDenied(simulation_permission.message)
        return True

    def get(self, request, *args, **kwargs):
        comment_id = kwargs.get("id")
        # Get specific comment
        if comment_id is not None:
            result = get_object_or_404(Comment, id=comment_id)
           # Checks that the request.user belongs to the forum where the comment is. 
            if not self._check_publication_access(request, result.publication):
                return Response({"status": "error", "message": "You are not a member of this forum."}, status=status.HTTP_403_FORBIDDEN)

            self.check_object_permissions(request, result)
            serializer = CommentSerializer(result)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)
        # Get comments from a publication
        publication_id = request.query_params.get("publication_id")

        if publication_id is None:
            return Response({"status": "error", "message": "publication_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        publication = get_object_or_404(Publication, id=publication_id)

        # Checks that the request.user belongs to the forum where the comment is. 
        if not self._check_publication_access(request, publication):
            return Response({"status": "error", "message": "You are not a member of this forum."}, status=status.HTTP_403_FORBIDDEN)

        result = Comment.objects.filter(publication=publication).order_by("-creation_date")
        # Serialization receives only the requested page, not all the comments
        page = self.paginate_queryset(result, request)
        serializer = CommentSerializer(page if page is not None else result, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)

        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)


    def post(self, request, *args, **kwargs):
        serializer = CommentSerializer(data=request.data)

        if serializer.is_valid():
            publication = serializer.validated_data["publication"]
            # Must be a member of the forum to post a comment
            if not self._check_publication_access(request, publication):
                return Response({"status": "error", "message": "You are not a member of this forum."}, status=status.HTTP_403_FORBIDDEN)

            comment = serializer.save(owner=request.user)
            response_data = CommentSerializer(comment).data
            publish_forum_event(
                publication.forum_id,
                "comment_created",
                response_data,
            )
            return Response({"status": "success", "data": response_data}, status=status.HTTP_201_CREATED)

        return Response({"status": "error", "message": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id=None, *args, **kwargs):
        result = get_object_or_404(Comment, id=id)
        if not self._check_publication_access(request, result.publication):
            return Response(
                {"status": "error", "message": "You are not a member of this forum."},
                status=status.HTTP_403_FORBIDDEN,
            )
        self.check_object_permissions(request,result) 
        forum_id = result.publication.forum_id
        comment_id = result.id
        publication_id = result.publication_id
        result.delete()
        publish_forum_event(
            forum_id,
            "comment_deleted",
            {"id": comment_id, "publication": publication_id},
        )
        return Response({"status": "success", "data": "Record Deleted"}, status=status.HTTP_204_NO_CONTENT)
