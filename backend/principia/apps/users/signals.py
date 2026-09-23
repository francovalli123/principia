# Señales
from django.db import transaction
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

from .models import Profile
# Signal will be executed when the user is eliminated and django removes its related profile
@receiver(post_delete, sender=Profile)
def delete_profile_picture(sender, instance, **kwargs):
    #If there isnt profile picture, does nothing
    if not instance.profile_picture:
        return

    profile_picture = instance.profile_picture
    #Guarantees that the file is removed only if the elimination from the bd is confirmed correctly
    transaction.on_commit(
        lambda: profile_picture.delete(save=False)
    )
#If user changes its picture through patch, the new image is stored and the old one erased
@receiver(pre_save, sender=Profile)
def delete_replaced_profile_picture(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        previous_profile = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    previous_picture = previous_profile.profile_picture

    if (
        previous_picture 
        and previous_picture.name
        and previous_picture.name != instance.profile_picture.name
    ): 
        transaction.on_commit(
            lambda: previous_picture.delete(save=False)
        )
