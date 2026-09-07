from django.db import models

class Publication(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    simulation_id = models.ForeignKey(Simulation, on_delete=models.CASCADE)
    forum_id = models.ForeignKey(Forum, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    creation_date = models.DateTimeField(auto_now_add=True)
    state = models.CharField(max_length=50, choices=[('public', 'Public'), ('hidden', 'Hidden'), ('private', 'Private'), ('eliminated', 'Eliminated')], default='public')


