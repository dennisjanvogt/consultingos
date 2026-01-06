import type { AITool } from './types'

export const windowTools: AITool[] = [
  {
    name: 'open_app',
    description: 'Öffnet eine App im ConsultingOS Desktop',
    parameters: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description: 'Die zu öffnende App',
          enum: ['dashboard', 'masterdata', 'transactions', 'calendar', 'documents', 'settings', 'timetracking', 'kanban', 'imageviewer', 'aidashboard', 'chess']
        }
      },
      required: ['app']
    },
    execute: async (args, ctx) => {
      const appId = args.app as string
      ctx.openWindow(appId as any)
      ctx.onClose()
      return `App "${appId}" wurde geöffnet.`
    }
  },
  {
    name: 'close_app',
    description: 'Schließt eine geöffnete App/Fenster im ConsultingOS Desktop',
    parameters: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description: 'Die zu schließende App',
          enum: ['dashboard', 'masterdata', 'transactions', 'calendar', 'documents', 'settings', 'timetracking', 'kanban', 'imageviewer', 'aidashboard', 'chess', 'chat']
        }
      },
      required: ['app']
    },
    execute: async (args, ctx) => {
      const appId = args.app as string
      ctx.closeWindowByAppId(appId as any)
      return `App "${appId}" wurde geschlossen.`
    }
  }
]
