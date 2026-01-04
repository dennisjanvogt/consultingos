import { create } from 'zustand'
import { ApiError } from '@/api/client'
import type {
  TimeTrackingClient,
  TimeTrackingClientCreate,
  TimeTrackingClientUpdate,
  TimeTrackingProject,
  TimeTrackingProjectCreate,
  TimeTrackingProjectUpdate,
  TimeEntry,
  TimeEntryCreate,
  TimeEntryUpdate,
  TimeTrackingSummary,
} from '@/api/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export type TimeTrackingTab = 'entries' | 'projects' | 'clients' | 'reports'

export interface TimerState {
  isRunning: boolean
  isPaused: boolean
  startTime: number | null  // Timestamp when started
  pausedTime: number  // Accumulated time when paused (in ms)
  projectId: number | null
  description: string
}

interface TimeTrackingState {
  clients: TimeTrackingClient[]
  projects: TimeTrackingProject[]
  entries: TimeEntry[]
  summary: TimeTrackingSummary | null
  isLoading: boolean
  error: string | null
  selectedDate: string | null
  activeTab: TimeTrackingTab

  // Timer state
  timer: TimerState

  // Timer actions
  startTimer: (projectId?: number, description?: string) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => Promise<TimeEntry | null>
  resetTimer: () => void
  setTimerProject: (projectId: number | null) => void
  setTimerDescription: (description: string) => void

  // Client actions
  fetchClients: () => Promise<void>
  addClient: (client: TimeTrackingClientCreate) => Promise<TimeTrackingClient | null>
  updateClient: (id: number, client: TimeTrackingClientUpdate) => Promise<TimeTrackingClient | null>
  deleteClient: (id: number) => Promise<boolean>

  // Project actions
  fetchProjects: (status?: string, clientId?: number) => Promise<void>
  addProject: (project: TimeTrackingProjectCreate) => Promise<TimeTrackingProject | null>
  updateProject: (id: number, project: TimeTrackingProjectUpdate) => Promise<TimeTrackingProject | null>
  deleteProject: (id: number) => Promise<boolean>

  // Entry actions
  fetchEntries: (dateFrom?: string, dateTo?: string, projectId?: number) => Promise<void>
  addEntry: (entry: TimeEntryCreate) => Promise<TimeEntry | null>
  updateEntry: (id: number, entry: TimeEntryUpdate) => Promise<TimeEntry | null>
  deleteEntry: (id: number) => Promise<boolean>

  // Summary
  fetchSummary: (dateFrom?: string, dateTo?: string) => Promise<void>

  // Helpers
  setSelectedDate: (date: string | null) => void
  getEntriesForDate: (date: string) => TimeEntry[]
  getActiveProjects: () => TimeTrackingProject[]
  setActiveTab: (tab: TimeTrackingTab) => void
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

export const useTimeTrackingStore = create<TimeTrackingState>((set, get) => ({
  clients: [],
  activeTab: 'entries',
  projects: [],
  entries: [],
  summary: null,
  isLoading: false,
  error: null,
  selectedDate: null,

  // Timer state
  timer: {
    isRunning: false,
    isPaused: false,
    startTime: null,
    pausedTime: 0,
    projectId: null,
    description: '',
  },

  // ===== Timer Actions =====

  startTimer: (projectId, description) => {
    set({
      timer: {
        isRunning: true,
        isPaused: false,
        startTime: Date.now(),
        pausedTime: 0,
        projectId: projectId ?? null,
        description: description ?? '',
      },
    })
  },

  pauseTimer: () => {
    const { timer } = get()
    if (!timer.isRunning || timer.isPaused) return

    const elapsed = timer.startTime ? Date.now() - timer.startTime : 0
    set({
      timer: {
        ...timer,
        isPaused: true,
        pausedTime: timer.pausedTime + elapsed,
        startTime: null,
      },
    })
  },

  resumeTimer: () => {
    const { timer } = get()
    if (!timer.isPaused) return

    set({
      timer: {
        ...timer,
        isPaused: false,
        isRunning: true,
        startTime: Date.now(),
      },
    })
  },

  stopTimer: async () => {
    const { timer, addEntry } = get()
    if (!timer.isRunning && !timer.isPaused) return null

    // Calculate total elapsed time
    let totalMs = timer.pausedTime
    if (timer.startTime && !timer.isPaused) {
      totalMs += Date.now() - timer.startTime
    }

    // Convert to hours and minutes
    const totalMinutes = Math.round(totalMs / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    // Create time entry if we have a project and meaningful duration
    let entry: TimeEntry | null = null
    if (timer.projectId && totalMinutes >= 1) {
      const now = new Date()
      const startTime = new Date(now.getTime() - totalMs)

      entry = await addEntry({
        project: timer.projectId,
        date: now.toISOString().split('T')[0],
        start_time: startTime.toTimeString().slice(0, 5),
        end_time: now.toTimeString().slice(0, 5),
        description: timer.description || `Timer: ${hours}h ${minutes}m`,
      })
    }

    // Reset timer
    set({
      timer: {
        isRunning: false,
        isPaused: false,
        startTime: null,
        pausedTime: 0,
        projectId: null,
        description: '',
      },
    })

    return entry
  },

  resetTimer: () => {
    set({
      timer: {
        isRunning: false,
        isPaused: false,
        startTime: null,
        pausedTime: 0,
        projectId: get().timer.projectId,
        description: get().timer.description,
      },
    })
  },

  setTimerProject: (projectId) => {
    set((state) => ({
      timer: { ...state.timer, projectId },
    }))
  },

  setTimerDescription: (description) => {
    set((state) => ({
      timer: { ...state.timer, description },
    }))
  },

  // ===== Client Actions =====

  fetchClients: async () => {
    set({ isLoading: true, error: null })
    try {
      const clients = await request<TimeTrackingClient[]>('/timetracking/clients/')
      set({ clients, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch clients'
      set({ error: message, isLoading: false })
    }
  },

  addClient: async (clientData) => {
    try {
      const client = await request<TimeTrackingClient>('/timetracking/clients/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      })
      set({ clients: [...get().clients, client] })
      return client
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create client'
      set({ error: message })
      return null
    }
  },

  updateClient: async (id, clientData) => {
    try {
      const client = await request<TimeTrackingClient>(`/timetracking/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      })
      set({ clients: get().clients.map((c) => (c.id === id ? client : c)) })
      return client
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update client'
      set({ error: message })
      return null
    }
  },

  deleteClient: async (id) => {
    try {
      await request(`/timetracking/clients/${id}`, { method: 'DELETE' })
      set({ clients: get().clients.filter((c) => c.id !== id) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete client'
      set({ error: message })
      return false
    }
  },

  // ===== Project Actions =====

  fetchProjects: async (status, clientId) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      if (clientId) params.append('client_id', String(clientId))
      const queryString = params.toString() ? `?${params.toString()}` : ''
      const projects = await request<TimeTrackingProject[]>(`/timetracking/projects/${queryString}`)
      set({ projects, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch projects'
      set({ error: message, isLoading: false })
    }
  },

  addProject: async (projectData) => {
    try {
      const project = await request<TimeTrackingProject>('/timetracking/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      })
      set({ projects: [...get().projects, project] })
      return project
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create project'
      set({ error: message })
      return null
    }
  },

  updateProject: async (id, projectData) => {
    try {
      const project = await request<TimeTrackingProject>(`/timetracking/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      })
      set({ projects: get().projects.map((p) => (p.id === id ? project : p)) })
      return project
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update project'
      set({ error: message })
      return null
    }
  },

  deleteProject: async (id) => {
    try {
      await request(`/timetracking/projects/${id}`, { method: 'DELETE' })
      set({ projects: get().projects.filter((p) => p.id !== id) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete project'
      set({ error: message })
      return false
    }
  },

  // ===== Entry Actions =====

  fetchEntries: async (dateFrom, dateTo, projectId) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      if (projectId) params.append('project_id', String(projectId))
      const queryString = params.toString() ? `?${params.toString()}` : ''
      const entries = await request<TimeEntry[]>(`/timetracking/entries/${queryString}`)
      set({ entries, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch entries'
      set({ error: message, isLoading: false })
    }
  },

  addEntry: async (entryData) => {
    try {
      const entry = await request<TimeEntry>('/timetracking/entries/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData),
      })
      set({ entries: [entry, ...get().entries] })
      return entry
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create entry'
      set({ error: message })
      return null
    }
  },

  updateEntry: async (id, entryData) => {
    try {
      const entry = await request<TimeEntry>(`/timetracking/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData),
      })
      set({ entries: get().entries.map((e) => (e.id === id ? entry : e)) })
      return entry
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update entry'
      set({ error: message })
      return null
    }
  },

  deleteEntry: async (id) => {
    try {
      await request(`/timetracking/entries/${id}`, { method: 'DELETE' })
      set({ entries: get().entries.filter((e) => e.id !== id) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete entry'
      set({ error: message })
      return false
    }
  },

  // ===== Summary =====

  fetchSummary: async (dateFrom, dateTo) => {
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      const queryString = params.toString() ? `?${params.toString()}` : ''
      const summary = await request<TimeTrackingSummary>(`/timetracking/summary/${queryString}`)
      set({ summary })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch summary'
      set({ error: message })
    }
  },

  // ===== Helpers =====

  setSelectedDate: (date) => {
    set({ selectedDate: date })
  },

  getEntriesForDate: (date) => {
    return get().entries.filter((e) => e.date === date)
  },

  getActiveProjects: () => {
    return get().projects.filter((p) => p.status === 'active')
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab })
  },
}))
