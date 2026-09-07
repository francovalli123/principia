from django.db import models

class Publication(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    simulation_id = models.IntegerField().ForeignKey('simulations.Simulation', on_delete=models.CASCADE)
    user_id = models.ForeignKey('auth.User', on_delete=models.CASCADE)
    creation_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title 