from django.shortcuts import get_object_or_404
from rest_framework.views import APIView 
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from apps.common.permissions import IsOwnerOrReadOnly
from .models import Simulation
from .serializers import SimulationSerializer
from apps.publications.models import Publication
from apps.forums.models import Forum

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
            publication = get_object_or_404(Publication,id=publication_id)
            self.check_object_permissions(request,result) #Chequea si tiene los permisos necesarios.Si falla retorna Forbidden
            simulation = publication.simulation
            serializer = SimulationSerializer(simulation) 
            return Response({"status": "success","data": serializer.data},status=status.HTTP_200_OK)
        #Get simulations from User
        owner_id = request.query_params.get("owner_id")
        if owner_id is not None:
            result = Simulation.objects.filter(owner_id = owner_id)
            serializer = SimulationSerializer(result, many=True)
            return Response({"status": "success","data": serializer.data},status=status.HTTP_200_OK)
            
        return Response({"status": "error","message": "publication_id is required"},status=status.HTTP_400_BAD_REQUEST)

    def post(self,request,*args,**kwargs):
        serializer = SimulationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"status": "error", "data": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self,request, id=None,*args,**kwargs):
        result = get_object_or_404(Forum,id=id)
        self.check_object_permissions(request,result)
        result.delete()
        return Response({"status": "success", "data": "Record Deleted"}, status=status.HTTP_200_OK)

