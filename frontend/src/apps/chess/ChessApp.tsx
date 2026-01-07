import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Trophy,
  Users,
  Bot,
  Clock,
  ArrowLeft,
  Loader2,
  ChevronRight,
  Cpu,
} from 'lucide-react'
import { useChessStore } from '@/stores/chessStore'
import { ChessBoard } from './components/ChessBoard'
import { GameInfo } from './components/GameInfo'
import { InviteModal } from './components/InviteModal'
import { useStockfish, parseUCIMove } from './hooks/useStockfish'
import type { ChessGame, ChessInvitation } from '@/api/types'

type ViewMode = 'list' | 'game'
type GameFilter = 'active' | 'finished' | 'all'

// Convert AI difficulty level (1-20) to approximate Elo rating
const difficultyToElo = (level: number): number => {
  // Stockfish levels roughly map to these Elo ranges
  const eloMap: Record<number, number> = {
    1: 800, 2: 900, 3: 1000, 4: 1100, 5: 1200,
    6: 1300, 7: 1400, 8: 1500, 9: 1600, 10: 1700,
    11: 1800, 12: 1900, 13: 2000, 14: 2100, 15: 2200,
    16: 2300, 17: 2400, 18: 2500, 19: 2600, 20: 2700,
  }
  return eloMap[level] || 1500
}

export function ChessApp() {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [gameFilter, setGameFilter] = useState<GameFilter>('active')
  const [showInviteModal, setShowInviteModal] = useState(false)

  const {
    games,
    currentGame,
    invitations,
    stats,
    isLoading,
    showNewGameModal,
    setShowNewGameModal,
    fetchGames,
    fetchGame,
    fetchInvitations,
    fetchStats,
    createGame,
    createInvitation,
    makeMove,
    resignGame,
    setCurrentGame,
    acceptInvitation,
    declineInvitation,
    sendDrawOffer,
    connectToGame,
    disconnectFromGame,
  } = useChessStore()

  // Fetch initial data
  useEffect(() => {
    fetchGames(true)
    fetchInvitations()
    fetchStats()
  }, [fetchGames, fetchInvitations, fetchStats])

  // WebSocket connection for multiplayer games
  useEffect(() => {
    if (currentGame && !currentGame.is_ai_game && currentGame.status === 'active') {
      connectToGame(currentGame.id)
      return () => {
        disconnectFromGame()
      }
    }
  }, [currentGame?.id, currentGame?.is_ai_game, currentGame?.status, connectToGame, disconnectFromGame])

  // Filter games based on selected filter
  const filteredGames = games.filter((game) => {
    if (gameFilter === 'active') {
      return game.status === 'active' || game.status === 'waiting'
    }
    if (gameFilter === 'finished') {
      return !['active', 'waiting'].includes(game.status)
    }
    return true
  })

  const handleSelectGame = async (game: ChessGame) => {
    await fetchGame(game.id)
    setViewMode('game')
  }

  const handleBackToList = () => {
    setCurrentGame(null)
    setViewMode('list')
  }

  const handleAcceptInvitation = async (invitation: ChessInvitation) => {
    const game = await acceptInvitation(invitation.id)
    if (game) {
      setViewMode('game')
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      waiting: t('chess.waiting'),
      active: t('chess.active'),
      checkmate: t('chess.checkmate'),
      stalemate: t('chess.stalemate'),
      draw: t('chess.draw'),
      resigned: t('chess.resigned'),
      timeout: t('chess.timeout'),
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      waiting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      checkmate: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      stalemate: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      draw: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      resigned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      timeout: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="h-full flex bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Stats */}
        {stats && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('chess.statistics')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-green-50 dark:bg-green-900/20 rounded p-1.5">
                <div className="font-bold text-green-600 dark:text-green-400">
                  {stats.wins}
                </div>
                <div className="text-gray-500">{t('chess.wins')}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded p-1.5">
                <div className="font-bold text-red-600 dark:text-red-400">
                  {stats.losses}
                </div>
                <div className="text-gray-500">{t('chess.losses')}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-1.5">
                <div className="font-bold text-gray-600 dark:text-gray-400">
                  {stats.draws}
                </div>
                <div className="text-gray-500">{t('chess.draws')}</div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {invitations.filter((i) => i.status === 'pending').length > 0 && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('chess.invitations')}
              </span>
            </div>
            <div className="space-y-2">
              {invitations
                .filter((i) => i.status === 'pending')
                .map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2"
                  >
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {invitation.from_user.username} {t('chess.hasInvitedYou')}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAcceptInvitation(invitation)}
                        className="flex-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        {t('chess.accept')}
                      </button>
                      <button
                        onClick={() => declineInvitation(invitation.id)}
                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        {t('chess.decline')}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

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
              {filter === 'active' && t('chess.active')}
              {filter === 'finished' && t('chess.finished')}
              {filter === 'all' && t('chess.all')}
            </button>
          ))}
        </div>

        {/* Game List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && games.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              <div className="text-3xl mb-2">&#9812;</div>
              <p>{t('chess.noGames')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleSelectGame(game)}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                    currentGame?.id === game.id
                      ? 'bg-gray-200 dark:bg-gray-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {game.is_ai_game ? (
                      <Bot className="w-3.5 h-3.5 text-purple-500" />
                    ) : (
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                    )}
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {game.is_ai_game
                        ? `vs KI (${difficultyToElo(game.ai_difficulty || 10)} Elo)`
                        : `vs ${
                            game.white_player?.username === 'me'
                              ? game.black_player?.username
                              : game.white_player?.username
                          }`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(
                        game.status
                      )}`}
                    >
                      {getStatusLabel(game.status)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {game.moves.length} {t('chess.moves')}
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
              <div className="text-6xl mb-4">&#9812;</div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('chess.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                {t('chess.description')}
              </p>
              <button
                onClick={() => setShowNewGameModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                {t('chess.newGame')}
              </button>
            </div>
          </div>
        ) : currentGame ? (
          // Game View
          <GameView
            game={currentGame}
            onBack={handleBackToList}
            onMove={(from, to, promotion) => makeMove(currentGame.id, from, to, promotion)}
            onResign={() => resignGame(currentGame.id)}
            onOfferDraw={sendDrawOffer}
            getStatusLabel={getStatusLabel}
            getStatusColor={getStatusColor}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {/* New Game Modal */}
      {showNewGameModal && (
        <NewGameModal
          onClose={() => setShowNewGameModal(false)}
          onCreate={async (options) => {
            const game = await createGame(options)
            if (game) {
              setShowNewGameModal(false)
              setViewMode('game')
            }
          }}
          onShowInviteModal={() => {
            setShowNewGameModal(false)
            setShowInviteModal(true)
          }}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInvite={async (userId, playerColor) => {
            const success = await createInvitation(userId, playerColor)
            return success
          }}
        />
      )}
    </div>
  )
}

// New Game Modal Component
interface NewGameModalProps {
  onClose: () => void
  onCreate: (options: {
    is_ai_game: boolean
    ai_difficulty?: number
    player_color?: 'white' | 'black'
    time_control?: number | null
  }) => Promise<void>
  onShowInviteModal: () => void
}

function NewGameModal({ onClose, onCreate, onShowInviteModal }: NewGameModalProps) {
  const { t } = useTranslation()
  const [gameType, setGameType] = useState<'ai' | 'multiplayer'>('ai')
  const [aiDifficulty, setAiDifficulty] = useState(10)
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [timeControl, setTimeControl] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    setIsCreating(true)
    await onCreate({
      is_ai_game: gameType === 'ai',
      ai_difficulty: gameType === 'ai' ? aiDifficulty : undefined,
      player_color: playerColor,
      time_control: timeControl,
    })
    setIsCreating(false)
  }

  const getDifficultyLabel = (level: number): string => {
    const elo = difficultyToElo(level)
    if (level <= 3) return `${elo} Elo (${t('chess.beginner')})`
    if (level <= 7) return `${elo} Elo (${t('chess.easy')})`
    if (level <= 12) return `${elo} Elo (${t('chess.medium')})`
    if (level <= 17) return `${elo} Elo (${t('chess.hard')})`
    return `${elo} Elo (${t('chess.master')})`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {t('chess.newGame')}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Game Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('chess.gameType')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setGameType('ai')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  gameType === 'ai'
                    ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-700'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <Bot className="w-5 h-5" />
                <span className="font-medium">{t('chess.playAgainstAI')}</span>
              </button>
              <button
                onClick={() => setGameType('multiplayer')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  gameType === 'multiplayer'
                    ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-700'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">{t('chess.multiplayer')}</span>
              </button>
            </div>
          </div>

          {/* AI Difficulty */}
          {gameType === 'ai' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('chess.difficulty')}: {getDifficultyLabel(aiDifficulty)}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>800 Elo</span>
                <span>2700 Elo</span>
              </div>
            </div>
          )}

          {/* Player Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('chess.yourColor')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPlayerColor('white')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  playerColor === 'white'
                    ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-700'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300" />
                <span className="font-medium">{t('chess.white')}</span>
              </button>
              <button
                onClick={() => setPlayerColor('black')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  playerColor === 'black'
                    ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-700'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gray-800 dark:bg-gray-900" />
                <span className="font-medium">{t('chess.black')}</span>
              </button>
            </div>
          </div>

          {/* Time Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('chess.timeControl')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[null, 5, 10, 15].map((time) => (
                <button
                  key={time ?? 'none'}
                  onClick={() => setTimeControl(time)}
                  className={`p-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    timeControl === time
                      ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-700'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  {time === null ? t('chess.noTimeLimit') : `${time} min`}
                </button>
              ))}
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
          {gameType === 'ai' ? (
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              {t('chess.startGame')}
            </button>
          ) : (
            <button
              onClick={onShowInviteModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
            >
              <Users className="w-4 h-4" />
              {t('chess.invitePlayer')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Game View Component
interface GameViewProps {
  game: ChessGame
  onBack: () => void
  onMove: (from: string, to: string, promotion?: string) => void
  onResign: () => void
  onOfferDraw: () => void
  getStatusLabel: (status: string) => string
  getStatusColor: (status: string) => string
}

function GameView({
  game,
  onBack,
  onMove,
  onResign,
  onOfferDraw,
  getStatusLabel,
  getStatusColor,
}: GameViewProps) {
  const { t } = useTranslation()
  // Determine player color from game data
  const playerColor = game.player_color as 'white' | 'black'

  // Check if it's player's turn
  const isPlayerTurn = game.current_turn === playerColor

  // Is game active?
  const isGameActive = game.status === 'active'

  // Stockfish AI for AI games
  const { isReady: aiReady, isThinking: aiThinking, bestMove, getMove: getAIMove } = useStockfish({
    difficulty: game.ai_difficulty || 10,
  })

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (
      game.is_ai_game &&
      isGameActive &&
      !isPlayerTurn &&
      aiReady &&
      !aiThinking
    ) {
      // Small delay to make it feel more natural
      const timer = setTimeout(() => {
        getAIMove(game.fen)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [game.is_ai_game, game.fen, isGameActive, isPlayerTurn, aiReady, aiThinking, getAIMove])

  // Execute AI move when bestMove is available
  useEffect(() => {
    if (bestMove && game.is_ai_game && !isPlayerTurn && isGameActive) {
      const move = parseUCIMove(bestMove)
      if (move) {
        onMove(move.from, move.to, move.promotion)
      }
    }
  }, [bestMove, game.is_ai_game, isPlayerTurn, isGameActive, onMove])

  // Get last move for highlighting
  const lastMove = useMemo(() => {
    if (game.moves.length === 0) return null
    const last = game.moves[game.moves.length - 1]
    return { from: last.from, to: last.to }
  }, [game.moves])

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
            {t('chess.back')}
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(game.status)}`}>
              {getStatusLabel(game.status)}
            </span>
            {game.time_control && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                {game.time_control} min
              </span>
            )}
            {game.is_ai_game && (
              <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                <Cpu className="w-3.5 h-3.5" />
                {difficultyToElo(game.ai_difficulty || 10)} Elo
              </span>
            )}
          </div>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>

        {/* Board Container */}
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="w-full max-w-lg">
            <ChessBoard
              fen={game.fen}
              playerColor={playerColor}
              onMove={onMove}
              disabled={!isGameActive || !isPlayerTurn}
              lastMove={lastMove}
            />

            {/* Turn indicator */}
            <div className="mt-3 text-center">
              {isGameActive ? (
                aiThinking ? (
                  <span className="flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('chess.aiThinking')}
                  </span>
                ) : (
                  <span className={`text-sm ${isPlayerTurn ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-500'}`}>
                    {isPlayerTurn ? t('chess.yourTurn') : t('chess.opponentTurn')}
                  </span>
                )
              ) : (
                <span className="text-sm text-gray-500">
                  {t('chess.gameEnded')}: {getStatusLabel(game.status)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel - Game Info */}
      <div className="w-56 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-full overflow-hidden">
        <GameInfo
          game={game}
          playerColor={playerColor}
          isPlayerTurn={isPlayerTurn}
          onResign={onResign}
          onOfferDraw={onOfferDraw}
        />
      </div>
    </div>
  )
}
