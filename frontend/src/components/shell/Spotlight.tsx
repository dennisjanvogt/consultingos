import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Sparkles, X, Mic, Volume2, VolumeX } from 'lucide-react'
import { sendMessage, type Message, type ToolCall } from '@/services/aiAgent'

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
import { useWindowStore, type AppType } from '@/stores/windowStore'
import { useCustomersStore } from '@/stores/customersStore'
import { useInvoicesStore } from '@/stores/invoicesStore'
import { useDocumentsStore } from '@/stores/documentsStore'
import { useCalendarStore } from '@/stores/calendarStore'
import { useTimeTrackingStore } from '@/stores/timetrackingStore'
import { useKanbanStore } from '@/stores/kanbanStore'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { openWindow } = useWindowStore()
  const { customers, fetchCustomers, createCustomer } = useCustomersStore()
  const { createInvoice } = useInvoicesStore()
  const { fetchDocuments } = useDocumentsStore()
  const { fetchEvents, addEvent, getEventsForDate, getUpcomingEvents, deleteEvent } = useCalendarStore()
  const { fetchClients: fetchTimeTrackingClients, fetchProjects: fetchTimeTrackingProjects, addEntry: addTimeEntry } = useTimeTrackingStore()
  const { fetchCards: fetchKanbanCards, createCard: createKanbanCard } = useKanbanStore()

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
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const executeToolCall = useCallback(async (toolCall: ToolCall): Promise<string> => {
    const args = JSON.parse(toolCall.function.arguments)

    switch (toolCall.function.name) {
      case 'open_app': {
        const appId = args.app as AppType
        openWindow(appId)
        onClose()
        return `App "${appId}" wurde geöffnet.`
      }

      case 'search_files': {
        await fetchDocuments(null, args.query)
        openWindow('documents')
        onClose()
        return `Suche nach "${args.query}" wurde gestartet. Die Dateien-App wurde geöffnet.`
      }

      case 'create_customer': {
        const customer = await createCustomer({
          name: args.name,
          company: args.company || '',
          email: args.email || '',
          phone: args.phone || '',
          street: args.street || '',
          zip_code: args.zip_code || '',
          city: args.city || '',
          country: args.country || 'Deutschland',
          tax_id: args.tax_id || '',
          notes: args.notes || ''
        })
        if (customer) {
          openWindow('masterdata')
          onClose()
          return `Kunde "${args.name}" wurde erfolgreich angelegt (ID: ${customer.id}).`
        }
        return 'Fehler beim Anlegen des Kunden.'
      }

      case 'create_invoice': {
        // Parse items if provided
        let items = []
        if (args.items) {
          try {
            items = JSON.parse(args.items)
          } catch {
            items = [{ description: 'Position 1', quantity: 1, unit_price: 100 }]
          }
        } else {
          items = [{ description: 'Position 1', quantity: 1, unit_price: 100 }]
        }

        // Find customer by name if ID not provided
        let customerId = args.customer_id
        if (!customerId && args.customer_name) {
          await fetchCustomers()
          // Get fresh customers from store
          const currentCustomers = useCustomersStore.getState().customers
          const found = currentCustomers.find(c =>
            c.name.toLowerCase().includes(args.customer_name.toLowerCase()) ||
            (c.company && c.company.toLowerCase().includes(args.customer_name.toLowerCase()))
          )
          if (found) {
            customerId = found.id
          }
        }

        if (!customerId) {
          return 'Kein Kunde gefunden. Bitte gib eine Kunden-ID oder einen Kundennamen an. Nutze "list_customers" um alle Kunden zu sehen.'
        }

        const today = new Date().toISOString().split('T')[0]
        const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const invoice = await createInvoice({
          customer_id: parseInt(customerId),
          issue_date: today,
          due_date: dueDate,
          currency: args.currency || 'EUR',
          notes: args.notes || '',
          items: items.map((item: { description: string; quantity?: number; unit_price: number }, idx: number) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unit_price: item.unit_price,
            position: idx + 1
          }))
        })

        if (invoice) {
          openWindow('transactions')
          onClose()
          return `Rechnung ${invoice.number} wurde erfolgreich erstellt.`
        }
        return 'Fehler beim Erstellen der Rechnung.'
      }

      case 'list_customers': {
        await fetchCustomers()
        // Get fresh customers from store
        const currentCustomers = useCustomersStore.getState().customers
        if (currentCustomers.length === 0) {
          return 'Keine Kunden vorhanden.'
        }
        const list = currentCustomers.map(c => `- ID ${c.id}: ${c.name}${c.company ? ` (${c.company})` : ''}`).join('\n')
        return `Kundenliste:\n${list}`
      }

      case 'create_calendar_event': {
        console.log('Creating calendar event with args:', args)
        const today = new Date()
        const defaultDate = today.toISOString().split('T')[0]

        const eventData = {
          title: args.title,
          date: args.date || defaultDate,
          start_time: args.start_time || '09:00',
          end_time: args.end_time || '10:00',
          location: args.location || '',
          description: args.description || '',
          color: args.color || 'violet'
        }
        console.log('Event data:', eventData)

        const event = await addEvent(eventData)
        console.log('Created event:', event)

        if (event) {
          openWindow('calendar')
          onClose()
          return `Termin "${event.title}" am ${event.date} um ${event.start_time} wurde erstellt.`
        }
        return 'Fehler beim Erstellen des Termins.'
      }

      case 'list_calendar_events': {
        // Fetch latest events from API
        await fetchEvents()

        let events
        let title

        if (args.date) {
          events = getEventsForDate(args.date)
          title = `Termine am ${args.date}`
        } else {
          const days = args.upcoming_days ? parseInt(args.upcoming_days) : 7
          events = getUpcomingEvents(days)
          title = `Kommende Termine (nächste ${days} Tage)`
        }

        if (events.length === 0) {
          return args.date
            ? `Keine Termine am ${args.date}.`
            : 'Keine kommenden Termine.'
        }

        const list = events.map(e =>
          `- [ID ${e.id}] ${e.date} ${e.start_time}-${e.end_time}: ${e.title}${e.location ? ` (${e.location})` : ''}`
        ).join('\n')

        return `${title}:\n${list}`
      }

      case 'delete_calendar_event': {
        const eventId = parseInt(args.event_id)
        const success = await deleteEvent(eventId)

        if (success) {
          return `Termin mit ID ${eventId} wurde gelöscht.`
        }
        return `Termin mit ID ${eventId} wurde nicht gefunden.`
      }

      case 'list_timetracking_clients': {
        await fetchTimeTrackingClients()
        const clients = useTimeTrackingStore.getState().clients
        if (clients.length === 0) {
          return 'Keine Zeiterfassungs-Kunden vorhanden. Erstelle zuerst einen Kunden in der Zeiterfassungs-App.'
        }
        const list = clients.map(c => `- ID ${c.id}: ${c.name}`).join('\n')
        return `Zeiterfassungs-Kunden:\n${list}`
      }

      case 'list_timetracking_projects': {
        await fetchTimeTrackingProjects()
        const projects = useTimeTrackingStore.getState().projects
        if (projects.length === 0) {
          return 'Keine Projekte vorhanden. Erstelle zuerst ein Projekt in der Zeiterfassungs-App.'
        }
        const list = projects.map(p =>
          `- ID ${p.id}: ${p.name} (Kunde: ${p.client_name}, ${p.hourly_rate}€/h)`
        ).join('\n')
        return `Projekte:\n${list}`
      }

      case 'create_time_entry': {
        const today = new Date().toISOString().split('T')[0]

        const entryData = {
          project: parseInt(args.project_id),
          date: args.date || today,
          start_time: args.start_time,
          end_time: args.end_time,
          description: args.description || '',
          billable: args.billable !== 'false'
        }

        const entry = await addTimeEntry(entryData)

        if (entry) {
          openWindow('timetracking')
          onClose()
          const hours = entry.duration_minutes / 60
          return `Zeiteintrag erstellt: ${entry.start_time}-${entry.end_time} (${hours.toFixed(1)}h) für Projekt "${entry.project_name}".`
        }
        return 'Fehler beim Erstellen des Zeiteintrags. Stelle sicher, dass die Projekt-ID existiert.'
      }

      case 'list_kanban_cards': {
        const board = args.board || 'work'
        await fetchKanbanCards(board)
        const cards = useKanbanStore.getState().cards
        if (cards.length === 0) {
          return `Keine Aufgaben im ${board}-Board vorhanden.`
        }
        const columnNames: Record<string, string> = {
          backlog: 'Backlog',
          todo: 'To Do',
          in_progress: 'In Arbeit',
          in_review: 'Review',
          done: 'Erledigt'
        }
        const list = cards.map(c =>
          `- [${columnNames[c.column]}] ${c.title}${c.priority === 'high' ? ' ⚠️' : ''}${c.due_date ? ` (Fällig: ${c.due_date})` : ''}`
        ).join('\n')
        return `Aufgaben im ${board}-Board:\n${list}`
      }

      case 'create_kanban_card': {
        const cardData = {
          title: args.title,
          description: args.description || '',
          column: args.column || 'todo',
          priority: args.priority || 'medium',
          color: args.color || 'violet',
          board: args.board || 'work',
          due_date: args.due_date || null
        }

        const card = await createKanbanCard(cardData)

        if (card) {
          openWindow('kanban')
          onClose()
          return `Aufgabe "${card.title}" wurde erstellt und in "${args.column || 'todo'}" eingeordnet.`
        }
        return 'Fehler beim Erstellen der Aufgabe.'
      }

      default:
        return `Unbekannte Funktion: ${toolCall.function.name}`
    }
  }, [openWindow, onClose, fetchDocuments, createCustomer, createInvoice, fetchCustomers, customers, addEvent, getEventsForDate, getUpcomingEvents, deleteEvent, fetchTimeTrackingClients, fetchTimeTrackingProjects, addTimeEntry, fetchKanbanCards, createKanbanCard])

  // Handle Cmd key for recording toggle
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Meta' && !e.repeat) {
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
          // Start recording
          startRecording()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isRecording, isLoading, conversationHistory, startRecording, stopRecording, executeToolCall, speak, voiceResponseEnabled])

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
                  <span className="text-xs text-red-500/70">⌘ zum Senden</span>
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
                  placeholder={isRecording ? "Sprich jetzt..." : "Frag mich etwas... (⌘ für Spracheingabe)"}
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
              <span>⌘ Spracheingabe</span>
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
                  <span className="text-violet-500 animate-pulse">Spricht...</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
