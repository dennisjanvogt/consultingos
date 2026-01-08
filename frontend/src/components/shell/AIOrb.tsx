import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWindowStore } from '@/stores/windowStore'
import { useAIStore } from '@/stores/aiStore'
import { sendMessage, type Message, type ToolCall } from '@/services/aiAgent'
import { executeTool } from '@/services/tools'
import { getAppsForAI } from '@/config/apps'

// Build system prompt with dynamic app list
const getOrbSystemPrompt = () => `Du bist Sammy, ein schneller Sprachassistent für ConsultingOS.

## APPS ÖFFNEN (open_app mit app="<id>")
${getAppsForAI()}

## DASHBOARD TOOLS

### CHARTS (für Visualisierungen)
- analyze_stock: Aktienanalyse mit Chart (symbol, model_type: "linear"/"ma"/"ar")
- analyze_crypto: Krypto-Analyse mit Chart
- get_stock_history: Kursverlauf-Chart
- get_crypto_chart: Krypto-Verlauf
- show_chart: Eigene Diagramme (title, chart_type: bar/line/pie/area/scatter, data_json)

### TABELLEN (für Datenwerte, Listen, Vergleiche)
- show_table: Tabelle anzeigen (title, data_json als 2D-Array)
  - Erste Zeile = Spaltenüberschriften
  - Format: [["Datum", "Wert"], ["01.01.", "100"], ["02.01.", "105"]]

### TEXT/INFO (für Erklärungen, Zusammenfassungen)
- show_info: Info-Karte mit Markdown (title, content)

## BEISPIELE

Apps:
- "Öffne Kalender" → open_app(app="calendar")
- "Zeig mir meine Aufgaben" → open_app(app="kanban")
- "Whiteboard" → open_app(app="whiteboard")
- "2048 spielen" → open_app(app="game2048")

Charts:
- "Tesla Chart" → analyze_stock(symbol="TSLA", model_type="linear")
- "Bitcoin Verlauf" → get_crypto_chart(coin="bitcoin", days=30)

## STIL
- Extrem kurze Antworten (1-3 Worte)
- "Kommt", "Hier", "Erledigt", "Fertig"
- KEINE langen Erklärungen`

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

export function AIOrb() {
  const { isOrbOpen, isOrbMuted, openWindow, closeWindowByAppId } = useWindowStore()
  const { hasValidApiKey } = useAIStore()

  // Orb states
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])

  // Refs
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const finalTranscriptRef = useRef('')
  const currentTranscriptRef = useRef('') // Includes interim results
  const wasOrbOpenRef = useRef(false)

  // Text-to-Speech (respects mute setting)
  const speak = useCallback((text: string) => {
    if (!text || !window.speechSynthesis || isOrbMuted) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'de-DE'
    utterance.rate = 1.4
    utterance.pitch = 1.05

    const voices = window.speechSynthesis.getVoices()
    const germanVoices = voices.filter(v => v.lang.startsWith('de'))
    const preferredVoice = germanVoices.find(v =>
      v.name.toLowerCase().includes('helena')
    ) || germanVoices.find(v =>
      v.name.toLowerCase().includes('anna') ||
      v.name.toLowerCase().includes('natural')
    ) || germanVoices[0]

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.speak(utterance)
  }, [isOrbMuted])

  // Tool execution
  const executeToolCall = useCallback(async (toolCall: ToolCall): Promise<string> => {
    const args = JSON.parse(toolCall.function.arguments)
    return executeTool(toolCall.function.name, args, {
      openWindow,
      closeWindowByAppId,
      minimizeByAppId: () => {},
      onClose: () => {}
    })
  }, [openWindow, closeWindowByAppId])

  // Process transcribed text
  const processText = useCallback(async (text: string) => {
    if (!text.trim()) return

    setIsProcessing(true)

    try {
      const newHistory: Message[] = [...conversationHistory, { role: 'user', content: text }]

      // AIOrb uses custom system prompt optimized for dashboard tools
      const orbHelper = {
        id: 0,
        name: 'Orb',
        icon: '🔮',
        description: 'AI Dashboard Voice Assistant',
        system_prompt: getOrbSystemPrompt(),
        enabled_tools: [] as string[],
        is_default: false,
        created_at: '',
        updated_at: ''
      }

      let response = await sendMessage(newHistory, {
        helper: orbHelper,
        bypassAnalysisMode: true
      })
      let currentHistory = [...newHistory]

      // Handle tool calls
      while (response.toolCalls.length > 0) {
        currentHistory.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.toolCalls
        })

        const toolResults: Message[] = []
        for (const toolCall of response.toolCalls) {
          const result = await executeToolCall(toolCall)
          toolResults.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id
          })
        }

        currentHistory = [...currentHistory, ...toolResults]
        response = await sendMessage(currentHistory, {
          helper: orbHelper,
          bypassAnalysisMode: true
        })
      }

      setConversationHistory([...currentHistory, { role: 'assistant', content: response.content || '' }])

      if (response.content) {
        speak(response.content)
      }
    } catch (error) {
      console.error('AI Orb Error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403')) {
        speak('API-Schlüssel fehlt oder ungültig.')
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        speak('Netzwerkfehler.')
      } else {
        speak('Fehler bei der Verarbeitung.')
      }
    } finally {
      setIsProcessing(false)
    }
  }, [conversationHistory, executeToolCall, speak])

  // Stop listening and return the text
  const stopListening = useCallback(() => {
    // Use currentTranscript which includes interim results (what user saw on screen)
    const text = currentTranscriptRef.current.trim()
    console.log('AI Orb: stopListening called, transcript:', text)

    if (recognitionRef.current) {
      // Remove handlers to prevent any callbacks after stop
      recognitionRef.current.onend = null
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.log('AI Orb: stop() error (already stopped?):', e)
      }
      recognitionRef.current = null
    }

    setIsListening(false)
    return text
  }, [])

  // Start listening
  const startListening = useCallback(() => {
    // Check for API key first
    if (!hasValidApiKey()) {
      speak('Bitte API-Schlüssel in den Einstellungen hinterlegen.')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      console.error('Speech Recognition not supported')
      speak('Spracherkennung nicht unterstützt.')
      return
    }

    console.log('AI Orb: startListening called')

    try {
      // Reset state
      finalTranscriptRef.current = ''
      currentTranscriptRef.current = ''
      setTranscribedText('')
      setIsListening(true)

      const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance
      recognition.lang = 'de-DE'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        const fullText = (finalTranscriptRef.current + interimTranscript).trim()
        currentTranscriptRef.current = fullText // Save for stopListening
        setTranscribedText(fullText)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.log('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          speak('Mikrofon-Zugriff verweigert.')
        }
      }

      recognition.onend = () => {
        // Don't auto-restart - push-to-talk handles this
        setIsListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (error) {
      console.error('Speech recognition failed:', error)
      setIsListening(false)
    }
  }, [speak, hasValidApiKey])

  // Handle orb open/close - Push-to-talk behavior
  useEffect(() => {
    const wasOpen = wasOrbOpenRef.current
    wasOrbOpenRef.current = isOrbOpen

    // Orb just opened
    if (isOrbOpen && !wasOpen && !isProcessing) {
      startListening()
    }

    // Orb just closed (key released)
    if (!isOrbOpen && wasOpen) {
      const text = stopListening()
      setTranscribedText('')
      finalTranscriptRef.current = ''
      currentTranscriptRef.current = ''

      if (text) {
        console.log('AI Orb: Processing text:', text)
        processText(text)
      } else {
        console.log('AI Orb: No text detected')
      }
    }
  }, [isOrbOpen, isProcessing, startListening, stopListening, processText])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      window.speechSynthesis?.cancel()
    }
  }, [])

  // Preload voices
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()
    }
  }, [])

  // Show orb when listening or processing
  const showOrb = isOrbOpen || isProcessing

  return (
    <AnimatePresence>
      {showOrb && (
        <motion.div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2"
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {/* Transcribed Text Display */}
          <AnimatePresence>
            {transcribedText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="max-w-md px-4 py-2 bg-gray-900/90 backdrop-blur-sm text-white text-sm rounded-xl text-center"
              >
                {transcribedText}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Hint */}
          <AnimatePresence>
            {isListening && !transcribedText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                Sprich jetzt... (Option loslassen zum Senden)
              </motion.div>
            )}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-amber-500"
              >
                Verarbeite...
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Orb Button - Ethereal Ghost Style */}
          <motion.div
            className="relative w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: isListening
                ? 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.1) 50%, transparent 70%)'
                : isProcessing
                ? 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.1) 50%, transparent 70%)'
                : 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.1) 50%, transparent 70%)',
              boxShadow: isListening
                ? '0 0 60px rgba(239, 68, 68, 0.4), inset 0 0 30px rgba(239, 68, 68, 0.2)'
                : isProcessing
                ? '0 0 60px rgba(245, 158, 11, 0.4), inset 0 0 30px rgba(245, 158, 11, 0.2)'
                : '0 0 60px rgba(139, 92, 246, 0.3), inset 0 0 30px rgba(139, 92, 246, 0.15)',
            }}
          >
            {/* Outer ethereal ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                border: isListening
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : isProcessing
                  ? '1px solid rgba(245, 158, 11, 0.4)'
                  : '1px solid rgba(139, 92, 246, 0.3)',
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Middle ethereal ring */}
            <motion.div
              className="absolute inset-2 rounded-full"
              style={{
                border: isListening
                  ? '1px solid rgba(239, 68, 68, 0.5)'
                  : isProcessing
                  ? '1px solid rgba(245, 158, 11, 0.5)'
                  : '1px solid rgba(139, 92, 246, 0.4)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 0.2, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.3,
              }}
            />

            {/* Inner glowing core */}
            <motion.div
              className="absolute w-6 h-6 rounded-full"
              style={{
                background: isListening
                  ? 'radial-gradient(circle, rgba(239, 68, 68, 0.8) 0%, rgba(239, 68, 68, 0.3) 50%, transparent 70%)'
                  : isProcessing
                  ? 'radial-gradient(circle, rgba(245, 158, 11, 0.8) 0%, rgba(245, 158, 11, 0.3) 50%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(139, 92, 246, 0.7) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 70%)',
                boxShadow: isListening
                  ? '0 0 20px rgba(239, 68, 68, 0.6)'
                  : isProcessing
                  ? '0 0 20px rgba(245, 158, 11, 0.6)'
                  : '0 0 20px rgba(139, 92, 246, 0.5)',
              }}
              animate={{
                scale: isListening ? [1, 1.4, 1] : isProcessing ? [1, 1.2, 1] : [1, 1.1, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: isListening ? 0.8 : 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Floating particles effect */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  background: isListening
                    ? 'rgba(239, 68, 68, 0.6)'
                    : isProcessing
                    ? 'rgba(245, 158, 11, 0.6)'
                    : 'rgba(139, 92, 246, 0.5)',
                }}
                animate={{
                  y: [-10, -25, -10],
                  x: [0, (i - 1) * 8, 0],
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.5,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
