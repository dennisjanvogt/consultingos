import json
from datetime import datetime
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
import chess

from .models import ChessGame


class ChessGameConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for real-time chess game updates"""

    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = f'chess_{self.game_id}'
        self.user = self.scope['user']

        # Verify user is part of this game
        game = await self.get_game()
        if not game:
            await self.close()
            return

        if not await self.is_player(game):
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send current game state
        await self.send_game_state(game)

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive_json(self, content):
        """Handle incoming WebSocket messages"""
        action = content.get('action')

        if action == 'move':
            await self.handle_move(content)
        elif action == 'resign':
            await self.handle_resign()
        elif action == 'draw_offer':
            await self.handle_draw_offer()
        elif action == 'draw_accept':
            await self.handle_draw_accept()
        elif action == 'draw_decline':
            await self.handle_draw_decline()

    async def handle_move(self, content):
        """Process a chess move"""
        from_square = content.get('from')
        to_square = content.get('to')
        promotion = content.get('promotion')

        game = await self.get_game()
        if not game or game.is_finished:
            await self.send_error('Spiel ist beendet oder nicht gefunden')
            return

        # Validate it's this player's turn
        current_turn = game.current_turn
        is_white = await self.is_white_player(game)

        if (current_turn == 'white' and not is_white) or (current_turn == 'black' and is_white):
            await self.send_error('Du bist nicht am Zug')
            return

        # Validate and make move
        result = await self.make_move(game, from_square, to_square, promotion)

        if result.get('error'):
            await self.send_error(result['error'])
            return

        # Broadcast updated game state to all players
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_update',
                'data': result['game_data']
            }
        )

    async def handle_resign(self):
        """Handle player resignation"""
        game = await self.get_game()
        if not game or game.is_finished:
            return

        result = await self.resign_game(game)

        # Broadcast to all players
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_update',
                'data': result
            }
        )

    async def handle_draw_offer(self):
        """Handle draw offer"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'draw_offered',
                'data': {
                    'from_user_id': self.user.id,
                    'from_username': self.user.username,
                }
            }
        )

    async def handle_draw_accept(self):
        """Accept draw offer"""
        game = await self.get_game()
        if game and not game.is_finished:
            await self.set_game_draw(game)

            game_data = await self.get_game_data(game)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'game_update',
                    'data': game_data
                }
            )

    async def handle_draw_decline(self):
        """Decline draw offer"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'draw_declined',
                'data': {}
            }
        )

    # === Event handlers ===

    async def game_update(self, event):
        """Send game update to WebSocket"""
        await self.send_json({
            'type': 'game_update',
            'data': event['data']
        })

    async def draw_offered(self, event):
        """Send draw offer to WebSocket"""
        await self.send_json({
            'type': 'draw_offered',
            'data': event['data']
        })

    async def draw_declined(self, event):
        """Send draw declined to WebSocket"""
        await self.send_json({
            'type': 'draw_declined',
            'data': event['data']
        })

    # === Helper methods ===

    async def send_game_state(self, game):
        """Send current game state"""
        game_data = await self.get_game_data(game)
        await self.send_json({
            'type': 'game_state',
            'data': game_data
        })

    async def send_error(self, message):
        """Send error message"""
        await self.send_json({
            'type': 'error',
            'message': message
        })

    # === Database operations ===

    @database_sync_to_async
    def get_game(self):
        try:
            return ChessGame.objects.select_related(
                'white_player', 'black_player', 'winner'
            ).get(id=self.game_id)
        except ChessGame.DoesNotExist:
            return None

    @database_sync_to_async
    def is_player(self, game):
        return game.white_player == self.user or game.black_player == self.user

    @database_sync_to_async
    def is_white_player(self, game):
        return game.white_player == self.user

    @database_sync_to_async
    def get_game_data(self, game):
        """Convert game to JSON-serializable dict"""
        return {
            'id': game.id,
            'white_player': {
                'id': game.white_player.id,
                'username': game.white_player.username,
            } if game.white_player else None,
            'black_player': {
                'id': game.black_player.id,
                'username': game.black_player.username,
            } if game.black_player else None,
            'is_ai_game': game.is_ai_game,
            'ai_difficulty': game.ai_difficulty,
            'fen': game.fen,
            'moves': game.moves,
            'status': game.status,
            'winner': {
                'id': game.winner.id,
                'username': game.winner.username,
            } if game.winner else None,
            'current_turn': game.current_turn,
        }

    @database_sync_to_async
    def make_move(self, game, from_square, to_square, promotion=None):
        """Make a move on the board"""
        board = chess.Board(game.fen)

        try:
            from_sq = chess.parse_square(from_square)
            to_sq = chess.parse_square(to_square)

            # Handle promotion
            promo = None
            if promotion:
                promo_map = {'q': chess.QUEEN, 'r': chess.ROOK, 'b': chess.BISHOP, 'n': chess.KNIGHT}
                promo = promo_map.get(promotion.lower())

            move = chess.Move(from_sq, to_sq, promotion=promo)

            if move not in board.legal_moves:
                return {'error': 'Ungültiger Zug'}

            san = board.san(move)
            board.push(move)

            # Update game
            game.fen = board.fen()
            game.moves = game.moves + [{
                'from': from_square,
                'to': to_square,
                'san': san,
                'fen': game.fen,
                'timestamp': datetime.now().isoformat(),
            }]

            # Check end conditions
            if board.is_checkmate():
                game.status = 'checkmate'
                game.winner = game.white_player if game.current_turn == 'black' else game.black_player
            elif board.is_stalemate():
                game.status = 'stalemate'
            elif board.is_insufficient_material() or board.is_fifty_moves() or board.is_repetition():
                game.status = 'draw'

            game.save()

            return {
                'game_data': {
                    'id': game.id,
                    'white_player': {
                        'id': game.white_player.id,
                        'username': game.white_player.username,
                    } if game.white_player else None,
                    'black_player': {
                        'id': game.black_player.id,
                        'username': game.black_player.username,
                    } if game.black_player else None,
                    'is_ai_game': game.is_ai_game,
                    'ai_difficulty': game.ai_difficulty,
                    'fen': game.fen,
                    'moves': game.moves,
                    'status': game.status,
                    'winner': {
                        'id': game.winner.id,
                        'username': game.winner.username,
                    } if game.winner else None,
                    'current_turn': game.current_turn,
                    'last_move': {
                        'from': from_square,
                        'to': to_square,
                        'san': san,
                    }
                }
            }

        except (ValueError, Exception) as e:
            return {'error': str(e)}

    @database_sync_to_async
    def resign_game(self, game):
        """Resign the game"""
        if game.white_player == self.user:
            game.winner = game.black_player
        else:
            game.winner = game.white_player

        game.status = 'resigned'
        game.save()

        return {
            'id': game.id,
            'status': game.status,
            'winner': {
                'id': game.winner.id,
                'username': game.winner.username,
            } if game.winner else None,
            'fen': game.fen,
            'moves': game.moves,
            'current_turn': game.current_turn,
        }

    @database_sync_to_async
    def set_game_draw(self, game):
        """Set game as draw"""
        game.status = 'draw'
        game.save()
