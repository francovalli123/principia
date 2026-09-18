import base64
import hashlib
import hmac
import os

from cryptography.fernet import Fernet, MultiFernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models

# Centralización del cifrado y busquedas seguras

# Se utiliza Fernet (criptografia simetrica autenticada)
# Se basa en tres componentes: AES-128 en modo CBC para el cifrado, 
# HMAC con SHA-256 para autenticacion y MKCS#7 para el relleno de datos

# Función interna del modulo. Obtiene la clave de cifrado
def _fernet_key():
    configured_key = os.environ.get("DATA_ENCRYPTION_KEY")  # Busca la DATA_ENCRYPTION_KEY en las variables del env
    if configured_key:
        return configured_key.encode()  # Si existe, la utiliza
    if not settings.DEBUG:
        raise ImproperlyConfigured("DATA_ENCRYPTION_KEY debe ser configurada fuera del desarrollo")
    return base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest()) # Convierte bytes a base64


def _fernet():
    # La primera clave cifra los datos nuevos. Las anteriores permiten leer y
    # rotar datos ya cifrados sin perderlos durante una rotacion de claves.
    previous_keys = [
        key.strip().encode()
        for key in os.environ.get("DATA_ENCRYPTION_PREVIOUS_KEYS", "").split(",")
        if key.strip()
    ]
    return MultiFernet([Fernet(_fernet_key()), *[Fernet(key) for key in previous_keys]])

# Cifra un valor usando Fernet
def encrypt_value(value):
    if value in (None, ""):
        return value    # Los None o cadenas vacias se conservan sin cambios
    return _fernet().encrypt(str(value).encode()).decode()

# Descifra un valor usando Fernet. Permite que la app recupere el valor original cuando lo necesite.
def decrypt_value(value):
    if value in (None, ""):
        return value
    return _fernet().decrypt(value.encode()).decode()

# Genera un HMAC-SHA256 del valor normalizado. Esto no se puede descifrar, sirve solo como índice de comparacion
def hash_lookup_value(value):
    normalized = str(value or "").strip().casefold().encode()
    lookup_key = os.environ.get("DATA_LOOKUP_KEY")
    if lookup_key:
        return hmac.new(lookup_key.encode(), normalized, hashlib.sha256).hexdigest()
    if not settings.DEBUG:
        raise ImproperlyConfigured("DATA_LOOKUP_KEY debe ser configurada fuera del desarrollo")
    # El prefijo separa el uso local del HMAC de otros usos de SECRET_KEY.
    development_key = f"users-email-lookup:{settings.SECRET_KEY}".encode()
    return hmac.new(development_key, normalized, hashlib.sha256).hexdigest()

class EncryptedTextField(models.TextField):
    # Cifra el dato antes de guardarlo
    def get_prep_value(self, value):
        return encrypt_value(value)

    # Descifra el dato despues de leerlo
    def from_db_value(self, value, expression, connection):
        return decrypt_value(value)
