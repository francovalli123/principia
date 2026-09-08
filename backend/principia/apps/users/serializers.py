from rest_framework import serializers
from apps.users.models import User, Profile

# Un serializer transforma instancias de un modelo en representaciones como json y viceversa
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'