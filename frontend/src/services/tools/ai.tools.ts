import { useAIStore } from '@/stores/aiStore'
import { useImageViewerStore } from '@/stores/imageViewerStore'
import type { AITool } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const aiTools: AITool[] = [
  {
    name: 'generate_image',
    description: 'Generiert ein KI-Bild basierend auf einer Beschreibung und speichert es im Bilder-Ordner',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detaillierte Beschreibung des gewünschten Bildes (Englisch für beste Ergebnisse)' },
        filename: { type: 'string', description: 'Optionaler Dateiname ohne Erweiterung' }
      },
      required: ['prompt']
    },
    execute: async (args, ctx) => {
      try {
        const imageModel = useAIStore.getState().imageModel

        const response = await fetch(`${API_BASE_URL}/ai/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prompt: args.prompt,
            filename: args.filename || null,
            model: imageModel
          })
        })

        if (!response.ok) {
          const error = await response.json()
          return `Fehler bei der Bildgenerierung: ${error.error || 'Unbekannter Fehler'}`
        }

        const result = await response.json()

        // Bild im Viewer anzeigen
        const { setCurrentImage } = useImageViewerStore.getState()
        setCurrentImage({
          id: result.id,
          name: result.name,
          folder_id: result.folder_id,
          file_url: result.file_url,
          file_type: 'png',
          file_size: 0,
          duration: null,
          description: '',
          customer_id: null,
          invoice_id: null,
          created_at: new Date().toISOString(),
        })

        ctx.openWindow('imageviewer')
        ctx.onClose()
        return `Bild "${result.name}" wurde erstellt und im Ordner "${result.folder_name}" gespeichert.`
      } catch (error) {
        console.error('Image generation error:', error)
        return 'Fehler bei der Bildgenerierung. Bitte versuche es erneut.'
      }
    }
  }
]
