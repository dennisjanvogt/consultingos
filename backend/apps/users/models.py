from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Extended user model for ConsultingOS"""

    is_approved = models.BooleanField(default=False, help_text='Must be approved by admin to login')
    github_username = models.CharField(max_length=100, blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)

    # Encrypted API keys (stored as encrypted strings)
    encrypted_openrouter_key = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def set_openrouter_key(self, api_key: str) -> None:
        """Encrypt and store the OpenRouter API key"""
        from .encryption import encrypt_value
        self.encrypted_openrouter_key = encrypt_value(api_key)
        self.save(update_fields=['encrypted_openrouter_key'])

    def get_openrouter_key(self) -> str:
        """Decrypt and return the OpenRouter API key"""
        from .encryption import decrypt_value
        return decrypt_value(self.encrypted_openrouter_key)

    def has_openrouter_key(self) -> bool:
        """Check if user has an OpenRouter API key set"""
        return bool(self.encrypted_openrouter_key)

    def clear_openrouter_key(self) -> None:
        """Remove the stored OpenRouter API key"""
        self.encrypted_openrouter_key = ''
        self.save(update_fields=['encrypted_openrouter_key'])
