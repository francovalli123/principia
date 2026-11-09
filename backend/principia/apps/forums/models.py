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

    # Forum members. Uses an intermediate model
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="ForumMembership",
        related_name="joined_forums",
    )

    def __str__(self):
        return self.name

# Note: when a forum is created, the owner must be automatically added as a member
class ForumMembership(models.Model):
    forum = models.ForeignKey(Forum, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # Prevents a user from joining the same forum twice
            models.UniqueConstraint(
                fields = ["forum", "user"],
                name="unique_forum_member",
            )
        ]
