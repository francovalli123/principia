from django.shortcuts import get_object_or_404
from rest_framework.views import APIView 
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView

from .models import Simulation
from .serializers import SimulationSerializer

#SimulationView
class SimulationView(APIView):
    def get(self, request, *args, **kwargs):
        publication_id = request.query_params.get("publication_id")
        #Get simulation from a publication
        if publication_id is not None:
            publication = get_object_or_404(Publication,id=publication_id)
            simulation = publication.simulation
            serializer = SimulationSerializer(simulation) 
            return Response({"status": "success","data": serializer.data},status=status.HTTP_200_OK)
        #Get simulations from User
        user_id = request.query_params.get("user_id")
        if user_id is not None:
            result = Simulations.objects.filter(user_id = user_id)
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
        result.delete()
        return Response({"status": "success", "data": "Record Deleted"}, status=status.HTTP_200_OK)

