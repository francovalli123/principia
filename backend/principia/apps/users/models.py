from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone

from .security import EncryptedTextField, hash_lookup_value

# Django's standard user
class User(AbstractUser):
    first_name = EncryptedTextField(max_length=150, blank=True)
    last_name = EncryptedTextField(max_length=150, blank=True)
    email = EncryptedTextField(max_length=254)
    email_lookup_hash = models.CharField(max_length=64, db_index=True)  # HMAC (Hash-Based Message Autentication Code) index for email
    # An email's HMAC is saved for searchs without saving a plain text copy

    # Each time a user is saved, it's normalized and his email's HMAC is calculated. Then email_lookup_hash is updated and user is saved
    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        # In partial saves, index is only updated when email is modified
        # This way it's not calculated if HMAC is left out of sync
        if update_fields is None or "email" in update_fields:
            self.email_lookup_hash = hash_lookup_value(self.email) # This way, the hash will always be the current one
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

# Model for recording login attempts
class LoginAttempt(models.Model):
    username = models.CharField(max_length=64, unique=True) # The username saved a hexadecimal result of an HMAC-SHA256, which uses 64 char
    failed_attempts = models.PositiveIntegerField(default=0) # Attempt counter
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
