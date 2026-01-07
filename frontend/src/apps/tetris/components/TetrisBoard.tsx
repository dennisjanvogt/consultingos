import type { CellColor, Piece } from '../hooks/useTetrisLogic'

interface TetrisBoardProps {
  board: CellColor[][]
  currentPiece: Piece | null
  ghostY: number
  boardWidth: number
  boardHeight: number
  tetrominoes: Record<string, { shape: number[][][], color: string }>
}

const CELL_SIZE = 24
const GAP = 1

const COLOR_MAP: Record<string, string> = {
  cyan: 'bg-cyan-400',
  yellow: 'bg-yellow-400',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
}

const COLOR_MAP_GHOST: Record<string, string> = {
  cyan: 'bg-cyan-400/30',
  yellow: 'bg-yellow-400/30',
  purple: 'bg-purple-500/30',
  green: 'bg-green-500/30',
  red: 'bg-red-500/30',
  blue: 'bg-blue-500/30',
  orange: 'bg-orange-500/30',
}

export function TetrisBoard({ board, currentPiece, ghostY, boardWidth, boardHeight, tetrominoes }: TetrisBoardProps) {
  const width = boardWidth * CELL_SIZE + (boardWidth + 1) * GAP
  const height = boardHeight * CELL_SIZE + (boardHeight + 1) * GAP

  // Create display board with current piece and ghost
  const displayBoard: (CellColor | 'ghost')[][] = board.map(row => [...row])

  // Add ghost piece
  if (currentPiece) {
    const shape = tetrominoes[currentPiece.type].shape[currentPiece.rotation]
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = ghostY + y
          const boardX = currentPiece.x + x
          if (boardY >= 0 && boardY < boardHeight && boardX >= 0 && boardX < boardWidth) {
            if (!displayBoard[boardY][boardX]) {
              displayBoard[boardY][boardX] = 'ghost'
            }
          }
        }
      }
    }
  }

  // Add current piece
  if (currentPiece) {
    const shape = tetrominoes[currentPiece.type].shape[currentPiece.rotation]
    const color = tetrominoes[currentPiece.type].color
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = currentPiece.y + y
          const boardX = currentPiece.x + x
          if (boardY >= 0 && boardY < boardHeight && boardX >= 0 && boardX < boardWidth) {
            displayBoard[boardY][boardX] = color
          }
        }
      }
    }
  }

  const ghostColor = currentPiece ? tetrominoes[currentPiece.type].color : ''

  return (
    <div
      className="relative bg-gray-800 dark:bg-gray-900 rounded-lg p-1 border-2 border-gray-700"
      style={{ width, height }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${boardWidth}, ${CELL_SIZE}px)`,
          gap: GAP,
        }}
      >
        {displayBoard.flat().map((cell, i) => (
          <div
            key={i}
            className={`rounded-sm ${
              cell === 'ghost'
                ? COLOR_MAP_GHOST[ghostColor]
                : cell
                  ? COLOR_MAP[cell] + ' shadow-sm'
                  : 'bg-gray-700/50 dark:bg-gray-800/50'
            }`}
            style={{ width: CELL_SIZE, height: CELL_SIZE }}
          />
        ))}
      </div>
    </div>
  )
}
