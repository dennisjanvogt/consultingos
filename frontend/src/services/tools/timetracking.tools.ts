import { useTimeTrackingStore } from '@/stores/timetrackingStore'
import type { AITool } from './types'

export const timetrackingTools: AITool[] = [
  // Timer Controls
  {
    name: 'start_timer',
    description: 'Startet den Timer für Zeiterfassung. Optional mit Projekt und Beschreibung.',
    parameters: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Projekt-ID (aus list_timetracking_projects)' },
        description: { type: 'string', description: 'Beschreibung der Tätigkeit' }
      },
      required: []
    },
    execute: async (args, ctx) => {
      const { startTimer, timer } = useTimeTrackingStore.getState()

      if (timer.isRunning) {
        return 'Timer läuft bereits. Stoppe ihn zuerst mit stop_timer.'
      }

      const projectId = args.project_id ? parseInt(args.project_id as string) : undefined
      startTimer(projectId, args.description as string)

      ctx.openWindow('timetracking')
      return `Timer gestartet${args.description ? ` für: ${args.description}` : ''}.`
    }
  },

  {
    name: 'stop_timer',
    description: 'Stoppt den laufenden Timer und speichert den Zeiteintrag',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async (args, ctx) => {
      const { stopTimer, timer } = useTimeTrackingStore.getState()

      if (!timer.isRunning && !timer.isPaused) {
        return 'Kein Timer aktiv.'
      }

      const entry = await stopTimer()
      if (entry) {
        ctx.openWindow('timetracking')
        const hours = (entry.duration_minutes / 60).toFixed(1)
        return `Timer gestoppt. ${entry.duration_minutes} Minuten (${hours}h) erfasst für "${entry.project_name}".`
      }
      return 'Timer gestoppt, aber kein Eintrag erstellt (kein Projekt ausgewählt?).'
    }
  },

  {
    name: 'pause_timer',
    description: 'Pausiert den laufenden Timer',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async (args, ctx) => {
      const { pauseTimer, timer } = useTimeTrackingStore.getState()

      if (!timer.isRunning) {
        return timer.isPaused ? 'Timer ist bereits pausiert.' : 'Kein Timer aktiv.'
      }

      pauseTimer()
      ctx.openWindow('timetracking')
      return 'Timer pausiert.'
    }
  },

  {
    name: 'resume_timer',
    description: 'Setzt einen pausierten Timer fort',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async (args, ctx) => {
      const { resumeTimer, timer } = useTimeTrackingStore.getState()

      if (!timer.isPaused) {
        return timer.isRunning ? 'Timer läuft bereits.' : 'Kein pausierter Timer vorhanden.'
      }

      resumeTimer()
      ctx.openWindow('timetracking')
      return 'Timer fortgesetzt.'
    }
  },

  // Client Management
  {
    name: 'list_timetracking_clients',
    description: 'Listet alle Zeiterfassungs-Kunden auf',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      const { fetchClients } = useTimeTrackingStore.getState()
      await fetchClients()

      const clients = useTimeTrackingStore.getState().clients
      if (clients.length === 0) {
        return 'Keine Zeiterfassungs-Kunden vorhanden. Erstelle zuerst einen Kunden in der Zeiterfassungs-App.'
      }

      const list = clients.map(c => `- ID ${c.id}: ${c.name}`).join('\n')
      return `Zeiterfassungs-Kunden:\n${list}`
    }
  },

  // Project Management
  {
    name: 'list_timetracking_projects',
    description: 'Listet alle Zeiterfassungs-Projekte auf mit IDs, Namen, Stundensätzen und zugehörigen Kunden',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter nach Status', enum: ['active', 'archived'] }
      },
      required: []
    },
    execute: async (args) => {
      const { fetchProjects } = useTimeTrackingStore.getState()
      await fetchProjects(args.status as string)

      const projects = useTimeTrackingStore.getState().projects
      if (projects.length === 0) {
        return 'Keine Projekte vorhanden. Erstelle zuerst ein Projekt in der Zeiterfassungs-App.'
      }

      const list = projects.map(p =>
        `- ID ${p.id}: ${p.name} (Kunde: ${p.client_name}, ${p.hourly_rate}EUR/h)`
      ).join('\n')

      return `Projekte:\n${list}`
    }
  },

  // Time Entry Management
  {
    name: 'create_time_entry',
    description: 'Erstellt einen neuen Zeiteintrag für die Zeiterfassung. WICHTIG: Nutze zuerst list_timetracking_projects um die Projekt-ID zu finden.',
    parameters: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Projekt-ID (Pflicht - aus list_timetracking_projects)' },
        date: { type: 'string', description: 'Datum im Format YYYY-MM-DD (Standard: heute)' },
        start_time: { type: 'string', description: 'Startzeit im Format HH:MM' },
        end_time: { type: 'string', description: 'Endzeit im Format HH:MM' },
        description: { type: 'string', description: 'Beschreibung der Tätigkeit' },
        billable: { type: 'string', description: 'Abrechenbar', enum: ['true', 'false'] }
      },
      required: ['project_id', 'start_time', 'end_time']
    },
    execute: async (args, ctx) => {
      const { addEntry } = useTimeTrackingStore.getState()
      const today = new Date().toISOString().split('T')[0]

      const entry = await addEntry({
        project: parseInt(args.project_id as string),
        date: (args.date as string) || today,
        start_time: args.start_time as string,
        end_time: args.end_time as string,
        description: (args.description as string) || '',
        billable: args.billable !== 'false'
      })

      if (entry) {
        ctx.openWindow('timetracking')
        ctx.onClose()
        const hours = (entry.duration_minutes / 60).toFixed(1)
        return `Zeiteintrag erstellt: ${entry.start_time}-${entry.end_time} (${hours}h) für Projekt "${entry.project_name}".`
      }
      return 'Fehler beim Erstellen des Zeiteintrags. Stelle sicher, dass die Projekt-ID existiert.'
    }
  },

  // Summary & Reporting
  {
    name: 'get_timetracking_summary',
    description: 'Zeigt eine Zusammenfassung der erfassten Zeiten (Stunden, Umsatz, Projekte)',
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'Startdatum (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Enddatum (YYYY-MM-DD)' }
      },
      required: []
    },
    execute: async (args) => {
      const { fetchSummary } = useTimeTrackingStore.getState()

      // Default: aktuelle Woche
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay() + 1) // Montag
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6) // Sonntag

      const dateFrom = (args.date_from as string) || weekStart.toISOString().split('T')[0]
      const dateTo = (args.date_to as string) || weekEnd.toISOString().split('T')[0]

      await fetchSummary(dateFrom, dateTo)
      const summary = useTimeTrackingStore.getState().summary

      if (!summary) {
        return 'Keine Zeiterfassungsdaten verfügbar.'
      }

      let result = `Zeiterfassung ${dateFrom} bis ${dateTo}:\n`
      result += `- Gesamtstunden: ${summary.total_hours.toFixed(1)}h\n`
      result += `- Umsatz: ${summary.total_revenue.toFixed(2)} EUR\n`
      result += `- Einträge: ${summary.entries_count}\n`

      if (summary.by_project && summary.by_project.length > 0) {
        result += `\nNach Projekt:\n`
        summary.by_project.forEach((p) => {
          result += `- ${p.project_name}: ${p.hours.toFixed(1)}h (${p.revenue.toFixed(2)} EUR)\n`
        })
      }

      return result
    }
  }
]
