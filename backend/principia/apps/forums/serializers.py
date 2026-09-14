from rest_framework import serializers
from apps.forums import Forum

class ForumSerializer(serializers.ModelSerializer):
    class Meta:
        model = Forum
        fields = '__all__'
        read_only_fields = ["owner"] 
        #Fuera owner editable en un futuro esto deberia ser modificado
