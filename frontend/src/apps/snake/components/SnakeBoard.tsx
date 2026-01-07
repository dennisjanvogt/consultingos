import type { Point } from '../hooks/useSnakeLogic'

interface SnakeBoardProps {
  snake: Point[]
  food: Point
  gridSize: number
}

const CELL_SIZE = 20
const GAP = 1

export function SnakeBoard({ snake, food, gridSize }: SnakeBoardProps) {
  const boardSize = gridSize * CELL_SIZE + (gridSize + 1) * GAP

  return (
    <div
      className="relative bg-green-900 dark:bg-green-950 rounded-lg p-1"
      style={{ width: boardSize, height: boardSize }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-1 grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, ${CELL_SIZE}px)`,
          gap: GAP,
        }}
      >
        {Array(gridSize * gridSize).fill(null).map((_, i) => (
          <div
            key={i}
            className="bg-green-800/30 dark:bg-green-900/50 rounded-sm"
            style={{ width: CELL_SIZE, height: CELL_SIZE }}
          />
        ))}
      </div>

      {/* Food */}
      <div
        className="absolute bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"
        style={{
          width: CELL_SIZE - 4,
          height: CELL_SIZE - 4,
          left: GAP + food.x * (CELL_SIZE + GAP) + 2,
          top: GAP + food.y * (CELL_SIZE + GAP) + 2,
        }}
      />

      {/* Snake */}
      {snake.map((segment, index) => {
        const isHead = index === 0
        return (
          <div
            key={index}
            className={`absolute rounded-sm transition-all duration-75 ${
              isHead
                ? 'bg-green-400 dark:bg-green-300 shadow-lg shadow-green-400/50'
                : 'bg-green-500 dark:bg-green-400'
            }`}
            style={{
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
              left: GAP + segment.x * (CELL_SIZE + GAP) + 1,
              top: GAP + segment.y * (CELL_SIZE + GAP) + 1,
              opacity: isHead ? 1 : 0.9 - (index * 0.02),
            }}
          />
        )
      })}
    </div>
  )
}

export { CELL_SIZE }
