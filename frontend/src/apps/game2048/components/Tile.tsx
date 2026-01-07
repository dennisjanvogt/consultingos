import type { TileData } from '../hooks/use2048Logic'

interface TileProps {
  tile: TileData
  cellSize: number
  gap: number
}

const TILE_COLORS: Record<number, { bg: string, text: string }> = {
  2: { bg: 'bg-amber-100', text: 'text-amber-900' },
  4: { bg: 'bg-amber-200', text: 'text-amber-900' },
  8: { bg: 'bg-orange-300', text: 'text-white' },
  16: { bg: 'bg-orange-400', text: 'text-white' },
  32: { bg: 'bg-orange-500', text: 'text-white' },
  64: { bg: 'bg-red-500', text: 'text-white' },
  128: { bg: 'bg-yellow-400', text: 'text-white' },
  256: { bg: 'bg-yellow-500', text: 'text-white' },
  512: { bg: 'bg-yellow-600', text: 'text-white' },
  1024: { bg: 'bg-yellow-700', text: 'text-white' },
  2048: { bg: 'bg-yellow-500', text: 'text-white' },
  4096: { bg: 'bg-purple-500', text: 'text-white' },
  8192: { bg: 'bg-purple-600', text: 'text-white' },
}

function getTileColors(value: number): { bg: string, text: string } {
  if (TILE_COLORS[value]) return TILE_COLORS[value]
  // For values > 8192
  return { bg: 'bg-purple-900', text: 'text-white' }
}

function getFontSize(value: number): string {
  if (value < 100) return 'text-4xl'
  if (value < 1000) return 'text-3xl'
  if (value < 10000) return 'text-2xl'
  return 'text-xl'
}

export function Tile({ tile, cellSize, gap }: TileProps) {
  const { bg, text } = getTileColors(tile.value)
  const fontSize = getFontSize(tile.value)

  const style = {
    width: cellSize,
    height: cellSize,
    transform: `translate(${tile.col * (cellSize + gap)}px, ${tile.row * (cellSize + gap)}px)`,
    transition: 'transform 100ms ease-in-out',
  }

  return (
    <div
      className={`absolute rounded-lg flex items-center justify-center font-bold ${bg} ${text} ${fontSize} ${
        tile.isNew ? 'animate-tile-appear' : ''
      } ${tile.isMerged ? 'animate-tile-pop' : ''}`}
      style={style}
    >
      {tile.value}
    </div>
  )
}
