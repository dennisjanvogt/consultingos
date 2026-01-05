import { useState, useCallback, useMemo, useEffect, type ReactElement } from 'react'
import { Chess, type Square, type Move, type PieceSymbol } from 'chess.js'
import { ChessPiece } from './ChessPiece'

interface ChessBoardProps {
  fen: string
  playerColor: 'white' | 'black'
  onMove: (from: string, to: string, promotion?: string) => void
  disabled?: boolean
  lastMove?: { from: string; to: string } | null
}

// Square colors - Classic black/white with gold & lavender highlights
const LIGHT_SQUARE = 'bg-[#f0f0f0] dark:bg-[#e8e8e8]'
const DARK_SQUARE = 'bg-[#4a4a4a] dark:bg-[#3a3a3a]'
const SELECTED_SQUARE = 'bg-gradient-to-br from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600 shadow-lg shadow-amber-500/50'
const LAST_MOVE_SQUARE = 'bg-gradient-to-br from-purple-400/60 to-lavender-400/60 dark:from-purple-500/50 dark:to-lavender-500/50'
const CHECK_SQUARE = 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/50'

// Files and ranks
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

export function ChessBoard({
  fen,
  playerColor,
  onMove,
  disabled = false,
  lastMove,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null)
  const [showPromotion, setShowPromotion] = useState<{
    from: Square
    to: Square
  } | null>(null)

  // Create chess instance from FEN
  const game = useMemo(() => {
    const chess = new Chess()
    try {
      chess.load(fen)
    } catch (e) {
      console.error('Invalid FEN:', e)
    }
    return chess
  }, [fen])

  // Get legal moves for a square
  const getLegalMoves = useCallback(
    (square: Square): Move[] => {
      return game.moves({ square, verbose: true })
    },
    [game]
  )

  // Check if move is legal
  const isLegalMove = useCallback(
    (from: Square, to: Square): boolean => {
      const moves = getLegalMoves(from)
      return moves.some((m) => m.to === to)
    },
    [getLegalMoves]
  )

  // Check if move is a promotion
  const isPromotion = useCallback(
    (from: Square, to: Square): boolean => {
      const piece = game.get(from)
      if (!piece || piece.type !== 'p') return false
      const toRank = to[1]
      return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1')
    },
    [game]
  )

  // Get legal move squares for selected piece
  const legalMoveSquares = useMemo(() => {
    if (!selectedSquare) return new Set<string>()
    const moves = getLegalMoves(selectedSquare)
    return new Set(moves.map((m) => m.to))
  }, [selectedSquare, getLegalMoves])

  // Find king in check
  const kingInCheck = useMemo(() => {
    if (!game.isCheck()) return null
    const turn = game.turn()
    const board = game.board()
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f]
        if (piece && piece.type === 'k' && piece.color === turn) {
          return `${FILES[f]}${RANKS[r]}` as Square
        }
      }
    }
    return null
  }, [game])

  // Handle square click
  const handleSquareClick = useCallback(
    (square: Square) => {
      if (disabled) return

      const piece = game.get(square)
      const isOwnPiece = piece && piece.color === (playerColor === 'white' ? 'w' : 'b')
      const isPlayerTurn = game.turn() === (playerColor === 'white' ? 'w' : 'b')

      // If we have a selected piece and click a legal move square
      if (selectedSquare && legalMoveSquares.has(square)) {
        if (isPromotion(selectedSquare, square)) {
          setShowPromotion({ from: selectedSquare, to: square })
        } else {
          onMove(selectedSquare, square)
        }
        setSelectedSquare(null)
        return
      }

      // If clicking own piece and it's our turn
      if (isOwnPiece && isPlayerTurn) {
        setSelectedSquare(square)
        return
      }

      // Deselect
      setSelectedSquare(null)
    },
    [disabled, game, playerColor, selectedSquare, legalMoveSquares, isPromotion, onMove]
  )

  // Handle drag start
  const handleDragStart = useCallback(
    (square: Square) => {
      if (disabled) return
      const piece = game.get(square)
      const isOwnPiece = piece && piece.color === (playerColor === 'white' ? 'w' : 'b')
      const isPlayerTurn = game.turn() === (playerColor === 'white' ? 'w' : 'b')

      if (isOwnPiece && isPlayerTurn) {
        setDraggedSquare(square)
        setSelectedSquare(square)
      }
    },
    [disabled, game, playerColor]
  )

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedSquare(null)
  }, [])

  // Handle drop
  const handleDrop = useCallback(
    (toSquare: Square) => {
      if (draggedSquare && isLegalMove(draggedSquare, toSquare)) {
        if (isPromotion(draggedSquare, toSquare)) {
          setShowPromotion({ from: draggedSquare, to: toSquare })
        } else {
          onMove(draggedSquare, toSquare)
        }
      }
      setDraggedSquare(null)
      setSelectedSquare(null)
    },
    [draggedSquare, isLegalMove, isPromotion, onMove]
  )

  // Handle promotion selection
  const handlePromotion = useCallback(
    (piece: PieceSymbol) => {
      if (showPromotion) {
        onMove(showPromotion.from, showPromotion.to, piece)
        setShowPromotion(null)
      }
    },
    [showPromotion, onMove]
  )

  // Clear selection on FEN change
  useEffect(() => {
    setSelectedSquare(null)
    setDraggedSquare(null)
  }, [fen])

  // Render the board
  const renderBoard = () => {
    const board = game.board()
    const squares: ReactElement[] = []

    // Flip board for black player
    const ranks = playerColor === 'black' ? [...RANKS].reverse() : RANKS
    const files = playerColor === 'black' ? [...FILES].reverse() : FILES

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const file = files[f]
        const rank = ranks[r]
        const square = `${file}${rank}` as Square

        // Get piece at this square
        const boardRank = RANKS.indexOf(rank)
        const boardFile = FILES.indexOf(file)
        const piece = board[boardRank][boardFile]

        // Determine square color
        const isLightSquare = (boardFile + boardRank) % 2 === 0

        // Determine highlighting
        const isSelected = selectedSquare === square
        const isLegalMove = legalMoveSquares.has(square)
        const isLastMoveSquare =
          lastMove && (lastMove.from === square || lastMove.to === square)
        const isKingInCheck = kingInCheck === square

        let squareClass = isLightSquare ? LIGHT_SQUARE : DARK_SQUARE
        if (isKingInCheck) {
          squareClass = CHECK_SQUARE
        } else if (isSelected) {
          squareClass = SELECTED_SQUARE
        } else if (isLastMoveSquare) {
          squareClass = LAST_MOVE_SQUARE
        }

        squares.push(
          <div
            key={square}
            className={`relative flex items-center justify-center ${squareClass} transition-colors aspect-square`}
            onClick={() => handleSquareClick(square)}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(e) => {
              e.preventDefault()
              handleDrop(square)
            }}
          >
            {/* Legal move indicator - gold glow */}
            {isLegalMove && !piece && (
              <div className="absolute w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-md shadow-amber-500/50 animate-pulse" />
            )}
            {isLegalMove && piece && (
              <div className="absolute inset-1 border-4 border-amber-400 dark:border-amber-500 rounded-md shadow-inner shadow-amber-500/30" />
            )}

            {/* Piece */}
            {piece && (
              <div
                draggable={
                  !disabled &&
                  piece.color === (playerColor === 'white' ? 'w' : 'b') &&
                  game.turn() === (playerColor === 'white' ? 'w' : 'b')
                }
                onDragStart={() => handleDragStart(square)}
                onDragEnd={handleDragEnd}
                className={`cursor-pointer ${
                  draggedSquare === square ? 'opacity-30' : ''
                }`}
              >
                <ChessPiece
                  piece={piece.type}
                  color={piece.color}
                  isDragging={draggedSquare === square}
                />
              </div>
            )}

            {/* Coordinates */}
            {f === 0 && (
              <span className="absolute top-0.5 left-1 text-[10px] font-medium text-gray-600/70 dark:text-gray-400/70">
                {rank}
              </span>
            )}
            {r === 7 && (
              <span className="absolute bottom-0 right-1 text-[10px] font-medium text-gray-600/70 dark:text-gray-400/70">
                {file}
              </span>
            )}
          </div>
        )
      }
    }

    return squares
  }

  return (
    <div className="relative w-full max-w-[1000px] mx-auto">
      {/* Board */}
      <div className="relative w-full pb-[100%]">
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden shadow-lg border-2 border-[#8b6bbf]/30 dark:border-[#5c4087]/50">
          {renderBoard()}
        </div>
      </div>

      {/* Promotion Modal */}
      {showPromotion && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-xl">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
              Bauernumwandlung
            </div>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((piece) => (
                <button
                  key={piece}
                  onClick={() => handlePromotion(piece)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChessPiece
                    piece={piece}
                    color={playerColor === 'white' ? 'w' : 'b'}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
