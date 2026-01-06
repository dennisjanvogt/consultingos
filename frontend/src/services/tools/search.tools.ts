import type { AITool } from './types'

export const searchTools: AITool[] = [
  {
    name: 'web_search',
    description:
      'Sucht im Internet nach Informationen mithilfe von DuckDuckGo. Gibt Suchergebnisse mit Titel, Beschreibung und URL zurück.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Der Suchbegriff oder die Suchanfrage',
        },
      },
      required: ['query'],
    },
    execute: async (args) => {
      try {
        const query = args.query as string

        // Use DuckDuckGo Instant Answer API
        const response = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
        )

        if (!response.ok) {
          return `Fehler bei der Suche: HTTP ${response.status}`
        }

        const data = await response.json()

        // Build result string
        const results: string[] = []

        // Abstract (main answer)
        if (data.Abstract) {
          results.push(`**Zusammenfassung:**\n${data.Abstract}`)
          if (data.AbstractURL) {
            results.push(`Quelle: ${data.AbstractURL}`)
          }
        }

        // Related topics
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
          results.push('\n**Verwandte Themen:**')
          const topics = data.RelatedTopics.slice(0, 5)
          for (const topic of topics) {
            if (topic.Text && topic.FirstURL) {
              results.push(`- ${topic.Text}\n  ${topic.FirstURL}`)
            } else if (topic.Text) {
              results.push(`- ${topic.Text}`)
            }
          }
        }

        // Infobox
        if (data.Infobox && data.Infobox.content) {
          results.push('\n**Fakten:**')
          const facts = data.Infobox.content.slice(0, 5)
          for (const fact of facts) {
            if (fact.label && fact.value) {
              results.push(`- ${fact.label}: ${fact.value}`)
            }
          }
        }

        // Definition
        if (data.Definition) {
          results.push(`\n**Definition:** ${data.Definition}`)
          if (data.DefinitionURL) {
            results.push(`Quelle: ${data.DefinitionURL}`)
          }
        }

        // Answer (for calculations, conversions, etc.)
        if (data.Answer) {
          results.push(`\n**Antwort:** ${data.Answer}`)
        }

        if (results.length === 0) {
          return `Keine direkten Ergebnisse für "${query}" gefunden. Versuche eine spezifischere Suchanfrage.`
        }

        return `Suchergebnisse für "${query}":\n\n${results.join('\n')}`
      } catch (error) {
        return `Fehler bei der Websuche: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    },
  },
]
