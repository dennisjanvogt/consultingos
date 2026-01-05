from django.db import models
from django.conf import settings

# Starting FEN position
STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'


class ChessGame(models.Model):
    """A chess game between two players or against AI"""

    STATUS_CHOICES = [
        ('waiting', 'Warte auf Gegner'),
        ('active', 'Aktiv'),
        ('checkmate', 'Schachmatt'),
        ('stalemate', 'Patt'),
        ('draw', 'Remis'),
        ('resigned', 'Aufgegeben'),
        ('timeout', 'Zeit abgelaufen'),
    ]

    # Players
    white_player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chess_games_as_white'
    )
    black_player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chess_games_as_black'
    )

    # AI settings
    is_ai_game = models.BooleanField(default=False)
    ai_difficulty = models.IntegerField(default=10)  # Stockfish Skill Level 0-20
    player_color = models.CharField(max_length=5, default='white')  # Which color the human plays

    # Game state
    fen = models.CharField(max_length=100, default=STARTING_FEN)
    pgn = models.TextField(blank=True)  # Portable Game Notation
    moves = models.JSONField(default=list)  # [{from, to, san, fen, timestamp}, ...]

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chess_wins'
    )

    # Time control (optional)
    time_control = models.IntegerField(null=True, blank=True)  # Minutes per player
    white_time_remaining = models.IntegerField(null=True, blank=True)  # Seconds
    black_time_remaining = models.IntegerField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Schachspiel'
        verbose_name_plural = 'Schachspiele'

    def __str__(self):
        if self.is_ai_game:
            return f"Spiel #{self.id}: {self.white_player} vs KI"
        return f"Spiel #{self.id}: {self.white_player} vs {self.black_player or 'Wartend'}"

    @property
    def current_turn(self):
        """Returns 'white' or 'black' based on FEN"""
        parts = self.fen.split(' ')
        return 'white' if parts[1] == 'w' else 'black'

    @property
    def is_finished(self):
        return self.status in ['checkmate', 'stalemate', 'draw', 'resigned', 'timeout']


class ChessInvitation(models.Model):
    """Game invitation for multiplayer"""

    STATUS_CHOICES = [
        ('pending', 'Ausstehend'),
        ('accepted', 'Angenommen'),
        ('declined', 'Abgelehnt'),
    ]

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_chess_invites'
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_chess_invites'
    )
    game = models.OneToOneField(
        ChessGame,
        on_delete=models.CASCADE,
        related_name='invitation'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Schach-Einladung'
        verbose_name_plural = 'Schach-Einladungen'

    def __str__(self):
        return f"Einladung von {self.from_user} an {self.to_user}"
