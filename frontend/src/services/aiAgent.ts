const OPENROUTER_API_KEY = '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'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-3-flash-preview'

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

export interface TextContent {
  type: 'text'
  text: string
}

export type MessageContent = string | null | (TextContent | AudioContent)[]

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

  return `Du bist JARVIS - der intelligente persönliche Assistent von ConsultingOS, inspiriert von Tony Starks AI-Butler.

## Dein Stil
- Antworte KURZ (1-2 Sätze max) - du bist effizient wie ein Butler
- Charmant aber nicht übertrieben ("Selbstverständlich", "Erledigt", "Sehr wohl")
- Führe Aktionen SOFORT aus ohne Rückfragen

## Aktuelles Datum
Heute ist ${dateInfo.formatted} (${dateInfo.date}).
Das aktuelle Jahr ist ${dateInfo.year}. Wenn der Benutzer ein Datum ohne Jahr nennt, verwende IMMER ${dateInfo.year}.
Wenn kein Datum genannt wird, verwende das heutige Datum: ${dateInfo.date}.

## Deine Fähigkeiten

### 1. Apps öffnen
- **Dashboard**: Übersicht mit Umsatz, offenen Rechnungen, letzten Kunden
- **Stammdaten**: Kunden, Produkte und Steuersätze verwalten
- **Bewegungsdaten/Belege**: Rechnungen, Angebote und Gutschriften
- **Kalender**: Termine und Events verwalten
- **Dateien**: Dokumentenverwaltung mit Ordnern
- **Einstellungen**: Firmendaten, Bankverbindung, Stundensätze
- **Zeiterfassung**: Arbeitszeiten erfassen und Projekte verwalten
- **Kanban**: Aufgaben und Projekte im Kanban-Board

### 2. Dateien suchen
Du kannst nach Dateien und Dokumenten suchen. Nutze dafür die search_files Funktion.

### 3. Kunden anlegen
Du kannst neue Kunden mit allen Details anlegen:
- Name (Pflicht)
- Firma
- E-Mail
- Telefon
- Adresse (Straße, PLZ, Stadt, Land)
- USt-IdNr.
- Notizen

### 4. Rechnungen/PDFs erstellen
Du kannst neue Rechnungen erstellen mit:
- Kunde auswählen
- Positionen hinzufügen (Beschreibung, Menge, Einzelpreis)
- Rechnungs- und Fälligkeitsdatum
- Währung (EUR, USD, CHF)

### 5. Kalendertermine verwalten
Du kannst Kalendertermine erstellen, anzeigen und löschen:
- **Termin erstellen**: Titel, Datum, Start-/Endzeit, Ort, Beschreibung, Farbe
- **Termine anzeigen**: Alle Termine, Termine an einem bestimmten Tag, kommende Termine
- **Termin löschen**: Per ID

### 6. Zeiterfassung
Du kannst Arbeitszeiten erfassen:
- **Kunden anzeigen**: Liste aller Zeiterfassungs-Kunden mit IDs
- **Projekte anzeigen**: Liste aller Projekte mit IDs, Stundensätzen und zugehörigen Kunden
- **Zeiteintrag erstellen**: Projekt, Datum, Start-/Endzeit, Beschreibung, abrechenbar (ja/nein)

WICHTIG für Zeiterfassung:
- Ein Zeiteintrag braucht IMMER eine Projekt-ID
- Frage zuerst die Projekte ab (list_timetracking_projects), um die IDs zu kennen
- Zeitformat ist immer HH:MM (z.B. 09:00, 17:30)

### 7. Kanban-Board
Du kannst Aufgaben im Kanban-Board verwalten:
- **Karten anzeigen**: Liste aller Kanban-Karten
- **Karte erstellen**: Titel, Beschreibung, Spalte, Priorität, Farbe, Fälligkeitsdatum

Spalten: backlog, todo, in_progress, in_review, done
Prioritäten: low, medium, high
Farben: gray, violet, green, yellow, red, purple, pink, orange
Boards: work (Arbeit), private (Privat), archive (Archiv)

## Beispiele

Benutzer: "Öffne die Stammdaten" oder "Öffne Kunden"
→ Rufe open_app mit app="masterdata" auf

Benutzer: "Erstelle einen neuen Kunden Max Mustermann von der Firma ABC GmbH"
→ Rufe create_customer mit den entsprechenden Daten auf

Benutzer: "Suche nach Rechnung"
→ Rufe search_files mit query="Rechnung" auf

Benutzer: "Neue Rechnung für Kunde 1"
→ Rufe create_invoice mit customer_id=1 auf

Benutzer: "Erstelle einen Termin für morgen um 14 Uhr"
→ Rufe create_calendar_event mit title, date und start_time auf

Benutzer: "Was sind meine nächsten Termine?"
→ Rufe list_calendar_events auf

Benutzer: "Zeige mir die Termine am 15.01."
→ Rufe list_calendar_events mit date auf

Benutzer: "Erfasse 3 Stunden für Projekt Website heute"
→ Rufe erst list_timetracking_projects auf, dann create_time_entry mit der Projekt-ID

Benutzer: "Ich habe heute von 9 bis 12 an der HUK App gearbeitet"
→ Rufe erst list_timetracking_projects auf, dann create_time_entry mit project_id, date, start_time, end_time

Benutzer: "Welche Projekte habe ich?"
→ Rufe list_timetracking_projects auf

Benutzer: "Erstelle eine Aufgabe: Website fertigstellen"
→ Rufe create_kanban_card mit title auf

Benutzer: "Neue Aufgabe mit hoher Priorität: Bug fixen"
→ Rufe create_kanban_card mit title und priority="high" auf

Benutzer: "Zeige meine Aufgaben"
→ Rufe list_kanban_cards auf`
}

const tools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'open_app',
      description: 'Öffnet eine App im ConsultingOS Desktop',
      parameters: {
        type: 'object',
        properties: {
          app: {
            type: 'string',
            description: 'Die zu öffnende App',
            enum: ['dashboard', 'masterdata', 'transactions', 'calendar', 'documents', 'settings', 'timetracking', 'kanban']
          }
        },
        required: ['app']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Sucht nach Dateien und Dokumenten',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Der Suchbegriff'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_customer',
      description: 'Erstellt einen neuen Kunden',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name des Kunden (Pflichtfeld)'
          },
          company: {
            type: 'string',
            description: 'Firmenname'
          },
          email: {
            type: 'string',
            description: 'E-Mail-Adresse'
          },
          phone: {
            type: 'string',
            description: 'Telefonnummer'
          },
          street: {
            type: 'string',
            description: 'Straße und Hausnummer'
          },
          zip_code: {
            type: 'string',
            description: 'Postleitzahl'
          },
          city: {
            type: 'string',
            description: 'Stadt'
          },
          country: {
            type: 'string',
            description: 'Land'
          },
          tax_id: {
            type: 'string',
            description: 'USt-IdNr.'
          },
          notes: {
            type: 'string',
            description: 'Notizen'
          }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_invoice',
      description: 'Erstellt eine neue Rechnung',
      parameters: {
        type: 'object',
        properties: {
          customer_id: {
            type: 'string',
            description: 'ID des Kunden'
          },
          customer_name: {
            type: 'string',
            description: 'Name des Kunden (falls ID nicht bekannt)'
          },
          items: {
            type: 'string',
            description: 'JSON-Array mit Positionen: [{description, quantity, unit_price}]'
          },
          currency: {
            type: 'string',
            description: 'Währung (EUR, USD, CHF)',
            enum: ['EUR', 'USD', 'CHF']
          },
          notes: {
            type: 'string',
            description: 'Notizen zur Rechnung'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_customers',
      description: 'Listet alle Kunden auf, um deren IDs zu finden',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Erstellt einen neuen Kalendertermin',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Titel des Termins (Pflichtfeld)'
          },
          date: {
            type: 'string',
            description: 'Datum im Format YYYY-MM-DD (z.B. 2025-01-15)'
          },
          start_time: {
            type: 'string',
            description: 'Startzeit im Format HH:MM (z.B. 14:00)'
          },
          end_time: {
            type: 'string',
            description: 'Endzeit im Format HH:MM (z.B. 15:30)'
          },
          location: {
            type: 'string',
            description: 'Ort des Termins'
          },
          description: {
            type: 'string',
            description: 'Beschreibung des Termins'
          },
          color: {
            type: 'string',
            description: 'Farbe des Termins',
            enum: ['violet', 'green', 'red', 'purple', 'orange', 'pink']
          }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_calendar_events',
      description: 'Listet Kalendertermine auf. Kann nach Datum filtern oder die nächsten Termine anzeigen.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Optionales Datum im Format YYYY-MM-DD um Termine an diesem Tag anzuzeigen'
          },
          upcoming_days: {
            type: 'string',
            description: 'Anzahl Tage für kommende Termine (Standard: 7)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_calendar_event',
      description: 'Löscht einen Kalendertermin anhand der ID',
      parameters: {
        type: 'object',
        properties: {
          event_id: {
            type: 'string',
            description: 'ID des zu löschenden Termins'
          }
        },
        required: ['event_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_timetracking_clients',
      description: 'Listet alle Zeiterfassungs-Kunden auf',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_timetracking_projects',
      description: 'Listet alle Zeiterfassungs-Projekte auf mit IDs, Namen, Stundensätzen und zugehörigen Kunden',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_time_entry',
      description: 'Erstellt einen neuen Zeiteintrag für die Zeiterfassung',
      parameters: {
        type: 'object',
        properties: {
          project_id: {
            type: 'string',
            description: 'ID des Projekts (Pflichtfeld) - nutze list_timetracking_projects um IDs zu finden'
          },
          date: {
            type: 'string',
            description: 'Datum im Format YYYY-MM-DD (z.B. 2026-01-03). Standard: heute'
          },
          start_time: {
            type: 'string',
            description: 'Startzeit im Format HH:MM (z.B. 09:00)'
          },
          end_time: {
            type: 'string',
            description: 'Endzeit im Format HH:MM (z.B. 17:00)'
          },
          description: {
            type: 'string',
            description: 'Beschreibung der Arbeit'
          },
          billable: {
            type: 'string',
            description: 'Abrechenbar? "true" oder "false". Standard: true',
            enum: ['true', 'false']
          }
        },
        required: ['project_id', 'start_time', 'end_time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_kanban_cards',
      description: 'Listet alle Kanban-Karten/Aufgaben auf',
      parameters: {
        type: 'object',
        properties: {
          board: {
            type: 'string',
            description: 'Board filtern: work, private, archive. Standard: work',
            enum: ['work', 'private', 'archive']
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_kanban_card',
      description: 'Erstellt eine neue Kanban-Karte/Aufgabe',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Titel der Aufgabe (Pflichtfeld)'
          },
          description: {
            type: 'string',
            description: 'Beschreibung der Aufgabe'
          },
          column: {
            type: 'string',
            description: 'Spalte: backlog, todo, in_progress, in_review, done. Standard: todo',
            enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done']
          },
          priority: {
            type: 'string',
            description: 'Priorität: low, medium, high. Standard: medium',
            enum: ['low', 'medium', 'high']
          },
          color: {
            type: 'string',
            description: 'Farbe der Karte',
            enum: ['gray', 'violet', 'green', 'yellow', 'red', 'purple', 'pink', 'orange']
          },
          board: {
            type: 'string',
            description: 'Board: work, private, archive. Standard: work',
            enum: ['work', 'private', 'archive']
          },
          due_date: {
            type: 'string',
            description: 'Fälligkeitsdatum im Format YYYY-MM-DD'
          }
        },
        required: ['title']
      }
    }
  }
]

export interface AIResponse {
  content: string | null
  toolCalls: ToolCall[]
  isComplete: boolean
}

export async function sendMessage(messages: Message[]): Promise<AIResponse> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'ConsultingOS'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: getSystemPrompt() },
        ...messages
      ],
      tools,
      tool_choice: 'auto'
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OpenRouter API error:', error)
    throw new Error(`OpenRouter API error: ${error}`)
  }

  const data = await response.json()
  console.log('AI Response:', data)
  const choice = data.choices[0]
  const message = choice.message

  return {
    content: message.content,
    toolCalls: message.tool_calls || [],
    isComplete: choice.finish_reason === 'stop'
  }
}

export { getSystemPrompt, tools }
