from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Extended user model for ConsultingOS"""

    is_approved = models.BooleanField(default=False, help_text='Must be approved by admin to login')
    github_username = models.CharField(max_length=100, blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
