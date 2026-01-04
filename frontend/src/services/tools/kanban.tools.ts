import { useKanbanStore } from '@/stores/kanbanStore'
import type { KanbanBoard, KanbanColumn, KanbanPriority, KanbanColor } from '@/api/types'
import type { AITool } from './types'

const COLUMN_NAMES: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Arbeit',
  in_review: 'Review',
  done: 'Erledigt'
}

export const kanbanTools: AITool[] = [
  {
    name: 'list_kanban_cards',
    description: 'Listet alle Kanban-Karten/Aufgaben auf',
    parameters: {
      type: 'object',
      properties: {
        board: { type: 'string', description: 'Board auswählen', enum: ['work', 'private', 'archive'] }
      },
      required: []
    },
    execute: async (args) => {
      const { fetchCards } = useKanbanStore.getState()
      const board = ((args.board as string) || 'work') as KanbanBoard
      await fetchCards(board)

      const cards = useKanbanStore.getState().cards
      if (cards.length === 0) {
        return `Keine Aufgaben im ${board}-Board vorhanden.`
      }

      const list = cards.map(c =>
        `- [ID ${c.id}] [${COLUMN_NAMES[c.column]}] ${c.title}${c.priority === 'high' ? ' (Hoch)' : ''}${c.due_date ? ` (Fällig: ${c.due_date})` : ''}`
      ).join('\n')

      return `Aufgaben im ${board}-Board:\n${list}`
    }
  },

  {
    name: 'create_kanban_card',
    description: 'Erstellt eine neue Kanban-Karte/Aufgabe',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titel der Aufgabe' },
        description: { type: 'string', description: 'Beschreibung' },
        column: { type: 'string', description: 'Spalte', enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done'] },
        priority: { type: 'string', description: 'Priorität', enum: ['low', 'medium', 'high'] },
        color: { type: 'string', description: 'Farbe', enum: ['gray', 'violet', 'green', 'yellow', 'red', 'purple', 'pink', 'orange'] },
        board: { type: 'string', description: 'Board', enum: ['work', 'private', 'archive'] },
        due_date: { type: 'string', description: 'Fälligkeitsdatum (YYYY-MM-DD)' }
      },
      required: ['title']
    },
    execute: async (args, ctx) => {
      const { createCard } = useKanbanStore.getState()

      const card = await createCard({
        title: args.title as string,
        description: (args.description as string) || '',
        column: ((args.column as string) || 'todo') as KanbanColumn,
        priority: ((args.priority as string) || 'medium') as KanbanPriority,
        color: ((args.color as string) || 'violet') as KanbanColor,
        board: ((args.board as string) || 'work') as KanbanBoard,
        due_date: (args.due_date as string) || null
      })

      if (card) {
        ctx.openWindow('kanban')
        ctx.onClose()
        return `Aufgabe "${card.title}" wurde erstellt und in "${COLUMN_NAMES[args.column as string] || 'To Do'}" eingeordnet.`
      }
      return 'Fehler beim Erstellen der Aufgabe.'
    }
  },

  {
    name: 'move_kanban_card',
    description: 'Verschiebt eine Kanban-Karte in eine andere Spalte',
    parameters: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'Die ID der Karte' },
        column: { type: 'string', description: 'Zielspalte', enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done'] }
      },
      required: ['card_id', 'column']
    },
    execute: async (args, ctx) => {
      const { moveCard, cards, activeBoard } = useKanbanStore.getState()
      const cardId = parseInt(args.card_id as string)

      // Find the card to get its current board
      const card = cards.find(c => c.id === cardId)
      const board = card?.board || activeBoard || 'work'

      const success = await moveCard(cardId, {
        board: board as KanbanBoard,
        column: args.column as KanbanColumn,
        position: 0 // Move to top of column
      })
      if (success) {
        ctx.openWindow('kanban')
        return `Aufgabe wurde nach "${COLUMN_NAMES[args.column as string]}" verschoben.`
      }
      return `Aufgabe mit ID ${cardId} wurde nicht gefunden.`
    }
  },

  {
    name: 'update_kanban_card',
    description: 'Aktualisiert eine bestehende Kanban-Karte',
    parameters: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'Die ID der Karte' },
        title: { type: 'string', description: 'Neuer Titel' },
        description: { type: 'string', description: 'Neue Beschreibung' },
        priority: { type: 'string', description: 'Neue Priorität', enum: ['low', 'medium', 'high'] },
        due_date: { type: 'string', description: 'Neues Fälligkeitsdatum (YYYY-MM-DD)' }
      },
      required: ['card_id']
    },
    execute: async (args, ctx) => {
      const { updateCard } = useKanbanStore.getState()
      const cardId = parseInt(args.card_id as string)

      const updates: Record<string, unknown> = {}
      if (args.title) updates.title = args.title
      if (args.description) updates.description = args.description
      if (args.priority) updates.priority = args.priority
      if (args.due_date) updates.due_date = args.due_date

      const card = await updateCard(cardId, updates as any)
      if (card) {
        ctx.openWindow('kanban')
        return `Aufgabe "${card.title}" wurde aktualisiert.`
      }
      return `Aufgabe mit ID ${cardId} wurde nicht gefunden.`
    }
  },

  {
    name: 'delete_kanban_card',
    description: 'Löscht eine Kanban-Karte',
    parameters: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'Die ID der zu löschenden Karte' }
      },
      required: ['card_id']
    },
    execute: async (args) => {
      const { deleteCard } = useKanbanStore.getState()
      const cardId = parseInt(args.card_id as string)

      const success = await deleteCard(cardId)
      if (success) {
        return `Aufgabe mit ID ${cardId} wurde gelöscht.`
      }
      return `Aufgabe mit ID ${cardId} wurde nicht gefunden.`
    }
  }
]
