from django.db import migrations, models

from apps.users.security import EncryptedTextField, hash_lookup_value


def rehash_email_lookup_values(apps, schema_editor):
    # El email se descifra mediante el campo histÃ³rico y se vuelve a indexar con
    # DATA_LOOKUP_KEY, una clave independiente de DJANGO_SECRET_KEY.
    User = apps.get_model("users", "User")
    for user in User.objects.iterator():
        user.email_lookup_hash = hash_lookup_value(user.email)
        user.save(update_fields=["email_lookup_hash"])


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_encrypt_existing_names"),
    ]

    operations = [
        migrations.RunPython(rehash_email_lookup_values, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="email",
            field=EncryptedTextField(max_length=254),
        ),
        migrations.AlterField(
            model_name="user",
            name="email_lookup_hash",
            field=models.CharField(db_index=True, max_length=64),
        ),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.UniqueConstraint(fields=("email_lookup_hash",), name="users_unique_email_lookup_hash"),
        ),
    ]
