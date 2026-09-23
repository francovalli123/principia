from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class Simulation(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="simulations",
    )
    phenomenon_type = models.CharField(max_length=255)
    #json_configuration = models.JSONField()
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
        return f"{self.phenomenon_type} - {self.owner.username}"

class Favourite(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favourite_simulations",
    )
    simulation = models.ForeignKey(
        Simulation,
        on_delete=models.CASCADE,
        related_name="favourites",
    )
    marked_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "simulation"],
                name = "unique_owner_simulation_favorite",
            )
        ]

    def __str__(self):
        return f"{self.owner.username} - {self.simulation}"


class ObliqueProjectileMotion(models.Model):
    simulation = models.OneToOneField(Simulation, on_delete=models.CASCADE)
    initial_velocity = models.FloatField(validators=[MinValueValidator(0)])
    angle = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(90)])
    initial_height = models.FloatField(default=0.0, validators=[MinValueValidator(0)])

    def __str__(self):
        return f"Oblique Projectile Motion - {self.simulation}"
