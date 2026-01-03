import { create } from 'zustand'
import { ApiError } from '@/api/client'
import type { CalendarEvent, CalendarEventCreate, CalendarEventUpdate, EventInvitation } from '@/api/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface CalendarState {
  events: CalendarEvent[]
  isLoading: boolean
  error: string | null
  selectedEventId: number | null

  // Actions
  fetchEvents: (startDate?: string, endDate?: string) => Promise<void>
  addEvent: (event: CalendarEventCreate) => Promise<CalendarEvent | null>
  updateEvent: (id: number, event: CalendarEventUpdate) => Promise<CalendarEvent | null>
  deleteEvent: (id: number) => Promise<boolean>
  setSelectedEventId: (id: number | null) => void

  // Meeting actions
  enableMeeting: (eventId: number) => Promise<CalendarEvent | null>
  inviteAttendee: (eventId: number, email: string, name?: string) => Promise<EventInvitation | null>
  removeInvitation: (invitationId: number, eventId: number) => Promise<boolean>

  // Computed helpers
  getEventsForDate: (date: string) => CalendarEvent[]
  getUpcomingEvents: (days?: number) => CalendarEvent[]
  searchEvents: (query: string) => CalendarEvent[]
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

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,
  selectedEventId: null,

  fetchEvents: async (startDate, endDate) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      const queryString = params.toString() ? `?${params.toString()}` : ''
      const events = await request<CalendarEvent[]>(`/calendar/${queryString}`)
      set({ events, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch events'
      set({ error: message, isLoading: false })
    }
  },

  addEvent: async (eventData) => {
    try {
      const event = await request<CalendarEvent>('/calendar/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      })
      set({ events: [...get().events, event] })
      return event
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create event'
      set({ error: message })
      return null
    }
  },

  updateEvent: async (id, eventData) => {
    try {
      const event = await request<CalendarEvent>(`/calendar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      })
      set({ events: get().events.map((e) => (e.id === id ? event : e)) })
      return event
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update event'
      set({ error: message })
      return null
    }
  },

  deleteEvent: async (id) => {
    try {
      await request(`/calendar/${id}`, { method: 'DELETE' })
      set({ events: get().events.filter((e) => e.id !== id) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete event'
      set({ error: message })
      return false
    }
  },

  setSelectedEventId: (id) => {
    set({ selectedEventId: id })
  },

  enableMeeting: async (eventId) => {
    try {
      const event = await request<CalendarEvent>(`/calendar/${eventId}/meeting`, {
        method: 'POST',
      })
      set({ events: get().events.map((e) => (e.id === eventId ? event : e)) })
      return event
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to enable meeting'
      set({ error: message })
      return null
    }
  },

  inviteAttendee: async (eventId, email, name) => {
    try {
      const invitation = await request<EventInvitation>(`/calendar/${eventId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || '' }),
      })
      // Refresh event to get updated invitations
      const event = await request<CalendarEvent>(`/calendar/${eventId}`)
      set({ events: get().events.map((e) => (e.id === eventId ? event : e)) })
      return invitation
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to invite attendee'
      set({ error: message })
      return null
    }
  },

  removeInvitation: async (invitationId, eventId) => {
    try {
      await request(`/calendar/invitation/${invitationId}`, { method: 'DELETE' })
      // Refresh event to get updated invitations
      const event = await request<CalendarEvent>(`/calendar/${eventId}`)
      set({ events: get().events.map((e) => (e.id === eventId ? event : e)) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to remove invitation'
      set({ error: message })
      return false
    }
  },

  getEventsForDate: (date) => {
    return get().events.filter((e) => e.date === date)
  },

  getUpcomingEvents: (days = 7) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + days)

    return get()
      .events.filter((e) => {
        const eventDate = new Date(e.date)
        return eventDate >= today && eventDate <= endDate
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        return a.start_time.localeCompare(b.start_time)
      })
  },

  searchEvents: (query) => {
    const lowerQuery = query.toLowerCase()
    return get().events.filter(
      (e) =>
        e.title.toLowerCase().includes(lowerQuery) ||
        e.description?.toLowerCase().includes(lowerQuery) ||
        e.location?.toLowerCase().includes(lowerQuery)
    )
  },
}))
