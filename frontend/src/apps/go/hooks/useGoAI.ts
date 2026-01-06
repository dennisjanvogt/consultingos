import { useState, useCallback } from 'react'
import type { GoGameState, BoardSize, StoneColor } from '../GoApp'
import { isValidMove, getNeighbors, getGroup, getLiberties } from '../GoApp'

type AIMove = [number, number] | 'pass'

interface UseGoAIReturn {
  getAIMove: (state: GoGameState, size: BoardSize) => Promise<AIMove>
  isThinking: boolean
}

// Get all valid moves for current player
const getValidMoves = (state: GoGameState, size: BoardSize): [number, number][] => {
  const moves: [number, number][] = []
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isValidMove(state, row, col, size)) {
        moves.push([row, col])
      }
    }
  }
  return moves
}

// Check if a move would capture enemy stones
const wouldCapture = (state: GoGameState, row: number, col: number, size: BoardSize): number => {
  const opponent = state.currentPlayer === 'black' ? 'white' : 'black'
  let captureCount = 0

  // Simulate placing the stone
  const tempBoard = state.board.map(r => [...r])
  tempBoard[row][col] = state.currentPlayer

  for (const [nr, nc] of getNeighbors(row, col, size)) {
    if (tempBoard[nr][nc] === opponent) {
      const group = getGroup(tempBoard, nr, nc)
      if (getLiberties(tempBoard, group) === 0) {
        captureCount += group.size
      }
    }
  }

  return captureCount
}

// Check if our own group would be in danger after this move
const wouldBeInDanger = (state: GoGameState, row: number, col: number, size: BoardSize): boolean => {
  // Simulate placing the stone
  const tempBoard = state.board.map(r => [...r])
  tempBoard[row][col] = state.currentPlayer

  const group = getGroup(tempBoard, row, col)
  return getLiberties(tempBoard, group) <= 1
}

// Check if an existing group is in atari (1 liberty)
const findGroupsInAtari = (board: StoneColor[][], color: 'black' | 'white', size: BoardSize): Set<string>[] => {
  const visited = new Set<string>()
  const atarisGroups: Set<string>[] = []

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row][col] === color && !visited.has(`${row},${col}`)) {
        const group = getGroup(board, row, col)
        group.forEach(key => visited.add(key))
        if (getLiberties(board, group) === 1) {
          atarisGroups.push(group)
        }
      }
    }
  }

  return atarisGroups
}

// Find the liberty point of a group in atari
const findLiberty = (board: StoneColor[][], group: Set<string>, size: BoardSize): [number, number] | null => {
  for (const key of group) {
    const [row, col] = key.split(',').map(Number)
    for (const [nr, nc] of getNeighbors(row, col, size)) {
      if (board[nr][nc] === null) {
        return [nr, nc]
      }
    }
  }
  return null
}

// Score a move based on strategic value
const scoreMove = (state: GoGameState, row: number, col: number, size: BoardSize): number => {
  let score = 0

  // Captures are good
  score += wouldCapture(state, row, col, size) * 100

  // Avoid dangerous positions
  if (wouldBeInDanger(state, row, col, size)) {
    score -= 50
  }

  // Prefer moves near existing stones (connection)
  for (const [nr, nc] of getNeighbors(row, col, size)) {
    if (state.board[nr][nc] === state.currentPlayer) {
      score += 20
    }
  }

  // Prefer center and third-line moves early game
  const center = Math.floor(size / 2)
  const distFromCenter = Math.abs(row - center) + Math.abs(col - center)
  score += Math.max(0, size - distFromCenter)

  // Prefer corners and edges in opening
  if (state.moveCount < 10) {
    const thirdLine = size === 9 ? 2 : size === 13 ? 3 : 3
    const fourthLine = thirdLine + 1
    if ((row === thirdLine || row === size - 1 - thirdLine) &&
        (col === thirdLine || col === size - 1 - thirdLine)) {
      score += 30 // Star points
    }
    if ((row === thirdLine || row === size - 1 - thirdLine ||
         col === thirdLine || col === size - 1 - thirdLine)) {
      score += 15 // Third line
    }
  }

  // Add some randomness
  score += Math.random() * 10

  return score
}

export function useGoAI(): UseGoAIReturn {
  const [isThinking, setIsThinking] = useState(false)

  const getAIMove = useCallback(async (state: GoGameState, size: BoardSize): Promise<AIMove> => {
    setIsThinking(true)

    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500))

    try {
      const validMoves = getValidMoves(state, size)

      // No valid moves - pass
      if (validMoves.length === 0) {
        return 'pass'
      }

      const aiColor = state.currentPlayer
      const opponent = aiColor === 'black' ? 'white' : 'black'

      // Priority 1: Capture enemy stones
      for (const [row, col] of validMoves) {
        if (wouldCapture(state, row, col, size) > 0) {
          setIsThinking(false)
          return [row, col]
        }
      }

      // Priority 2: Save own groups in atari
      const ownAtariGroups = findGroupsInAtari(state.board, aiColor, size)
      for (const group of ownAtariGroups) {
        const liberty = findLiberty(state.board, group, size)
        if (liberty && isValidMove(state, liberty[0], liberty[1], size)) {
          // Check if saving move doesn't put us in worse position
          if (!wouldBeInDanger(state, liberty[0], liberty[1], size)) {
            setIsThinking(false)
            return liberty
          }
        }
      }

      // Priority 3: Put enemy groups in atari
      for (const [row, col] of validMoves) {
        const tempBoard = state.board.map(r => [...r])
        tempBoard[row][col] = aiColor

        for (const [nr, nc] of getNeighbors(row, col, size)) {
          if (tempBoard[nr][nc] === opponent) {
            const group = getGroup(tempBoard, nr, nc)
            if (getLiberties(tempBoard, group) === 1) {
              // This move puts enemy in atari
              if (!wouldBeInDanger(state, row, col, size)) {
                setIsThinking(false)
                return [row, col]
              }
            }
          }
        }
      }

      // Priority 4: Score-based selection
      let bestMove: [number, number] | null = null
      let bestScore = -Infinity

      for (const [row, col] of validMoves) {
        const score = scoreMove(state, row, col, size)
        if (score > bestScore) {
          bestScore = score
          bestMove = [row, col]
        }
      }

      if (bestMove) {
        setIsThinking(false)
        return bestMove
      }

      // Fallback: random valid move
      const randomIdx = Math.floor(Math.random() * validMoves.length)
      setIsThinking(false)
      return validMoves[randomIdx]

    } catch (error) {
      console.error('AI error:', error)
      setIsThinking(false)
      return 'pass'
    }
  }, [])

  return { getAIMove, isThinking }
}
