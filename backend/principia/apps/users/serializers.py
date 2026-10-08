from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from apps.users.models import User, Profile
from .security import hash_lookup_value
from django.db import transaction

# Un serializer transforma instancias de un modelo en representaciones como json y viceversa

# Serializador del usuario
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User

        # Se define explicitamente los campos para evitar exponer campos internos accidentalmente
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
        # La restriccion de base de datos evita carreras; esta validacion da
        # un error legible a las solicitudes administrativas antes de guardar.
        users_with_email = User.objects.filter(email_lookup_hash=hash_lookup_value(value))
        if self.instance:
            users_with_email = users_with_email.exclude(pk=self.instance.pk)
        if users_with_email.exists():
            raise serializers.ValidationError("Este email ya esta registrado.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password", None) # La contraseña se elimina de validated_data
        user = User(**validated_data)
        if password:
            user.set_password(password) # Se procesa con set_password. Esto crea un hash seguro usando Django
        user.save()
        return user

    # Permite modificar los campos recibidos
    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password) # Si llega una nueva password, utiliza set_password para reemplazar el hash anterior
        instance.save()
        return instance

# Serializador del perfil
class ProfileSerializer(serializers.ModelSerializer):
    # El campo user es de solo lectura para evitar que se pueda cambiar el propietario de un perfil desde la API
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
    password = serializers.CharField(
        write_only=True, 
        validators=[validate_password]
    )
    username = serializers.CharField(max_length = 150)
    first_name = serializers.CharField(max_length = 150)
    last_name = serializers.CharField(max_length = 150)
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
        fields = ("username", "first_name", "last_name", "email", "password")

    def validate_email(self, value):
        # Como el email está cifrado, se calcula el mismo HMAC y se compara con email_lookup_hash
        if User.objects.filter(email_lookup_hash=hash_lookup_value(value)).exists():
            # Informa al cliente de que el correo ya está en uso.
            raise serializers.ValidationError("Este email ya está registrado.")
        # Devuelve el correo validado al proceso de creación.
        return value

    @transaction.atomic # para garantizar que si no se crea el perfil, tampoco se guarde el usuario
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        Profile.objects.create(user=user)
        return user
