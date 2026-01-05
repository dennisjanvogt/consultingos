import { create } from 'zustand'
import { api } from '@/api/client'
import type { ChessGame, ChessGameCreate, ChessInvitation, ChessStats, User } from '@/api/types'

interface ChessState {
  // Games
  games: ChessGame[]
  currentGame: ChessGame | null
  isLoading: boolean
  error: string | null

  // Invitations
  invitations: ChessInvitation[]

  // Stats
  stats: ChessStats | null

  // Users for inviting
  availableUsers: User[]

  // WebSocket
  socket: WebSocket | null

  // UI State
  showNewGameModal: boolean
  setShowNewGameModal: (show: boolean) => void

  // Actions
  fetchGames: (includeFinished?: boolean) => Promise<void>
  fetchGame: (gameId: number) => Promise<ChessGame | null>
  createGame: (data: ChessGameCreate) => Promise<ChessGame | null>
  makeMove: (gameId: number, from: string, to: string, promotion?: string) => Promise<boolean>
  resignGame: (gameId: number) => Promise<boolean>
  setCurrentGame: (game: ChessGame | null) => void

  // Invitations
  fetchInvitations: () => Promise<void>
  createInvitation: (toUserId: number, playerColor: 'white' | 'black') => Promise<boolean>
  acceptInvitation: (invitationId: number) => Promise<ChessGame | null>
  declineInvitation: (invitationId: number) => Promise<boolean>

  // Stats
  fetchStats: () => Promise<void>

  // Users
  fetchAvailableUsers: (search?: string) => Promise<void>

  // WebSocket
  connectToGame: (gameId: number) => void
  disconnectFromGame: () => void
  sendMove: (from: string, to: string, promotion?: string) => void
  sendResign: () => void
  sendDrawOffer: () => void
  sendDrawAccept: () => void
  sendDrawDecline: () => void
}

export const useChessStore = create<ChessState>((set, get) => ({
  games: [],
  currentGame: null,
  isLoading: false,
  error: null,
  invitations: [],
  stats: null,
  availableUsers: [],
  socket: null,
  showNewGameModal: false,

  setShowNewGameModal: (show: boolean) => set({ showNewGameModal: show }),

  fetchGames: async (includeFinished = true) => {
    set({ isLoading: true, error: null })
    try {
      const games = await api.get<ChessGame[]>(`/chess/games?include_finished=${includeFinished}`)
      set({ games, isLoading: false })
    } catch (err) {
      set({ error: 'Fehler beim Laden der Spiele', isLoading: false })
    }
  },

  fetchGame: async (gameId: number) => {
    set({ isLoading: true, error: null })
    try {
      const game = await api.get<ChessGame>(`/chess/games/${gameId}`)
      set({ currentGame: game, isLoading: false })
      return game
    } catch (err) {
      set({ error: 'Spiel nicht gefunden', isLoading: false })
      return null
    }
  },

  createGame: async (data: ChessGameCreate) => {
    set({ isLoading: true, error: null })
    try {
      const game = await api.post<ChessGame>('/chess/games', data)
      set((state) => ({
        games: [game, ...state.games],
        currentGame: game,
        isLoading: false,
      }))
      return game
    } catch (err) {
      set({ error: 'Fehler beim Erstellen des Spiels', isLoading: false })
      return null
    }
  },

  makeMove: async (gameId: number, from: string, to: string, promotion?: string) => {
    try {
      const game = await api.post<ChessGame>(`/chess/games/${gameId}/move`, {
        from_square: from,
        to_square: to,
        promotion,
      })
      set((state) => ({
        currentGame: game,
        games: state.games.map((g) => (g.id === game.id ? game : g)),
      }))
      return true
    } catch (err) {
      console.error('Move failed:', err)
      return false
    }
  },

  resignGame: async (gameId: number) => {
    try {
      const game = await api.post<ChessGame>(`/chess/games/${gameId}/resign`, {})
      set((state) => ({
        currentGame: game,
        games: state.games.map((g) => (g.id === game.id ? game : g)),
      }))
      return true
    } catch (err) {
      return false
    }
  },

  setCurrentGame: (game: ChessGame | null) => {
    set({ currentGame: game })
  },

  fetchInvitations: async () => {
    try {
      const invitations = await api.get<ChessInvitation[]>('/chess/invitations')
      set({ invitations })
    } catch (err) {
      console.error('Failed to fetch invitations:', err)
    }
  },

  createInvitation: async (toUserId: number, playerColor: 'white' | 'black') => {
    try {
      await api.post('/chess/invitations', {
        to_user_id: toUserId,
        player_color: playerColor,
      })
      await get().fetchInvitations()
      return true
    } catch (err) {
      return false
    }
  },

  acceptInvitation: async (invitationId: number) => {
    try {
      const game = await api.post<ChessGame>(`/chess/invitations/${invitationId}/accept`, {})
      set((state) => ({
        invitations: state.invitations.filter((i) => i.id !== invitationId),
        games: [game, ...state.games],
        currentGame: game,
      }))
      return game
    } catch (err) {
      return null
    }
  },

  declineInvitation: async (invitationId: number) => {
    try {
      await api.post(`/chess/invitations/${invitationId}/decline`, {})
      set((state) => ({
        invitations: state.invitations.filter((i) => i.id !== invitationId),
      }))
      return true
    } catch (err) {
      return false
    }
  },

  fetchStats: async () => {
    try {
      const stats = await api.get<ChessStats>('/chess/stats')
      set({ stats })
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  },

  fetchAvailableUsers: async (search?: string) => {
    try {
      const url = search ? `/chess/users?search=${encodeURIComponent(search)}` : '/chess/users'
      const users = await api.get<User[]>(url)
      set({ availableUsers: users })
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  },

  // WebSocket methods
  connectToGame: (gameId: number) => {
    const { socket } = get()
    if (socket) {
      socket.close()
    }

    const wsUrl = `ws://localhost:8000/ws/chess/${gameId}/`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('Connected to chess game WebSocket')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('WebSocket message:', data)

      if (data.type === 'game_state' || data.type === 'game_update') {
        const gameData = data.data
        set((state) => ({
          currentGame: state.currentGame
            ? {
                ...state.currentGame,
                fen: gameData.fen,
                moves: gameData.moves,
                status: gameData.status,
                winner: gameData.winner,
                current_turn: gameData.current_turn,
              }
            : null,
        }))
      } else if (data.type === 'draw_offered') {
        // Handle draw offer UI
        console.log('Draw offered by:', data.data.from_username)
      }
    }

    ws.onclose = () => {
      console.log('Disconnected from chess game WebSocket')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    set({ socket: ws })
  },

  disconnectFromGame: () => {
    const { socket } = get()
    if (socket) {
      socket.close()
      set({ socket: null })
    }
  },

  sendMove: (from: string, to: string, promotion?: string) => {
    const { socket } = get()
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: 'move',
        from,
        to,
        promotion,
      }))
    }
  },

  sendResign: () => {
    const { socket } = get()
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'resign' }))
    }
  },

  sendDrawOffer: () => {
    const { socket } = get()
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'draw_offer' }))
    }
  },

  sendDrawAccept: () => {
    const { socket } = get()
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'draw_accept' }))
    }
  },

  sendDrawDecline: () => {
    const { socket } = get()
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'draw_decline' }))
    }
  },
}))
