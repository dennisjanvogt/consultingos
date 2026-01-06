from django.contrib import admin
from .models import Diagram


@admin.register(Diagram)
class DiagramAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'updated_at', 'created_at']
    list_filter = ['user', 'created_at']
    search_fields = ['title']
    readonly_fields = ['created_at', 'updated_at']
