from django.db import models
from django.conf import settings

class Simulation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="simulations",
    )
    phenomenon_type = models.CharField(max_length=255)
    json_configuration = models.JSONField()
    visibility = models.CharField(
        max_length=50,
        choices=[
            ("public", "Public"),
            ("hidden", "Hidden"),
            ("private", "Private"),
        ],
        default="public",
    )
    creation_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.phenomenon_type} - {self.user.username}"

class Favorite(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorite_simulations",
    )
    simulation = models.ForeignKey(
        Simulation,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    marked_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "simulation"],
                name = "unique_user_simulation_favorite",
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.simulation}"