from django.db import models

class User(models.Model):
    id = models.AutoField(primary_key=True)
    full_name = models.CharField(max_length=255, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    creation_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name

class Profile(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True, null=True)
    visible_name = models.CharField(max_length=255, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    creation_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile of {self.visible_name or self.user_id.full_name}"