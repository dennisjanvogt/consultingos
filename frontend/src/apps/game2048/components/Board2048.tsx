import { Tile } from './Tile'
import type { TileData } from '../hooks/use2048Logic'

interface Board2048Props {
  tiles: TileData[]
}

const CELL_SIZE = 80
const GAP = 12
const BOARD_SIZE = CELL_SIZE * 4 + GAP * 5

export function Board2048({ tiles }: Board2048Props) {
  return (
    <div
      className="relative bg-amber-900/20 dark:bg-amber-900/40 rounded-lg p-3"
      style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
    >
      {/* Background grid cells */}
      <div className="absolute inset-3 grid grid-cols-4 gap-3">
        {Array(16).fill(null).map((_, i) => (
          <div
            key={i}
            className="bg-amber-100/50 dark:bg-amber-950/50 rounded-lg"
          />
        ))}
      </div>

      {/* Tiles container - same positioning as background grid */}
      <div className="absolute inset-3">
        {tiles.map(tile => (
          <Tile
            key={tile.id}
            tile={tile}
            cellSize={CELL_SIZE}
            gap={GAP}
          />
        ))}
      </div>
    </div>
  )
}

export { BOARD_SIZE }
