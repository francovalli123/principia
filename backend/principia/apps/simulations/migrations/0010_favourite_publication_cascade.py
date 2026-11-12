from django.db import migrations, models
import django.db.models.deletion


def delete_favourites_without_publication(apps, schema_editor):
    Favourite = apps.get_model("simulations", "Favourite")
    Favourite.objects.filter(publication__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("simulations", "0009_favourite_publication"),
    ]

    operations = [
        migrations.RunPython(
            delete_favourites_without_publication,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="favourite",
            name="publication",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="favourites",
                to="publications.publication",
            ),
        ),
    ]
