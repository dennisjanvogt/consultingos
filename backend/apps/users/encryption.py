"""
Encryption utilities for sensitive data using Fernet (symmetric encryption).
Uses Django's SECRET_KEY to derive the encryption key.
"""

import base64
import hashlib
from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken


def get_fernet_key() -> bytes:
    """
    Derive a Fernet-compatible key from Django's SECRET_KEY.
    Fernet requires a 32-byte base64-encoded key.
    """
    # Use SHA256 to create a consistent 32-byte key from SECRET_KEY
    key_bytes = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key_bytes)


def encrypt_value(plaintext: str) -> str:
    """
    Encrypt a string value and return base64-encoded ciphertext.
    Returns empty string if plaintext is empty.
    """
    if not plaintext:
        return ''

    fernet = Fernet(get_fernet_key())
    encrypted = fernet.encrypt(plaintext.encode('utf-8'))
    return encrypted.decode('utf-8')


def decrypt_value(ciphertext: str) -> str:
    """
    Decrypt a base64-encoded ciphertext and return plaintext.
    Returns empty string if decryption fails or ciphertext is empty.
    """
    if not ciphertext:
        return ''

    try:
        fernet = Fernet(get_fernet_key())
        decrypted = fernet.decrypt(ciphertext.encode('utf-8'))
        return decrypted.decode('utf-8')
    except InvalidToken:
        # Invalid token (corrupted or wrong key)
        return ''
    except Exception:
        return ''
