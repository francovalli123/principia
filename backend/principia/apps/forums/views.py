from django.shortcuts import get_object_or_404
from django.db import transaction

from rest_framework.views import APIView 
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly


from apps.common.permissions import IsOwnerOrReadOnly
from apps.forums.models import Forum, ForumMembership
from apps.forums.serializers import ForumSerializer
from apps.publications.serializers import PublicationSerializer
from apps.simulations.phRegistry import PHENOMENON_SERIALIZERS


#ForumView
class ForumView(APIView):
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
            forums = Forum.objects.all()
            serializer = ForumSerializer(forums, many=True)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

        # Get specific forum
        forum = get_object_or_404(Forum, id=forum_id)
        self.check_object_permissions(request, forum)

        if request.user.id not in forum.members.values_list("id", flat=True):
            return Response({"status": "error", "data": "You are not a member of this forum."}, status=status.HTTP_403_FORBIDDEN)

        # Filter publications by title
        if publication_title is not None:
            publication_title = publication_title.strip()
            publications = forum.publications.filter(title__icontains=publication_title)
            serializer = PublicationSerializer(publications, many=True)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

        # Filter publications by phenomenon type
        if phenomenon_type is not None:
            phenomenon = PHENOMENON_SERIALIZERS.get(phenomenon_type)
            if phenomenon is None:
                return Response({"status": "error", "data": f"Phenomenon type '{phenomenon_type}' not found."}, status=status.HTTP_400_BAD_REQUEST)

            publications = forum.publications.filter(simulation__phenomenon_type=phenomenon_type)
            serializer = PublicationSerializer(publications, many=True)
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

        # El propuetario se obtiene del token
        forum = serializer.save(owner=request.user)

        # El creador del foro se registra automaticamente como miembro
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

        self.check_object_permissions(request,forum) #Chequea si tiene los permisos necesarios.Si falla retorna Forbidden
        forum.delete()

        return Response(
            {"status": "success", "data": "Record Deleted"}, 
            status=status.HTTP_200_OK
        )

class JoinForumView(APIView):
    # Solo los usuarios autenticados pueden unirse a un foro
    permission_classes = [IsAuthenticated]

    # Unirse a un foro
    def post(self, request, id):
        forum = get_object_or_404(Forum, id=id)

        membership, created = ForumMembership.objects.get_or_create(
            forum=forum,
            user=request.user,
        )

        # No te podes unir mas de una vez a un foro
        if not created:
            return Response(
                {"detail": "Ya perteneces a este foro"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Te has unido al foro."},
            status=status.HTTP_201_CREATED,
        )

class LeaveForumView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, id):
        forum = get_object_or_404(Forum, id=id)

        # El propietario no puede abandonar su propio foro para evitar que quede el foro sin owner
        if forum.owner_id == request.user.id:
            return Response(
                {"detail": "El propietario no puede abandonar "},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = get_object_or_404(
            ForumMembership,
            forum=forum,
            user=request.user,
        )

        # Se borra la membresia al foro
        membership.delete()

        return Response(
            {"detail": "Has abandonado el foro."},
            status=status.HTTP_204_NO_CONTENT,
        )
