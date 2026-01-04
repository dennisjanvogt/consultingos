import { useCalendarStore } from '@/stores/calendarStore'
import type { AITool } from './types'

export const calendarTools: AITool[] = [
  {
    name: 'create_calendar_event',
    description: 'Erstellt einen neuen Kalendertermin',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titel des Termins' },
        date: { type: 'string', description: 'Datum im Format YYYY-MM-DD (Standard: heute)' },
        start_time: { type: 'string', description: 'Startzeit im Format HH:MM (Standard: 09:00)' },
        end_time: { type: 'string', description: 'Endzeit im Format HH:MM (Standard: 10:00)' },
        location: { type: 'string', description: 'Ort des Termins' },
        description: { type: 'string', description: 'Beschreibung des Termins' },
        color: { type: 'string', description: 'Farbe', enum: ['violet', 'green', 'red', 'purple', 'orange', 'pink'] }
      },
      required: ['title']
    },
    execute: async (args, ctx) => {
      const { addEvent } = useCalendarStore.getState()
      const today = new Date().toISOString().split('T')[0]

      const event = await addEvent({
        title: args.title as string,
        date: (args.date as string) || today,
        start_time: (args.start_time as string) || '09:00',
        end_time: (args.end_time as string) || '10:00',
        location: (args.location as string) || '',
        description: (args.description as string) || '',
        color: (args.color as string) || 'violet'
      })

      if (event) {
        ctx.openWindow('calendar')
        ctx.onClose()
        return `Termin "${event.title}" am ${event.date} um ${event.start_time} wurde erstellt.`
      }
      return 'Fehler beim Erstellen des Termins.'
    }
  },

  {
    name: 'list_calendar_events',
    description: 'Listet Kalendertermine auf. Kann nach Datum filtern oder die nächsten Termine anzeigen.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Datum im Format YYYY-MM-DD für einen bestimmten Tag' },
        upcoming_days: { type: 'string', description: 'Anzahl Tage für kommende Termine (Standard: 7)' }
      },
      required: []
    },
    execute: async (args) => {
      const { fetchEvents, getEventsForDate, getUpcomingEvents } = useCalendarStore.getState()
      await fetchEvents()

      let events
      let title

      if (args.date) {
        events = getEventsForDate(args.date as string)
        title = `Termine am ${args.date}`
      } else {
        const days = args.upcoming_days ? parseInt(args.upcoming_days as string) : 7
        events = getUpcomingEvents(days)
        title = `Kommende Termine (nächste ${days} Tage)`
      }

      if (events.length === 0) {
        return args.date ? `Keine Termine am ${args.date}.` : 'Keine kommenden Termine.'
      }

      const list = events.map(e =>
        `- [ID ${e.id}] ${e.date} ${e.start_time}-${e.end_time}: ${e.title}${e.location ? ` (${e.location})` : ''}`
      ).join('\n')

      return `${title}:\n${list}`
    }
  },

  {
    name: 'delete_calendar_event',
    description: 'Löscht einen Kalendertermin anhand der ID',
    parameters: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Die ID des zu löschenden Termins' }
      },
      required: ['event_id']
    },
    execute: async (args) => {
      const { deleteEvent } = useCalendarStore.getState()
      const eventId = parseInt(args.event_id as string)
      const success = await deleteEvent(eventId)

      if (success) {
        return `Termin mit ID ${eventId} wurde gelöscht.`
      }
      return `Termin mit ID ${eventId} wurde nicht gefunden.`
    }
  },

  {
    name: 'update_calendar_event',
    description: 'Aktualisiert einen bestehenden Kalendertermin',
    parameters: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Die ID des Termins' },
        title: { type: 'string', description: 'Neuer Titel' },
        date: { type: 'string', description: 'Neues Datum (YYYY-MM-DD)' },
        start_time: { type: 'string', description: 'Neue Startzeit (HH:MM)' },
        end_time: { type: 'string', description: 'Neue Endzeit (HH:MM)' },
        location: { type: 'string', description: 'Neuer Ort' },
        description: { type: 'string', description: 'Neue Beschreibung' }
      },
      required: ['event_id']
    },
    execute: async (args, ctx) => {
      const { updateEvent } = useCalendarStore.getState()
      const eventId = parseInt(args.event_id as string)

      const updates: Record<string, unknown> = {}
      if (args.title) updates.title = args.title
      if (args.date) updates.date = args.date
      if (args.start_time) updates.start_time = args.start_time
      if (args.end_time) updates.end_time = args.end_time
      if (args.location) updates.location = args.location
      if (args.description) updates.description = args.description

      const event = await updateEvent(eventId, updates as any)
      if (event) {
        ctx.openWindow('calendar')
        return `Termin "${event.title}" wurde aktualisiert.`
      }
      return `Termin mit ID ${eventId} wurde nicht gefunden.`
    }
  },

  {
    name: 'enable_meeting',
    description: 'Aktiviert Video-Meeting für einen Kalendertermin',
    parameters: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Die ID des Termins' }
      },
      required: ['event_id']
    },
    execute: async (args, ctx) => {
      const { enableMeeting } = useCalendarStore.getState()
      const eventId = parseInt(args.event_id as string)
      const result = await enableMeeting(eventId)

      if (result) {
        ctx.openWindow('calendar')
        return `Video-Meeting wurde für den Termin aktiviert. Meeting-Link: ${result.meeting_link || 'wird generiert'}`
      }
      return `Konnte Meeting nicht aktivieren. Termin mit ID ${eventId} nicht gefunden.`
    }
  }
]
