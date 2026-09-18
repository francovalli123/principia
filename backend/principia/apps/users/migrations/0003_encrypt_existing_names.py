from django.db import migrations


def encrypt_plain_names(apps, schema_editor):
    # 0002 ya cifra todos los campos. No se debe usar InvalidToken para
    # identificar texto plano: una clave rotada o un dato corrupto tambiÃ©n
    # produce esa excepciÃ³n y volver a cifrarlo destruirÃ­a el valor original.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_encrypt_sensitive_user_data"),
    ]

    operations = [
        migrations.RunPython(encrypt_plain_names, migrations.RunPython.noop),
    ]
