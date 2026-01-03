from django.contrib import admin
from .models import KanbanCard


@admin.register(KanbanCard)
class KanbanCardAdmin(admin.ModelAdmin):
    list_display = ['title', 'board', 'column', 'position', 'priority', 'user', 'created_at']
    list_filter = ['board', 'column', 'priority', 'color']
    search_fields = ['title', 'description']
    ordering = ['board', 'column', 'position']
