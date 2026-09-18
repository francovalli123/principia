from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone

# La implementación de User se realiza a partir del usuario estándar de DJango
class User(AbstractUser):
    def __str__(self):
        return self.get_full_name() or self.username

# Modelo para registrar intentos de login
class LoginAttempt(models.Model):
    username = models.CharField(max_length=150, unique=True)
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
    bio = models.TextField(blank=True, null=True)
    visible_name = models.CharField(max_length=255, blank=True, null=True)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/', 
        blank=True,
        null=True,
    )
    creation_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile of {self.visible_name or self.user.get_full_name() or self.user.username}"