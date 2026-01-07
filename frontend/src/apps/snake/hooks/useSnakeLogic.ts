import { useState, useCallback, useEffect, useRef } from 'react'
import { saveSnakeHighscore, getSnakeBestScore } from '@/stores/snakeStore'

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Point {
  x: number
  y: number
}

export interface SnakeState {
  snake: Point[]
  food: Point
  direction: Direction
  score: number
  bestScore: number
  gameOver: boolean
  isPaused: boolean
  isRunning: boolean
}

const GRID_SIZE = 20
const INITIAL_SPEED = 150
const MIN_SPEED = 50
const SPEED_INCREASE = 5

function getRandomPosition(exclude: Point[]): Point {
  let pos: Point
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
  } while (exclude.some(p => p.x === pos.x && p.y === pos.y))
  return pos
}

function getInitialSnake(): Point[] {
  const centerX = Math.floor(GRID_SIZE / 2)
  const centerY = Math.floor(GRID_SIZE / 2)
  return [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY },
  ]
}

export function useSnakeLogic() {
  const [snake, setSnake] = useState<Point[]>(getInitialSnake)
  const [food, setFood] = useState<Point>(() => getRandomPosition(getInitialSnake()))
  const [direction, setDirection] = useState<Direction>('right')
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(getSnakeBestScore)
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(INITIAL_SPEED)

  const directionRef = useRef(direction)
  const nextDirectionRef = useRef<Direction | null>(null)

  useEffect(() => {
    directionRef.current = direction
  }, [direction])

  const initGame = useCallback(() => {
    const initialSnake = getInitialSnake()
    setSnake(initialSnake)
    setFood(getRandomPosition(initialSnake))
    setDirection('right')
    directionRef.current = 'right'
    nextDirectionRef.current = null
    setScore(0)
    setGameOver(false)
    setIsPaused(false)
    setIsRunning(false)
    setSpeed(INITIAL_SPEED)
    setBestScore(getSnakeBestScore())
  }, [])

  const startGame = useCallback(() => {
    if (gameOver) {
      initGame()
    }
    setIsRunning(true)
    setIsPaused(false)
  }, [gameOver, initGame])

  const togglePause = useCallback(() => {
    if (!isRunning || gameOver) return
    setIsPaused(p => !p)
  }, [isRunning, gameOver])

  const changeDirection = useCallback((newDir: Direction) => {
    const current = directionRef.current
    const opposite: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    }

    if (newDir !== opposite[current]) {
      nextDirectionRef.current = newDir
    }
  }, [])

  const moveSnake = useCallback(() => {
    if (gameOver || isPaused || !isRunning) return

    // Apply queued direction change
    if (nextDirectionRef.current) {
      setDirection(nextDirectionRef.current)
      directionRef.current = nextDirectionRef.current
      nextDirectionRef.current = null
    }

    setSnake(currentSnake => {
      const head = currentSnake[0]
      const dir = directionRef.current

      let newHead: Point
      switch (dir) {
        case 'up':
          newHead = { x: head.x, y: head.y - 1 }
          break
        case 'down':
          newHead = { x: head.x, y: head.y + 1 }
          break
        case 'left':
          newHead = { x: head.x - 1, y: head.y }
          break
        case 'right':
          newHead = { x: head.x + 1, y: head.y }
          break
      }

      // Check wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true)
        setIsRunning(false)
        saveSnakeHighscore(score, currentSnake.length)
        return currentSnake
      }

      // Check self collision
      if (currentSnake.some(p => p.x === newHead.x && p.y === newHead.y)) {
        setGameOver(true)
        setIsRunning(false)
        saveSnakeHighscore(score, currentSnake.length)
        return currentSnake
      }

      const newSnake = [newHead, ...currentSnake]

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        // Grow snake (don't remove tail)
        const newScore = score + 10
        setScore(newScore)
        if (newScore > bestScore) {
          setBestScore(newScore)
        }
        setFood(getRandomPosition(newSnake))
        // Increase speed
        setSpeed(s => Math.max(MIN_SPEED, s - SPEED_INCREASE))
        return newSnake
      }

      // Remove tail
      newSnake.pop()
      return newSnake
    })
  }, [gameOver, isPaused, isRunning, food, score, bestScore])

  // Game loop
  useEffect(() => {
    if (!isRunning || isPaused || gameOver) return

    const interval = setInterval(moveSnake, speed)
    return () => clearInterval(interval)
  }, [isRunning, isPaused, gameOver, speed, moveSnake])

  return {
    snake,
    food,
    direction,
    score,
    bestScore,
    gameOver,
    isPaused,
    isRunning,
    gridSize: GRID_SIZE,
    initGame,
    startGame,
    togglePause,
    changeDirection,
  }
}
