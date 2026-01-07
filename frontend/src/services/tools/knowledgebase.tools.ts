import type { AITool } from './types'
import { useKnowledgebaseStore } from '@/stores/knowledgebaseStore'

export const knowledgebaseTools: AITool[] = [
  {
    name: 'list_experts',
    description: 'Listet alle Wissens-Experten in der Wissensdatenbank auf',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async (_args, context) => {
      const store = useKnowledgebaseStore.getState()
      await store.fetchExperts()
      const experts = store.experts

      if (experts.length === 0) {
        return 'Keine Experten gefunden. Du kannst einen neuen Experten in der Wissensdatenbank-App erstellen.'
      }

      const expertList = experts.map(e =>
        `- ${e.icon} ${e.name}: ${e.document_count} Dokumente, ${e.chunk_count} Chunks ${e.is_indexed ? '(indexiert)' : '(nicht indexiert)'}`
      ).join('\n')

      return `Verfügbare Experten:\n${expertList}`
    }
  },
  {
    name: 'ask_expert',
    description: 'Stellt eine RAG-basierte Frage an einen Wissens-Experten. Der Experte antwortet basierend auf seinen hochgeladenen Dokumenten.',
    parameters: {
      type: 'object',
      properties: {
        expert_name: {
          type: 'string',
          description: 'Name des Experten (muss existieren)'
        },
        question: {
          type: 'string',
          description: 'Die Frage an den Experten'
        }
      },
      required: ['expert_name', 'question']
    },
    execute: async (args, context) => {
      const store = useKnowledgebaseStore.getState()
      await store.fetchExperts()

      const expertName = args.expert_name as string
      const question = args.question as string

      // Find expert by name (case insensitive)
      const expert = store.experts.find(
        e => e.name.toLowerCase() === expertName.toLowerCase()
      )

      if (!expert) {
        const available = store.experts.map(e => e.name).join(', ')
        return `Experte "${expertName}" nicht gefunden. Verfügbare Experten: ${available || 'keine'}`
      }

      if (!expert.is_indexed) {
        return `Der Experte "${expert.name}" hat noch keine indexierten Dokumente. Bitte lade zuerst Dokumente hoch.`
      }

      try {
        const result = await store.quickQuery(expert.id, question)

        if (!result) {
          return 'Fehler bei der Anfrage an den Experten.'
        }

        // Format sources
        let response = result.answer

        if (result.sources && result.sources.length > 0) {
          const sourcesText = result.sources.map(s =>
            `  - ${s.document_name}${s.page_number ? ` (S. ${s.page_number})` : ''}`
          ).join('\n')
          response += `\n\nQuellen:\n${sourcesText}`
        }

        return response
      } catch (error) {
        return `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    }
  },
  {
    name: 'open_knowledgebase',
    description: 'Öffnet die Wissensdatenbank-App',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async (_args, context) => {
      context.openWindow('knowledgebase')
      return 'Wissensdatenbank wurde geöffnet.'
    }
  },
  {
    name: 'open_expert',
    description: 'Öffnet die Wissensdatenbank-App und wählt einen bestimmten Experten aus',
    parameters: {
      type: 'object',
      properties: {
        expert_name: {
          type: 'string',
          description: 'Name des Experten'
        }
      },
      required: ['expert_name']
    },
    execute: async (args, context) => {
      const store = useKnowledgebaseStore.getState()
      await store.fetchExperts()

      const expertName = args.expert_name as string
      const expert = store.experts.find(
        e => e.name.toLowerCase() === expertName.toLowerCase()
      )

      if (!expert) {
        const available = store.experts.map(e => e.name).join(', ')
        return `Experte "${expertName}" nicht gefunden. Verfügbare Experten: ${available || 'keine'}`
      }

      store.selectExpert(expert.id)
      context.openWindow('knowledgebase')

      return `Wissensdatenbank mit Experte "${expert.name}" geöffnet.`
    }
  }
]
