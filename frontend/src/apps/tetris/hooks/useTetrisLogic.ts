import { useState, useCallback, useEffect, useRef } from 'react'
import { saveTetrisHighscore, getTetrisBestScore } from '@/stores/tetrisStore'

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20

// Tetromino shapes (each rotation state)
const TETROMINOES = {
  I: {
    shape: [
      [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
      [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
      [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    ],
    color: 'cyan',
  },
  O: {
    shape: [
      [[1, 1], [1, 1]],
      [[1, 1], [1, 1]],
      [[1, 1], [1, 1]],
      [[1, 1], [1, 1]],
    ],
    color: 'yellow',
  },
  T: {
    shape: [
      [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
      [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
      [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
      [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
    ],
    color: 'purple',
  },
  S: {
    shape: [
      [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
      [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
      [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
      [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
    ],
    color: 'green',
  },
  Z: {
    shape: [
      [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
      [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
      [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
      [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
    ],
    color: 'red',
  },
  J: {
    shape: [
      [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
      [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
      [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
      [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
    ],
    color: 'blue',
  },
  L: {
    shape: [
      [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
      [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
      [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
      [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
    ],
    color: 'orange',
  },
}

type TetrominoType = keyof typeof TETROMINOES

export interface Piece {
  type: TetrominoType
  rotation: number
  x: number
  y: number
}

export type CellColor = string | null

function createEmptyBoard(): CellColor[][] {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
}

function getRandomPiece(): Piece {
  const types = Object.keys(TETROMINOES) as TetrominoType[]
  const type = types[Math.floor(Math.random() * types.length)]
  return {
    type,
    rotation: 0,
    x: Math.floor(BOARD_WIDTH / 2) - Math.floor(TETROMINOES[type].shape[0][0].length / 2),
    y: 0,
  }
}

function getShape(piece: Piece): number[][] {
  return TETROMINOES[piece.type].shape[piece.rotation]
}

function getColor(piece: Piece): string {
  return TETROMINOES[piece.type].color
}

function checkCollision(board: CellColor[][], piece: Piece, offsetX = 0, offsetY = 0, newRotation?: number): boolean {
  const shape = TETROMINOES[piece.type].shape[newRotation ?? piece.rotation]

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const newX = piece.x + x + offsetX
        const newY = piece.y + y + offsetY

        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return true
        }

        if (newY >= 0 && board[newY][newX]) {
          return true
        }
      }
    }
  }
  return false
}

function mergePieceToBoard(board: CellColor[][], piece: Piece): CellColor[][] {
  const newBoard = board.map(row => [...row])
  const shape = getShape(piece)
  const color = getColor(piece)

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] && piece.y + y >= 0) {
        newBoard[piece.y + y][piece.x + x] = color
      }
    }
  }

  return newBoard
}

function clearLines(board: CellColor[][]): { newBoard: CellColor[][], linesCleared: number } {
  const newBoard = board.filter(row => row.some(cell => cell === null))
  const linesCleared = BOARD_HEIGHT - newBoard.length

  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(null))
  }

  return { newBoard, linesCleared }
}

function getGhostPosition(board: CellColor[][], piece: Piece): number {
  let ghostY = piece.y
  while (!checkCollision(board, piece, 0, ghostY - piece.y + 1)) {
    ghostY++
  }
  return ghostY
}

export function useTetrisLogic() {
  const [board, setBoard] = useState<CellColor[][]>(createEmptyBoard)
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
  const [nextPiece, setNextPiece] = useState<Piece>(getRandomPiece)
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(getTetrisBestScore)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const getDropSpeed = useCallback(() => {
    return Math.max(100, 1000 - (level - 1) * 100)
  }, [level])

  const spawnPiece = useCallback(() => {
    const piece = nextPiece
    setNextPiece(getRandomPiece())
    setCanHold(true)

    if (checkCollision(board, piece)) {
      setGameOver(true)
      setIsRunning(false)
      saveTetrisHighscore(score, level, lines)
      return null
    }

    setCurrentPiece(piece)
    return piece
  }, [nextPiece, board, score, level, lines])

  const lockPiece = useCallback(() => {
    if (!currentPiece) return

    let newBoard = mergePieceToBoard(board, currentPiece)
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)

    setBoard(clearedBoard)

    if (linesCleared > 0) {
      const lineScores = [0, 100, 300, 500, 800]
      const points = lineScores[linesCleared] * level
      const newScore = score + points
      const newLines = lines + linesCleared

      setScore(newScore)
      setLines(newLines)

      if (newScore > bestScore) {
        setBestScore(newScore)
      }

      // Level up every 10 lines
      const newLevel = Math.floor(newLines / 10) + 1
      if (newLevel > level) {
        setLevel(newLevel)
      }
    }

    spawnPiece()
  }, [currentPiece, board, score, level, lines, bestScore, spawnPiece])

  const moveDown = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return

    if (!checkCollision(board, currentPiece, 0, 1)) {
      setCurrentPiece(p => p ? { ...p, y: p.y + 1 } : null)
    } else {
      lockPiece()
    }
  }, [currentPiece, board, gameOver, isPaused, lockPiece])

  const moveLeft = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    if (!checkCollision(board, currentPiece, -1, 0)) {
      setCurrentPiece(p => p ? { ...p, x: p.x - 1 } : null)
    }
  }, [currentPiece, board, gameOver, isPaused])

  const moveRight = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    if (!checkCollision(board, currentPiece, 1, 0)) {
      setCurrentPiece(p => p ? { ...p, x: p.x + 1 } : null)
    }
  }, [currentPiece, board, gameOver, isPaused])

  const rotate = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    const newRotation = (currentPiece.rotation + 1) % 4

    // Try normal rotation
    if (!checkCollision(board, currentPiece, 0, 0, newRotation)) {
      setCurrentPiece(p => p ? { ...p, rotation: newRotation } : null)
      return
    }

    // Wall kick attempts
    const kicks = [-1, 1, -2, 2]
    for (const kick of kicks) {
      if (!checkCollision(board, currentPiece, kick, 0, newRotation)) {
        setCurrentPiece(p => p ? { ...p, x: p.x + kick, rotation: newRotation } : null)
        return
      }
    }
  }, [currentPiece, board, gameOver, isPaused])

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return

    const ghostY = getGhostPosition(board, currentPiece)
    const dropDistance = ghostY - currentPiece.y
    setScore(s => s + dropDistance * 2)
    setCurrentPiece(p => p ? { ...p, y: ghostY } : null)

    // Lock immediately on next tick
    setTimeout(lockPiece, 0)
  }, [currentPiece, board, gameOver, isPaused, lockPiece])

  const hold = useCallback(() => {
    if (!currentPiece || !canHold || gameOver || isPaused) return

    setCanHold(false)

    if (holdPiece) {
      const newPiece: Piece = {
        type: holdPiece,
        rotation: 0,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(TETROMINOES[holdPiece].shape[0][0].length / 2),
        y: 0,
      }
      setHoldPiece(currentPiece.type)
      setCurrentPiece(newPiece)
    } else {
      setHoldPiece(currentPiece.type)
      spawnPiece()
    }
  }, [currentPiece, canHold, holdPiece, gameOver, isPaused, spawnPiece])

  const togglePause = useCallback(() => {
    if (!isRunning || gameOver) return
    setIsPaused(p => !p)
  }, [isRunning, gameOver])

  const initGame = useCallback(() => {
    setBoard(createEmptyBoard())
    setCurrentPiece(null)
    setNextPiece(getRandomPiece())
    setHoldPiece(null)
    setCanHold(true)
    setScore(0)
    setLines(0)
    setLevel(1)
    setGameOver(false)
    setIsPaused(false)
    setIsRunning(false)
    setBestScore(getTetrisBestScore())
  }, [])

  const startGame = useCallback(() => {
    if (gameOver) {
      initGame()
      setTimeout(() => {
        setIsRunning(true)
        setCurrentPiece(getRandomPiece())
      }, 0)
    } else {
      setIsRunning(true)
      if (!currentPiece) {
        spawnPiece()
      }
    }
    setIsPaused(false)
  }, [gameOver, initGame, currentPiece, spawnPiece])

  // Game loop
  useEffect(() => {
    if (!isRunning || isPaused || gameOver) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
      return
    }

    gameLoopRef.current = setInterval(moveDown, getDropSpeed())
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [isRunning, isPaused, gameOver, getDropSpeed, moveDown])

  // Calculate ghost position
  const ghostY = currentPiece ? getGhostPosition(board, currentPiece) : 0

  return {
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
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    tetrominoes: TETROMINOES,
    initGame,
    startGame,
    togglePause,
    moveLeft,
    moveRight,
    moveDown,
    rotate,
    hardDrop,
    hold,
  }
}
