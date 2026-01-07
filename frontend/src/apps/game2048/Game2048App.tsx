import { useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, Undo2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { Board2048, BOARD_SIZE } from './components/Board2048'
import { use2048Logic, type Direction } from './hooks/use2048Logic'

export function Game2048App() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    tiles,
    score,
    bestScore,
    gameOver,
    won,
    canContinue,
    canUndo,
    move,
    initGame,
    continueGame,
    undo,
  } = use2048Logic()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle if input is focused
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    let direction: Direction | null = null

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        direction = 'up'
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        direction = 'down'
        break
      case 'ArrowLeft':
      case 'a':
      case 'A':
        direction = 'left'
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        direction = 'right'
        break
    }

    if (direction) {
      e.preventDefault()
      move(direction)
    }
  }, [move])

  // Touch handling for swipe
  const touchStartRef = useRef<{ x: number, y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    const minSwipe = 50

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipe) {
        move(dx > 0 ? 'right' : 'left')
      }
    } else {
      if (Math.abs(dy) > minSwipe) {
        move(dy > 0 ? 'down' : 'up')
      }
    }

    touchStartRef.current = null
  }, [move])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Focus container for keyboard events
    container.focus()

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="h-full flex flex-col items-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 outline-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header with score */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <h1 className="text-4xl font-bold text-amber-900 dark:text-amber-100">2048</h1>

        <div className="flex gap-2">
          <div className="bg-amber-800 dark:bg-amber-900 rounded-lg px-4 py-2 text-center min-w-[80px]">
            <div className="text-amber-300 text-xs uppercase tracking-wide">
              {t('games.score', 'Punkte')}
            </div>
            <div className="text-white text-xl font-bold">{score}</div>
          </div>
          <div className="bg-amber-800 dark:bg-amber-900 rounded-lg px-4 py-2 text-center min-w-[80px]">
            <div className="text-amber-300 text-xs uppercase tracking-wide">
              {t('games.best', 'Best')}
            </div>
            <div className="text-white text-xl font-bold">{bestScore}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-md flex gap-2 mb-4">
        <button
          onClick={initGame}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t('games.newGame', 'Neues Spiel')}
        </button>
        <button
          onClick={undo}
          disabled={!canUndo}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          <Undo2 className="w-4 h-4" />
          {t('games.undo', 'Zurück')}
        </button>
      </div>

      {/* Game board with overlay */}
      <div className="relative">
        <Board2048 tiles={tiles} />

        {/* Game Over overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-amber-900/80 rounded-lg flex flex-col items-center justify-center">
            <div className="text-white text-3xl font-bold mb-2">
              {t('games.gameOver', 'Game Over')}
            </div>
            <div className="text-amber-200 text-xl mb-4">
              {t('games.finalScore', 'Punkte')}: {score}
            </div>
            <button
              onClick={initGame}
              className="px-6 py-3 bg-white text-amber-900 rounded-lg font-bold hover:bg-amber-100 transition-colors"
            >
              {t('games.tryAgain', 'Nochmal')}
            </button>
          </div>
        )}

        {/* Win overlay */}
        {won && !canContinue && (
          <div className="absolute inset-0 bg-yellow-500/90 rounded-lg flex flex-col items-center justify-center">
            <div className="text-white text-3xl font-bold mb-2">
              {t('games.youWon', 'Du hast gewonnen!')}
            </div>
            <div className="text-yellow-100 text-xl mb-4">
              {t('games.reached2048', '2048 erreicht!')}
            </div>
            <div className="flex gap-2">
              <button
                onClick={continueGame}
                className="px-6 py-3 bg-white text-yellow-700 rounded-lg font-bold hover:bg-yellow-100 transition-colors"
              >
                {t('games.continue', 'Weiterspielen')}
              </button>
              <button
                onClick={initGame}
                className="px-6 py-3 bg-yellow-700 text-white rounded-lg font-bold hover:bg-yellow-800 transition-colors"
              >
                {t('games.newGame', 'Neues Spiel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="mt-6 text-center">
        <div className="text-amber-800/60 dark:text-amber-200/60 text-sm mb-2">
          {t('games.controls', 'Steuerung')}
        </div>
        <div className="flex items-center justify-center gap-1">
          <kbd className="px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded text-amber-900 dark:text-amber-100 text-xs">
            <ArrowUp className="w-3 h-3 inline" />
          </kbd>
          <kbd className="px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded text-amber-900 dark:text-amber-100 text-xs">
            <ArrowDown className="w-3 h-3 inline" />
          </kbd>
          <kbd className="px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded text-amber-900 dark:text-amber-100 text-xs">
            <ArrowLeft className="w-3 h-3 inline" />
          </kbd>
          <kbd className="px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded text-amber-900 dark:text-amber-100 text-xs">
            <ArrowRight className="w-3 h-3 inline" />
          </kbd>
          <span className="text-amber-600 dark:text-amber-400 text-xs mx-2">{t('common.or', 'oder')}</span>
          <kbd className="px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded text-amber-900 dark:text-amber-100 text-xs">W</kbd>
          <kbd className="px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded text-amber-900 dark:text-amber-100 text-xs">A</kbd>
          <kbd className="px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded text-amber-900 dark:text-amber-100 text-xs">S</kbd>
          <kbd className="px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded text-amber-900 dark:text-amber-100 text-xs">D</kbd>
        </div>
      </div>
    </div>
  )
}
