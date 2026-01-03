from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

DEFAULT_FOLDERS = [
    {'name': 'Bilder', 'show_in_sidebar': True},
    {'name': 'Videos', 'show_in_sidebar': True},
    {'name': 'Musik', 'show_in_sidebar': True},
    {'name': 'Dokumente', 'show_in_sidebar': True},
]


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_folders(sender, instance, created, **kwargs):
    """Create default folders for new users"""
    if created:
        from .models import Folder
        for folder_data in DEFAULT_FOLDERS:
            Folder.objects.get_or_create(
                user=instance,
                name=folder_data['name'],
                parent=None,
                defaults={'show_in_sidebar': folder_data['show_in_sidebar']}
            )


def create_default_folders_for_user(user):
    """Utility function to create default folders for an existing user"""
    from .models import Folder
    created_folders = []
    for folder_data in DEFAULT_FOLDERS:
        folder, created = Folder.objects.get_or_create(
            user=user,
            name=folder_data['name'],
            parent=None,
            defaults={'show_in_sidebar': folder_data['show_in_sidebar']}
        )
        if created:
            created_folders.append(folder)
    return created_folders
