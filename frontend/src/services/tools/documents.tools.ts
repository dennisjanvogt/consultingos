import { useDocumentsStore } from '@/stores/documentsStore'
import type { AITool } from './types'

export const documentTools: AITool[] = [
  {
    name: 'search_files',
    description: 'Sucht nach Dateien und Dokumenten',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Der Suchbegriff' }
      },
      required: ['query']
    },
    execute: async (args, ctx) => {
      const { fetchDocuments } = useDocumentsStore.getState()
      await fetchDocuments(null, args.query as string)
      ctx.openWindow('documents')
      ctx.onClose()
      return `Suche nach "${args.query}" wurde gestartet. Die Dateien-App wurde geöffnet.`
    }
  },

  {
    name: 'create_folder',
    description: 'Erstellt einen neuen Ordner in der Dokumentenverwaltung',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name des Ordners' },
        parent_id: { type: 'string', description: 'ID des übergeordneten Ordners (leer für Wurzelverzeichnis)' },
        show_in_sidebar: { type: 'boolean', description: 'In Seitenleiste anzeigen' }
      },
      required: ['name']
    },
    execute: async (args, ctx) => {
      const { createFolder } = useDocumentsStore.getState()

      const folder = await createFolder({
        name: args.name as string,
        parent_id: args.parent_id ? parseInt(args.parent_id as string) : null,
        show_in_sidebar: args.show_in_sidebar as boolean || false
      })

      if (folder) {
        ctx.openWindow('documents')
        return `Ordner "${folder.name}" wurde erstellt (ID: ${folder.id}).`
      }
      return 'Fehler beim Erstellen des Ordners.'
    }
  },

  {
    name: 'move_document',
    description: 'Verschiebt ein Dokument in einen anderen Ordner',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'ID des Dokuments' },
        target_folder_id: { type: 'string', description: 'ID des Zielordners' }
      },
      required: ['document_id', 'target_folder_id']
    },
    execute: async (args, ctx) => {
      const { moveDocument } = useDocumentsStore.getState()
      const docId = parseInt(args.document_id as string)
      const folderId = parseInt(args.target_folder_id as string)

      const success = await moveDocument(docId, folderId)
      if (success) {
        ctx.openWindow('documents')
        return `Dokument wurde in den Ordner verschoben.`
      }
      return 'Fehler beim Verschieben des Dokuments.'
    }
  },

  {
    name: 'list_folders',
    description: 'Listet alle Ordner auf',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      const { fetchAllFolders, allFolders } = useDocumentsStore.getState()
      await fetchAllFolders()

      const folders = useDocumentsStore.getState().allFolders
      if (folders.length === 0) {
        return 'Keine Ordner vorhanden.'
      }

      const list = folders.map(f =>
        `- ID ${f.id}: ${f.name}${f.parent_id ? ` (in Ordner ${f.parent_id})` : ' (Wurzel)'}`
      ).join('\n')

      return `Ordner:\n${list}`
    }
  }
]
