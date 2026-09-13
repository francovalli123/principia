from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from apps.users.models import User, Profile

# Un serializer transforma instancias de un modelo en representaciones como json y viceversa

# Serializador del usuario
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

# Serializador del perfil
class ProfileSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True) # el user debe asignarse desde request.user
    creation_date = serializers.DateTimeField(read_only=True)
    # No usamos fields = '__all__' porque expone campos internos y permite escribir user o creation_date
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

# Serializador del registro de usuarios
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    username = serializers.CharField(max_length = 150)
    email = serializers.EmailField(
        # Mensajes de error
        error_messages = {
            "invalid": "Email invalido",
            "blank": "Email invalido",
            "required": "Email invalido"
        }
    )

    class Meta:
        # Indica que este serializer trabaja con el modelo User.
        model = User
        # Expone únicamente los datos necesarios para registrar una cuenta.
        fields = ("username", "email", "password")

    def validate_email(self, value):
        # Comprueba el correo ignorando mayúsculas y minúsculas.
        if User.objects.filter(email__iexact=value).exists():
            # Informa al cliente de que el correo ya está en uso.
            raise serializers.ValidationError("Este email ya está registrado.")
        # Devuelve el correo validado al proceso de creación.
        return value

    def create(self, validated_data):
        # Extrae los datos validados y crea el usuario con password hasheada.
        return User.objects.create_user(**validated_data)    