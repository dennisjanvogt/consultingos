import { type ReactElement } from 'react'
import { Clock, Flag, Handshake } from 'lucide-react'
import type { ChessGame, ChessMove } from '@/api/types'

interface GameInfoProps {
  game: ChessGame
  playerColor: 'white' | 'black'
  onResign?: () => void
  onOfferDraw?: () => void
  isPlayerTurn: boolean
}

export function GameInfo({
  game,
  playerColor,
  onResign,
  onOfferDraw,
  isPlayerTurn,
}: GameInfoProps) {
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPlayerName = (color: 'white' | 'black'): string => {
    if (game.is_ai_game) {
      return color === playerColor ? 'Du' : `KI (Stufe ${game.ai_difficulty})`
    }
    const player = color === 'white' ? game.white_player : game.black_player
    return player?.username || 'Warte...'
  }

  const isGameActive = game.status === 'active' || game.status === 'waiting'

  return (
    <div className="flex flex-col h-full">
      {/* Opponent Info */}
      <div
        className={`p-3 border-b border-gray-200 dark:border-gray-700 ${
          !isPlayerTurn && isGameActive
            ? 'bg-amber-50 dark:bg-amber-900/20'
            : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                playerColor === 'white'
                  ? 'bg-gray-800 dark:bg-gray-900'
                  : 'bg-white border border-gray-300'
              }`}
            />
            <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
              {getPlayerName(playerColor === 'white' ? 'black' : 'white')}
            </span>
          </div>
          {game.time_control && (
            <div className="flex items-center gap-1 text-sm font-mono">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {formatTime(
                playerColor === 'white'
                  ? game.black_time_remaining
                  : game.white_time_remaining
              )}
            </div>
          )}
        </div>
      </div>

      {/* Move List */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
          Zuege ({game.moves.length})
        </div>
        {game.moves.length === 0 ? (
          <div className="text-sm text-gray-400 dark:text-gray-500 italic">
            Noch keine Zuege
          </div>
        ) : (
          <div className="space-y-1">
            {renderMoveList(game.moves)}
          </div>
        )}
      </div>

      {/* Player Info */}
      <div
        className={`p-3 border-t border-gray-200 dark:border-gray-700 ${
          isPlayerTurn && isGameActive
            ? 'bg-green-50 dark:bg-green-900/20'
            : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                playerColor === 'white'
                  ? 'bg-white border border-gray-300'
                  : 'bg-gray-800 dark:bg-gray-900'
              }`}
            />
            <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
              {getPlayerName(playerColor)} (Du)
            </span>
          </div>
          {game.time_control && (
            <div className="flex items-center gap-1 text-sm font-mono">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {formatTime(
                playerColor === 'white'
                  ? game.white_time_remaining
                  : game.black_time_remaining
              )}
            </div>
          )}
        </div>
      </div>

      {/* Game Actions */}
      {isGameActive && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={onOfferDraw}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Handshake className="w-3.5 h-3.5" />
            Remis
          </button>
          <button
            onClick={onResign}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
            Aufgeben
          </button>
        </div>
      )}
    </div>
  )
}

// Render move list in pairs (white move + black move)
function renderMoveList(moves: ChessMove[]): ReactElement[] {
  const rows: ReactElement[] = []

  for (let i = 0; i < moves.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1
    const whiteMove = moves[i]
    const blackMove = moves[i + 1]

    rows.push(
      <div key={moveNumber} className="flex items-center text-xs">
        <span className="w-6 text-gray-400 dark:text-gray-500">{moveNumber}.</span>
        <span className="w-14 font-mono text-gray-700 dark:text-gray-300">
          {whiteMove.san}
        </span>
        {blackMove && (
          <span className="w-14 font-mono text-gray-700 dark:text-gray-300">
            {blackMove.san}
          </span>
        )}
      </div>
    )
  }

  return rows
}
