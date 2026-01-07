import { useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, Play } from 'lucide-react'
import { PinballCanvas } from './components/PinballCanvas'
import { usePinballPhysics } from './hooks/usePinballPhysics'

export function PinballApp() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    ball,
    leftFlipperAngle,
    rightFlipperAngle,
    bumpers,
    targets,
    walls,
    score,
    bestScore,
    ballsLeft,
    multiplier,
    isLaunching,
    launchPower,
    gameOver,
    isRunning,
    canvasWidth,
    canvasHeight,
    ballRadius,
    flipperLength,
    flipperWidth,
    flipperPivotY,
    leftFlipperX,
    rightFlipperX,
    initGame,
    startGame,
    launchBall,
    activateLeftFlipper,
    activateRightFlipper,
  } = usePinballPhysics()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (e.key) {
      case 'y':
      case 'Y':
        e.preventDefault()
        activateLeftFlipper(true)
        break
      case 'm':
      case 'M':
        e.preventDefault()
        activateRightFlipper(true)
        break
      case 'n':
      case 'N':
        e.preventDefault()
        if (!isRunning || gameOver) {
          startGame()
        } else if (isLaunching) {
          launchBall()
        }
        break
    }
  }, [activateLeftFlipper, activateRightFlipper, startGame, launchBall, isRunning, gameOver, isLaunching])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'y':
      case 'Y':
        activateLeftFlipper(false)
        break
      case 'm':
      case 'M':
        activateRightFlipper(false)
        break
    }
  }, [activateLeftFlipper, activateRightFlipper])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.focus()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="h-full flex items-center justify-center p-4 bg-gradient-to-br from-indigo-950 to-purple-950 outline-none"
    >
      <div className="flex gap-4">
        {/* Left panel */}
        <div className="flex flex-col gap-2 min-w-[100px]">
          <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-1">{t('games.score', 'Punkte')}</div>
            <div className="text-white text-2xl font-bold">{score.toLocaleString()}</div>
          </div>

          <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-1">{t('games.best', 'Best')}</div>
            <div className="text-white text-xl font-bold">{bestScore.toLocaleString()}</div>
          </div>

          <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-1">{t('games.balls', 'Bälle')}</div>
            <div className="flex gap-1">
              {Array(Math.max(0, ballsLeft)).fill(null).map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-gray-400" />
              ))}
              {Array(Math.max(0, 3 - ballsLeft)).fill(null).map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-gray-700" />
              ))}
            </div>
          </div>

          <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-1">Multiplier</div>
            <div className={`text-xl font-bold ${multiplier > 2 ? 'text-yellow-400' : 'text-white'}`}>
              x{multiplier.toFixed(1)}
            </div>
          </div>

          <button
            onClick={initGame}
            className="flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('games.newGame', 'Neues Spiel')}
          </button>
        </div>

        {/* Game canvas */}
        <div className="relative">
          <PinballCanvas
            ball={ball}
            leftFlipperAngle={leftFlipperAngle}
            rightFlipperAngle={rightFlipperAngle}
            bumpers={bumpers}
            targets={targets}
            walls={walls}
            launchPower={launchPower}
            isLaunching={isLaunching}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            ballRadius={ballRadius}
            flipperLength={flipperLength}
            flipperWidth={flipperWidth}
            flipperPivotY={flipperPivotY}
            leftFlipperX={leftFlipperX}
            rightFlipperX={rightFlipperX}
          />

          {/* Start overlay */}
          {!isRunning && !gameOver && (
            <div className="absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center">
              <div className="text-white text-4xl font-bold mb-4">Pinball</div>
              <button
                onClick={startGame}
                className="px-6 py-3 bg-pink-500 text-white rounded-lg font-bold hover:bg-pink-600 transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                {t('games.start', 'Start')}
              </button>
            </div>
          )}

          {/* Launch hint */}
          {isLaunching && (
            <div className="absolute bottom-20 right-4 text-white text-sm bg-black/60 px-3 py-2 rounded animate-pulse">
              {t('games.pressNLaunch', 'N zum Abschuss')}
            </div>
          )}

          {/* Game Over overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center">
              <div className="text-white text-4xl font-bold mb-2">
                {t('games.gameOver', 'Game Over')}
              </div>
              <div className="text-pink-300 text-2xl mb-4">
                {score.toLocaleString()} {t('games.points', 'Punkte')}
              </div>
              <button
                onClick={startGame}
                className="px-6 py-3 bg-pink-500 text-white rounded-lg font-bold hover:bg-pink-600 transition-colors"
              >
                {t('games.tryAgain', 'Nochmal')}
              </button>
            </div>
          )}
        </div>

        {/* Right panel - Controls */}
        <div className="flex flex-col gap-2 min-w-[120px]">
          <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-2">{t('games.controls', 'Steuerung')}</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-white text-xs">Y</kbd>
                <span className="text-gray-300">Left Flipper</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-white text-xs">M</kbd>
                <span className="text-gray-300">Right Flipper</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-white text-xs">N</kbd>
                <span className="text-gray-300">Launch</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
            <div className="text-gray-400 text-xs uppercase mb-2">{t('games.points', 'Punkte')}</div>
            <div className="space-y-1 text-xs text-gray-300">
              <div>Bumper: 100-150</div>
              <div>Targets: 50-200</div>
              <div>Multiplier stacks!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
