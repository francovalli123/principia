from django.db import models

class Forum(models.Model):
    name = models.CharField(max_length=255)
  