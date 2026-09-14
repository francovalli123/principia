from django.shortcuts import get_object_or_404
from rest_framework.views import APIView 
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView


from common.permissions import IsOwnerOrReadOnly
from .models import Forum
from .serializers import ForumSerializer

#ForumView
class ForumView(APIView):
 permission_classes = [
        IsAuthenticatedOrReadOnly,
        IsOwnerOrReadOnly,
    ]
    def get(self,request,*args,**kwargs):
        forum_id = kwarg.get('id')

        if forum_id is not None:
            result = get_object_or_404(Forum, id=forum_id)
            self.check_object_permissions(request,result) #Chequea si tiene los permisos necesarios.Si falla retorna Forbidden
            serializer = ForumSerializer(result)
            return Response({"status": "success", "data":serializer.data}, status = status.HTTP_200_OK)
        #Get All
        result = User.objects.all()
        serializer = ForumSerializer(result, many=True)
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)
        
    def post(self,request,*args,**kwargs):
        serializer = ForumSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(owner = request.user)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"status": "error", "data": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self,request, id=None,*args,**kwargs):
        result = get_object_or_404(Forum,id=id)
        self.check_object_permissions(request,result) #Chequea si tiene los permisos necesarios.Si falla retorna Forbidden
        result.delete()
        return Response({"status": "success", "data": "Record Deleted"}, status=status.HTTP_200_OK)

