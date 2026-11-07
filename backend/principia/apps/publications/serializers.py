from rest_framework import serializers
from apps.publications.models import Publication
from apps.users.serializers import PublicUserSerializer

class PublicationSerializer(serializers.ModelSerializer):
    owner = PublicUserSerializer(read_only=True)

    class Meta:
        model = Publication
        fields = '__all__'
        read_only_fields = ["owner"]
