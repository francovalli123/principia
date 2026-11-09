import base64
import hashlib
import hmac
import os

from cryptography.fernet import Fernet, MultiFernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models

# Centralization of encryption and secure searches

# Fernet (Autenticated Simmetric Cryptography) is used
# It is based on three components: AES-128 in CBC mode for encryption, HMAC with SHA-256 for authentication and PKCS#7 for data padding.

# Internal module function. Obtains the encryption key
def _fernet_key():
    configured_key = os.environ.get("DATA_ENCRYPTION_KEY")  # Searchs for DATA_ENCRYPTION_KEY in env variables
    if configured_key:
        return configured_key.encode()  # Uses it if exists
    if not settings.DEBUG:
        raise ImproperlyConfigured("DATA_ENCRYPTION_KEY debe ser configurada fuera del desarrollo")
    return base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest()) # Converts bytes to base64


def _fernet():
    # The first key encrypts new data. 
    # The previous ones allow for reading and rotating already-encrypted data withoud losing it during a key rotation
    previous_keys = [
        key.strip().encode()
        for key in os.environ.get("DATA_ENCRYPTION_PREVIOUS_KEYS", "").split(",")
        if key.strip()
    ]
    return MultiFernet([Fernet(_fernet_key()), *[Fernet(key) for key in previous_keys]])

# Encrypts a value using Fernet 
def encrypt_value(value):
    if value in (None, ""):
        return value    # None values or empty strings are kept unchanged
    return _fernet().encrypt(str(value).encode()).decode()

# Decrypt a value using Fernet. This allows the app to retrieve the original value whenever it needs it
def decrypt_value(value):
    if value in (None, ""):
        return value
    return _fernet().decrypt(value.encode()).decode()

# Generates an HMAC-SHA256 of the normalized value. This cannot be decrypted; it serves only as an index for comparison
def hash_lookup_value(value):
    normalized = str(value or "").strip().casefold().encode()
    lookup_key = os.environ.get("DATA_LOOKUP_KEY")
    if lookup_key:
        return hmac.new(lookup_key.encode(), normalized, hashlib.sha256).hexdigest()
    if not settings.DEBUG:
        raise ImproperlyConfigured("DATA_LOOKUP_KEY debe ser configurada fuera del desarrollo")
    
    # The prefix separates the local use of the HMAC from other uses of SECRET_KEY
    development_key = f"users-email-lookup:{settings.SECRET_KEY}".encode()
    return hmac.new(development_key, normalized, hashlib.sha256).hexdigest()

class EncryptedTextField(models.TextField):
    # Encrypts the data before saving it
    def get_prep_value(self, value):
        return encrypt_value(value)

    # Decrypts the data after reading it
    def from_db_value(self, value, expression, connection):
        return decrypt_value(value)
