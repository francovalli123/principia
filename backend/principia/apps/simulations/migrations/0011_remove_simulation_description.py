from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("simulations", "0010_favourite_publication_cascade"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="simulation",
            name="description",
        ),
    ]