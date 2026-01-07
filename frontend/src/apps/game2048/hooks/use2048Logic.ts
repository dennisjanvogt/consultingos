import { useState, useCallback, useEffect } from 'react'
import { saveHighscore, getBestScore } from '@/stores/game2048Store'

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface TileData {
  id: number
  value: number
  row: number
  col: number
  isNew: boolean
  isMerged: boolean
}

export interface GameState {
  tiles: TileData[]
  score: number
  bestScore: number
  gameOver: boolean
  won: boolean
  canContinue: boolean
}

let tileIdCounter = 0
const generateTileId = () => ++tileIdCounter

function createEmptyGrid(): number[][] {
  return Array(4).fill(null).map(() => Array(4).fill(0))
}

function gridToTiles(grid: number[][]): TileData[] {
  const tiles: TileData[] = []
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col] !== 0) {
        tiles.push({
          id: generateTileId(),
          value: grid[row][col],
          row,
          col,
          isNew: false,
          isMerged: false,
        })
      }
    }
  }
  return tiles
}

function tilesToGrid(tiles: TileData[]): number[][] {
  const grid = createEmptyGrid()
  tiles.forEach(tile => {
    grid[tile.row][tile.col] = tile.value
  })
  return grid
}

function getEmptyCells(grid: number[][]): [number, number][] {
  const empty: [number, number][] = []
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col] === 0) {
        empty.push([row, col])
      }
    }
  }
  return empty
}

function addRandomTile(tiles: TileData[]): TileData[] {
  const grid = tilesToGrid(tiles)
  const emptyCells = getEmptyCells(grid)

  if (emptyCells.length === 0) return tiles

  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  const value = Math.random() < 0.9 ? 2 : 4

  return [
    ...tiles.map(t => ({ ...t, isNew: false, isMerged: false })),
    {
      id: generateTileId(),
      value,
      row,
      col,
      isNew: true,
      isMerged: false,
    }
  ]
}

function slideLine(line: number[]): { newLine: number[], score: number, merged: boolean[] } {
  // Remove zeros
  const filtered = line.filter(x => x !== 0)
  const merged: boolean[] = Array(4).fill(false)
  let score = 0

  // Merge adjacent equal values
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2
      score += filtered[i]
      merged[i] = true
      filtered.splice(i + 1, 1)
    }
  }

  // Pad with zeros
  while (filtered.length < 4) {
    filtered.push(0)
  }

  return { newLine: filtered, score, merged }
}

function moveGrid(grid: number[][], direction: Direction): {
  newGrid: number[][],
  score: number,
  moved: boolean,
  mergedPositions: [number, number][]
} {
  let newGrid = createEmptyGrid()
  let totalScore = 0
  let moved = false
  const mergedPositions: [number, number][] = []

  for (let i = 0; i < 4; i++) {
    let line: number[]

    switch (direction) {
      case 'left':
        line = grid[i].slice()
        break
      case 'right':
        line = grid[i].slice().reverse()
        break
      case 'up':
        line = [grid[0][i], grid[1][i], grid[2][i], grid[3][i]]
        break
      case 'down':
        line = [grid[3][i], grid[2][i], grid[1][i], grid[0][i]]
        break
    }

    const { newLine, score, merged } = slideLine(line)
    totalScore += score

    // Check if line changed
    const originalLine = direction === 'right' || direction === 'down'
      ? line.slice().reverse()
      : line
    if (JSON.stringify(newLine) !== JSON.stringify(originalLine)) {
      moved = true
    }

    // Reverse back if needed
    const finalLine = direction === 'right' || direction === 'down'
      ? newLine.reverse()
      : newLine

    // Apply to new grid and track merges
    switch (direction) {
      case 'left':
      case 'right':
        for (let j = 0; j < 4; j++) {
          newGrid[i][j] = finalLine[j]
          if (merged[direction === 'right' ? 3 - j : j] && finalLine[j] !== 0) {
            mergedPositions.push([i, j])
          }
        }
        break
      case 'up':
      case 'down':
        for (let j = 0; j < 4; j++) {
          newGrid[j][i] = finalLine[j]
          if (merged[direction === 'down' ? 3 - j : j] && finalLine[j] !== 0) {
            mergedPositions.push([j, i])
          }
        }
        break
    }
  }

  return { newGrid, score: totalScore, moved, mergedPositions }
}

function canMove(grid: number[][]): boolean {
  // Check for empty cells
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col] === 0) return true
    }
  }

  // Check for adjacent equal values
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const value = grid[row][col]
      if (col < 3 && value === grid[row][col + 1]) return true
      if (row < 3 && value === grid[row + 1][col]) return true
    }
  }

  return false
}

function hasWon(grid: number[][]): boolean {
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col] >= 2048) return true
    }
  }
  return false
}

export function use2048Logic() {
  const [tiles, setTiles] = useState<TileData[]>([])
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(getBestScore)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [canContinue, setCanContinue] = useState(false)
  const [previousState, setPreviousState] = useState<{ tiles: TileData[], score: number } | null>(null)

  const initGame = useCallback(() => {
    tileIdCounter = 0
    let newTiles: TileData[] = []
    newTiles = addRandomTile(newTiles)
    newTiles = addRandomTile(newTiles)
    setTiles(newTiles)
    setScore(0)
    setGameOver(false)
    setWon(false)
    setCanContinue(false)
    setPreviousState(null)
    setBestScore(getBestScore())
  }, [])

  useEffect(() => {
    initGame()
  }, [initGame])

  const move = useCallback((direction: Direction) => {
    if (gameOver || (won && !canContinue)) return

    const grid = tilesToGrid(tiles)
    const { newGrid, score: moveScore, moved, mergedPositions } = moveGrid(grid, direction)

    if (!moved) return

    // Save state for undo
    setPreviousState({ tiles: [...tiles], score })

    // Create new tiles with merged flags
    let newTiles = gridToTiles(newGrid).map(tile => ({
      ...tile,
      isMerged: mergedPositions.some(([r, c]) => r === tile.row && c === tile.col)
    }))

    // Add random tile
    newTiles = addRandomTile(newTiles)

    const newScore = score + moveScore
    setTiles(newTiles)
    setScore(newScore)

    // Update best score
    if (newScore > bestScore) {
      setBestScore(newScore)
    }

    // Check win
    if (!won && hasWon(newGrid)) {
      setWon(true)
      saveHighscore(newScore, true)
      return
    }

    // Check game over
    const updatedGrid = tilesToGrid(newTiles)
    if (!canMove(updatedGrid)) {
      setGameOver(true)
      saveHighscore(newScore, false)
    }
  }, [tiles, score, bestScore, gameOver, won, canContinue])

  const continueGame = useCallback(() => {
    setCanContinue(true)
  }, [])

  const undo = useCallback(() => {
    if (previousState) {
      setTiles(previousState.tiles)
      setScore(previousState.score)
      setPreviousState(null)
      setGameOver(false)
    }
  }, [previousState])

  return {
    tiles,
    score,
    bestScore,
    gameOver,
    won,
    canContinue,
    canUndo: previousState !== null,
    move,
    initGame,
    continueGame,
    undo,
  }
}
