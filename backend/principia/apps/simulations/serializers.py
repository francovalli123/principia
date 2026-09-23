from rest_framework import serializers
from apps.simulations.models import Simulation, Favourite, ObliqueProjectileMotion

class SimulationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Simulation
        fields = '__all__'
        read_only_fields = ['owner']

class FavouriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favourite
        fields = '__all__'
        read_only_fields = ['owner', 'marked_date']

class ObliqueProjectileMotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObliqueProjectileMotion
        fields = ['initial_velocity', 'angle', 'initial_height']
    
    def validate(self, attrs):
        allowed_fields = set(self.fields.keys())
        received_fields = set(self.initial_data.keys())
        extra_fields = received_fields - allowed_fields
        if extra_fields:
            raise serializers.ValidationError({"unknown_fields": list(extra_fields)})
        return attrs
