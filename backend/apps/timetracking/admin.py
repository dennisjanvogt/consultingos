from django.contrib import admin
from .models import Client, Project, TimeEntry


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'email', 'phone']
    ordering = ['name']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'client', 'hourly_rate', 'status', 'color', 'user', 'created_at']
    list_filter = ['status', 'color', 'client']
    search_fields = ['name', 'description', 'client__name']
    ordering = ['client__name', 'name']


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ['project', 'date', 'start_time', 'end_time', 'duration_minutes', 'billable', 'user']
    list_filter = ['date', 'billable', 'project', 'project__client']
    search_fields = ['description', 'project__name', 'project__client__name']
    ordering = ['-date', '-start_time']
    date_hierarchy = 'date'
