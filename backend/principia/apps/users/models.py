from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone

from .security import EncryptedTextField, hash_lookup_value

# La implementación de User se realiza a partir del usuario estándar de DJango
class User(AbstractUser):
    first_name = EncryptedTextField(max_length=150, blank=True)
    last_name = EncryptedTextField(max_length=150, blank=True)
    email = EncryptedTextField(max_length=254)
    email_lookup_hash = models.CharField(max_length=64, db_index=True)  # indice HMAC para el email
    # Se guarda un HMAC del email para realizar busquedas exactas sin almacenar una copia en plain text

    # Cada vez que se guarda un usuario, se normaliza y calcula el HMAC del email. Se actualiza email_lookup_hash y se guarda el user
    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        # En guardados parciales se actualiza el indice solo si se modifica el email;
        # de esta manera no se recalcula ni se deja desincronizado el HMAC.
        if update_fields is None or "email" in update_fields:
            self.email_lookup_hash = hash_lookup_value(self.email) # De esta manera el hash siempre corresponde al actual
            if update_fields is not None:
                kwargs["update_fields"] = set(update_fields) | {"email_lookup_hash"}
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        constraints = [
            models.UniqueConstraint(fields=["email_lookup_hash"], name="users_unique_email_lookup_hash"),
        ]

    def __str__(self):
        return self.get_full_name() or self.username

# Modelo para registrar intentos de login
class LoginAttempt(models.Model):
    username = models.CharField(max_length=64, unique=True) # Username guarda un resultado hexadecimal de un HMAX-SHA256, que ocupa 64 char
    failed_attempts = models.PositiveIntegerField(default=0) # Contador de intentos
    locked_until = models.DateTimeField(blank=True, null=True)  # Fecha de expiración del cool off (si aplica)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    # Devuelve true si hay una fecha de expiracion del cool off y si aun falta para que termine el mismo 
    def is_locked(self):
        return self.locked_until is not None and timezone.now() < self.locked_until

    # Reinicia el contador de intentos
    def reset(self):
        self.failed_attempts = 0
        self.locked_until = None    # Ahora no hay fecha de expiración del cool off
        self.save(update_fields=['failed_attempts', 'locked_until', 'updated_at'])

    def __str__(self):
        return f"{self.username}: {self.failed_attempts} fallidos"

class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,   # Si se elimina un usuario, se elimina su perfil
        related_name = "profile",    # Acceder al perfil con user.profile
    )
    bio = EncryptedTextField(blank=True, null=True)
    visible_name = EncryptedTextField(blank=True, null=True)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/', 
        blank=True,
        null=True,
    )
    creation_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile of {self.visible_name or self.user.get_full_name() or self.user.username}"
