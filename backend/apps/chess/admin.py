from django.contrib import admin
from .models import ChessGame, ChessInvitation


@admin.register(ChessGame)
class ChessGameAdmin(admin.ModelAdmin):
    list_display = ['id', 'white_player', 'black_player', 'is_ai_game', 'status', 'created_at']
    list_filter = ['status', 'is_ai_game', 'created_at']
    search_fields = ['white_player__username', 'black_player__username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ChessInvitation)
class ChessInvitationAdmin(admin.ModelAdmin):
    list_display = ['id', 'from_user', 'to_user', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['from_user__username', 'to_user__username']
