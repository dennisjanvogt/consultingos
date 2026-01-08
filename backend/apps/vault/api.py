from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Max
from typing import List, Optional, Any
from datetime import datetime
import re

from .models import Page, PageLink, Tag, Database, DatabaseRow

router = Router()


# ============ Schemas ============

class TagSchema(Schema):
    id: int
    name: str
    color: str
    created_at: datetime


class TagCreateSchema(Schema):
    name: str
    color: Optional[str] = 'gray'


class BreadcrumbSchema(Schema):
    id: int
    title: str
    icon: str


class PageLinkSchema(Schema):
    id: int
    title: str
    icon: str


class PageSchema(Schema):
    id: int
    parent_id: Optional[int] = None
    title: str
    icon: str
    content: Any
    is_favorited: bool
    position: int
    created_at: datetime
    updated_at: datetime
    tags: List[TagSchema] = []
    breadcrumbs: List[BreadcrumbSchema] = []
    backlinks: List[PageLinkSchema] = []
    has_children: bool = False


class PageListSchema(Schema):
    id: int
    parent_id: Optional[int] = None
    title: str
    icon: str
    is_favorited: bool
    position: int
    updated_at: datetime
    has_children: bool = False


class PageCreateSchema(Schema):
    parent_id: Optional[int] = None
    title: Optional[str] = 'Untitled'
    icon: Optional[str] = ''
    content: Optional[Any] = None


class PageUpdateSchema(Schema):
    title: Optional[str] = None
    icon: Optional[str] = None
    content: Optional[Any] = None
    is_favorited: Optional[bool] = None
    position: Optional[int] = None
    tag_ids: Optional[List[int]] = None


class PageMoveSchema(Schema):
    parent_id: Optional[int] = None


class ErrorSchema(Schema):
    error: str


class SuccessSchema(Schema):
    success: bool


class GraphNodeSchema(Schema):
    id: int
    title: str
    icon: str
    link_count: int


class GraphEdgeSchema(Schema):
    source: int
    target: int


class GraphSchema(Schema):
    nodes: List[GraphNodeSchema]
    edges: List[GraphEdgeSchema]


# Database Schemas
class ColumnOptionSchema(Schema):
    id: str
    value: str
    color: str = 'gray'


class ColumnSchema(Schema):
    id: str
    type: str  # title, text, number, select, multi_select, date, checkbox, url
    name: str
    options: Optional[List[ColumnOptionSchema]] = None


class DatabaseSchemaSchema(Schema):
    columns: List[ColumnSchema]


class DatabaseRowSchema(Schema):
    id: int
    data: Any
    position: int
    created_at: datetime
    updated_at: datetime


class DatabaseSchema(Schema):
    id: int
    page_id: int
    schema: DatabaseSchemaSchema
    default_view: str
    kanban_column_id: str
    calendar_date_column_id: str
    rows: List[DatabaseRowSchema] = []
    created_at: datetime
    updated_at: datetime


class DatabaseCreateSchema(Schema):
    page_id: int
    schema: Optional[DatabaseSchemaSchema] = None
    default_view: Optional[str] = 'table'


class DatabaseUpdateSchema(Schema):
    schema: Optional[DatabaseSchemaSchema] = None
    default_view: Optional[str] = None
    kanban_column_id: Optional[str] = None
    calendar_date_column_id: Optional[str] = None


class DatabaseRowCreateSchema(Schema):
    data: Any = {}
    position: Optional[int] = None


class DatabaseRowUpdateSchema(Schema):
    data: Optional[Any] = None
    position: Optional[int] = None


# ============ Page Endpoints ============

@router.get('/pages/', response=List[PageListSchema])
def list_pages(request, parent_id: Optional[int] = None, search: Optional[str] = None, favorites_only: bool = False):
    """List pages - optionally filter by parent, search, or favorites"""
    pages = Page.objects.filter(user=request.user)

    if search:
        pages = pages.filter(
            Q(title__icontains=search) |
            Q(content__icontains=search)
        )
    elif parent_id is not None:
        pages = pages.filter(parent_id=parent_id)
    elif favorites_only:
        pages = pages.filter(is_favorited=True)
    else:
        # Default: only root pages
        pages = pages.filter(parent__isnull=True)

    # Annotate with children count
    pages = pages.annotate(children_count=Count('children'))

    result = []
    for page in pages:
        result.append({
            'id': page.id,
            'parent_id': page.parent_id,
            'title': page.title,
            'icon': page.icon,
            'is_favorited': page.is_favorited,
            'position': page.position,
            'updated_at': page.updated_at,
            'has_children': page.children_count > 0
        })
    return result


@router.get('/pages/{page_id}/', response={200: PageSchema, 404: ErrorSchema})
def get_page(request, page_id: int):
    """Get a single page with full details including backlinks"""
    page = get_object_or_404(Page, id=page_id, user=request.user)

    # Get backlinks (pages that link TO this page)
    backlinks = [
        {'id': link.source.id, 'title': link.source.title, 'icon': link.source.icon}
        for link in page.incoming_links.select_related('source').all()
    ]

    return {
        'id': page.id,
        'parent_id': page.parent_id,
        'title': page.title,
        'icon': page.icon,
        'content': page.content,
        'is_favorited': page.is_favorited,
        'position': page.position,
        'created_at': page.created_at,
        'updated_at': page.updated_at,
        'tags': list(page.tags.all()),
        'breadcrumbs': page.get_breadcrumbs(),
        'backlinks': backlinks,
        'has_children': page.children.exists()
    }


@router.post('/pages/', response={201: PageSchema, 400: ErrorSchema})
def create_page(request, data: PageCreateSchema):
    """Create a new page"""
    parent = None
    if data.parent_id:
        parent = get_object_or_404(Page, id=data.parent_id, user=request.user)

    page = Page.objects.create(
        user=request.user,
        parent=parent,
        title=data.title or 'Untitled',
        icon=data.icon or '',
        content=data.content or {}
    )

    return 201, {
        'id': page.id,
        'parent_id': page.parent_id,
        'title': page.title,
        'icon': page.icon,
        'content': page.content,
        'is_favorited': page.is_favorited,
        'position': page.position,
        'created_at': page.created_at,
        'updated_at': page.updated_at,
        'tags': [],
        'breadcrumbs': page.get_breadcrumbs(),
        'backlinks': [],
        'has_children': False
    }


@router.put('/pages/{page_id}/', response={200: PageSchema, 404: ErrorSchema})
def update_page(request, page_id: int, data: PageUpdateSchema):
    """Update a page"""
    page = get_object_or_404(Page, id=page_id, user=request.user)

    if data.title is not None:
        page.title = data.title
    if data.icon is not None:
        page.icon = data.icon
    if data.content is not None:
        page.content = data.content
        # Extract and update page links from content
        _update_page_links(page)
    if data.is_favorited is not None:
        page.is_favorited = data.is_favorited
    if data.position is not None:
        page.position = data.position

    page.save()

    # Update tags if provided
    if data.tag_ids is not None:
        tags = Tag.objects.filter(id__in=data.tag_ids, user=request.user)
        page.tags.set(tags)

    # Get backlinks
    backlinks = [
        {'id': link.source.id, 'title': link.source.title, 'icon': link.source.icon}
        for link in page.incoming_links.select_related('source').all()
    ]

    return {
        'id': page.id,
        'parent_id': page.parent_id,
        'title': page.title,
        'icon': page.icon,
        'content': page.content,
        'is_favorited': page.is_favorited,
        'position': page.position,
        'created_at': page.created_at,
        'updated_at': page.updated_at,
        'tags': list(page.tags.all()),
        'breadcrumbs': page.get_breadcrumbs(),
        'backlinks': backlinks,
        'has_children': page.children.exists()
    }


@router.delete('/pages/{page_id}/', response={200: SuccessSchema, 404: ErrorSchema})
def delete_page(request, page_id: int):
    """Delete a page and all its children"""
    page = get_object_or_404(Page, id=page_id, user=request.user)
    page.delete()
    return {'success': True}


@router.post('/pages/{page_id}/move/', response={200: PageSchema, 400: ErrorSchema, 404: ErrorSchema})
def move_page(request, page_id: int, data: PageMoveSchema):
    """Move a page to a new parent"""
    page = get_object_or_404(Page, id=page_id, user=request.user)

    if data.parent_id is not None:
        new_parent = get_object_or_404(Page, id=data.parent_id, user=request.user)
        # Prevent circular reference
        if new_parent.id == page.id or new_parent in page.get_all_descendants():
            return 400, {'error': 'Cannot move page into itself or its descendants'}
        page.parent = new_parent
    else:
        page.parent = None

    page.save()

    backlinks = [
        {'id': link.source.id, 'title': link.source.title, 'icon': link.source.icon}
        for link in page.incoming_links.select_related('source').all()
    ]

    return {
        'id': page.id,
        'parent_id': page.parent_id,
        'title': page.title,
        'icon': page.icon,
        'content': page.content,
        'is_favorited': page.is_favorited,
        'position': page.position,
        'created_at': page.created_at,
        'updated_at': page.updated_at,
        'tags': list(page.tags.all()),
        'breadcrumbs': page.get_breadcrumbs(),
        'backlinks': backlinks,
        'has_children': page.children.exists()
    }


@router.post('/pages/{page_id}/favorite/', response={200: PageSchema, 404: ErrorSchema})
def toggle_favorite(request, page_id: int):
    """Toggle favorite status"""
    page = get_object_or_404(Page, id=page_id, user=request.user)
    page.is_favorited = not page.is_favorited
    page.save()

    backlinks = [
        {'id': link.source.id, 'title': link.source.title, 'icon': link.source.icon}
        for link in page.incoming_links.select_related('source').all()
    ]

    return {
        'id': page.id,
        'parent_id': page.parent_id,
        'title': page.title,
        'icon': page.icon,
        'content': page.content,
        'is_favorited': page.is_favorited,
        'position': page.position,
        'created_at': page.created_at,
        'updated_at': page.updated_at,
        'tags': list(page.tags.all()),
        'breadcrumbs': page.get_breadcrumbs(),
        'backlinks': backlinks,
        'has_children': page.children.exists()
    }


# ============ Tag Endpoints ============

@router.get('/tags/', response=List[TagSchema])
def list_tags(request):
    """List all tags for current user"""
    return Tag.objects.filter(user=request.user)


@router.post('/tags/', response={201: TagSchema, 400: ErrorSchema})
def create_tag(request, data: TagCreateSchema):
    """Create a new tag"""
    if Tag.objects.filter(user=request.user, name=data.name).exists():
        return 400, {'error': 'Tag already exists'}

    tag = Tag.objects.create(
        user=request.user,
        name=data.name,
        color=data.color or 'gray'
    )
    return 201, tag


@router.delete('/tags/{tag_id}/', response={200: SuccessSchema, 404: ErrorSchema})
def delete_tag(request, tag_id: int):
    """Delete a tag"""
    tag = get_object_or_404(Tag, id=tag_id, user=request.user)
    tag.delete()
    return {'success': True}


# ============ Search Endpoint ============

@router.get('/search/', response=List[PageListSchema])
def search_pages(request, q: str):
    """Full-text search across all pages"""
    pages = Page.objects.filter(user=request.user).filter(
        Q(title__icontains=q) | Q(content__icontains=q)
    ).annotate(children_count=Count('children'))

    result = []
    for page in pages[:50]:  # Limit results
        result.append({
            'id': page.id,
            'parent_id': page.parent_id,
            'title': page.title,
            'icon': page.icon,
            'is_favorited': page.is_favorited,
            'position': page.position,
            'updated_at': page.updated_at,
            'has_children': page.children_count > 0
        })
    return result


# ============ Graph Endpoint ============

@router.get('/graph/', response=GraphSchema)
def get_graph(request):
    """Get all pages and links for graph visualization"""
    pages = Page.objects.filter(user=request.user).annotate(
        link_count=Count('outgoing_links') + Count('incoming_links')
    )

    nodes = [
        {
            'id': page.id,
            'title': page.title,
            'icon': page.icon,
            'link_count': page.link_count
        }
        for page in pages
    ]

    # Get all links between user's pages
    links = PageLink.objects.filter(source__user=request.user)
    edges = [
        {'source': link.source_id, 'target': link.target_id}
        for link in links
    ]

    return {'nodes': nodes, 'edges': edges}


# ============ Database Endpoints ============

@router.get('/databases/{page_id}/', response={200: DatabaseSchema, 404: ErrorSchema})
def get_database(request, page_id: int):
    """Get database for a page"""
    page = get_object_or_404(Page, id=page_id, user=request.user)

    try:
        db = page.database
    except Database.DoesNotExist:
        return 404, {'error': 'No database attached to this page'}

    return {
        'id': db.id,
        'page_id': db.page_id,
        'schema': db.schema,
        'default_view': db.default_view,
        'kanban_column_id': db.kanban_column_id,
        'calendar_date_column_id': db.calendar_date_column_id,
        'rows': list(db.rows.all()),
        'created_at': db.created_at,
        'updated_at': db.updated_at,
    }


@router.post('/databases/', response={201: DatabaseSchema, 400: ErrorSchema})
def create_database(request, data: DatabaseCreateSchema):
    """Create a database for a page"""
    page = get_object_or_404(Page, id=data.page_id, user=request.user)

    # Check if page already has a database
    if hasattr(page, 'database'):
        return 400, {'error': 'Page already has a database'}

    # Default schema with title column
    default_schema = data.schema or {
        'columns': [
            {'id': 'title', 'type': 'title', 'name': 'Name'},
            {'id': 'status', 'type': 'select', 'name': 'Status', 'options': [
                {'id': 'todo', 'value': 'Todo', 'color': 'gray'},
                {'id': 'in_progress', 'value': 'In Progress', 'color': 'blue'},
                {'id': 'done', 'value': 'Done', 'color': 'green'},
            ]},
        ]
    }

    db = Database.objects.create(
        page=page,
        schema=default_schema if isinstance(default_schema, dict) else default_schema.dict(),
        default_view=data.default_view or 'table',
        kanban_column_id='status',  # Default to status for kanban
    )

    return 201, {
        'id': db.id,
        'page_id': db.page_id,
        'schema': db.schema,
        'default_view': db.default_view,
        'kanban_column_id': db.kanban_column_id,
        'calendar_date_column_id': db.calendar_date_column_id,
        'rows': [],
        'created_at': db.created_at,
        'updated_at': db.updated_at,
    }


@router.put('/databases/{page_id}/', response={200: DatabaseSchema, 404: ErrorSchema})
def update_database(request, page_id: int, data: DatabaseUpdateSchema):
    """Update database schema or settings"""
    page = get_object_or_404(Page, id=page_id, user=request.user)

    try:
        db = page.database
    except Database.DoesNotExist:
        return 404, {'error': 'No database attached to this page'}

    if data.schema is not None:
        db.schema = data.schema.dict()
    if data.default_view is not None:
        db.default_view = data.default_view
    if data.kanban_column_id is not None:
        db.kanban_column_id = data.kanban_column_id
    if data.calendar_date_column_id is not None:
        db.calendar_date_column_id = data.calendar_date_column_id

    db.save()

    return {
        'id': db.id,
        'page_id': db.page_id,
        'schema': db.schema,
        'default_view': db.default_view,
        'kanban_column_id': db.kanban_column_id,
        'calendar_date_column_id': db.calendar_date_column_id,
        'rows': list(db.rows.all()),
        'created_at': db.created_at,
        'updated_at': db.updated_at,
    }


@router.delete('/databases/{page_id}/', response={200: SuccessSchema, 404: ErrorSchema})
def delete_database(request, page_id: int):
    """Delete a database (keeps the page)"""
    page = get_object_or_404(Page, id=page_id, user=request.user)

    try:
        db = page.database
    except Database.DoesNotExist:
        return 404, {'error': 'No database attached to this page'}

    db.delete()
    return {'success': True}


# ============ Database Row Endpoints ============

@router.post('/databases/{page_id}/rows/', response={201: DatabaseRowSchema, 404: ErrorSchema})
def create_row(request, page_id: int, data: DatabaseRowCreateSchema):
    """Create a new row in a database"""
    page = get_object_or_404(Page, id=page_id, user=request.user)

    try:
        db = page.database
    except Database.DoesNotExist:
        return 404, {'error': 'No database attached to this page'}

    # Get max position
    max_pos = db.rows.aggregate(Max('position'))['position__max'] or 0
    position = data.position if data.position is not None else max_pos + 1

    row = DatabaseRow.objects.create(
        database=db,
        data=data.data or {},
        position=position,
    )

    return 201, row


@router.put('/databases/{page_id}/rows/{row_id}/', response={200: DatabaseRowSchema, 404: ErrorSchema})
def update_row(request, page_id: int, row_id: int, data: DatabaseRowUpdateSchema):
    """Update a database row"""
    page = get_object_or_404(Page, id=page_id, user=request.user)

    try:
        db = page.database
    except Database.DoesNotExist:
        return 404, {'error': 'No database attached to this page'}

    row = get_object_or_404(DatabaseRow, id=row_id, database=db)

    if data.data is not None:
        row.data = data.data
    if data.position is not None:
        row.position = data.position

    row.save()
    return row


@router.delete('/databases/{page_id}/rows/{row_id}/', response={200: SuccessSchema, 404: ErrorSchema})
def delete_row(request, page_id: int, row_id: int):
    """Delete a database row"""
    page = get_object_or_404(Page, id=page_id, user=request.user)

    try:
        db = page.database
    except Database.DoesNotExist:
        return 404, {'error': 'No database attached to this page'}

    row = get_object_or_404(DatabaseRow, id=row_id, database=db)
    row.delete()
    return {'success': True}


# ============ Helper Functions ============

def _extract_page_links(content: dict) -> List[int]:
    """Extract page IDs from TipTap content JSON"""
    page_ids = []

    def walk(node):
        if isinstance(node, dict):
            # Check for pageLink type
            if node.get('type') == 'pageLink':
                attrs = node.get('attrs', {})
                page_id = attrs.get('pageId')
                if page_id:
                    page_ids.append(int(page_id))
            # Walk children
            for child in node.get('content', []):
                walk(child)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(content)
    return page_ids


def _update_page_links(page: Page):
    """Update PageLink records based on content"""
    # Extract linked page IDs from content
    linked_ids = _extract_page_links(page.content)

    # Get existing target pages that belong to same user
    target_pages = Page.objects.filter(id__in=linked_ids, user=page.user)

    # Delete old links
    page.outgoing_links.all().delete()

    # Create new links
    for target in target_pages:
        if target.id != page.id:  # Don't link to self
            PageLink.objects.get_or_create(source=page, target=target)
