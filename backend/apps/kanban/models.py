from django.db import models
from django.conf import settings


class KanbanCard(models.Model):
    BOARD_CHOICES = [
        ('work', 'Work'),
        ('private', 'Private'),
        ('archive', 'Archive'),
    ]

    COLUMN_CHOICES = [
        ('backlog', 'Backlog'),
        ('todo', 'To-Do'),
        ('in_progress', 'In Progress'),
        ('in_review', 'In Review'),
        ('done', 'Done'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    COLOR_CHOICES = [
        ('gray', 'Gray'),
        ('blue', 'Blue'),
        ('green', 'Green'),
        ('yellow', 'Yellow'),
        ('red', 'Red'),
        ('purple', 'Purple'),
        ('pink', 'Pink'),
        ('orange', 'Orange'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='kanban_cards')
    board = models.CharField(max_length=20, choices=BOARD_CHOICES, default='work')
    column = models.CharField(max_length=20, choices=COLUMN_CHOICES, default='backlog')
    position = models.IntegerField(default=0)  # Order within column

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    color = models.CharField(max_length=20, choices=COLOR_CHOICES, default='gray')

    # Optional due date
    due_date = models.DateField(null=True, blank=True)

    # Optional link to customer
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='kanban_cards')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['board', 'column', 'position']

    def __str__(self):
        return f"{self.title} ({self.board}/{self.column})"
