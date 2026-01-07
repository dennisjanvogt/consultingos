import { useWorkflowStore } from '@/stores/workflowStore'
import { useConfirmStore } from '@/stores/confirmStore'
import type { AITool } from './types'

const STATUS_NAMES: Record<string, string> = {
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Abgeschlossen'
}

export const workflowTools: AITool[] = [
  {
    name: 'list_workflow_templates',
    description: 'Listet alle Workflow-Vorlagen auf',
    parameters: {
      type: 'object',
      properties: {
        category_id: { type: 'string', description: 'Kategorie-ID zum Filtern (optional)' }
      },
      required: []
    },
    execute: async (args) => {
      const { fetchTemplates, templates } = useWorkflowStore.getState()
      const categoryId = args.category_id ? parseInt(args.category_id as string) : undefined
      await fetchTemplates(categoryId)

      const list = useWorkflowStore.getState().templates
      if (list.length === 0) {
        return 'Keine Workflow-Vorlagen vorhanden.'
      }

      const result = list.map(t => {
        const category = t.category_name ? ` [${t.category_name}]` : ''
        return `- [ID ${t.id}]${category} ${t.name} (${t.step_count} Schritte)`
      }).join('\n')

      return `${list.length} Vorlagen gefunden:\n${result}`
    }
  },

  {
    name: 'list_active_workflows',
    description: 'Listet alle aktiven Workflows mit Fortschritt',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Status-Filter: active, paused, completed', enum: ['active', 'paused', 'completed'] }
      },
      required: []
    },
    execute: async (args) => {
      const { fetchInstances } = useWorkflowStore.getState()
      const status = (args.status as string) || 'active'
      await fetchInstances(status)

      const list = useWorkflowStore.getState().instances
      if (list.length === 0) {
        return `Keine ${STATUS_NAMES[status] || status} Workflows vorhanden.`
      }

      const result = list.map(i => {
        const customer = i.customer_name ? ` | ${i.customer_name}` : ''
        return `- [ID ${i.id}] ${i.name}${customer} - ${i.progress}% (${STATUS_NAMES[i.status]})`
      }).join('\n')

      return `${list.length} Workflows gefunden:\n${result}`
    }
  },

  {
    name: 'start_workflow',
    description: 'Startet einen neuen Workflow basierend auf einer Vorlage',
    parameters: {
      type: 'object',
      properties: {
        template_id: { type: 'string', description: 'ID der Workflow-Vorlage' },
        name: { type: 'string', description: 'Name des Workflows (optional)' },
        customer_id: { type: 'string', description: 'Kunden-ID für Verknüpfung (optional)' },
        project_id: { type: 'string', description: 'Projekt-ID für Verknüpfung (optional)' }
      },
      required: ['template_id']
    },
    execute: async (args, ctx) => {
      const { createInstance } = useWorkflowStore.getState()

      const instance = await createInstance({
        template_id: parseInt(args.template_id as string),
        name: args.name as string | undefined,
        customer_id: args.customer_id ? parseInt(args.customer_id as string) : undefined,
        project_id: args.project_id ? parseInt(args.project_id as string) : undefined,
      })

      if (instance) {
        ctx.openWindow('workflows')
        return `Workflow "${instance.name}" wurde gestartet. ${instance.steps.length} Schritte.`
      }
      return 'Fehler beim Starten des Workflows.'
    }
  },

  {
    name: 'toggle_workflow_step',
    description: 'Markiert einen Workflow-Schritt als erledigt oder offen',
    parameters: {
      type: 'object',
      properties: {
        instance_id: { type: 'string', description: 'Workflow-ID' },
        step_id: { type: 'string', description: 'Schritt-ID' }
      },
      required: ['instance_id', 'step_id']
    },
    execute: async (args, ctx) => {
      const { toggleInstanceStep, getInstance } = useWorkflowStore.getState()
      const instanceId = parseInt(args.instance_id as string)
      const stepId = parseInt(args.step_id as string)

      const step = await toggleInstanceStep(instanceId, stepId)
      if (step) {
        const instance = await getInstance(instanceId)
        ctx.openWindow('workflows')
        const status = step.is_completed ? 'erledigt' : 'offen'
        return `Schritt "${step.title}" als ${status} markiert. Workflow-Fortschritt: ${instance?.progress || 0}%`
      }
      return 'Fehler beim Ändern des Schritt-Status.'
    }
  },

  {
    name: 'get_workflow_progress',
    description: 'Zeigt den Fortschritt eines bestimmten Workflows',
    parameters: {
      type: 'object',
      properties: {
        instance_id: { type: 'string', description: 'Workflow-ID' }
      },
      required: ['instance_id']
    },
    execute: async (args, ctx) => {
      const { getInstance } = useWorkflowStore.getState()
      const instanceId = parseInt(args.instance_id as string)

      const instance = await getInstance(instanceId)
      if (!instance) {
        return `Workflow mit ID ${instanceId} nicht gefunden.`
      }

      const completedSteps = instance.steps.filter(s => s.is_completed).length
      const totalSteps = instance.steps.length

      const stepList = instance.steps
        .filter(s => s.parent_id === null)
        .map(s => {
          const check = s.is_completed ? '✓' : '○'
          const children = instance.steps.filter(c => c.parent_id === s.id)
          let result = `${check} ${s.title}`
          if (children.length > 0) {
            const childList = children.map(c => {
              const cCheck = c.is_completed ? '✓' : '○'
              return `  ${cCheck} ${c.title}`
            }).join('\n')
            result += '\n' + childList
          }
          return result
        }).join('\n')

      ctx.openWindow('workflows')
      return `**${instance.name}** - ${instance.progress}%\nStatus: ${STATUS_NAMES[instance.status]}\n${completedSteps}/${totalSteps} Schritte erledigt\n\n${stepList}`
    }
  },

  {
    name: 'get_overdue_steps',
    description: 'Listet alle überfälligen Workflow-Schritte',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async (args, ctx) => {
      const { fetchInstances, fetchStats, stats, instances } = useWorkflowStore.getState()
      await fetchStats()
      await fetchInstances('active')

      const currentStats = useWorkflowStore.getState().stats
      const activeInstances = useWorkflowStore.getState().instances

      if (!currentStats || currentStats.overdue_steps === 0) {
        return 'Keine überfälligen Schritte vorhanden.'
      }

      // Find overdue steps in active instances
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const overdueList: string[] = []
      for (const instance of activeInstances) {
        // Need to fetch full instance to get steps with due dates
        const { getInstance } = useWorkflowStore.getState()
        const fullInstance = await getInstance(instance.id)
        if (fullInstance) {
          for (const step of fullInstance.steps) {
            if (step.due_date && !step.is_completed) {
              const dueDate = new Date(step.due_date)
              if (dueDate < today) {
                const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                overdueList.push(`- [${instance.name}] ${step.title} (${daysOverdue} Tage überfällig)`)
              }
            }
          }
        }
      }

      if (overdueList.length === 0) {
        return 'Keine überfälligen Schritte gefunden.'
      }

      ctx.openWindow('workflows')
      return `${overdueList.length} überfällige Schritte:\n${overdueList.join('\n')}`
    }
  },

  {
    name: 'get_workflow_stats',
    description: 'Zeigt Statistiken zu allen Workflows',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async (args, ctx) => {
      const { fetchStats } = useWorkflowStore.getState()
      await fetchStats()

      const stats = useWorkflowStore.getState().stats
      if (!stats) {
        return 'Keine Statistiken verfügbar.'
      }

      let result = `**Workflow-Statistiken**\n`
      result += `- Aktive Workflows: ${stats.total_active}\n`
      result += `- Abgeschlossene Workflows: ${stats.total_completed}\n`
      result += `- Überfällige Schritte: ${stats.overdue_steps}\n`

      if (stats.by_category.length > 0) {
        result += `\n**Nach Kategorie:**\n`
        for (const cat of stats.by_category) {
          result += `- ${cat.category_name}: ${cat.count} aktiv, Ø ${Math.round(cat.avg_progress)}%\n`
        }
      }

      ctx.openWindow('workflows')
      return result
    }
  },

  {
    name: 'update_workflow_status',
    description: 'Ändert den Status eines Workflows (aktiv, pausiert, abgeschlossen)',
    parameters: {
      type: 'object',
      properties: {
        instance_id: { type: 'string', description: 'Workflow-ID' },
        status: { type: 'string', description: 'Neuer Status', enum: ['active', 'paused', 'completed'] }
      },
      required: ['instance_id', 'status']
    },
    execute: async (args, ctx) => {
      const { updateInstance } = useWorkflowStore.getState()
      const instanceId = parseInt(args.instance_id as string)
      const status = args.status as 'active' | 'paused' | 'completed'

      const instance = await updateInstance(instanceId, { status })
      if (instance) {
        ctx.openWindow('workflows')
        return `Workflow "${instance.name}" auf "${STATUS_NAMES[status]}" gesetzt.`
      }
      return `Workflow mit ID ${instanceId} nicht gefunden.`
    }
  }
]
