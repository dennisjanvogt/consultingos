from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async


class AdminNotificationConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for admin notifications (e.g., new user registrations)"""

    async def connect(self):
        self.user = self.scope['user']

        # Only allow authenticated staff users
        if not self.user.is_authenticated or not await self.is_staff():
            await self.close()
            return

        # Join the admin notifications group
        self.group_name = 'admin_notifications'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        # Send current pending count on connect
        count = await self.get_pending_count()
        await self.send_json({
            'type': 'pending_count',
            'count': count
        })

    async def disconnect(self, close_code):
        # Leave the group
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def new_registration(self, event):
        """Handle new registration event - send updated count to admin"""
        await self.send_json({
            'type': 'new_registration',
            'count': event['count'],
            'username': event.get('username', '')
        })

    async def pending_count_update(self, event):
        """Handle pending count update (after approve/reject)"""
        await self.send_json({
            'type': 'pending_count',
            'count': event['count']
        })

    @database_sync_to_async
    def is_staff(self):
        return self.user.is_staff

    @database_sync_to_async
    def get_pending_count(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(is_approved=False).count()
