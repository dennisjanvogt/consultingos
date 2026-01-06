import { useAIStore } from '@/stores/aiStore'
import { getToolDefinitions, getToolStats, getFilteredToolDefinitions, getToolDefinitionsForChat } from './tools'
import { getAppsForAI } from '@/config/apps'
import type { AIHelper } from '@/api/types'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Get the current chat model from the store
const getChatModel = () => useAIStore.getState().chatModel

// Get analysis mode state
const getAnalysisMode = () => useAIStore.getState().analysisMode

// Analysis mode prompt - appended when inline charts are enabled in chat
const ANALYSIS_MODE_PROMPT = `

## INLINE-CHARTS AKTIV

Für Charts NUTZE diese Tools:
- inline_stock_chart: Aktienkurse (symbol, period: 1w/1m/3m/6m/1y)
- inline_stock_with_ma: Aktie + Moving Average (symbol, period, ma_days)
- inline_crypto_chart: Kryptowährungen (coin, days)

BEISPIELE:
- "Amazon Chart" → inline_stock_chart(symbol="AMZN", period="3m")
- "Tesla 1 Jahr" → inline_stock_chart(symbol="TSLA", period="1y")
- "Apple mit MA" → inline_stock_with_ma(symbol="AAPL", period="6m", ma_days=20)
- "Bitcoin" → inline_crypto_chart(coin="bitcoin", days=30)

WICHTIG: Kein SVG/HTML selbst generieren - immer Tool aufrufen!`

// Log tool stats on load
const stats = getToolStats()
console.log(`AI Agent loaded with ${stats.total} tools:`, stats.byCategory)

export interface Tool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, { type: string; description: string; enum?: string[] }>
      required: string[]
    }
  }
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface AudioContent {
  type: 'input_audio'
  input_audio: {
    data: string // base64 encoded audio
    format: 'wav' | 'mp3' | 'ogg' | 'webm'
  }
}

export interface ImageContent {
  type: 'image_url'
  image_url: {
    url: string // base64 data URL or http URL
  }
}

export interface TextContent {
  type: 'text'
  text: string
}

export type MessageContent = string | null | (TextContent | AudioContent | ImageContent)[]

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: MessageContent
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

// Get current date for the AI prompt (called fresh each time)
const getSystemPrompt = () => {
  const now = new Date()
  const dateInfo = {
    date: now.toISOString().split('T')[0],
    year: now.getFullYear(),
    formatted: now.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  return `Du bist Sammy, ein effizienter persönlicher Assistent.

## KOMMUNIKATIONSSTIL (OBERSTE PRIORITÄT)
- Antworte EXTREM KURZ. Maximal 1 Satz, oft reichen 2-3 Worte.
- NIEMALS Vorschläge machen was du kannst. NIEMALS fragen "Soll ich noch...?" oder "Ich könnte auch..."
- NIEMALS deine Fähigkeiten auflisten oder erklären, auch nicht auf direkte Frage.
- Handle einfach still. Bestätige nur kurz: "Erledigt", "Hier", "Kommt", "Fertig", "Ist notiert".
- Nur bei echten Fehlern oder wenn etwas wirklich unklar ist, frag kurz nach.
- Sei natürlich wie ein guter Freund, nicht wie ein Roboter.

## DATUM
Heute: ${dateInfo.formatted} (${dateInfo.date})
Jahr: ${dateInfo.year} - bei Datumsangaben ohne Jahr IMMER ${dateInfo.year} verwenden.
Wenn kein Datum genannt wird, verwende heute: ${dateInfo.date}.

## FÄHIGKEITEN (nutzen, aber NIEMALS erwähnen oder auflisten)

### Apps öffnen (open_app mit app="<id>")
${getAppsForAI()}

### Kunden anlegen
Name (Pflicht), Firma, E-Mail, Telefon, Adresse (Straße, PLZ, Stadt, Land), USt-IdNr., Notizen

### Rechnungen erstellen
Kunde auswählen, Positionen (Beschreibung, Menge, Einzelpreis), Datum, Währung (EUR, USD, CHF)
Status ändern: mark_invoice_sent, mark_invoice_paid

### Kalendertermine
Erstellen: Titel, Datum, Start-/Endzeit, Ort, Beschreibung, Farbe
Anzeigen: Alle, bestimmter Tag, kommende
Löschen: Per ID

### Zeiterfassung (WICHTIG)
- Ein Zeiteintrag braucht IMMER eine Projekt-ID
- IMMER erst list_timetracking_projects aufrufen um IDs zu bekommen
- Zeitformat: HH:MM (z.B. 09:00, 17:30)
- Timer: start_timer, stop_timer, pause_timer, resume_timer

### Kanban-Board
Karten: erstellen, verschieben, aktualisieren, löschen
Spalten: backlog, todo, in_progress, in_review, done
Prioritäten: low, medium, high
Farben: gray, violet, green, yellow, red, purple, pink, orange
Boards: work, private, archive

### Dateien suchen
search_files mit query

### Bilder generieren
generate_image mit detailliertem Prompt, optional filename

### Marktdaten (nur Textantworten)
- Aktien: get_stock_quote (aktueller Kurs)
- Crypto: get_crypto_price (aktueller Preis)
- Wetter: get_weather (aktuelles Wetter)

Hinweis: Charts und Dashboard-Visualisierungen werden über den AI Orb gesteuert, nicht über den Chat.

## BEISPIELE (wie du handeln sollst)

"Öffne Stammdaten" → open_app mit app="masterdata"
"Neuer Kunde Max Mustermann, ABC GmbH" → create_customer mit Daten
"Suche nach Rechnung" → search_files mit query="Rechnung"
"Rechnung für Kunde 1" → create_invoice mit customer_id=1
"Termin morgen 14 Uhr Meeting" → create_calendar_event mit title, date, start_time
"Meine nächsten Termine?" → list_calendar_events
"Termine am 15.01." → list_calendar_events mit date
"3 Stunden Website heute" → ERST list_timetracking_projects, DANN create_time_entry
"Von 9 bis 12 an HUK App gearbeitet" → ERST list_timetracking_projects, DANN create_time_entry
"Meine Projekte?" → list_timetracking_projects
"Aufgabe: Website fertig" → create_kanban_card mit title
"Bug fixen, hohe Prio" → create_kanban_card mit priority="high"
"Meine Aufgaben" → list_kanban_cards
"Bild: Sonnenuntergang am Strand" → generate_image mit prompt
"Timer starten für Website" → start_timer mit description
"Timer stopp" → stop_timer
"Rechnung 5 bezahlt" → mark_invoice_paid mit invoice_id=5
"Aufgabe nach Done" → move_kanban_card mit column="done"
"Apple Aktie" → get_stock_quote mit symbol="AAPL"
"Wetter Berlin" → get_weather mit city="Berlin"
"Bitcoin Preis" → get_crypto_price mit coin="bitcoin"`
}

// Tools are now loaded dynamically from the tool registry
// See: frontend/src/services/tools/

export interface AIResponse {
  content: string | null
  toolCalls: ToolCall[]
  isComplete: boolean
}

export interface SendMessageOptions {
  helper?: AIHelper | null
  /** Bypass analysis mode filtering - use all tools including dashboard tools */
  bypassAnalysisMode?: boolean
  /** AbortSignal for cancelling the request */
  signal?: AbortSignal
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void
  onToolCall?: (toolCall: ToolCall) => void
  onComplete: (response: AIResponse) => void
  onError: (error: Error) => void
}

// Streaming version of sendMessage
export async function sendMessageStream(
  messages: Message[],
  callbacks: StreamCallbacks,
  options?: SendMessageOptions
): Promise<void> {
  const model = getChatModel()
  const helper = options?.helper
  const bypassAnalysisMode = options?.bypassAnalysisMode ?? false
  const analysisMode = bypassAnalysisMode ? false : getAnalysisMode()
  const signal = options?.signal

  // Build system prompt - append analysis mode prompt if enabled
  let systemPrompt = helper?.system_prompt || getSystemPrompt()
  if (analysisMode) {
    systemPrompt += ANALYSIS_MODE_PROMPT
  }

  // Use helper's enabled tools if provided, otherwise filter based on analysis mode
  const tools = helper?.enabled_tools && helper.enabled_tools.length > 0
    ? getFilteredToolDefinitions(helper.enabled_tools)
    : getToolDefinitionsForChat(analysisMode)

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
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        stream: true
      }),
      signal
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error: ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let content = ''
    let toolCalls: ToolCall[] = []
    let toolCallsInProgress: Record<number, { id: string; type: string; function: { name: string; arguments: string } }> = {}

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta

            if (delta?.content) {
              content += delta.content
              callbacks.onChunk(delta.content)
            }

            // Handle tool calls in streaming
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index
                if (!toolCallsInProgress[index]) {
                  toolCallsInProgress[index] = {
                    id: tc.id || '',
                    type: 'function',
                    function: { name: tc.function?.name || '', arguments: '' }
                  }
                }
                if (tc.id) toolCallsInProgress[index].id = tc.id
                if (tc.function?.name) toolCallsInProgress[index].function.name = tc.function.name
                if (tc.function?.arguments) toolCallsInProgress[index].function.arguments += tc.function.arguments
              }
            }

            // Check for finish reason
            if (parsed.choices?.[0]?.finish_reason) {
              // Convert toolCallsInProgress to array
              toolCalls = Object.values(toolCallsInProgress) as ToolCall[]
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    callbacks.onComplete({
      content: content || null,
      toolCalls,
      isComplete: true
    })
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)))
  }
}

// Non-streaming version (kept for compatibility)
export async function sendMessage(messages: Message[], options?: SendMessageOptions): Promise<AIResponse> {
  const model = getChatModel()
  const helper = options?.helper
  const bypassAnalysisMode = options?.bypassAnalysisMode ?? false
  const analysisMode = bypassAnalysisMode ? false : getAnalysisMode()
  const signal = options?.signal

  // Build system prompt - append analysis mode prompt if enabled
  let systemPrompt = helper?.system_prompt || getSystemPrompt()
  if (analysisMode) {
    systemPrompt += ANALYSIS_MODE_PROMPT
  }

  // Use helper's enabled tools if provided, otherwise filter based on analysis mode
  const tools = helper?.enabled_tools && helper.enabled_tools.length > 0
    ? getFilteredToolDefinitions(helper.enabled_tools)
    : getToolDefinitionsForChat(analysisMode)

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'ConsultingOS'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined
    }),
    signal
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${error}`)
  }

  const data = await response.json()
  const choice = data.choices[0]
  const message = choice.message

  return {
    content: message.content,
    toolCalls: message.tool_calls || [],
    isComplete: choice.finish_reason === 'stop'
  }
}

// Export tools from registry
const tools = getToolDefinitions()
export { getSystemPrompt, tools }
