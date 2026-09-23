from django.shortcuts import get_object_or_404
from django.db import transaction

from rest_framework.views import APIView 
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly


from apps.common.permissions import IsOwnerOrReadOnly
from apps.common.pagination import PaginatedAPIView
from apps.forums.models import Forum, ForumMembership
from apps.forums.serializers import ForumSerializer
from apps.publications.serializers import PublicationSerializer
from apps.simulations.phRegistry import PHENOMENON_SERIALIZERS
from apps.users.serializers import UserSerializer


#ForumView
class ForumView(PaginatedAPIView):
    permission_classes = [
        IsAuthenticatedOrReadOnly,
        IsOwnerOrReadOnly,
    ]
    def get(self, request, *args, **kwargs):
        forum_id = kwargs.get("id")
        publication_title = request.query_params.get("publication_title")
        phenomenon_type = request.query_params.get("phenomenon_type")

        # Get all forums
        if forum_id is None:
            forums = Forum.objects.all().order_by("id")
            # La página se calcula sobre el queryset completo para conservar el count.
            page = self.paginate_queryset(forums, request)
            serializer = ForumSerializer(page if page is not None else forums, many=True)
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

        # Get specific forum
        forum = get_object_or_404(Forum, id=forum_id)
        self.check_object_permissions(request, forum)

        if request.user.id not in forum.members.values_list("id", flat=True):
            return Response({"status": "error", "data": "You are not a member of this forum."}, status=status.HTTP_403_FORBIDDEN)

        # Filter publications by title
        if publication_title is not None:
            publication_title = publication_title.strip()
            publications = forum.publications.filter(title__icontains=publication_title).order_by("-creation_date")
            page = self.paginate_queryset(publications, request)
            serializer = PublicationSerializer(page if page is not None else publications, many=True)
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

        # Filter publications by phenomenon type
        if phenomenon_type is not None:
            phenomenon = PHENOMENON_SERIALIZERS.get(phenomenon_type)
            if phenomenon is None:
                return Response({"status": "error", "data": f"Phenomenon type '{phenomenon_type}' not found."}, status=status.HTTP_400_BAD_REQUEST)

            publications = forum.publications.filter(simulation__phenomenon_type=phenomenon_type).order_by("-creation_date")
            page = self.paginate_queryset(publications, request)
            serializer = PublicationSerializer(page if page is not None else publications, many=True)
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

        serializer = ForumSerializer(forum)
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)
   
    @transaction.atomic 
    def post(self,request,*args,**kwargs):
        serializer = ForumSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"status": "error", "data": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # owner obtained through token
        forum = serializer.save(owner=request.user)
        #Creator of forum is automatically set as member
        ForumMembership.objects.create(
            forum=forum,
            user=request.user,
        )

        return Response(
            {
                "status": "success",
                "data": ForumSerializer(forum).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def delete(self,request, id=None,*args,**kwargs):
        forum = get_object_or_404(Forum,id=id)

        self.check_object_permissions(request,forum) #Checks if it has the necessary permissions. On fail returns Forbidden
        forum.delete()

        return Response(
            {"status": "success", "data": "Record Deleted"}, 
            status=status.HTTP_200_OK
        )

class JoinForumView(APIView):
    #Only authenticated users can join forums
    permission_classes = [IsAuthenticated]

    # Join forum
    def post(self, request, id):
        forum = get_object_or_404(Forum, id=id)

        membership, created = ForumMembership.objects.get_or_create(
            forum=forum,
            user=request.user,
        )

        # Cant join more than one time the same forum
        if not created:
            return Response(
                {"detail": "Ya already belong to this forum"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "You have joined the forum."},
            status=status.HTTP_201_CREATED,
        )

class LeaveForumView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, id):
        forum = get_object_or_404(Forum, id=id)

        #Owner cant abandon its own forum. To avoid having a ownerless forum
        if forum.owner_id == request.user.id:
            return Response(
                {"detail": "Owner cant abandon their forum"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = get_object_or_404(
            ForumMembership,
            forum=forum,
            user=request.user,
        )

        membership.delete()

        return Response(
            {"detail": "Has abandonado el foro."},
            status=status.HTTP_204_NO_CONTENT,
        )

class ForumMembersView(PaginatedAPIView):
    permission_classes = [IsAuthenticated]

    # List forum members
    def get(self, request, id):
        forum = get_object_or_404(Forum, id=id)
        if not forum.members.filter(id=request.user.id).exists():
            return Response(
                {"status": "error", "data": "You are not a member of this forum."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Order by username
        members = forum.members.all().order_by("username")
        # Aplica la paginación al queryset members
        page = self.paginate_queryset(members, request)
        # Serializa los datos
        serializer = UserSerializer(page if page is not None else members, many=True)
        # Si existe una página, genera la respuesta paginada
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(
            {"status": "success", "data": serializer.data},
            status=status.HTTP_200_OK,
        )

    # Kick member
    def delete(self, request, id, user_id):
        forum = get_object_or_404(Forum, id=id)
        #Only owner can kick members 
        if forum.owner_id != request.user.id:
            return Response(
                {"status": "error", "data": "Only the forum owner can expel members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        #Forum owner cant be kicked out, (to avoid ownerless forum)
        if forum.owner_id == user_id:
            return Response(
                {"status": "error", "data": "The forum owner cannot be expelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = get_object_or_404(
            ForumMembership,
            forum=forum,
            user_id=user_id,
        )
        membership.delete() # Erase membership of a specific user
        return Response(status=status.HTTP_204_NO_CONTENT)
