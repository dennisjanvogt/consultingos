import { useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, Play, Pause, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { TetrisBoard } from './components/TetrisBoard'
import { useTetrisLogic } from './hooks/useTetrisLogic'

function MiniPiece({ type, tetrominoes }: { type: string | null, tetrominoes: Record<string, { shape: number[][][], color: string }> }) {
  if (!type) return <div className="w-16 h-16 bg-gray-700/30 rounded" />

  const shape = tetrominoes[type].shape[0]
  const color = tetrominoes[type].color

  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-400',
    yellow: 'bg-yellow-400',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
  }

  return (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${shape[0].length}, 12px)` }}>
      {shape.flat().map((cell, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-sm ${cell ? colorMap[color] : 'bg-transparent'}`}
        />
      ))}
    </div>
  )
}

export function TetrisApp() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    board,
    currentPiece,
    nextPiece,
    holdPiece,
    canHold,
    ghostY,
    score,
    bestScore,
    lines,
    level,
    gameOver,
    isPaused,
    isRunning,
    boardWidth,
    boardHeight,
    tetrominoes,
    initGame,
    startGame,
    togglePause,
    moveLeft,
    moveRight,
    moveDown,
    rotate,
    hardDrop,
    hold,
  } = useTetrisLogic()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault()
        rotate()
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault()
        moveDown()
        break
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault()
        moveLeft()
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault()
        moveRight()
        break
      case ' ':
        e.preventDefault()
        if (!isRunning || gameOver) {
          startGame()
        } else {
          hardDrop()
        }
        break
      case 'p':
      case 'P':
        togglePause()
        break
      case 'c':
      case 'C':
        hold()
        break
    }
  }, [rotate, moveDown, moveLeft, moveRight, hardDrop, hold, togglePause, startGame, isRunning, gameOver])

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
      className="h-full flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 outline-none"
    >
      <div className="flex gap-4">
        {/* Left panel - Hold */}
        <div className="flex flex-col gap-2">
          <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-3 border-2 border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-2 text-center">Hold</div>
            <div className={`flex justify-center ${!canHold ? 'opacity-50' : ''}`}>
              <MiniPiece type={holdPiece} tetrominoes={tetrominoes} />
            </div>
          </div>

          <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-3 border-2 border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-1">{t('games.level', 'Level')}</div>
            <div className="text-white text-2xl font-bold text-center">{level}</div>
          </div>

          <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-3 border-2 border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-1">{t('games.lines', 'Reihen')}</div>
            <div className="text-white text-2xl font-bold text-center">{lines}</div>
          </div>
        </div>

        {/* Center - Board */}
        <div className="relative">
          <TetrisBoard
            board={board}
            currentPiece={currentPiece}
            ghostY={ghostY}
            boardWidth={boardWidth}
            boardHeight={boardHeight}
            tetrominoes={tetrominoes}
          />

          {/* Start overlay */}
          {!isRunning && !gameOver && (
            <div className="absolute inset-0 bg-gray-900/90 rounded-lg flex flex-col items-center justify-center">
              <div className="text-white text-3xl font-bold mb-4">Tetris</div>
              <button
                onClick={startGame}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                {t('games.start', 'Start')}
              </button>
              <div className="text-gray-400 text-sm mt-4">
                {t('games.pressSpace', 'Drücke Space zum Starten')}
              </div>
            </div>
          )}

          {/* Pause overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-gray-900/90 rounded-lg flex flex-col items-center justify-center">
              <div className="text-white text-3xl font-bold mb-4">
                {t('games.paused', 'Pausiert')}
              </div>
              <button
                onClick={togglePause}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                {t('games.resume', 'Fortsetzen')}
              </button>
            </div>
          )}

          {/* Game Over overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-red-900/90 rounded-lg flex flex-col items-center justify-center">
              <div className="text-white text-3xl font-bold mb-2">
                {t('games.gameOver', 'Game Over')}
              </div>
              <div className="text-red-200 text-xl mb-1">
                {t('games.finalScore', 'Punkte')}: {score}
              </div>
              <div className="text-red-200 text-sm mb-4">
                Level {level} • {lines} {t('games.lines', 'Reihen')}
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

        {/* Right panel */}
        <div className="flex flex-col gap-2">
          <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-3 border-2 border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-2 text-center">Next</div>
            <div className="flex justify-center">
              <MiniPiece type={nextPiece.type} tetrominoes={tetrominoes} />
            </div>
          </div>

          <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-3 border-2 border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-1">{t('games.score', 'Punkte')}</div>
            <div className="text-white text-xl font-bold text-center">{score}</div>
          </div>

          <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-3 border-2 border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-1">{t('games.best', 'Best')}</div>
            <div className="text-white text-xl font-bold text-center">{bestScore}</div>
          </div>

          {/* Controls */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={initGame}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              title={t('games.newGame', 'Neues Spiel')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {isRunning && !gameOver && (
              <button
                onClick={togglePause}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                title={isPaused ? t('games.resume', 'Fortsetzen') : t('games.pause', 'Pause')}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Controls hint */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
            <div className="flex gap-1">
              <kbd className="px-1 bg-gray-700 rounded text-gray-300">
                <ArrowLeft className="w-3 h-3 inline" />
              </kbd>
              <kbd className="px-1 bg-gray-700 rounded text-gray-300">
                <ArrowRight className="w-3 h-3 inline" />
              </kbd>
              Move
            </div>
            <div className="flex gap-1">
              <kbd className="px-1 bg-gray-700 rounded text-gray-300">
                <ArrowUp className="w-3 h-3 inline" />
              </kbd>
              Rotate
            </div>
            <div className="flex gap-1">
              <kbd className="px-1 bg-gray-700 rounded text-gray-300">
                <ArrowDown className="w-3 h-3 inline" />
              </kbd>
              Soft Drop
            </div>
            <div className="flex gap-1">
              <kbd className="px-1 bg-gray-700 rounded text-gray-300">Space</kbd>
              Hard Drop
            </div>
            <div className="flex gap-1">
              <kbd className="px-1 bg-gray-700 rounded text-gray-300">C</kbd>
              Hold
            </div>
            <div className="flex gap-1">
              <kbd className="px-1 bg-gray-700 rounded text-gray-300">P</kbd>
              Pause
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
