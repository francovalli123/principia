from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from apps.users.models import User, Profile
from .security import hash_lookup_value
from django.db import transaction

# User serializer
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        # Fields are explicitly defined to avoid accidentally exposing internal fields
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
        )
        read_only_fields = ("id",)

    def validate_email(self, value):
        # The database constraint prevents race condition
        # This validation provides a readable error for administrative requests before saving
        users_with_email = User.objects.filter(email_lookup_hash=hash_lookup_value(value))
        if self.instance:
            users_with_email = users_with_email.exclude(pk=self.instance.pk)
        if users_with_email.exists():
            raise serializers.ValidationError("Este email ya esta registrado.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password", None) # The password is removed from validated_data
        user = User(**validated_data)
        if password:
            user.set_password(password) # It is processed using set_password. This creates a secure hash using Django
        user.save()
        return user

    # Permite modificar los campos recibidos
    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password) # If a new password arrives, use set_password to replace the previous hash
        instance.save()
        return instance


class PublicUserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "profile_picture")
        read_only_fields = fields

    def get_profile_picture(self, obj):
        try:
            profile = obj.profile
        except Profile.DoesNotExist:
            return None

        return profile.profile_picture.url if profile.profile_picture else None

# Profile serializer
class ProfileSerializer(serializers.ModelSerializer):
    # The user field is read-only to prevent the profile owner from being changed via the API
    user = serializers.PrimaryKeyRelatedField(read_only=True) # The user should be assigned from request.user

    creation_date = serializers.DateTimeField(read_only=True)
    # We do not use fields='__all__' because it exposes internal fields and allows writing to 'user' or 'creation_date'
    class Meta:
        model = Profile
        fields = (
            "id",
            "user",
            "bio",
            "visible_name",
            "profile_picture",
            "creation_date",
        )

# Public Profile Serializer
class PublicProfileSerializer(serializers.ModelSerializer): 
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Profile
        fields = (
            "id",
            "user",
            "username",
            "visible_name",
            "bio",
            "profile_picture",
            "creation_date",
        )
        read_only_fields = fields

# Register serializer
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, 
        validators=[validate_password]
    )
    username = serializers.CharField(max_length = 150)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(
        # Error messages
        error_messages = {
            "invalid": "Email invalido",
            "blank": "Email invalido",
            "required": "Email invalido"
        }
    )

    class Meta:
        # Indicates that this serializer works with the User model
        model = User
        # Provides only the necessary data to register an account
        fields = ("username", "first_name", "last_name", "email", "password")

    def validate_email(self, value):
        # Since the email is encrypted, the same HMAC is calculated and compared againts email_lookup_hash
        if User.objects.filter(email_lookup_hash=hash_lookup_value(value)).exists():
            # Inform the client that the email is already in use
            raise serializers.ValidationError("Este email ya está registrado.")
        # Return the validated email to the creation process
        return value

    @transaction.atomic # To ensure that if the profile is not created, the user is not saved either
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        Profile.objects.create(user=user)
        return user
