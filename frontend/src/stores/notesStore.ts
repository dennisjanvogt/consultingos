import { create } from 'zustand'
import { ApiError } from '@/api/client'
import type { Note, NoteCreate, NoteUpdate } from '@/api/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface NotesState {
  notes: Note[]
  selectedNoteId: number | null
  isLoading: boolean
  error: string | null
  searchQuery: string

  // Actions
  fetchNotes: (search?: string) => Promise<void>
  createNote: (data?: NoteCreate) => Promise<Note | null>
  updateNote: (id: number, data: NoteUpdate) => Promise<Note | null>
  deleteNote: (id: number) => Promise<boolean>
  togglePin: (id: number) => Promise<Note | null>
  selectNote: (id: number | null) => void
  setSearchQuery: (query: string) => void

  // Computed helpers
  getSelectedNote: () => Note | null
  getPinnedNotes: () => Note[]
  getRecentNotes: (limit?: number) => Note[]
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

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  selectedNoteId: null,
  isLoading: false,
  error: null,
  searchQuery: '',

  fetchNotes: async (search) => {
    set({ isLoading: true, error: null })
    try {
      const query = search ?? get().searchQuery
      const url = query ? `/notes/?search=${encodeURIComponent(query)}` : '/notes/'
      const notes = await request<Note[]>(url)
      set({ notes, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch notes'
      set({ error: message, isLoading: false })
    }
  },

  createNote: async (data = {}) => {
    try {
      const note = await request<Note>('/notes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ notes: [note, ...get().notes], selectedNoteId: note.id })
      return note
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create note'
      set({ error: message })
      return null
    }
  },

  updateNote: async (id, data) => {
    try {
      const note = await request<Note>(`/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ notes: get().notes.map((n) => (n.id === id ? note : n)) })
      return note
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update note'
      set({ error: message })
      return null
    }
  },

  deleteNote: async (id) => {
    const oldNotes = get().notes
    // Optimistic delete
    set({
      notes: oldNotes.filter((n) => n.id !== id),
      selectedNoteId: get().selectedNoteId === id ? null : get().selectedNoteId
    })

    try {
      await request(`/notes/${id}`, { method: 'DELETE' })
      return true
    } catch (err) {
      // Rollback on error
      set({ notes: oldNotes })
      const message = err instanceof ApiError ? err.message : 'Failed to delete note'
      set({ error: message })
      return false
    }
  },

  togglePin: async (id) => {
    try {
      const note = await request<Note>(`/notes/${id}/pin`, {
        method: 'POST',
      })
      set({ notes: get().notes.map((n) => (n.id === id ? note : n)) })
      return note
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to toggle pin'
      set({ error: message })
      return null
    }
  },

  selectNote: (id) => {
    set({ selectedNoteId: id })
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
    get().fetchNotes(query)
  },

  getSelectedNote: () => {
    const { notes, selectedNoteId } = get()
    return notes.find((n) => n.id === selectedNoteId) || null
  },

  getPinnedNotes: () => {
    return get().notes.filter((n) => n.is_pinned)
  },

  getRecentNotes: (limit = 3) => {
    return [...get().notes]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, limit)
  },
}))
