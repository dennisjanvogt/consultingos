import { useNotesStore } from '@/stores/notesStore'
import { useConfirmStore } from '@/stores/confirmStore'
import type { NoteColor } from '@/api/types'
import type { AITool } from './types'

const COLOR_NAMES: Record<string, string> = {
  default: 'Standard',
  yellow: 'Gelb',
  green: 'Grün',
  blue: 'Blau',
  pink: 'Pink'
}

export const notesTools: AITool[] = [
  {
    name: 'list_notes',
    description: 'Listet alle Notizen des Benutzers auf',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Suchbegriff zum Filtern' }
      },
      required: []
    },
    execute: async (args) => {
      const { fetchNotes } = useNotesStore.getState()
      const search = args.search as string | undefined
      await fetchNotes(search)

      const notes = useNotesStore.getState().notes
      if (notes.length === 0) {
        return search
          ? `Keine Notizen gefunden für "${search}".`
          : 'Keine Notizen vorhanden.'
      }

      const list = notes.map(n => {
        const pinned = n.is_pinned ? ' [Gepinnt]' : ''
        const color = n.color !== 'default' ? ` (${COLOR_NAMES[n.color]})` : ''
        const preview = n.content.length > 50 ? n.content.slice(0, 50) + '...' : n.content
        return `- [ID ${n.id}]${pinned}${color} ${n.title || 'Unbenannt'}: ${preview || '(kein Inhalt)'}`
      }).join('\n')

      return `${notes.length} Notizen gefunden:\n${list}`
    }
  },

  {
    name: 'create_note',
    description: 'Erstellt eine neue Notiz',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titel der Notiz' },
        content: { type: 'string', description: 'Inhalt der Notiz' },
        color: { type: 'string', description: 'Farbe', enum: ['default', 'yellow', 'green', 'blue', 'pink'] },
        is_pinned: { type: 'boolean', description: 'Soll die Notiz gepinnt werden?' }
      },
      required: []
    },
    execute: async (args, ctx) => {
      const { createNote } = useNotesStore.getState()

      const note = await createNote({
        title: (args.title as string) || '',
        content: (args.content as string) || '',
        color: ((args.color as string) || 'default') as NoteColor,
        is_pinned: (args.is_pinned as boolean) || false
      })

      if (note) {
        ctx.openWindow('notes')
        ctx.onClose()
        return `Notiz "${note.title || 'Unbenannt'}" wurde erstellt.`
      }
      return 'Fehler beim Erstellen der Notiz.'
    }
  },

  {
    name: 'update_note',
    description: 'Aktualisiert eine bestehende Notiz',
    parameters: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'Die ID der Notiz' },
        title: { type: 'string', description: 'Neuer Titel' },
        content: { type: 'string', description: 'Neuer Inhalt' },
        color: { type: 'string', description: 'Neue Farbe', enum: ['default', 'yellow', 'green', 'blue', 'pink'] }
      },
      required: ['note_id']
    },
    execute: async (args, ctx) => {
      const { updateNote } = useNotesStore.getState()
      const noteId = parseInt(args.note_id as string)

      const updates: Record<string, unknown> = {}
      if (args.title !== undefined) updates.title = args.title
      if (args.content !== undefined) updates.content = args.content
      if (args.color) updates.color = args.color

      const note = await updateNote(noteId, updates as any)
      if (note) {
        ctx.openWindow('notes')
        return `Notiz "${note.title || 'Unbenannt'}" wurde aktualisiert.`
      }
      return `Notiz mit ID ${noteId} wurde nicht gefunden.`
    }
  },

  {
    name: 'delete_note',
    description: 'Löscht eine Notiz (mit Bestätigung)',
    parameters: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'Die ID der zu löschenden Notiz' }
      },
      required: ['note_id']
    },
    execute: async (args) => {
      const { notes, deleteNote } = useNotesStore.getState()
      const { confirm } = useConfirmStore.getState()
      const noteId = parseInt(args.note_id as string)

      const note = notes.find(n => n.id === noteId)
      if (!note) {
        return `Notiz mit ID ${noteId} wurde nicht gefunden.`
      }

      const confirmed = await confirm({
        title: 'Notiz löschen',
        message: `Möchtest du "${note.title || 'Unbenannt'}" wirklich löschen?`,
        confirmLabel: 'Löschen',
        variant: 'danger'
      })

      if (!confirmed) {
        return 'Löschen wurde abgebrochen.'
      }

      const success = await deleteNote(noteId)
      if (success) {
        return `Notiz "${note.title || 'Unbenannt'}" wurde gelöscht.`
      }
      return `Fehler beim Löschen der Notiz.`
    }
  },

  {
    name: 'pin_note',
    description: 'Pinnt eine Notiz an oder löst sie',
    parameters: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'Die ID der Notiz' }
      },
      required: ['note_id']
    },
    execute: async (args, ctx) => {
      const { togglePin, notes } = useNotesStore.getState()
      const noteId = parseInt(args.note_id as string)

      const noteBefore = notes.find(n => n.id === noteId)
      if (!noteBefore) {
        return `Notiz mit ID ${noteId} wurde nicht gefunden.`
      }

      const note = await togglePin(noteId)
      if (note) {
        ctx.openWindow('notes')
        return note.is_pinned
          ? `Notiz "${note.title || 'Unbenannt'}" wurde angepinnt.`
          : `Notiz "${note.title || 'Unbenannt'}" wurde gelöst.`
      }
      return `Fehler beim Ändern des Pin-Status.`
    }
  },

  {
    name: 'summarize_notes',
    description: 'Fasst alle Notizen oder bestimmte Notizen zusammen',
    parameters: {
      type: 'object',
      properties: {
        note_ids: { type: 'string', description: 'Komma-getrennte IDs der Notizen (optional, wenn leer werden alle genommen)' }
      },
      required: []
    },
    execute: async (args) => {
      const { notes, fetchNotes } = useNotesStore.getState()
      await fetchNotes()

      let targetNotes = notes
      if (args.note_ids) {
        const ids = (args.note_ids as string).split(',').map(id => parseInt(id.trim()))
        targetNotes = notes.filter(n => ids.includes(n.id))
      }

      if (targetNotes.length === 0) {
        return 'Keine Notizen zum Zusammenfassen gefunden.'
      }

      const summary = targetNotes.map(n => {
        const pinned = n.is_pinned ? '[Gepinnt] ' : ''
        return `### ${pinned}${n.title || 'Unbenannt'}\n${n.content || '(kein Inhalt)'}`
      }).join('\n\n---\n\n')

      return `Zusammenfassung von ${targetNotes.length} Notizen:\n\n${summary}`
    }
  },

  {
    name: 'cleanup_old_notes',
    description: 'Findet alte Notizen, die gelöscht werden könnten',
    parameters: {
      type: 'object',
      properties: {
        days_old: { type: 'number', description: 'Mindest-Alter in Tagen (Standard: 30)' }
      },
      required: []
    },
    execute: async (args) => {
      const { notes, fetchNotes } = useNotesStore.getState()
      await fetchNotes()

      const daysOld = (args.days_old as number) || 30
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const oldNotes = notes.filter(n => {
        const updatedAt = new Date(n.updated_at)
        return updatedAt < cutoffDate && !n.is_pinned
      })

      if (oldNotes.length === 0) {
        return `Keine Notizen gefunden, die älter als ${daysOld} Tage sind.`
      }

      const list = oldNotes.map(n => {
        const age = Math.floor((Date.now() - new Date(n.updated_at).getTime()) / (1000 * 60 * 60 * 24))
        return `- [ID ${n.id}] ${n.title || 'Unbenannt'} (${age} Tage alt)`
      }).join('\n')

      return `${oldNotes.length} alte Notizen gefunden (älter als ${daysOld} Tage):\n${list}\n\nNutze delete_note mit der jeweiligen ID um sie zu löschen.`
    }
  }
]
