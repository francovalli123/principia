from django.db import models
from django.conf import settings 
from django.core.validators import MinLengthValidator, MaxLengthValidator

class Comment(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )

    publication = models.ForeignKey(
        "publications.Publication",
        on_delete=models.CASCADE,
        related_name="comments",
    )

    content = models.TextField(validators=[MinLengthValidator(1), MaxLengthValidator(2000)])
    creation_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.owner.username}"
