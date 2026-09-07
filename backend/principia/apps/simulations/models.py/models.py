from django.db import models

class Simulation(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    phenomenon_type = models.CharField(max_length=255)
    json_configuration = models.JSONField()
    visibility = models.CharField(max_length=50, choices=[('public', 'Public'), ('hidden', 'Hidden'), ('private', 'Private')], default='public')
    creation_date = models.DateTimeField(auto_now_add=True)

class Favorite(models.Model):
    pk = models.CompositePrimaryKey("user_id", "simulation_id")
    user = models.ForeignKey(User,on_delete=models.CASCADE)
    simulation = models.ForeignKey(Simulation,on_delete=models.CASCADE)
    marked_date = models.DateTimeField(auto_now_add=True)