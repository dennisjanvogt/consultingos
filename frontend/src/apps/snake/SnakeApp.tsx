import { useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, Play, Pause, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { SnakeBoard } from './components/SnakeBoard'
import { useSnakeLogic, type Direction } from './hooks/useSnakeLogic'

export function SnakeApp() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    snake,
    food,
    score,
    bestScore,
    gameOver,
    isPaused,
    isRunning,
    gridSize,
    initGame,
    startGame,
    togglePause,
    changeDirection,
  } = useSnakeLogic()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    let dir: Direction | null = null

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        dir = 'up'
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        dir = 'down'
        break
      case 'ArrowLeft':
      case 'a':
      case 'A':
        dir = 'left'
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        dir = 'right'
        break
      case 'p':
      case 'P':
        togglePause()
        return
      case ' ':
        e.preventDefault()
        if (!isRunning || gameOver) {
          startGame()
        }
        return
    }

    if (dir) {
      e.preventDefault()
      changeDirection(dir)
    }
  }, [changeDirection, togglePause, startGame, isRunning, gameOver])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.focus()

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="h-full flex flex-col items-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 outline-none"
    >
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <h1 className="text-4xl font-bold text-green-800 dark:text-green-100">Snake</h1>

        <div className="flex gap-2">
          <div className="bg-green-800 dark:bg-green-900 rounded-lg px-4 py-2 text-center min-w-[80px]">
            <div className="text-green-300 text-xs uppercase tracking-wide">
              {t('games.score', 'Punkte')}
            </div>
            <div className="text-white text-xl font-bold">{score}</div>
          </div>
          <div className="bg-green-800 dark:bg-green-900 rounded-lg px-4 py-2 text-center min-w-[80px]">
            <div className="text-green-300 text-xs uppercase tracking-wide">
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
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t('games.newGame', 'Neues Spiel')}
        </button>
        {isRunning && !gameOver && (
          <button
            onClick={togglePause}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? t('games.resume', 'Fortsetzen') : t('games.pause', 'Pause')}
          </button>
        )}
      </div>

      {/* Game board with overlay */}
      <div className="relative">
        <SnakeBoard snake={snake} food={food} gridSize={gridSize} />

        {/* Start overlay */}
        {!isRunning && !gameOver && (
          <div className="absolute inset-0 bg-green-900/80 rounded-lg flex flex-col items-center justify-center">
            <div className="text-white text-2xl font-bold mb-4">
              Snake
            </div>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-white text-green-900 rounded-lg font-bold hover:bg-green-100 transition-colors flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              {t('games.start', 'Start')}
            </button>
            <div className="text-green-200 text-sm mt-4">
              {t('games.pressSpace', 'Drücke Space zum Starten')}
            </div>
          </div>
        )}

        {/* Pause overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-green-900/80 rounded-lg flex flex-col items-center justify-center">
            <div className="text-white text-3xl font-bold mb-4">
              {t('games.paused', 'Pausiert')}
            </div>
            <button
              onClick={togglePause}
              className="px-6 py-3 bg-white text-green-900 rounded-lg font-bold hover:bg-green-100 transition-colors flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              {t('games.resume', 'Fortsetzen')}
            </button>
          </div>
        )}

        {/* Game Over overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-red-900/80 rounded-lg flex flex-col items-center justify-center">
            <div className="text-white text-3xl font-bold mb-2">
              {t('games.gameOver', 'Game Over')}
            </div>
            <div className="text-red-200 text-xl mb-2">
              {t('games.finalScore', 'Punkte')}: {score}
            </div>
            <div className="text-red-200 text-sm mb-4">
              {t('games.snakeLength', 'Länge')}: {snake.length}
            </div>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-white text-red-900 rounded-lg font-bold hover:bg-red-100 transition-colors"
            >
              {t('games.tryAgain', 'Nochmal')}
            </button>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="mt-6 text-center">
        <div className="text-green-800/60 dark:text-green-200/60 text-sm mb-2">
          {t('games.controls', 'Steuerung')}
        </div>
        <div className="flex items-center justify-center gap-1">
          <kbd className="px-2 py-1 bg-green-200 dark:bg-green-800 rounded text-green-900 dark:text-green-100 text-xs">
            <ArrowUp className="w-3 h-3 inline" />
          </kbd>
          <kbd className="px-2 py-1 bg-green-200 dark:bg-green-800 rounded text-green-900 dark:text-green-100 text-xs">
            <ArrowDown className="w-3 h-3 inline" />
          </kbd>
          <kbd className="px-2 py-1 bg-green-200 dark:bg-green-800 rounded text-green-900 dark:text-green-100 text-xs">
            <ArrowLeft className="w-3 h-3 inline" />
          </kbd>
          <kbd className="px-2 py-1 bg-green-200 dark:bg-green-800 rounded text-green-900 dark:text-green-100 text-xs">
            <ArrowRight className="w-3 h-3 inline" />
          </kbd>
          <span className="text-green-600 dark:text-green-400 text-xs mx-2">|</span>
          <kbd className="px-2 py-1 bg-green-200 dark:bg-green-800 rounded text-green-900 dark:text-green-100 text-xs">P</kbd>
          <span className="text-green-600 dark:text-green-400 text-xs ml-1">{t('games.pause', 'Pause')}</span>
        </div>
      </div>
    </div>
  )
}
