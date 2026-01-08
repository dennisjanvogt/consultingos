from django.db import models
from django.conf import settings


class Tag(models.Model):
    """User-scoped tags for organizing pages"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vault_tags'
    )
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=20, default='gray')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vault_tags'
        unique_together = ['user', 'name']
        ordering = ['name']

    def __str__(self):
        return self.name


class Page(models.Model):
    """A page in the vault - can be nested hierarchically"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vault_pages'
    )
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children'
    )
    title = models.CharField(max_length=500, default='Untitled')
    icon = models.CharField(max_length=50, blank=True, default='')
    content = models.JSONField(default=dict, blank=True)
    is_favorited = models.BooleanField(default=False)
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Many-to-many with tags
    tags = models.ManyToManyField(Tag, blank=True, related_name='pages')

    class Meta:
        db_table = 'vault_pages'
        ordering = ['position', '-updated_at']

    def __str__(self):
        return self.title

    def get_breadcrumbs(self):
        """Get list of ancestors from root to this page"""
        breadcrumbs = []
        page = self
        while page:
            breadcrumbs.insert(0, {'id': page.id, 'title': page.title, 'icon': page.icon})
            page = page.parent
        return breadcrumbs

    def get_all_descendants(self):
        """Get all nested children recursively"""
        descendants = []
        for child in self.children.all():
            descendants.append(child)
            descendants.extend(child.get_all_descendants())
        return descendants


class PageLink(models.Model):
    """Tracks [[page]] links between pages for backlinks"""
    source = models.ForeignKey(
        Page,
        on_delete=models.CASCADE,
        related_name='outgoing_links'
    )
    target = models.ForeignKey(
        Page,
        on_delete=models.CASCADE,
        related_name='incoming_links'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vault_page_links'
        unique_together = ['source', 'target']

    def __str__(self):
        return f"{self.source.title} -> {self.target.title}"


class Database(models.Model):
    """
    A Notion-style database attached to a page.
    Schema defines columns with types like: title, text, number, select, multi_select, date, checkbox, url
    """
    page = models.OneToOneField(
        Page,
        on_delete=models.CASCADE,
        related_name='database'
    )
    schema = models.JSONField(default=dict)
    # Schema format:
    # {
    #   "columns": [
    #     {"id": "title", "type": "title", "name": "Name"},
    #     {"id": "status", "type": "select", "name": "Status", "options": [
    #       {"id": "opt1", "value": "Todo", "color": "gray"},
    #       {"id": "opt2", "value": "In Progress", "color": "blue"},
    #       {"id": "opt3", "value": "Done", "color": "green"}
    #     ]},
    #     {"id": "priority", "type": "select", "name": "Priority", "options": [...]},
    #     {"id": "due_date", "type": "date", "name": "Due Date"},
    #     {"id": "tags", "type": "multi_select", "name": "Tags", "options": [...]},
    #   ]
    # }
    default_view = models.CharField(
        max_length=20,
        default='table',
        choices=[('table', 'Table'), ('kanban', 'Kanban'), ('calendar', 'Calendar')]
    )
    kanban_column_id = models.CharField(max_length=100, blank=True, default='')  # Column ID used for Kanban grouping
    calendar_date_column_id = models.CharField(max_length=100, blank=True, default='')  # Column ID for Calendar
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vault_databases'

    def __str__(self):
        return f"Database: {self.page.title}"

    def get_title_column(self):
        """Get the title column from schema"""
        for col in self.schema.get('columns', []):
            if col.get('type') == 'title':
                return col
        return None


class DatabaseRow(models.Model):
    """A row in a database"""
    database = models.ForeignKey(
        Database,
        on_delete=models.CASCADE,
        related_name='rows'
    )
    data = models.JSONField(default=dict)
    # Data format:
    # {
    #   "title": "Task name",
    #   "status": "opt2",  # References option ID
    #   "priority": "opt1",
    #   "due_date": "2024-01-15",
    #   "tags": ["opt1", "opt3"],  # Multiple option IDs for multi_select
    # }
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vault_database_rows'
        ordering = ['position', '-updated_at']

    def __str__(self):
        title_col = self.database.get_title_column()
        if title_col:
            return self.data.get(title_col['id'], 'Untitled')
        return f"Row {self.id}"
