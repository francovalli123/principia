from django.db import models
from django.conf import settings

class Publication(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()

    simulation = models.ForeignKey(
        "simulations.Simulation",
        on_delete=models.CASCADE,
        related_name="publications",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="publications",
    )

    creation_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title