import { useState, useMemo } from 'react'
import type { StoneColor, BoardSize } from '../GoApp'
import { GoStone } from './GoStone'

interface GoBoardProps {
  size: BoardSize
  board: StoneColor[][]
  lastMove: [number, number] | null
  currentPlayer: 'black' | 'white'
  onMove: (row: number, col: number) => void
  disabled?: boolean
}

// Star points (hoshi) positions for each board size
const STAR_POINTS: Record<BoardSize, [number, number][]> = {
  9: [
    [2, 2], [2, 6], [4, 4], [6, 2], [6, 6]
  ],
  13: [
    [3, 3], [3, 9], [6, 6], [9, 3], [9, 9],
    [3, 6], [6, 3], [6, 9], [9, 6]
  ],
  19: [
    [3, 3], [3, 9], [3, 15],
    [9, 3], [9, 9], [9, 15],
    [15, 3], [15, 9], [15, 15]
  ]
}

export function GoBoard({ size, board, lastMove, currentPlayer, onMove, disabled }: GoBoardProps) {
  const [hoverPos, setHoverPos] = useState<[number, number] | null>(null)

  // Calculate cell size based on container
  const cellSize = Math.floor(500 / (size + 1))
  const padding = cellSize
  const boardPixels = cellSize * (size - 1) + padding * 2
  const stoneSize = cellSize * 0.9

  const handleClick = (row: number, col: number) => {
    if (disabled || board[row][col] !== null) return
    onMove(row, col)
  }

  const handleMouseEnter = (row: number, col: number) => {
    if (!disabled && board[row][col] === null) {
      setHoverPos([row, col])
    }
  }

  const handleMouseLeave = () => {
    setHoverPos(null)
  }

  return (
    <div
      className="relative mx-auto rounded-lg shadow-lg"
      style={{
        width: boardPixels,
        height: boardPixels,
        background: 'linear-gradient(135deg, #e0b874 0%, #d4a85c 50%, #c99b4a 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
      }}
    >
      {/* Wood grain texture overlay */}
      <div
        className="absolute inset-0 rounded-lg opacity-20 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.03) 3px,
            rgba(0,0,0,0.03) 6px
          )`,
        }}
      />

      {/* Grid lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={boardPixels}
        height={boardPixels}
      >
        {/* Vertical lines */}
        {Array.from({ length: size }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={padding + i * cellSize}
            y1={padding}
            x2={padding + i * cellSize}
            y2={padding + (size - 1) * cellSize}
            stroke="#5a4a2a"
            strokeWidth={i === 0 || i === size - 1 ? 2 : 1}
          />
        ))}

        {/* Horizontal lines */}
        {Array.from({ length: size }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={padding}
            y1={padding + i * cellSize}
            x2={padding + (size - 1) * cellSize}
            y2={padding + i * cellSize}
            stroke="#5a4a2a"
            strokeWidth={i === 0 || i === size - 1 ? 2 : 1}
          />
        ))}

        {/* Star points (hoshi) */}
        {STAR_POINTS[size].map(([row, col]) => (
          <circle
            key={`star-${row}-${col}`}
            cx={padding + col * cellSize}
            cy={padding + row * cellSize}
            r={cellSize * 0.12}
            fill="#5a4a2a"
          />
        ))}
      </svg>

      {/* Stones and click areas */}
      {board.map((row, rowIdx) =>
        row.map((cell, colIdx) => {
          const isLastMove = !!(lastMove && lastMove[0] === rowIdx && lastMove[1] === colIdx)
          const isHovered = hoverPos && hoverPos[0] === rowIdx && hoverPos[1] === colIdx

          return (
            <div
              key={`${rowIdx}-${colIdx}`}
              className="absolute flex items-center justify-center cursor-pointer"
              style={{
                left: padding + colIdx * cellSize - cellSize / 2,
                top: padding + rowIdx * cellSize - cellSize / 2,
                width: cellSize,
                height: cellSize,
              }}
              onClick={() => handleClick(rowIdx, colIdx)}
              onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
              onMouseLeave={handleMouseLeave}
            >
              {cell && (
                <GoStone
                  color={cell}
                  size={stoneSize}
                  isLastMove={isLastMove}
                />
              )}

              {/* Hover preview */}
              {!cell && isHovered && !disabled && (
                <GoStone
                  color={currentPlayer}
                  size={stoneSize}
                  isPreview
                />
              )}
            </div>
          )
        })
      )}

      {/* Coordinate labels (optional, for larger boards) */}
      {size >= 13 && (
        <>
          {/* Column labels (A-T, skipping I) */}
          {Array.from({ length: size }).map((_, i) => {
            const letter = String.fromCharCode(65 + i + (i >= 8 ? 1 : 0)) // Skip 'I'
            return (
              <div
                key={`col-${i}`}
                className="absolute text-xs font-medium text-amber-900/60 select-none pointer-events-none"
                style={{
                  left: padding + i * cellSize,
                  top: boardPixels - padding / 2,
                  transform: 'translateX(-50%)',
                }}
              >
                {letter}
              </div>
            )
          })}

          {/* Row labels (1-19) */}
          {Array.from({ length: size }).map((_, i) => (
            <div
              key={`row-${i}`}
              className="absolute text-xs font-medium text-amber-900/60 select-none pointer-events-none"
              style={{
                left: padding / 4,
                top: padding + i * cellSize,
                transform: 'translateY(-50%)',
              }}
            >
              {size - i}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
