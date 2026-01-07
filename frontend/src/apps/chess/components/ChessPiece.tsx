import type { PieceSymbol, Color } from 'chess.js'

interface ChessPieceProps {
  piece: PieceSymbol
  color: Color
  isDragging?: boolean
}

// Unicode chess pieces - using filled characters for both colors
const FILLED_PIECES: Record<PieceSymbol, string> = {
  k: '\u265A', // Filled King
  q: '\u265B', // Filled Queen
  r: '\u265C', // Filled Rook
  b: '\u265D', // Filled Bishop
  n: '\u265E', // Filled Knight
  p: '\u265F', // Filled Pawn
}

const PIECE_UNICODE: Record<Color, Record<PieceSymbol, string>> = {
  w: FILLED_PIECES,
  b: FILLED_PIECES,
}

export function ChessPiece({ piece, color, isDragging }: ChessPieceProps) {
  // Gold pieces for white, Silver pieces for black
  const pieceStyle = color === 'w'
    ? {
        color: '#FFD700', // Gold
        textShadow: '-1px -1px 0 #8B6914, 1px -1px 0 #8B6914, -1px 1px 0 #8B6914, 1px 1px 0 #8B6914, 0 2px 6px rgba(0,0,0,0.4)',
      }
    : {
        color: '#C0C0C0', // Silver
        textShadow: '-1px -1px 0 #4a4a4a, 1px -1px 0 #4a4a4a, -1px 1px 0 #4a4a4a, 1px 1px 0 #4a4a4a, 0 2px 6px rgba(0,0,0,0.4)',
      }

  return (
    <div
      className={`text-5xl select-none transition-transform ${
        isDragging ? 'scale-110' : ''
      }`}
      style={{
        ...pieceStyle,
        filter: isDragging ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))' : undefined,
      }}
    >
      {PIECE_UNICODE[color][piece]}
    </div>
  )
}

// Export for other components
export { PIECE_UNICODE }
