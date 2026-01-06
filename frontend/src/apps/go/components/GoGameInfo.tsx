import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Hand, Flag, Plus } from 'lucide-react'
import type { GoGameState, BoardSize } from '../GoApp'
import { toGoNotation } from '../GoApp'

interface GoGameInfoProps {
  gameState: GoGameState
  playerColor: 'black' | 'white'
  boardSize: BoardSize
  onPass: () => void
  onResign: () => void
  onNewGame: () => void
  disabled?: boolean
}

export function GoGameInfo({ gameState, playerColor, boardSize, onPass, onResign, onNewGame, disabled }: GoGameInfoProps) {
  const { t } = useTranslation()
  const historyRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest move
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [gameState.moveHistory.length])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Player info */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('go.players')}
        </div>

        {/* Black player */}
        <div className={`flex items-center gap-2 p-2 rounded-lg mb-2 ${
          gameState.currentPlayer === 'black' && !gameState.gameOver
            ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-gray-400 dark:ring-gray-500'
            : 'bg-gray-50 dark:bg-gray-800'
        }`}>
          <div className="w-5 h-5 rounded-full bg-gray-900 dark:bg-black border border-gray-700" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {t('go.black')} {playerColor === 'black' && `(${t('go.you')})`}
            </div>
            <div className="text-xs text-gray-500">
              {t('go.captures')}: {gameState.captures.black}
            </div>
          </div>
        </div>

        {/* White player */}
        <div className={`flex items-center gap-2 p-2 rounded-lg ${
          gameState.currentPlayer === 'white' && !gameState.gameOver
            ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-gray-400 dark:ring-gray-500'
            : 'bg-gray-50 dark:bg-gray-800'
        }`}>
          <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-300" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {t('go.white')} {playerColor === 'white' && `(${t('go.you')})`}
            </div>
            <div className="text-xs text-gray-500">
              {t('go.captures')}: {gameState.captures.white} + 6.5 komi
            </div>
          </div>
        </div>
      </div>

      {/* Pass warning - opponent passed */}
      {!gameState.gameOver && gameState.passes === 1 && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {t('go.opponentPassed')}
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-300 mt-1">
              {t('go.passWarning')}
            </div>
          </div>
        </div>
      )}

      {/* Game result */}
      {gameState.gameOver && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {t('go.gameOver')}
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-300 mt-1">
              {gameState.winner === 'draw'
                ? t('go.draw')
                : gameState.winner === playerColor
                  ? t('go.youWin')
                  : t('go.youLose')}
            </div>
            {/* Score display */}
            <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-600 dark:text-gray-400">
                  {t('go.black')}: {gameState.captures.black}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {t('go.white')}: {(gameState.captures.white + 6.5).toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move History */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-gray-200 dark:border-gray-700">
        <div className="p-3 pb-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('go.moveHistory')} ({gameState.moveHistory.length})
          </div>
        </div>
        <div
          ref={historyRef}
          className="flex-1 overflow-y-auto px-3 pb-3"
        >
          {gameState.moveHistory.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-4">
              {t('go.noMoves')}
            </div>
          ) : (
            <div className="space-y-1">
              {gameState.moveHistory.map((move, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-xs p-1.5 rounded ${
                    idx === gameState.moveHistory.length - 1
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : ''
                  }`}
                >
                  <span className="w-6 text-gray-400">{idx + 1}.</span>
                  <div className={`w-3 h-3 rounded-full ${
                    move.player === 'black'
                      ? 'bg-gray-900 dark:bg-black border border-gray-700'
                      : 'bg-white border border-gray-300'
                  }`} />
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {move.isPass ? t('go.pass') : toGoNotation(move.row, move.col, boardSize)}
                  </span>
                  {move.captured > 0 && (
                    <span className="text-red-500 dark:text-red-400">
                      +{move.captured}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-3 space-y-2">
        {!gameState.gameOver && (
          <>
            <button
              onClick={onPass}
              disabled={disabled}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                gameState.passes === 1
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Hand className="w-4 h-4" />
              {gameState.passes === 1 ? t('go.passEndGame') : t('go.pass')}
            </button>

            <button
              onClick={onResign}
              disabled={disabled}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Flag className="w-4 h-4" />
              {t('go.resign')}
            </button>
          </>
        )}

        <button
          onClick={onNewGame}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('go.newGame')}
        </button>
      </div>
    </div>
  )
}
