from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly, IsAuthenticated

from django.db import transaction

from apps.common.permissions import IsOwnerOrReadOnly, SimulationPermission
from apps.common.pagination import PaginatedAPIView
from .models import Favourite, Simulation
from .serializers import SimulationSerializer, FavouriteSerializer
from .phRegistry import PHENOMENON_SERIALIZERS
from apps.publications.models import Publication

class PhenomenonCatalogView(APIView):
    permission_classes = [AllowAny] #Public catalogue

    def get(self, request, *args, **kwargs):
        return Response(
            {"status": "success", "data": list(PHENOMENON_SERIALIZERS.keys())},#Gets the phenomenons directly from PHENOMENON_SERIALIZERS
            status=status.HTTP_200_OK,
        )


#SimulationView
class SimulationView(PaginatedAPIView):
    permission_classes = [
        IsAuthenticatedOrReadOnly,
        IsOwnerOrReadOnly,
        SimulationPermission,
    ]

    def get(self, request, *args, **kwargs):
        publication_id = request.query_params.get("publication_id")

        #Get simulation from a publication        
        if publication_id is not None:
            publication = get_object_or_404(Publication, id=publication_id)
            simulation = publication.simulation
            self.access_context = (
                "forum"
                if publication.forum_id is not None
                and publication.forum.members.filter(id=request.user.id).exists()
                else None
            )
            self.check_object_permissions(request, simulation)
            serializer = SimulationSerializer(simulation)
            return Response(
                {"status": "success", "data": serializer.data},
                status=status.HTTP_200_OK,
            )

        #Get simulations from User/Profile
        owner_id = request.query_params.get("owner_id")
        if owner_id is not None:
            filters = {"owner_id": owner_id}
            if str(request.user.id) != str(owner_id):
                filters["visibility"] = "public"
            result = Simulation.objects.filter(**filters).order_by("-creation_date")
            # La paginación se aplica antes de convertir las simulaciones a JSON.
            page = self.paginate_queryset(result, request)
            serializer = SimulationSerializer(page if page is not None else result, many=True)
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response(
                {"status": "success", "data": serializer.data},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"status": "error", "message": "publication_id or owner_id is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    def post(self, request, *args, **kwargs):
        phenomenon_type = request.data.get("phenomenon_type")
        parameters = request.data.get("parameters", {})
        visibility = request.data.get("visibility", "public")
        config = PHENOMENON_SERIALIZERS.get(phenomenon_type)
        if config is None:
            return Response({"status": "error","message": "Invalid phenomenon_type"},status=status.HTTP_400_BAD_REQUEST,)
        #Obtains the serializer that matches the phenomenon type
        serializer_class = config["serializer"]
        phenomenon_serializer = serializer_class(data=parameters)
        if not phenomenon_serializer.is_valid():
            return Response({"status": "error","data": phenomenon_serializer.errors},status=status.HTTP_400_BAD_REQUEST,)

        simulation_serializer = SimulationSerializer(data={"phenomenon_type": phenomenon_type, "visibility": visibility})

        if not simulation_serializer.is_valid():
            return Response({"status": "error","data": simulation_serializer.errors},status=status.HTTP_400_BAD_REQUEST,)

        with transaction.atomic():
            simulation = simulation_serializer.save(owner=request.user)
            phenomenon_serializer.save(simulation=simulation)

        return Response({"status": "success","data": SimulationSerializer(simulation).data},status=status.HTTP_201_CREATED,)
    
    def delete(self, request, id=None, *args, **kwargs):
        result = get_object_or_404(Simulation, id=id)
        self.check_object_permissions(request, result)
        result.delete()
        return Response(
            {"status": "success", "data": "Record Deleted"},
            status=status.HTTP_204_NO_CONTENT,
        )


class FavouriteView(PaginatedAPIView):
    permission_classes = [IsAuthenticated, SimulationPermission]

    def get(self, request, *args, **kwargs):
        simulation_id = kwargs.get("simulation_id")
        #Get especific 
        if simulation_id is not None:
            favorite = get_object_or_404(Favourite,owner=request.user,simulation_id=simulation_id)
            self.check_object_permissions(request, favorite.simulation)
            serializer = FavouriteSerializer(favorite)
            return Response({"status": "success","data": serializer.data},status=status.HTTP_200_OK)
        #get all favourites of user
        favorites = Favourite.objects.filter(owner=request.user).order_by("-marked_date")
        page = self.paginate_queryset(favorites, request)
        serializer = FavouriteSerializer(page if page is not None else favorites, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response({"status": "success","data": serializer.data},status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        simulation_id = kwargs.get("simulation_id")
        if simulation_id is None:
            return Response({"status": "error","message": "simulation_id is required"},status=status.HTTP_400_BAD_REQUEST)

        simulation = get_object_or_404(Simulation,id=simulation_id)
        self.check_object_permissions(request, simulation)
        favorite, created = Favourite.objects.get_or_create(owner=request.user,simulation=simulation)

        if not created:
            return Response({"status": "error","message": "Simulation already favorited"},status=status.HTTP_400_BAD_REQUEST)

        return Response({"status": "success","data": FavouriteSerializer(favorite).data},status=status.HTTP_201_CREATED)

    def delete(self, request, *args, **kwargs):
        simulation_id = kwargs.get("simulation_id")
        if simulation_id is None:
            return Response({"status": "error","message": "simulation_id is required"},status=status.HTTP_400_BAD_REQUEST)

        favorite = get_object_or_404(Favourite,owner=request.user,simulation_id=simulation_id)
        self.check_object_permissions(request, favorite.simulation)
        favorite.delete()

        return Response({"status": "success","data": "Favourite removed"},status=status.HTTP_204_NO_CONTENT)

#Generic view for all phenomenons
# This gets returns the phenomenon and the parameters of the related simulation
class PhenomenonTypeView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly, SimulationPermission]
    def get(self, request,*args, **kwargs):
        simulation_id = kwargs.get("simulation_id")
        simulation = get_object_or_404(Simulation, id=simulation_id)
        self.check_object_permissions(request, simulation)
        phenomenon_type = simulation.phenomenon_type
        #get from the registry the matching dictionary to the phenomenon_tyoe  
        #which contains the serializer and related_name
        config = PHENOMENON_SERIALIZERS.get(phenomenon_type)
        if config is None:
            return Response({"status": "error","message": "Invalid phenomenon_type"},status=status.HTTP_400_BAD_REQUEST,)
        
        serializer_class = config["serializer"]
        related_name = config["related_name"]
        phenomenon = getattr(simulation, related_name)
        serializer = serializer_class(phenomenon)
        return Response(
            {"status": "success", "data": serializer.data},
            status=status.HTTP_200_OK,
        )
    
