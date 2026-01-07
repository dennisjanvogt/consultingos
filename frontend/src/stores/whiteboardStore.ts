import { create } from 'zustand'
import { ApiError } from '@/api/client'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export interface Diagram {
  id: number
  title: string
  content: Record<string, unknown>
  thumbnail: string
  created_at: string
  updated_at: string
}

export interface DiagramListItem {
  id: number
  title: string
  thumbnail: string
  created_at: string
  updated_at: string
}

export type WhiteboardView = 'gallery' | 'editor'

interface WhiteboardState {
  diagrams: DiagramListItem[]
  currentDiagram: Diagram | null
  view: WhiteboardView
  isLoading: boolean
  isSaving: boolean
  hasUnsavedChanges: boolean
  error: string | null

  // Actions
  fetchDiagrams: () => Promise<void>
  loadDiagram: (id: number) => Promise<Diagram | null>
  createDiagram: (title?: string) => Promise<Diagram | null>
  saveDiagram: (id: number, content: Record<string, unknown>, thumbnail?: string) => Promise<void>
  renameDiagram: (id: number, title: string) => Promise<void>
  deleteDiagram: (id: number) => Promise<boolean>
  setCurrentDiagram: (diagram: Diagram | null) => void
  setView: (view: WhiteboardView) => void
  setHasUnsavedChanges: (value: boolean) => void
  clearError: () => void
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

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  diagrams: [],
  currentDiagram: null,
  view: 'gallery',
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
  error: null,

  fetchDiagrams: async () => {
    set({ isLoading: true, error: null })
    try {
      const diagrams = await request<DiagramListItem[]>('/whiteboard/')
      set({ diagrams, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch diagrams'
      set({ error: message, isLoading: false })
    }
  },

  loadDiagram: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      const diagram = await request<Diagram>(`/whiteboard/${id}`)
      set({ currentDiagram: diagram, isLoading: false })
      return diagram
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load diagram'
      set({ error: message, isLoading: false })
      return null
    }
  },

  createDiagram: async (title?: string) => {
    try {
      const diagram = await request<Diagram>('/whiteboard/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'Untitled' }),
      })
      set({
        diagrams: [{
          id: diagram.id,
          title: diagram.title,
          thumbnail: diagram.thumbnail,
          created_at: diagram.created_at,
          updated_at: diagram.updated_at,
        }, ...get().diagrams],
        currentDiagram: diagram,
      })
      return diagram
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create diagram'
      set({ error: message })
      return null
    }
  },

  saveDiagram: async (id: number, content: Record<string, unknown>, thumbnail?: string) => {
    set({ isSaving: true })
    try {
      const updated = await request<Diagram>(`/whiteboard/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, thumbnail }),
      })

      // Update diagrams list
      set({
        diagrams: get().diagrams.map(d =>
          d.id === id
            ? { ...d, thumbnail: updated.thumbnail, updated_at: updated.updated_at }
            : d
        ),
        currentDiagram: get().currentDiagram?.id === id ? updated : get().currentDiagram,
        isSaving: false,
      })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save diagram'
      set({ error: message, isSaving: false })
    }
  },

  renameDiagram: async (id: number, title: string) => {
    try {
      const updated = await request<Diagram>(`/whiteboard/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })

      set({
        diagrams: get().diagrams.map(d => d.id === id ? { ...d, title } : d),
        currentDiagram: get().currentDiagram?.id === id
          ? { ...get().currentDiagram!, title }
          : get().currentDiagram,
      })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to rename diagram'
      set({ error: message })
    }
  },

  deleteDiagram: async (id: number) => {
    try {
      await request(`/whiteboard/${id}`, { method: 'DELETE' })
      set({
        diagrams: get().diagrams.filter(d => d.id !== id),
        currentDiagram: get().currentDiagram?.id === id ? null : get().currentDiagram,
      })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete diagram'
      set({ error: message })
      return false
    }
  },

  setCurrentDiagram: (diagram) => set({ currentDiagram: diagram }),

  setView: (view) => set({ view }),

  setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),

  clearError: () => set({ error: null }),
}))
