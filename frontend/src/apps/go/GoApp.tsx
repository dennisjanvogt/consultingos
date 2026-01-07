import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ArrowLeft, Save, Trash2, Trophy, Bot, Loader2, ChevronRight, Cpu } from 'lucide-react'
import { GoBoard } from './components/GoBoard'
import { GoGameInfo } from './components/GoGameInfo'
import { useGoAI } from './hooks/useGoAI'
import { useGoStore } from '@/stores/goStore'

export type StoneColor = 'black' | 'white' | null
export type BoardSize = 9 | 13 | 19

// Move record for history
export interface MoveRecord {
  player: 'black' | 'white'
  row: number
  col: number
  captured: number
  isPass?: boolean
}

export interface GoGameState {
  board: StoneColor[][]
  currentPlayer: 'black' | 'white'
  captures: { black: number; white: number }
  history: string[] // Board states for Ko rule
  moveHistory: MoveRecord[] // Human-readable move history
  passes: number // 2 consecutive passes = game over
  gameOver: boolean
  winner: 'black' | 'white' | 'draw' | null
  lastMove: [number, number] | null
  moveCount: number
}

// Saved game format
interface SavedGame {
  id: string
  name: string
  date: string
  boardSize: BoardSize
  playerColor: 'black' | 'white'
  gameState: GoGameState
  aiDifficulty: number
  status: 'active' | 'finished'
}

// Stats
interface GoStats {
  played: number
  wins: number
  losses: number
}

type ViewMode = 'list' | 'game'
type GameFilter = 'active' | 'finished' | 'all'

const STORAGE_KEY = 'go-saved-games'
const STATS_KEY = 'go-stats'

// Convert row/col to Go notation (A1, B2, etc. - skipping I)
export const toGoNotation = (row: number, col: number, size: BoardSize): string => {
  const colLetter = String.fromCharCode(65 + col + (col >= 8 ? 1 : 0)) // Skip 'I'
  const rowNumber = size - row
  return `${colLetter}${rowNumber}`
}

// Create empty board
const createEmptyBoard = (size: BoardSize): StoneColor[][] => {
  return Array(size).fill(null).map(() => Array(size).fill(null))
}

// Serialize board for Ko detection
const serializeBoard = (board: StoneColor[][]): string => {
  return board.map(row => row.map(cell => cell === 'black' ? 'B' : cell === 'white' ? 'W' : '.').join('')).join('')
}

// Get neighbors of a position
const getNeighbors = (row: number, col: number, size: number): [number, number][] => {
  const neighbors: [number, number][] = []
  if (row > 0) neighbors.push([row - 1, col])
  if (row < size - 1) neighbors.push([row + 1, col])
  if (col > 0) neighbors.push([row, col - 1])
  if (col < size - 1) neighbors.push([row, col + 1])
  return neighbors
}

// Get group of connected stones starting from a position
const getGroup = (board: StoneColor[][], row: number, col: number): Set<string> => {
  const color = board[row][col]
  if (!color) return new Set()

  const group = new Set<string>()
  const stack: [number, number][] = [[row, col]]
  const size = board.length

  while (stack.length > 0) {
    const [r, c] = stack.pop()!
    const key = `${r},${c}`
    if (group.has(key)) continue
    if (board[r][c] !== color) continue

    group.add(key)
    for (const [nr, nc] of getNeighbors(r, c, size)) {
      if (!group.has(`${nr},${nc}`) && board[nr][nc] === color) {
        stack.push([nr, nc])
      }
    }
  }

  return group
}

// Count liberties (empty adjacent points) for a group
const getLiberties = (board: StoneColor[][], group: Set<string>): number => {
  const liberties = new Set<string>()
  const size = board.length

  for (const key of group) {
    const [row, col] = key.split(',').map(Number)
    for (const [nr, nc] of getNeighbors(row, col, size)) {
      if (board[nr][nc] === null) {
        liberties.add(`${nr},${nc}`)
      }
    }
  }

  return liberties.size
}

// Remove captured stones from the board
const captureGroup = (board: StoneColor[][], group: Set<string>): StoneColor[][] => {
  const newBoard = board.map(row => [...row])
  for (const key of group) {
    const [row, col] = key.split(',').map(Number)
    newBoard[row][col] = null
  }
  return newBoard
}

// Check if a move is valid
const isValidMove = (state: GoGameState, row: number, col: number, size: BoardSize): boolean => {
  // Must be empty
  if (state.board[row][col] !== null) return false

  // Simulate the move
  const newBoard = state.board.map(r => [...r])
  newBoard[row][col] = state.currentPlayer

  // Check for captures first
  const opponent = state.currentPlayer === 'black' ? 'white' : 'black'
  let capturedAny = false

  for (const [nr, nc] of getNeighbors(row, col, size)) {
    if (newBoard[nr][nc] === opponent) {
      const group = getGroup(newBoard, nr, nc)
      if (getLiberties(newBoard, group) === 0) {
        capturedAny = true
      }
    }
  }

  // Check if our own group has liberties after the move
  const ourGroup = getGroup(newBoard, row, col)
  if (getLiberties(newBoard, ourGroup) === 0 && !capturedAny) {
    // Suicide move - check if we capture anything
    let wouldCapture = false
    for (const [nr, nc] of getNeighbors(row, col, size)) {
      if (state.board[nr][nc] === opponent) {
        const tempBoard = state.board.map(r => [...r])
        tempBoard[row][col] = state.currentPlayer
        const oppGroup = getGroup(tempBoard, nr, nc)
        if (getLiberties(tempBoard, oppGroup) === 0) {
          wouldCapture = true
          break
        }
      }
    }
    if (!wouldCapture) return false
  }

  // Ko rule - can't recreate previous board state
  const newBoardSerialized = serializeBoard(newBoard)
  if (state.history.includes(newBoardSerialized)) {
    return false
  }

  return true
}

// Make a move and return new state
const makeMove = (state: GoGameState, row: number, col: number, size: BoardSize): GoGameState | null => {
  if (!isValidMove(state, row, col, size)) return null

  let newBoard = state.board.map(r => [...r])
  newBoard[row][col] = state.currentPlayer

  const opponent = state.currentPlayer === 'black' ? 'white' : 'black'
  let capturedCount = 0

  // Check for captures
  for (const [nr, nc] of getNeighbors(row, col, size)) {
    if (newBoard[nr][nc] === opponent) {
      const group = getGroup(newBoard, nr, nc)
      if (getLiberties(newBoard, group) === 0) {
        capturedCount += group.size
        newBoard = captureGroup(newBoard, group)
      }
    }
  }

  const newCaptures = { ...state.captures }
  newCaptures[state.currentPlayer] += capturedCount

  const moveRecord: MoveRecord = {
    player: state.currentPlayer,
    row,
    col,
    captured: capturedCount,
  }

  return {
    board: newBoard,
    currentPlayer: opponent,
    captures: newCaptures,
    history: [...state.history, serializeBoard(newBoard)],
    moveHistory: [...state.moveHistory, moveRecord],
    passes: 0,
    gameOver: false,
    winner: null,
    lastMove: [row, col],
    moveCount: state.moveCount + 1,
  }
}

// Initial game state
const createInitialState = (size: BoardSize): GoGameState => ({
  board: createEmptyBoard(size),
  currentPlayer: 'black',
  captures: { black: 0, white: 0 },
  history: [],
  moveHistory: [],
  passes: 0,
  gameOver: false,
  winner: null,
  lastMove: null,
  moveCount: 0,
})

// Load saved games from localStorage
const loadSavedGames = (): SavedGame[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

// Save games to localStorage
const saveSavedGames = (games: SavedGame[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

// Load stats
const loadStats = (): GoStats => {
  try {
    const saved = localStorage.getItem(STATS_KEY)
    return saved ? JSON.parse(saved) : { played: 0, wins: 0, losses: 0 }
  } catch {
    return { played: 0, wins: 0, losses: 0 }
  }
}

// Save stats
const saveStats = (stats: GoStats) => {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

export function GoApp() {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [gameFilter, setGameFilter] = useState<GameFilter>('active')
  const [boardSize, setBoardSize] = useState<BoardSize>(9)
  const [gameState, setGameState] = useState<GoGameState>(() => createInitialState(9))
  const [playerColor, setPlayerColor] = useState<'black' | 'white'>('black')
  const [aiDifficulty, setAiDifficulty] = useState(5)
  const { showNewGameModal, setShowNewGameModal } = useGoStore()
  const [savedGames, setSavedGames] = useState<SavedGame[]>([])
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)
  const [stats, setStats] = useState<GoStats>({ played: 0, wins: 0, losses: 0 })

  const { getAIMove, isThinking } = useGoAI()

  const isPlayerTurn = gameState.currentPlayer === playerColor

  // Load saved games and stats on mount
  useEffect(() => {
    setSavedGames(loadSavedGames())
    setStats(loadStats())
  }, [])

  // Filter games
  const filteredGames = useMemo(() => {
    return savedGames.filter(game => {
      if (gameFilter === 'active') return game.status === 'active'
      if (gameFilter === 'finished') return game.status === 'finished'
      return true
    })
  }, [savedGames, gameFilter])

  // Handle player move
  const handleMove = useCallback((row: number, col: number) => {
    if (gameState.gameOver || !isPlayerTurn) return

    const newState = makeMove(gameState, row, col, boardSize)
    if (newState) {
      setGameState(newState)
    }
  }, [gameState, boardSize, isPlayerTurn])

  // Handle AI move
  useEffect(() => {
    if (!isPlayerTurn && !gameState.gameOver && !isThinking) {
      const timer = setTimeout(async () => {
        const aiMove = await getAIMove(gameState, boardSize)
        if (aiMove === 'pass') {
          handlePass()
        } else {
          const newState = makeMove(gameState, aiMove[0], aiMove[1], boardSize)
          if (newState) {
            setGameState(newState)
          }
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isPlayerTurn, gameState, boardSize, isThinking, getAIMove])

  // Handle pass
  const handlePass = useCallback(() => {
    if (gameState.gameOver) return

    const newPasses = gameState.passes + 1
    const passRecord: MoveRecord = {
      player: gameState.currentPlayer,
      row: -1,
      col: -1,
      captured: 0,
      isPass: true,
    }

    if (newPasses >= 2) {
      // Game over - count territory
      const blackScore = gameState.captures.black
      const whiteScore = gameState.captures.white + 6.5 // Komi
      const winner = blackScore > whiteScore ? 'black' : whiteScore > blackScore ? 'white' : 'draw'

      // Update stats
      const newStats = { ...stats, played: stats.played + 1 }
      if (winner === playerColor) {
        newStats.wins++
      } else if (winner !== 'draw') {
        newStats.losses++
      }
      setStats(newStats)
      saveStats(newStats)

      setGameState(prev => ({
        ...prev,
        moveHistory: [...prev.moveHistory, passRecord],
        passes: newPasses,
        gameOver: true,
        winner,
      }))
    } else {
      setGameState(prev => ({
        ...prev,
        moveHistory: [...prev.moveHistory, passRecord],
        currentPlayer: prev.currentPlayer === 'black' ? 'white' : 'black',
        passes: newPasses,
      }))
    }
  }, [gameState, stats, playerColor])

  // Handle resign
  const handleResign = useCallback(() => {
    const winner = gameState.currentPlayer === 'black' ? 'white' : 'black'

    // Update stats
    const newStats = { ...stats, played: stats.played + 1, losses: stats.losses + 1 }
    setStats(newStats)
    saveStats(newStats)

    setGameState(prev => ({
      ...prev,
      gameOver: true,
      winner,
    }))
  }, [gameState.currentPlayer, stats])

  // Auto-save current game
  useEffect(() => {
    if (viewMode === 'game' && gameState.moveCount > 0) {
      const id = currentGameId || `game-${Date.now()}`
      const now = new Date()
      const name = `${boardSize}×${boardSize} - ${now.toLocaleDateString('de-DE')}`

      const savedGame: SavedGame = {
        id,
        name,
        date: now.toISOString(),
        boardSize,
        playerColor,
        gameState,
        aiDifficulty,
        status: gameState.gameOver ? 'finished' : 'active',
      }

      const existingGames = loadSavedGames()
      const existingIndex = existingGames.findIndex(g => g.id === id)

      if (existingIndex >= 0) {
        existingGames[existingIndex] = savedGame
      } else {
        existingGames.unshift(savedGame)
        setCurrentGameId(id)
      }

      const trimmedGames = existingGames.slice(0, 20)
      saveSavedGames(trimmedGames)
      setSavedGames(trimmedGames)
    }
  }, [gameState, viewMode, currentGameId, boardSize, playerColor, aiDifficulty])

  // Select a game from list
  const handleSelectGame = useCallback((game: SavedGame) => {
    setBoardSize(game.boardSize)
    setPlayerColor(game.playerColor)
    setGameState(game.gameState)
    setAiDifficulty(game.aiDifficulty)
    setCurrentGameId(game.id)
    setViewMode('game')
  }, [])

  // Delete a saved game
  const handleDeleteGame = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const games = loadSavedGames().filter(g => g.id !== id)
    saveSavedGames(games)
    setSavedGames(games)
  }, [])

  // Back to list
  const handleBackToList = useCallback(() => {
    setCurrentGameId(null)
    setViewMode('list')
  }, [])

  // Start new game
  const startNewGame = useCallback((size: BoardSize, color: 'black' | 'white', difficulty: number) => {
    setBoardSize(size)
    setPlayerColor(color)
    setAiDifficulty(difficulty)
    setGameState(createInitialState(size))
    setCurrentGameId(null)
    setViewMode('game')
    setShowNewGameModal(false)
  }, [])

  const getStatusColor = (status: string): string => {
    return status === 'active'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }

  return (
    <div className="h-full flex bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Stats */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('go.statistics')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-1.5">
              <div className="font-bold text-gray-600 dark:text-gray-400">
                {stats.played}
              </div>
              <div className="text-gray-500">{t('go.played')}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded p-1.5">
              <div className="font-bold text-green-600 dark:text-green-400">
                {stats.wins}
              </div>
              <div className="text-gray-500">{t('go.wins')}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded p-1.5">
              <div className="font-bold text-red-600 dark:text-red-400">
                {stats.losses}
              </div>
              <div className="text-gray-500">{t('go.losses')}</div>
            </div>
          </div>
        </div>

        {/* Game Filter Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['active', 'finished', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setGameFilter(filter)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                gameFilter === filter
                  ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {filter === 'active' && t('go.active')}
              {filter === 'finished' && t('go.finished')}
              {filter === 'all' && t('go.all')}
            </button>
          ))}
        </div>

        {/* Game List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredGames.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              <div className="text-3xl mb-2">⚫</div>
              <p>{t('go.noGames')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleSelectGame(game)}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors group ${
                    currentGameId === game.id
                      ? 'bg-gray-200 dark:bg-gray-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
                      {game.boardSize}×{game.boardSize} vs KI
                    </span>
                    <button
                      onClick={(e) => handleDeleteGame(game.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(game.status)}`}>
                      {game.status === 'active' ? t('go.active') : t('go.finished')}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {game.gameState.moveCount} {t('go.moves')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {viewMode === 'list' ? (
          // Welcome / Empty State
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">⚫</div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('go.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                {t('go.description')}
              </p>
              <button
                onClick={() => setShowNewGameModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                {t('go.newGame')}
              </button>
            </div>
          </div>
        ) : (
          // Game View
          <GameView
            gameState={gameState}
            boardSize={boardSize}
            playerColor={playerColor}
            aiDifficulty={aiDifficulty}
            isPlayerTurn={isPlayerTurn}
            isThinking={isThinking}
            onBack={handleBackToList}
            onMove={handleMove}
            onPass={handlePass}
            onResign={handleResign}
            onNewGame={() => setShowNewGameModal(true)}
          />
        )}
      </div>

      {/* New Game Modal */}
      {showNewGameModal && (
        <NewGameModal
          onClose={() => setShowNewGameModal(false)}
          onStart={startNewGame}
        />
      )}
    </div>
  )
}

// Game View Component
interface GameViewProps {
  gameState: GoGameState
  boardSize: BoardSize
  playerColor: 'black' | 'white'
  aiDifficulty: number
  isPlayerTurn: boolean
  isThinking: boolean
  onBack: () => void
  onMove: (row: number, col: number) => void
  onPass: () => void
  onResign: () => void
  onNewGame: () => void
}

function GameView({
  gameState,
  boardSize,
  playerColor,
  aiDifficulty,
  isPlayerTurn,
  isThinking,
  onBack,
  onMove,
  onPass,
  onResign,
  onNewGame,
}: GameViewProps) {
  const { t } = useTranslation()

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Main Board Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('go.back')}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{boardSize}×{boardSize}</span>
            {gameState.gameOver && (
              <span className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                {t('go.gameOver')}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
              <Cpu className="w-3.5 h-3.5" />
              {t('go.aiLevel')} {aiDifficulty}
            </span>
          </div>
          <div className="w-24" /> {/* Spacer */}
        </div>

        {/* Board Container */}
        <div className="flex-1 flex items-center justify-center p-4 bg-amber-50 dark:bg-gray-800/50">
          <div className="w-full max-w-lg">
            <GoBoard
              size={boardSize}
              board={gameState.board}
              lastMove={gameState.lastMove}
              currentPlayer={gameState.currentPlayer}
              onMove={onMove}
              disabled={gameState.gameOver || !isPlayerTurn || isThinking}
            />

            {/* Turn indicator */}
            <div className="mt-3 text-center">
              {gameState.gameOver ? (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {gameState.winner === 'draw'
                    ? t('go.draw')
                    : t('go.winnerIs', { color: t(`go.${gameState.winner}`) })}
                </span>
              ) : isThinking ? (
                <span className="flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('go.aiThinking')}
                </span>
              ) : (
                <span className={`text-sm ${isPlayerTurn ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-500'}`}>
                  {isPlayerTurn ? t('go.yourTurn') : t('go.opponentTurn')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel - Game Info */}
      <div className="w-56 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-full overflow-hidden">
        <GoGameInfo
          gameState={gameState}
          playerColor={playerColor}
          boardSize={boardSize}
          onPass={onPass}
          onResign={onResign}
          onNewGame={onNewGame}
          disabled={gameState.gameOver || !isPlayerTurn || isThinking}
        />
      </div>
    </div>
  )
}

// New Game Modal Component
interface NewGameModalProps {
  onClose: () => void
  onStart: (size: BoardSize, color: 'black' | 'white', difficulty: number) => void
}

function NewGameModal({ onClose, onStart }: NewGameModalProps) {
  const { t } = useTranslation()
  const [size, setSize] = useState<BoardSize>(9)
  const [color, setColor] = useState<'black' | 'white'>('black')
  const [difficulty, setDifficulty] = useState(5)

  const getDifficultyLabel = (level: number): string => {
    if (level <= 2) return t('go.beginner')
    if (level <= 5) return t('go.easy')
    if (level <= 7) return t('go.medium')
    return t('go.hard')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {t('go.newGame')}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Board Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('go.boardSize')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([9, 13, 19] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    size === s
                      ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-700'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="font-bold text-lg">{s}×{s}</div>
                  <div className="text-xs text-gray-500">
                    {s === 9 ? t('go.beginner') : s === 13 ? t('go.medium') : t('go.standard')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('go.difficulty')}: {getDifficultyLabel(difficulty)}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{t('go.easy')}</span>
              <span>{t('go.hard')}</span>
            </div>
          </div>

          {/* Player Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('go.yourColor')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setColor('black')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  color === 'black'
                    ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-700'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gray-900 dark:bg-black border border-gray-700" />
                <span className="font-medium">{t('go.black')}</span>
              </button>
              <button
                onClick={() => setColor('white')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  color === 'white'
                    ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-700'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300" />
                <span className="font-medium">{t('go.white')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onStart(size, color, difficulty)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            {t('go.startGame')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Export helper functions for AI
export { isValidMove, makeMove, getNeighbors, getGroup, getLiberties }
