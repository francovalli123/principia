from django.db import migrations, models

from apps.users.security import EncryptedTextField, encrypt_value, hash_lookup_value


def encrypt_existing_data(apps, schema_editor):
    User = apps.get_model("users", "User")
    Profile = apps.get_model("users", "Profile")
    LoginAttempt = apps.get_model("users", "LoginAttempt")

    for user in User.objects.iterator():
        first_name = user.first_name
        last_name = user.last_name
        email = user.email
        user.first_name = encrypt_value(first_name)
        user.last_name = encrypt_value(last_name)
        user.email = encrypt_value(email)
        user.email_lookup_hash = hash_lookup_value(email)
        user.save(update_fields=["first_name", "last_name", "email", "email_lookup_hash"])

    for profile in Profile.objects.iterator():
        profile.bio = encrypt_value(profile.bio)
        profile.visible_name = encrypt_value(profile.visible_name)
        profile.save(update_fields=["bio", "visible_name"])

    for attempt in LoginAttempt.objects.iterator():
        attempt.username = hash_lookup_value(attempt.username)
        attempt.save(update_fields=["username"])


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="email_lookup_hash",
            field=models.CharField(blank=True, db_index=True, max_length=64),
        ),
        migrations.CreateModel(
            name="LoginAttempt",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("username", models.CharField(max_length=64, unique=True)),
                ("failed_attempts", models.PositiveIntegerField(default=0)),
                ("locked_until", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.RunPython(encrypt_existing_data, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="first_name",
            field=EncryptedTextField(blank=True, max_length=150),
        ),
        migrations.AlterField(
            model_name="user",
            name="last_name",
            field=EncryptedTextField(blank=True, max_length=150),
        ),
        migrations.AlterField(
            model_name="user",
            name="email",
            field=EncryptedTextField(blank=True, max_length=254),
        ),
        migrations.AlterField(
            model_name="profile",
            name="bio",
            field=EncryptedTextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="profile",
            name="visible_name",
            field=EncryptedTextField(blank=True, null=True),
        ),
    ]