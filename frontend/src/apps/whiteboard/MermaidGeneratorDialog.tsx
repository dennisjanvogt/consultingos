import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Sparkles, Loader2, AlertCircle, Code2, Wand2 } from 'lucide-react'
import { parseMermaidToExcalidraw } from '@excalidraw/mermaid-to-excalidraw'
import { convertToExcalidrawElements } from '@excalidraw/excalidraw'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElementType = any

interface MermaidGeneratorDialogProps {
  open: boolean
  onClose: () => void
  onGenerated: (elements: ExcalidrawElementType[]) => void
  mode: 'create' | 'insert'
}

const SYSTEM_PROMPT = `Du bist ein Experte für Mermaid-Diagramme. Der User beschreibt dir was er visualisieren möchte und du generierst valides Mermaid Syntax dafür.

WICHTIG:
- Gib NUR den Mermaid Code zurück, KEINE Erklärungen oder Markdown-Codeblöcke
- Verwende einfache, klare Labels ohne Sonderzeichen
- Nutze das passende Diagrammformat (flowchart, sequenceDiagram, classDiagram, stateDiagram, etc.)
- Halte das Diagramm übersichtlich

Beispiel für ein Flowchart:
flowchart TD
    A[Start] --> B{Entscheidung}
    B -->|Ja| C[Aktion 1]
    B -->|Nein| D[Aktion 2]
    C --> E[Ende]
    D --> E

Beispiel für ein Sequenzdiagramm:
sequenceDiagram
    participant U as User
    participant S as Server
    U->>S: Request
    S-->>U: Response`

export function MermaidGeneratorDialog({ open, onClose, onGenerated, mode }: MermaidGeneratorDialogProps) {
  const [description, setDescription] = useState('')
  const [mermaidCode, setMermaidCode] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'describe' | 'preview'>('describe')

  // ESC key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDescription('')
      setMermaidCode('')
      setError(null)
      setStep('describe')
    }
  }, [open])

  const generateMermaid = async () => {
    if (!description.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'ConsultingOS'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: description }
          ],
          max_tokens: 2000,
        })
      })

      if (!response.ok) {
        throw new Error('API Fehler')
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''

      // Clean up the response - remove markdown code blocks if present
      let cleanedCode = content.trim()
      if (cleanedCode.startsWith('```mermaid')) {
        cleanedCode = cleanedCode.replace(/^```mermaid\n?/, '').replace(/\n?```$/, '')
      } else if (cleanedCode.startsWith('```')) {
        cleanedCode = cleanedCode.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }

      setMermaidCode(cleanedCode)
      setStep('preview')
    } catch (err) {
      setError('Fehler beim Generieren. Bitte versuche es erneut.')
      console.error('Mermaid generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const convertAndInsert = async () => {
    if (!mermaidCode.trim()) return

    setIsConverting(true)
    setError(null)

    try {
      // Parse Mermaid to Excalidraw skeleton
      const result = await parseMermaidToExcalidraw(mermaidCode)

      if (!result.elements || result.elements.length === 0) {
        throw new Error('Keine Elemente generiert')
      }

      // Convert skeleton to full Excalidraw elements
      const elements = convertToExcalidrawElements(result.elements)

      onGenerated(elements as ExcalidrawElementType[])
      onClose()
    } catch (err) {
      console.error('Mermaid conversion error:', err)
      setError('Fehler beim Konvertieren. Bitte überprüfe den Mermaid Code.')
    } finally {
      setIsConverting(false)
    }
  }

  const handleBack = () => {
    setStep('describe')
    setError(null)
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h2 className="text-lg font-semibold">
              {mode === 'create' ? 'Diagramm mit AI erstellen' : 'Elemente mit AI einfügen'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'describe' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Beschreibe dein Diagramm
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="z.B. Ein Flowchart für einen Login-Prozess mit Passwort-Validierung und Zwei-Faktor-Authentifizierung..."
                  className="w-full h-32 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      generateMermaid()
                    }
                  }}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Tipp: Beschreibe was visualisiert werden soll, welche Elemente und Verbindungen es gibt.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Generierter Mermaid Code
                  </label>
                  <button
                    onClick={handleBack}
                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    Zurück zur Beschreibung
                  </button>
                </div>
                <div className="relative">
                  <Code2 className="absolute top-3 left-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={mermaidCode}
                    onChange={(e) => setMermaidCode(e.target.value)}
                    className="w-full h-48 pl-9 pr-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Du kannst den Code manuell anpassen bevor du ihn einfügst.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          {step === 'describe' ? (
            <button
              onClick={generateMermaid}
              disabled={!description.trim() || isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generiere...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generieren
                </>
              )}
            </button>
          ) : (
            <button
              onClick={convertAndInsert}
              disabled={!mermaidCode.trim() || isConverting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Konvertiere...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {mode === 'create' ? 'Diagramm erstellen' : 'Einfügen'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
