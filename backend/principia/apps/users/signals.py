# Señales
from django.db import transaction
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

from .models import Profile

# La señal se ejecutará cuando se elimine el usuario y django elimine su perfil relacionado
@receiver(post_delete, sender=Profile)
def delete_profile_picture(sender, instance, **kwargs):
    # Si no hay foto de perfil, no hace nada
    if not instance.profile_picture:
        return

    profile_picture = instance.profile_picture

    # Garantiza que el archivo se elimine solamente si la eliminación de la bd se confirma correctamente
    transaction.on_commit(
        lambda: profile_picture.delete(save=False)
    )

# Si el usuario cambia su foto mediante patch, la nueva imagen se guarda y se borra la anterior
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