from django.contrib import admin
from .models import ImageProject


@admin.register(ImageProject)
class ImageProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'width', 'height', 'updated_at']
    list_filter = ['user', 'created_at']
    search_fields = ['name', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
