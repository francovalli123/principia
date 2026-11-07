from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("simulations", "0007_favourite_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="simulation",
            name="title",
            field=models.CharField(default="", max_length=255),
        ),
        migrations.AddField(
            model_name="simulation",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="simulation",
            name="allow_cloning",
            field=models.BooleanField(default=True),
        ),
    ]
