import type { AITool } from './types'
import { useAIDashboardStore, type ChartType } from '@/stores/aiDashboardStore'

export const dashboardTools: AITool[] = [
  {
    name: 'show_chart',
    description:
      'Erstellt ein Diagramm im AI Dashboard. Unterstützt Bar, Line, Pie, Area und Scatter Charts. Daten müssen als JSON-Array übergeben werden mit name/value Paaren.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titel des Diagramms',
        },
        chart_type: {
          type: 'string',
          description: 'Art des Diagramms',
          enum: ['bar', 'line', 'pie', 'area', 'scatter'],
        },
        data_json: {
          type: 'string',
          description:
            'JSON-Array mit Datenpunkten. Format: [{"name": "Label1", "value": 100}, {"name": "Label2", "value": 200}]',
        },
        color: {
          type: 'string',
          description: 'Optionale Farbe als Hex-Code (z.B. #8b5cf6). Standard: Violett',
        },
      },
      required: ['title', 'chart_type', 'data_json'],
    },
    execute: async (args, ctx) => {
      try {
        const data = JSON.parse(args.data_json as string)

        if (!Array.isArray(data)) {
          return 'Fehler: data_json muss ein Array sein'
        }

        const { addWidget } = useAIDashboardStore.getState()

        addWidget({
          type: 'chart',
          title: args.title as string,
          chartType: args.chart_type as ChartType,
          data,
          color: (args.color as string) || '#8b5cf6',
        })

        ctx.openWindow('aidashboard')
        ctx.onClose()  // Schließt Spotlight
        return `Diagramm "${args.title}" wurde im AI Dashboard erstellt.`
      } catch (error) {
        return `Fehler beim Erstellen des Diagramms: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    },
  },

  {
    name: 'show_info',
    description:
      'Zeigt eine Info-Karte im AI Dashboard an. Unterstützt Markdown für Formatierung.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titel der Info-Karte',
        },
        content: {
          type: 'string',
          description: 'Inhalt der Info-Karte (unterstützt Markdown)',
        },
      },
      required: ['title', 'content'],
    },
    execute: async (args, ctx) => {
      const { addWidget } = useAIDashboardStore.getState()

      addWidget({
        type: 'info',
        title: args.title as string,
        data: args.content as string,
      })

      ctx.openWindow('aidashboard')
      ctx.onClose()  // Schließt Spotlight
      return `Info-Karte "${args.title}" wurde im AI Dashboard erstellt.`
    },
  },

  {
    name: 'show_table',
    description:
      'Zeigt eine Tabelle im AI Dashboard an. Daten werden als 2D-Array übergeben, wobei die erste Zeile die Spaltenüberschriften enthält.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titel der Tabelle',
        },
        data_json: {
          type: 'string',
          description:
            'JSON 2D-Array. Erste Zeile = Überschriften. Format: [["Spalte1", "Spalte2"], ["Wert1", "Wert2"], ["Wert3", "Wert4"]]',
        },
      },
      required: ['title', 'data_json'],
    },
    execute: async (args, ctx) => {
      try {
        const data = JSON.parse(args.data_json as string)

        if (!Array.isArray(data) || !Array.isArray(data[0])) {
          return 'Fehler: data_json muss ein 2D-Array sein'
        }

        const { addWidget } = useAIDashboardStore.getState()

        addWidget({
          type: 'table',
          title: args.title as string,
          data,
        })

        ctx.openWindow('aidashboard')
        ctx.onClose()  // Schließt Spotlight
        return `Tabelle "${args.title}" wurde im AI Dashboard erstellt.`
      } catch (error) {
        return `Fehler beim Erstellen der Tabelle: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    },
  },

  {
    name: 'clear_dashboard',
    description: 'Löscht alle Widgets aus dem AI Dashboard.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: async (args, ctx) => {
      const { clearWidgets } = useAIDashboardStore.getState()
      clearWidgets()
      return 'Das AI Dashboard wurde geleert.'
    },
  },
]
