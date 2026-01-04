import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Sparkles, X, Mic, Volume2, VolumeX } from 'lucide-react'
import { sendMessage, type Message, type ToolCall } from '@/services/aiAgent'
import { executeTool } from '@/services/tools'

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

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}
import { useWindowStore } from '@/stores/windowStore'

interface SpotlightProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function Spotlight({ isOpen, onClose }: SpotlightProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcribedText, setTranscribedText] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceResponseEnabled, setVoiceResponseEnabled] = useState(true)
  const [hasInitialAltPress, setHasInitialAltPress] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { openWindow } = useWindowStore()

  // Start speech recognition
  const startRecording = useCallback(() => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        console.error('Speech Recognition not supported')
        return
      }

      const recognition = new SpeechRecognition()
      recognition.lang = 'de-DE'
      recognition.continuous = true
      recognition.interimResults = true

      let finalTranscript = ''

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }
        setTranscribedText(finalTranscript + interimTranscript)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsRecording(true)
      setRecordingTime(0)
      setTranscribedText('')

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Speech recognition failed:', error)
    }
  }, [])

  // Stop recording and get transcribed text
  const stopRecording = useCallback((): string => {
    if (!recognitionRef.current) return ''

    recognitionRef.current.stop()
    recognitionRef.current = null
    setIsRecording(false)

    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    return transcribedText.trim()
  }, [transcribedText])

  // Text-to-Speech function
  const speak = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const speakWithVoice = () => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'de-DE'
      utterance.rate = 1.4 // Faster, more natural
      utterance.pitch = 1.05 // Slightly higher, more lively

      // Find the best German voice (prefer natural/premium voices)
      const voices = window.speechSynthesis.getVoices()
      const germanVoices = voices.filter(v => v.lang.startsWith('de'))

      // Prefer Helena or other natural voices
      const preferredVoice = germanVoices.find(v =>
        v.name.toLowerCase().includes('helena')
      ) || germanVoices.find(v =>
        v.name.toLowerCase().includes('anna') ||
        v.name.toLowerCase().includes('natural') ||
        v.name.toLowerCase().includes('neural')
      ) || germanVoices[0]

      if (preferredVoice) {
        utterance.voice = preferredVoice
        console.log('Using voice:', preferredVoice.name)
      }

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = (e) => {
        console.error('Speech error:', e)
        setIsSpeaking(false)
      }

      window.speechSynthesis.speak(utterance)
    }

    // Voices might not be loaded yet - wait for them
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      speakWithVoice()
    } else {
      // Wait for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        speakWithVoice()
      }
      // Fallback: try anyway after a short delay
      setTimeout(speakWithVoice, 100)
    }
  }, [])

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  // Preload voices on mount
  useEffect(() => {
    if (window.speechSynthesis) {
      // Trigger voice loading
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => {
        const voices = window.speechSynthesis.getVoices()
        console.log('Available voices:', voices.filter(v => v.lang.startsWith('de')).map(v => v.name))
      }
    }
  }, [])

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      if (isRecording) {
        recognitionRef.current?.stop()
        recognitionRef.current = null
        setIsRecording(false)
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
        }
      }
      // Stop speaking when closing
      stopSpeaking()
    }
  }, [isOpen, isRecording, stopSpeaking])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setMessages([])
      setConversationHistory([])
      setInput('')
      setIsRecording(false)
      setRecordingTime(0)
      setTranscribedText('')
      setHasInitialAltPress(false)
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Tool execution is now handled by the centralized tool registry
  const executeToolCall = useCallback(async (toolCall: ToolCall): Promise<string> => {
    const args = JSON.parse(toolCall.function.arguments)
    return executeTool(toolCall.function.name, args, { openWindow, onClose })
  }, [openWindow, onClose])

  // Handle Option/Alt key for recording toggle and ESC to close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = async (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Alt' && !e.repeat) {
        e.preventDefault()

        if (isRecording) {
          // Stop recording and send transcribed text
          const spokenText = stopRecording()

          if (!spokenText) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: 'Ich konnte nichts verstehen. Bitte versuche es erneut.'
            }])
            return
          }

          setMessages(prev => [...prev, { role: 'user', content: spokenText }])
          setIsLoading(true)

          try {
            const newHistory: Message[] = [...conversationHistory, {
              role: 'user',
              content: spokenText
            }]

            let response = await sendMessage(newHistory)
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
              response = await sendMessage(currentHistory)
            }

            setConversationHistory([...currentHistory, { role: 'assistant', content: response.content || '' }])

            if (response.content) {
              setMessages(prev => [...prev, { role: 'assistant', content: response.content! }])
              // Speak the response for voice interactions (if enabled)
              if (voiceResponseEnabled) {
                speak(response.content)
              }
            }
          } catch (error) {
            console.error('AI Error:', error)
            const errorMsg = 'Entschuldigung, es gab einen Fehler bei der Verarbeitung.'
            setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }])
            if (voiceResponseEnabled) {
              speak(errorMsg)
            }
          } finally {
            setIsLoading(false)
          }
        } else if (!isLoading) {
          // First Alt press just marks readiness, second press starts recording
          if (!hasInitialAltPress) {
            setHasInitialAltPress(true)
          } else {
            startRecording()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isRecording, isLoading, conversationHistory, startRecording, stopRecording, executeToolCall, speak, voiceResponseEnabled, onClose, hasInitialAltPress])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // Add user message to conversation history
      const newHistory: Message[] = [...conversationHistory, { role: 'user', content: userMessage }]

      // Get AI response
      let response = await sendMessage(newHistory)
      let currentHistory = [...newHistory]

      // Handle tool calls
      while (response.toolCalls.length > 0) {
        // Add assistant message with tool calls to history
        currentHistory.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.toolCalls
        })

        // Execute each tool call and collect results
        const toolResults: Message[] = []
        for (const toolCall of response.toolCalls) {
          const result = await executeToolCall(toolCall)
          toolResults.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id
          })
        }

        // Add tool results to history
        currentHistory = [...currentHistory, ...toolResults]

        // Get next response
        response = await sendMessage(currentHistory)
      }

      // Update conversation history
      setConversationHistory([...currentHistory, { role: 'assistant', content: response.content || '' }])

      // Show final response
      if (response.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.content! }])
      }
    } catch (error) {
      console.error('AI Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Entschuldigung, es gab einen Fehler bei der Verarbeitung deiner Anfrage.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

        {/* Spotlight Container */}
        <motion.div
          className="relative w-full max-w-xl mx-4"
          initial={{ scale: 0.95, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="glass rounded-xl window-shadow overflow-hidden">
            {/* Recording Indicator */}
            {isRecording && (
              <div className="p-3 bg-red-500/10 border-b border-red-300/50">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Aufnahme... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-red-500/70">⌥ zum Senden</span>
                </div>
                {transcribedText && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 italic text-center">
                    "{transcribedText}"
                  </div>
                )}
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-3 p-3 border-b border-gray-200/50 dark:border-gray-700/50">
                {isRecording ? (
                  <Mic className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
                ) : (
                  <Sparkles className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRecording ? "Sprich jetzt..." : "Frag mich etwas... (⌥ für Spracheingabe)"}
                  className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
                  disabled={isLoading || isRecording}
                />
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : input && !isRecording && (
                  <button
                    type="button"
                    onClick={() => setInput('')}
                    className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </form>

            {/* Messages Area */}
            {messages.length > 0 && (
              <div className="max-h-64 overflow-y-auto p-3 space-y-2 bg-white/30 dark:bg-black/20">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-1.5 rounded-lg text-sm whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                      <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Quick Actions */}
            {messages.length === 0 && !isLoading && (
              <div className="p-2 bg-white/30 dark:bg-black/20">
                <div className="space-y-0.5">
                  {[
                    { label: 'Dashboard öffnen', action: 'Öffne das Dashboard' },
                    { label: 'Neuer Kunde anlegen', action: 'Erstelle einen neuen Kunden' },
                    { label: 'Neue Rechnung erstellen', action: 'Erstelle eine neue Rechnung' },
                    { label: 'Dateien durchsuchen', action: 'Suche nach Dateien' },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(item.action)
                        inputRef.current?.focus()
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-3 py-1.5 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between text-[10px] text-gray-400">
              <span>⌥ Spracheingabe</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isSpeaking) stopSpeaking()
                    setVoiceResponseEnabled(!voiceResponseEnabled)
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                    voiceResponseEnabled
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title={voiceResponseEnabled ? 'Sprachausgabe an' : 'Sprachausgabe aus'}
                >
                  {voiceResponseEnabled ? (
                    <Volume2 className="w-3 h-3" />
                  ) : (
                    <VolumeX className="w-3 h-3" />
                  )}
                </button>
                {isSpeaking && (
                  <span className="text-lavender-500 animate-pulse">Spricht...</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
