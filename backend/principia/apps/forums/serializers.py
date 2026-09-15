from rest_framework import serializers
from apps.forums.models import Forum

class ForumSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(
        source="members.count",
        read_only=True,
    )

    class Meta:
        model = Forum
        fields = [
            "id", 
            "name",
            "creation_date",
            "owner",
            "member_count",
        ]
        read_only_fields = [
            "id",
            "creation_date",
            "owner",
            "member_count",
        ]