from typing import List, Optional
from datetime import datetime
from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.http import HttpRequest
import chess

from .models import ChessGame, ChessInvitation, STARTING_FEN
from apps.users.models import User

router = Router()

# Authentication helper - not used with django_auth anymore
def require_auth(request: HttpRequest):
    """Check if user is authenticated"""
    if not request.user.is_authenticated:
        return False, {'error': 'Nicht angemeldet'}
    return True, None


# === Schemas ===

class UserSchema(Schema):
    id: int
    username: str
    first_name: str
    last_name: str


class ChessMoveSchema(Schema):
    from_square: str  # e.g., 'e2'
    to_square: str    # e.g., 'e4'
    san: str          # e.g., 'e4'
    fen: str          # Board state after move
    timestamp: Optional[str] = None


class ChessGameSchema(Schema):
    id: int
    white_player: Optional[UserSchema]
    black_player: Optional[UserSchema]
    is_ai_game: bool
    ai_difficulty: int
    player_color: str
    fen: str
    pgn: str
    moves: List[dict]
    status: str
    winner: Optional[UserSchema]
    current_turn: str
    time_control: Optional[int]
    white_time_remaining: Optional[int]
    black_time_remaining: Optional[int]
    created_at: datetime
    updated_at: datetime


class ChessGameCreateSchema(Schema):
    is_ai_game: bool = True
    ai_difficulty: int = 10
    player_color: str = 'white'  # Which color the player wants
    time_control: Optional[int] = None  # Minutes per player


class ChessMoveInputSchema(Schema):
    from_square: str
    to_square: str
    promotion: Optional[str] = None  # 'q', 'r', 'b', 'n' for pawn promotion


class ChessInvitationSchema(Schema):
    id: int
    from_user: UserSchema
    to_user: UserSchema
    game: ChessGameSchema
    status: str
    created_at: datetime


class ChessInviteCreateSchema(Schema):
    to_user_id: int
    player_color: str = 'white'  # Color for the inviter
    time_control: Optional[int] = None


class ChessStatsSchema(Schema):
    total_games: int
    wins: int
    losses: int
    draws: int
    ai_games: int
    multiplayer_games: int


class ErrorSchema(Schema):
    error: str


# === Game Endpoints ===

@router.get('/games', response=List[ChessGameSchema])
def list_games(request, status: Optional[str] = None, include_finished: bool = True):
    """List all games for the current user"""
    games = ChessGame.objects.filter(
        Q(white_player=request.user) | Q(black_player=request.user)
    )

    if status:
        games = games.filter(status=status)

    if not include_finished:
        games = games.exclude(status__in=['checkmate', 'stalemate', 'draw', 'resigned', 'timeout'])

    return games.select_related('white_player', 'black_player', 'winner')


@router.post('/games', response={201: ChessGameSchema, 400: ErrorSchema})
def create_game(request, data: ChessGameCreateSchema):
    """Create a new game (vs AI or waiting for opponent)"""
    game = ChessGame.objects.create(
        white_player=request.user if data.player_color == 'white' else None,
        black_player=request.user if data.player_color == 'black' else None,
        is_ai_game=data.is_ai_game,
        ai_difficulty=data.ai_difficulty,
        player_color=data.player_color,
        status='active' if data.is_ai_game else 'waiting',
        time_control=data.time_control,
        white_time_remaining=data.time_control * 60 if data.time_control else None,
        black_time_remaining=data.time_control * 60 if data.time_control else None,
    )

    # If player chose black, set white_player correctly
    if data.player_color == 'black':
        game.white_player = None
        game.black_player = request.user
        game.save()
    else:
        game.white_player = request.user
        game.black_player = None
        game.save()

    return 201, game


@router.get('/games/{game_id}', response={200: ChessGameSchema, 404: ErrorSchema})
def get_game(request, game_id: int):
    """Get a specific game"""
    game = get_object_or_404(
        ChessGame.objects.select_related('white_player', 'black_player', 'winner'),
        id=game_id
    )

    # Check if user is a participant
    if game.white_player != request.user and game.black_player != request.user:
        return 404, {'error': 'Spiel nicht gefunden'}

    return game


@router.post('/games/{game_id}/move', response={200: ChessGameSchema, 400: ErrorSchema, 403: ErrorSchema})
def make_move(request, game_id: int, data: ChessMoveInputSchema):
    """Make a move in a game"""
    game = get_object_or_404(ChessGame, id=game_id)

    # Check if user is a participant
    if game.white_player != request.user and game.black_player != request.user:
        return 403, {'error': 'Du bist kein Teilnehmer dieses Spiels'}

    # Validate game state
    if game.is_finished:
        return 400, {'error': 'Spiel ist bereits beendet'}

    # Validate it's user's turn
    current_player = game.white_player if game.current_turn == 'white' else game.black_player
    if not game.is_ai_game and current_player != request.user:
        return 400, {'error': 'Du bist nicht am Zug'}

    # Validate move using python-chess
    board = chess.Board(game.fen)

    try:
        # Try to find the move
        from_sq = chess.parse_square(data.from_square)
        to_sq = chess.parse_square(data.to_square)

        # Check for promotion
        promotion = None
        if data.promotion:
            promotion_map = {'q': chess.QUEEN, 'r': chess.ROOK, 'b': chess.BISHOP, 'n': chess.KNIGHT}
            promotion = promotion_map.get(data.promotion.lower())

        move = chess.Move(from_sq, to_sq, promotion=promotion)

        if move not in board.legal_moves:
            return 400, {'error': 'Ungültiger Zug'}

        # Get SAN before making the move
        san = board.san(move)

        # Make the move
        board.push(move)

        # Update game state
        game.fen = board.fen()

        # Add move to history
        move_record = {
            'from': data.from_square,
            'to': data.to_square,
            'san': san,
            'fen': game.fen,
            'timestamp': datetime.now().isoformat(),
        }
        game.moves = game.moves + [move_record]

        # Check game end conditions
        if board.is_checkmate():
            game.status = 'checkmate'
            game.winner = game.white_player if game.current_turn == 'black' else game.black_player
        elif board.is_stalemate():
            game.status = 'stalemate'
        elif board.is_insufficient_material() or board.is_fifty_moves() or board.is_repetition():
            game.status = 'draw'

        game.save()
        return game

    except ValueError as e:
        return 400, {'error': f'Ungültiger Zug: {str(e)}'}


@router.post('/games/{game_id}/resign', response={200: ChessGameSchema, 400: ErrorSchema, 403: ErrorSchema})
def resign_game(request, game_id: int):
    """Resign from a game"""
    game = get_object_or_404(ChessGame, id=game_id)

    # Check if user is a participant
    if game.white_player != request.user and game.black_player != request.user:
        return 403, {'error': 'Du bist kein Teilnehmer dieses Spiels'}

    if game.is_finished:
        return 400, {'error': 'Spiel ist bereits beendet'}

    # Determine winner (the opponent)
    if game.white_player == request.user:
        game.winner = game.black_player
    else:
        game.winner = game.white_player

    game.status = 'resigned'
    game.save()

    return game


# === Invitation Endpoints ===

@router.get('/invitations', response=List[ChessInvitationSchema])
def list_invitations(request):
    """List pending invitations for the current user"""
    invitations = ChessInvitation.objects.filter(
        Q(to_user=request.user) | Q(from_user=request.user),
        status='pending'
    ).select_related('from_user', 'to_user', 'game')

    return invitations


@router.post('/invitations', response={201: ChessInvitationSchema, 400: ErrorSchema})
def create_invitation(request, data: ChessInviteCreateSchema):
    """Invite a user to play chess"""
    to_user = get_object_or_404(User, id=data.to_user_id)

    if to_user == request.user:
        return 400, {'error': 'Du kannst dich nicht selbst einladen'}

    # Create the game
    if data.player_color == 'white':
        game = ChessGame.objects.create(
            white_player=request.user,
            black_player=to_user,
            is_ai_game=False,
            status='waiting',
            time_control=data.time_control,
            white_time_remaining=data.time_control * 60 if data.time_control else None,
            black_time_remaining=data.time_control * 60 if data.time_control else None,
        )
    else:
        game = ChessGame.objects.create(
            white_player=to_user,
            black_player=request.user,
            is_ai_game=False,
            status='waiting',
            time_control=data.time_control,
            white_time_remaining=data.time_control * 60 if data.time_control else None,
            black_time_remaining=data.time_control * 60 if data.time_control else None,
        )

    # Create invitation
    invitation = ChessInvitation.objects.create(
        from_user=request.user,
        to_user=to_user,
        game=game,
    )

    return 201, invitation


@router.post('/invitations/{invitation_id}/accept', response={200: ChessGameSchema, 400: ErrorSchema})
def accept_invitation(request, invitation_id: int):
    """Accept a game invitation"""
    invitation = get_object_or_404(ChessInvitation, id=invitation_id, to_user=request.user)

    if invitation.status != 'pending':
        return 400, {'error': 'Einladung bereits bearbeitet'}

    invitation.status = 'accepted'
    invitation.save()

    # Start the game
    game = invitation.game
    game.status = 'active'
    game.save()

    return game


@router.post('/invitations/{invitation_id}/decline', response={200: dict, 400: ErrorSchema})
def decline_invitation(request, invitation_id: int):
    """Decline a game invitation"""
    invitation = get_object_or_404(ChessInvitation, id=invitation_id, to_user=request.user)

    if invitation.status != 'pending':
        return 400, {'error': 'Einladung bereits bearbeitet'}

    invitation.status = 'declined'
    invitation.save()

    # Also delete the waiting game
    invitation.game.delete()

    return {'success': True}


# === Stats Endpoint ===

@router.get('/stats', response=ChessStatsSchema)
def get_stats(request):
    """Get chess statistics for the current user"""
    user_games = ChessGame.objects.filter(
        Q(white_player=request.user) | Q(black_player=request.user)
    )

    total = user_games.count()
    wins = user_games.filter(winner=request.user).count()
    losses = user_games.filter(
        status__in=['checkmate', 'resigned', 'timeout']
    ).exclude(winner=request.user).exclude(winner__isnull=True).count()
    draws = user_games.filter(status__in=['stalemate', 'draw']).count()
    ai_games = user_games.filter(is_ai_game=True).count()
    multiplayer_games = user_games.filter(is_ai_game=False).count()

    return {
        'total_games': total,
        'wins': wins,
        'losses': losses,
        'draws': draws,
        'ai_games': ai_games,
        'multiplayer_games': multiplayer_games,
    }


# === Users Endpoint (for invitations) ===

@router.get('/users', response=List[UserSchema])
def list_users(request, search: Optional[str] = None):
    """List users available for invitation"""
    users = User.objects.exclude(id=request.user.id)

    if search:
        users = users.filter(
            Q(username__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search)
        )

    return users[:20]
