from rest_framework import serializers
from apps.comments.models import Comment

class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = '__all__'
        read_only_fields = ('owner', 'creation_date')
    
    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Comment content cannot be empty.")
        return value