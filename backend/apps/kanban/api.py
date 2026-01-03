from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from django.db.models import Max, F
from typing import List, Optional
from datetime import date, datetime

from .models import KanbanCard

router = Router()


# Schemas
class KanbanCardSchema(Schema):
    id: int
    board: str
    column: str
    position: int
    title: str
    description: str
    priority: str
    color: str
    due_date: Optional[date]
    customer_id: Optional[int]
    created_at: datetime
    updated_at: datetime


class KanbanCardCreateSchema(Schema):
    board: str = 'work'
    column: str = 'backlog'
    title: str
    description: Optional[str] = ''
    priority: Optional[str] = 'medium'
    color: Optional[str] = 'gray'
    due_date: Optional[date] = None
    customer_id: Optional[int] = None


class KanbanCardUpdateSchema(Schema):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    color: Optional[str] = None
    due_date: Optional[date] = None
    customer_id: Optional[int] = None


class KanbanCardMoveSchema(Schema):
    board: str
    column: str
    position: int


class ErrorSchema(Schema):
    error: str


# Endpoints
@router.get('/', response=List[KanbanCardSchema])
def list_cards(request, board: Optional[str] = None):
    """List all kanban cards for the current user"""
    cards = KanbanCard.objects.filter(user=request.user)

    if board:
        cards = cards.filter(board=board)

    return cards


@router.post('/', response={201: KanbanCardSchema, 400: ErrorSchema})
def create_card(request, data: KanbanCardCreateSchema):
    """Create a new kanban card"""
    # Get the next position for this column
    max_position = KanbanCard.objects.filter(
        user=request.user,
        board=data.board,
        column=data.column
    ).aggregate(Max('position'))['position__max']

    position = (max_position or 0) + 1

    card = KanbanCard.objects.create(
        user=request.user,
        board=data.board,
        column=data.column,
        position=position,
        title=data.title,
        description=data.description or '',
        priority=data.priority or 'medium',
        color=data.color or 'gray',
        due_date=data.due_date,
        customer_id=data.customer_id
    )
    return 201, card


@router.get('/{card_id}', response={200: KanbanCardSchema, 404: ErrorSchema})
def get_card(request, card_id: int):
    """Get a single kanban card"""
    card = get_object_or_404(KanbanCard, id=card_id, user=request.user)
    return card


@router.put('/{card_id}', response={200: KanbanCardSchema, 404: ErrorSchema})
def update_card(request, card_id: int, data: KanbanCardUpdateSchema):
    """Update a kanban card"""
    card = get_object_or_404(KanbanCard, id=card_id, user=request.user)

    if data.title is not None:
        card.title = data.title
    if data.description is not None:
        card.description = data.description
    if data.priority is not None:
        card.priority = data.priority
    if data.color is not None:
        card.color = data.color
    if data.due_date is not None:
        card.due_date = data.due_date
    if data.customer_id is not None:
        card.customer_id = data.customer_id

    card.save()
    return card


@router.post('/{card_id}/move', response={200: KanbanCardSchema, 404: ErrorSchema})
def move_card(request, card_id: int, data: KanbanCardMoveSchema):
    """Move a card to a different board/column/position"""
    card = get_object_or_404(KanbanCard, id=card_id, user=request.user)

    old_board = card.board
    old_column = card.column
    old_position = card.position

    new_board = data.board
    new_column = data.column
    new_position = data.position

    # If moving within same board/column
    if old_board == new_board and old_column == new_column:
        # Shift cards between old and new position
        if new_position < old_position:
            # Moving up: shift cards down
            KanbanCard.objects.filter(
                user=request.user,
                board=new_board,
                column=new_column,
                position__gte=new_position,
                position__lt=old_position
            ).update(position=F('position') + 1)
        else:
            # Moving down: shift cards up
            KanbanCard.objects.filter(
                user=request.user,
                board=new_board,
                column=new_column,
                position__gt=old_position,
                position__lte=new_position
            ).update(position=F('position') - 1)
    else:
        # Moving to different board/column
        # Shift down cards in old column
        KanbanCard.objects.filter(
            user=request.user,
            board=old_board,
            column=old_column,
            position__gt=old_position
        ).update(position=F('position') - 1)

        # Shift up cards in new column
        KanbanCard.objects.filter(
            user=request.user,
            board=new_board,
            column=new_column,
            position__gte=new_position
        ).update(position=F('position') + 1)

    # Update the card
    card.board = new_board
    card.column = new_column
    card.position = new_position
    card.save()

    return card


@router.delete('/{card_id}', response={204: None, 404: ErrorSchema})
def delete_card(request, card_id: int):
    """Delete a kanban card"""
    card = get_object_or_404(KanbanCard, id=card_id, user=request.user)

    # Shift positions of remaining cards
    KanbanCard.objects.filter(
        user=request.user,
        board=card.board,
        column=card.column,
        position__gt=card.position
    ).update(position=F('position') - 1)

    card.delete()
    return 204, None
