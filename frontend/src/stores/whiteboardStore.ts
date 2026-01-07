import { create } from 'zustand'
import { ApiError } from '@/api/client'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export interface WhiteboardProject {
  id: number
  name: string
  diagram_count: number
  created_at: string
  updated_at: string
}

export interface Diagram {
  id: number
  title: string
  content: Record<string, unknown>
  thumbnail: string
  project_id: number | null
  created_at: string
  updated_at: string
}

export interface DiagramListItem {
  id: number
  title: string
  thumbnail: string
  project_id: number | null
  created_at: string
  updated_at: string
}

export type WhiteboardView = 'gallery' | 'editor'

interface WhiteboardState {
  projects: WhiteboardProject[]
  diagrams: DiagramListItem[]
  currentDiagram: Diagram | null
  currentProjectId: number | null  // null = show all/root, number = inside project
  view: WhiteboardView
  isLoading: boolean
  isSaving: boolean
  hasUnsavedChanges: boolean
  error: string | null

  // Project Actions
  fetchProjects: () => Promise<void>
  createProject: (name: string) => Promise<WhiteboardProject | null>
  renameProject: (id: number, name: string) => Promise<void>
  deleteProject: (id: number) => Promise<boolean>
  setCurrentProjectId: (id: number | null) => void

  // Diagram Actions
  fetchDiagrams: (projectId?: number | null) => Promise<void>
  loadDiagram: (id: number) => Promise<Diagram | null>
  createDiagram: (title?: string, projectId?: number | null) => Promise<Diagram | null>
  saveDiagram: (id: number, content: Record<string, unknown>, thumbnail?: string) => Promise<void>
  renameDiagram: (id: number, title: string) => Promise<void>
  moveDiagram: (id: number, projectId: number | null) => Promise<void>
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
  projects: [],
  diagrams: [],
  currentDiagram: null,
  currentProjectId: null,
  view: 'gallery',
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
  error: null,

  // Project Actions
  fetchProjects: async () => {
    try {
      const projects = await request<WhiteboardProject[]>('/whiteboard/projects')
      set({ projects })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch projects'
      set({ error: message })
    }
  },

  createProject: async (name: string) => {
    try {
      const project = await request<WhiteboardProject>('/whiteboard/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      set({ projects: [...get().projects, project] })
      return project
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create project'
      set({ error: message })
      return null
    }
  },

  renameProject: async (id: number, name: string) => {
    try {
      await request(`/whiteboard/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      set({ projects: get().projects.map(p => p.id === id ? { ...p, name } : p) })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to rename project'
      set({ error: message })
    }
  },

  deleteProject: async (id: number) => {
    try {
      await request(`/whiteboard/projects/${id}`, { method: 'DELETE' })
      set({
        projects: get().projects.filter(p => p.id !== id),
        currentProjectId: get().currentProjectId === id ? null : get().currentProjectId,
      })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete project'
      set({ error: message })
      return false
    }
  },

  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  // Diagram Actions
  fetchDiagrams: async (projectId?: number | null) => {
    set({ isLoading: true, error: null })
    try {
      const url = projectId !== undefined && projectId !== null
        ? `/whiteboard/?project_id=${projectId}`
        : '/whiteboard/'
      const diagrams = await request<DiagramListItem[]>(url)
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

  createDiagram: async (title?: string, projectId?: number | null) => {
    try {
      const body: Record<string, unknown> = { title: title || 'Untitled' }
      if (projectId !== undefined && projectId !== null) {
        body.project_id = projectId
      }

      const diagram = await request<Diagram>('/whiteboard/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      set({
        diagrams: [{
          id: diagram.id,
          title: diagram.title,
          thumbnail: diagram.thumbnail,
          project_id: diagram.project_id,
          created_at: diagram.created_at,
          updated_at: diagram.updated_at,
        }, ...get().diagrams],
        currentDiagram: diagram,
      })
      // Update project diagram count
      if (projectId) {
        set({
          projects: get().projects.map(p =>
            p.id === projectId ? { ...p, diagram_count: p.diagram_count + 1 } : p
          ),
        })
      }
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
      await request(`/whiteboard/${id}`, {
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

  moveDiagram: async (id: number, projectId: number | null) => {
    const oldDiagram = get().diagrams.find(d => d.id === id)
    const oldProjectId = oldDiagram?.project_id

    try {
      await request(`/whiteboard/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId ?? 0 }),
      })

      // Update diagram's project_id
      set({
        diagrams: get().diagrams.map(d =>
          d.id === id ? { ...d, project_id: projectId } : d
        ),
      })

      // Update project counts
      set({
        projects: get().projects.map(p => {
          if (p.id === oldProjectId) return { ...p, diagram_count: p.diagram_count - 1 }
          if (p.id === projectId) return { ...p, diagram_count: p.diagram_count + 1 }
          return p
        }),
      })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to move diagram'
      set({ error: message })
    }
  },

  deleteDiagram: async (id: number) => {
    const diagram = get().diagrams.find(d => d.id === id)
    try {
      await request(`/whiteboard/${id}`, { method: 'DELETE' })
      set({
        diagrams: get().diagrams.filter(d => d.id !== id),
        currentDiagram: get().currentDiagram?.id === id ? null : get().currentDiagram,
      })
      // Update project count
      if (diagram?.project_id) {
        set({
          projects: get().projects.map(p =>
            p.id === diagram.project_id ? { ...p, diagram_count: p.diagram_count - 1 } : p
          ),
        })
      }
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
