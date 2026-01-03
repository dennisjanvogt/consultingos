import { create } from 'zustand'
import { ApiError } from '@/api/client'
import type {
  KanbanCard,
  KanbanCardCreate,
  KanbanCardUpdate,
  KanbanCardMove,
  KanbanBoard,
  KanbanColumn,
} from '@/api/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface KanbanState {
  cards: KanbanCard[]
  activeBoard: KanbanBoard
  isLoading: boolean
  error: string | null

  // Actions
  setActiveBoard: (board: KanbanBoard) => void
  fetchCards: (board?: KanbanBoard) => Promise<void>
  createCard: (card: KanbanCardCreate) => Promise<KanbanCard | null>
  updateCard: (id: number, card: KanbanCardUpdate) => Promise<KanbanCard | null>
  moveCard: (id: number, move: KanbanCardMove) => Promise<KanbanCard | null>
  deleteCard: (id: number) => Promise<boolean>

  // Computed helpers
  getCardsForColumn: (column: KanbanColumn) => KanbanCard[]
  getCardsByBoard: (board: KanbanBoard) => KanbanCard[]
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new ApiError(response.status, error.detail || error.error || 'Request failed')
  }
  if (response.status === 204) {
    return null as T
  }
  return response.json()
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  cards: [],
  activeBoard: 'work',
  isLoading: false,
  error: null,

  setActiveBoard: (board) => {
    set({ activeBoard: board })
    get().fetchCards(board)
  },

  fetchCards: async (board) => {
    set({ isLoading: true, error: null })
    try {
      const queryBoard = board || get().activeBoard
      const cards = await request<KanbanCard[]>(`/kanban/?board=${queryBoard}`)
      set({ cards, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch cards'
      set({ error: message, isLoading: false })
    }
  },

  createCard: async (cardData) => {
    try {
      const data = {
        ...cardData,
        board: cardData.board || get().activeBoard,
      }
      const card = await request<KanbanCard>('/kanban/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ cards: [...get().cards, card] })
      return card
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create card'
      set({ error: message })
      return null
    }
  },

  updateCard: async (id, cardData) => {
    try {
      const card = await request<KanbanCard>(`/kanban/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      })
      set({ cards: get().cards.map((c) => (c.id === id ? card : c)) })
      return card
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update card'
      set({ error: message })
      return null
    }
  },

  moveCard: async (id, moveData) => {
    const oldCards = get().cards
    const card = oldCards.find((c) => c.id === id)
    if (!card) return null

    // Optimistic update: just update the card's column and position
    const updatedCard = { ...card, column: moveData.column, position: moveData.position }
    set({ cards: oldCards.map((c) => (c.id === id ? updatedCard : c)) })

    try {
      const serverCard = await request<KanbanCard>(`/kanban/${id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveData),
      })

      // Update with server response
      set({ cards: get().cards.map((c) => (c.id === id ? serverCard : c)) })
      return serverCard
    } catch (err) {
      // Rollback on error
      set({ cards: oldCards })
      const message = err instanceof ApiError ? err.message : 'Failed to move card'
      set({ error: message })
      return null
    }
  },

  deleteCard: async (id) => {
    const oldCards = get().cards
    // Optimistic delete
    set({ cards: oldCards.filter((c) => c.id !== id) })

    try {
      await request(`/kanban/${id}`, { method: 'DELETE' })
      return true
    } catch (err) {
      // Rollback on error
      set({ cards: oldCards })
      const message = err instanceof ApiError ? err.message : 'Failed to delete card'
      set({ error: message })
      return false
    }
  },

  getCardsForColumn: (column) => {
    return get()
      .cards.filter((c) => c.column === column && c.board === get().activeBoard)
      .sort((a, b) => a.position - b.position)
  },

  getCardsByBoard: (board) => {
    return get()
      .cards.filter((c) => c.board === board)
      .sort((a, b) => a.position - b.position)
  },
}))
