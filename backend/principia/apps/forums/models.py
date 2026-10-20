from django.db import models
from django.conf import settings

class Forum(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    creation_date = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="forums",
        null=True,
        blank=True,
        )

    # Miembros del foro. Usa un modelo intermedio
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="ForumMembership",
        related_name="joined_forums",
    )

    def __str__(self):
        return self.name

# Nota: Cuando se cree un foro, hay que agregar automáticamente al propietario como miembro
class ForumMembership(models.Model):
    forum = models.ForeignKey(Forum, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # Evita que un usuario se una dos veces al mismo foro
            models.UniqueConstraint(
                fields = ["forum", "user"],
                name="unique_forum_member",
            )
        ]
