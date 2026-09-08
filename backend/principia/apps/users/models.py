from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

# La implementación de User se realiza a partir del usuario estándar de DJango
class User(AbstractUser):
    def __str__(self):
        return self.get_full_name() or self.full_name

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
        return f"Profile of {self.visible_name or self.user_id.full_name() or self.user.username}"