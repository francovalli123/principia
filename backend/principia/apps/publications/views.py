from django.shortcuts import get_object_or_404
from rest_framework.views import APIView 
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from django.db.models import Q

from apps.common.permissions import IsOwnerOrReadOnly, SimulationPermission
from apps.common.pagination import PaginatedAPIView
from .models import Publication
from .serializers import PublicationSerializer

#PublicationView
class PublicationView(PaginatedAPIView):
    permission_classes = [
        IsAuthenticatedOrReadOnly,
        IsOwnerOrReadOnly,
        SimulationPermission,
    ]

    def get(self, request, *args, **kwargs):
        publication_id = kwargs.get("id")
        #Get Publication by id
        if publication_id is not None:
            publication = get_object_or_404(Publication, id=publication_id)
            self.check_object_permissions(request, publication.simulation)
            serializer = PublicationSerializer(publication)
            return Response({"status": "success", "data": serializer.data},status=status.HTTP_200_OK)

        forum_id = request.query_params.get("forum_id")
       #Get publications by forum_id
        if forum_id is not None:
            #Q allows building conditions for Django's ORM, and the | operator
            # combines them as an OR: the simulation must be public, belong to the
            # authenticated user, or be private when the user belongs to the forum.
            filters = Q(simulation__visibility="public")
            is_authenticated = request.user.is_authenticated

            if is_authenticated:
                filters |= Q(simulation__owner=request.user)#public visibility OR simulation belongs to the current user
                is_forum_member = Publication.objects.filter(
                    forum_id=forum_id,  # Limits search to solicitated forum
                    forum__members=request.user,    
                ).exists()# Returns True if it finds at least one publication from that forum associated with a forum where the user is a member
                if is_forum_member:
                    filters |= Q(simulation__visibility="private")#if its private, a user can only see it, if he belongs to the forum where it is published

            result = Publication.objects.filter(forum_id=forum_id).filter(filters).order_by("-creation_date")
            # Paginar el queryset antes de serializarlo evita cargar toda la colección.
            page = self.paginate_queryset(result, request)
            serializer = PublicationSerializer(page if page is not None else result, many=True)
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)
  
        return Response({"status": "error","message": "forum_id is required"},status=status.HTTP_400_BAD_REQUEST)

    #post: publish simulation with description and title, optional forum_id
    def post(self,request,*args,**kwargs):
        serializer = PublicationSerializer(data = request.data)

        if serializer.is_valid():
            simulation = serializer.validated_data["simulation"]
            forum = serializer.validated_data.get("forum")
            self.access_context = (#Tells the SimulationPermission from where its being accessed.
                "forum"
                if forum is not None and forum.members.filter(id=request.user.id).exists()
                else None
            )
            if forum is not None and not forum.members.filter(id=request.user.id).exists():
                return Response({"status": "error", "message": "You are not a member of this forum."}, status=status.HTTP_403_FORBIDDEN)
            self.check_object_permissions(request, simulation)
            serializer.save(owner=request.user)
            return Response({"status": "success", "data": serializer.data}, status = status.HTTP_201_CREATED)

        return Response({"status": "error", "message": serializer.errors}, status = status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id=None, *args, **kwargs):
        result = get_object_or_404(Publication, id=id)
        self.check_object_permissions(request,result) 
        result.delete()
        return Response({"status": "success", "data": "Record Deleted"}, status=status.HTTP_204_NO_CONTENT)
