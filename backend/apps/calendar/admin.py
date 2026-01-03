from django.contrib import admin
from .models import CalendarEvent


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ['title', 'date', 'start_time', 'end_time', 'user', 'color']
    list_filter = ['date', 'color', 'user']
    search_fields = ['title', 'description', 'location']
    date_hierarchy = 'date'
