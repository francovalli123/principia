from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("forums", "0002_forum_owner_forummembership_forum_members_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="forum",
            name="description",
            field=models.TextField(blank=True),
        ),
    ]
