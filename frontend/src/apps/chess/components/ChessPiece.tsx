import type { PieceSymbol, Color } from 'chess.js'

interface ChessPieceProps {
  piece: PieceSymbol
  color: Color
  isDragging?: boolean
}

// Unicode chess pieces
const PIECE_UNICODE: Record<Color, Record<PieceSymbol, string>> = {
  w: {
    k: '\u2654', // White King
    q: '\u2655', // White Queen
    r: '\u2656', // White Rook
    b: '\u2657', // White Bishop
    n: '\u2658', // White Knight
    p: '\u2659', // White Pawn
  },
  b: {
    k: '\u265A', // Black King
    q: '\u265B', // Black Queen
    r: '\u265C', // Black Rook
    b: '\u265D', // Black Bishop
    n: '\u265E', // Black Knight
    p: '\u265F', // Black Pawn
  },
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
