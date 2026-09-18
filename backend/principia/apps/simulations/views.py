from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated

from django.db import transaction

from apps.common.permissions import IsOwnerOrReadOnly
from .models import Simulation
from .serializers import SimulationSerializer
from .phRegistry import PHENOMENON_SERIALIZERS
from apps.publications.models import Publication


#SimulationView
class SimulationView(APIView):
    permission_classes = [
        IsAuthenticatedOrReadOnly,
        IsOwnerOrReadOnly,
    ]

    def get(self, request, *args, **kwargs):
        publication_id = request.query_params.get("publication_id")

        #Get simulation from a publication        
        if publication_id is not None:
            publication = get_object_or_404(Publication, id=publication_id)
            simulation = publication.simulation
            serializer = SimulationSerializer(simulation)
            return Response(
                {"status": "success", "data": serializer.data},
                status=status.HTTP_200_OK,
            )

        #Get simulations from User/Profile
        owner_id = request.query_params.get("owner_id")
        if owner_id is not None:
            result = Simulation.objects.filter(owner_id=owner_id)
            serializer = SimulationSerializer(result, many=True)
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
    # Obtengo la configuración correspondiente al phenomenon_type
    config = PHENOMENON_SERIALIZERS.get(phenomenon_type)
    if config is None:
        return Response({"status": "error","message": "Invalid phenomenon_type"},status=status.HTTP_400_BAD_REQUEST,)
    
    serializer_class = config["serializer"]
    phenomenon_serializer = serializer_class(data=parameters)
    if not phenomenon_serializer.is_valid():
        return Response({"status": "error","data": phenomenon_serializer.errors},status=status.HTTP_400_BAD_REQUEST,)

    simulation_serializer = SimulationSerializer(data={"phenomenon_type": phenomenon_type})

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
            status=status.HTTP_200_OK,
        )


class FavoriteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        simulation_id = kwargs.get("simulation_id")
        #Obtener especifico
        if simulation_id is not None:
            favorite = get_object_or_404(Favorite,owner=request.user,simulation_id=simulation_id)
            serializer = FavoriteSerializer(favorite)
            return Response({"status": "success","data": serializer.data},status=status.HTTP_200_OK)
        #Obtener todos los favoritos del usuario
        favorites = Favorite.objects.filter(owner=request.user)
        serializer = FavoriteSerializer(favorites,many=True)
        return Response({"status": "success","data": serializer.data},status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        simulation_id = request.data.get("simulation_id")
        if simulation_id is None:
            return Response({"status": "error","message": "simulation_id is required"},status=status.HTTP_400_BAD_REQUEST)

        simulation = get_object_or_404(Simulation,id=simulation_id)
        favorite, created = Favorite.objects.get_or_create(owner=request.user,simulation=simulation)

        if not created:
            return Response({"status": "error","message": "Simulation already favorited"},status=status.HTTP_400_BAD_REQUEST)

        return Response({"status": "success","data": FavoriteSerializer(favorite).data},status=status.HTTP_201_CREATED)

    def delete(self, request, *args, **kwargs):
        simulation_id = kwargs.get("simulation_id")
        if simulation_id is None:
            return Response({"status": "error","message": "simulation_id is required"},status=status.HTTP_400_BAD_REQUEST)

        favorite = get_object_or_404(Favorite,owner=request.user,simulation_id=simulation_id)
        favorite.delete()

        return Response({"status": "success","data": "Favorite removed"},status=status.HTTP_200_OK)

#View generica para cualquier fenomeno
# Este get da el fenomeno y sus parametros a partir de la simulacion asociada
class PhenomenonTypeView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    def get(self, request,*args, **kwargs):
        simulation_id = kwargs.get("simulation_id")
        simulation = get_object_or_404(Simulation, id=simulation_id)
        phenomenon_type = simulation.phenomenon_type
        #obtengo del Registry el diccionario correspondiente al phenomenon_type. 
        #que contiene el serializer y el related_name
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
    