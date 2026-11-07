from rest_framework import serializers
from apps.forums.models import Forum

class ForumSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(
        source="members.count",
        read_only=True,
    )
    is_member = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    def get_is_member(self, forum):
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and (
                forum.owner_id == request.user.id
                or forum.members.filter(pk=request.user.pk).exists()
            )
        )

    def get_is_owner(self, forum):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and forum.owner_id == request.user.id)

    class Meta:
        model = Forum
        fields = [
            "id", 
            "name",
            "description",
            "creation_date",
            "owner",
            "member_count",
            "is_member",
            "is_owner",
        ]
        read_only_fields = [
            "id",
            "creation_date",
            "owner",
            "member_count",
        ]
