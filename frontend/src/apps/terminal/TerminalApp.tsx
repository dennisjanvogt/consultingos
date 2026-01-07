import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Trash2, RotateCcw } from 'lucide-react'
import '@xterm/xterm/css/xterm.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export function TerminalApp() {
  const { t } = useTranslation()
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentLine, setCurrentLine] = useState('')
  const commandHistoryRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)

  const executeCommand = useCallback(async (command: string) => {
    if (!xtermRef.current) return

    try {
      const response = await fetch(`${API_URL}/terminal/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ command }),
      })

      if (!response.ok) {
        if (response.status === 403) {
          xtermRef.current.writeln('\r\n\x1b[31mError: Admin access required\x1b[0m')
        } else {
          const error = await response.json()
          xtermRef.current.writeln(`\r\n\x1b[31mError: ${error.detail || 'Unknown error'}\x1b[0m`)
        }
        return
      }

      const data = await response.json()

      if (data.stdout) {
        // Split output into lines and write each
        const lines = data.stdout.split('\n')
        lines.forEach((line: string, index: number) => {
          if (index < lines.length - 1 || line) {
            xtermRef.current?.writeln(line)
          }
        })
      }

      if (data.stderr) {
        xtermRef.current.write('\x1b[31m') // Red color
        const lines = data.stderr.split('\n')
        lines.forEach((line: string, index: number) => {
          if (index < lines.length - 1 || line) {
            xtermRef.current?.writeln(line)
          }
        })
        xtermRef.current.write('\x1b[0m') // Reset color
      }

      if (data.error) {
        xtermRef.current.writeln(`\x1b[31m${data.error}\x1b[0m`)
      }
    } catch (error) {
      xtermRef.current.writeln(`\r\n\x1b[31mConnection error: ${error}\x1b[0m`)
    }
  }, [])

  const writePrompt = useCallback((newLine = false) => {
    if (xtermRef.current) {
      xtermRef.current.write(`${newLine ? '\r\n' : ''}\x1b[32m$\x1b[0m `)
    }
  }, [])

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        cursorAccent: '#1a1b26',
        selectionBackground: '#33467c',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
      },
      scrollback: 10000,
      convertEol: true,
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)

    xterm.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Welcome message
    xterm.writeln('\x1b[36m╔═══════════════════════════════════════╗\x1b[0m')
    xterm.writeln('\x1b[36m║\x1b[0m  \x1b[1;33mConsultingOS Terminal\x1b[0m               \x1b[36m║\x1b[0m')
    xterm.writeln('\x1b[36m║\x1b[0m  \x1b[90mAdmin Shell - Django Server\x1b[0m         \x1b[36m║\x1b[0m')
    xterm.writeln('\x1b[36m╚═══════════════════════════════════════╝\x1b[0m')
    xterm.writeln('')
    xterm.writeln('\x1b[90mType "help" for available commands\x1b[0m')

    writePrompt(true)
    setIsConnected(true)

    let currentInput = ''

    // Handle input
    xterm.onData((data) => {
      const code = data.charCodeAt(0)

      if (code === 13) {
        // Enter
        const command = currentInput.trim()
        currentInput = ''
        historyIndexRef.current = -1

        if (command) {
          commandHistoryRef.current.unshift(command)
          if (commandHistoryRef.current.length > 100) {
            commandHistoryRef.current.pop()
          }

          if (command === 'clear') {
            xterm.clear()
            writePrompt(true)
          } else {
            xterm.write('\r\n') // New line after command
            executeCommand(command).then(() => writePrompt(true))
          }
        } else {
          writePrompt(true)
        }
      } else if (code === 127) {
        // Backspace
        if (currentInput.length > 0) {
          currentInput = currentInput.slice(0, -1)
          xterm.write('\b \b')
        }
      } else if (code === 27) {
        // Escape sequences (arrow keys, etc.)
        if (data === '\x1b[A') {
          // Up arrow - previous command
          if (historyIndexRef.current < commandHistoryRef.current.length - 1) {
            historyIndexRef.current++
            const cmd = commandHistoryRef.current[historyIndexRef.current]
            // Clear current input
            xterm.write('\r\x1b[K\x1b[32m$\x1b[0m ' + cmd)
            currentInput = cmd
          }
        } else if (data === '\x1b[B') {
          // Down arrow - next command
          if (historyIndexRef.current > 0) {
            historyIndexRef.current--
            const cmd = commandHistoryRef.current[historyIndexRef.current]
            xterm.write('\r\x1b[K\x1b[32m$\x1b[0m ' + cmd)
            currentInput = cmd
          } else if (historyIndexRef.current === 0) {
            historyIndexRef.current = -1
            xterm.write('\r\x1b[K\x1b[32m$\x1b[0m ')
            currentInput = ''
          }
        }
      } else if (code >= 32) {
        // Printable characters
        currentInput += data
        xterm.write(data)
      } else if (code === 3) {
        // Ctrl+C
        xterm.write('^C')
        currentInput = ''
        writePrompt(true)
      }

      setCurrentLine(currentInput)
    })

    // Handle resize with debounce to prevent infinite loops
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        if (fitAddonRef.current && terminalRef.current) {
          const { clientWidth, clientHeight } = terminalRef.current
          if (clientWidth > 0 && clientHeight > 0) {
            try {
              fitAddonRef.current.fit()
            } catch {
              // Ignore resize errors
            }
          }
        }
      }, 100)
    })

    resizeObserver.observe(terminalRef.current)

    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeObserver.disconnect()
      xterm.dispose()
      xtermRef.current = null
    }
  }, [executeCommand, writePrompt])

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear()
      writePrompt(true)
    }
  }

  const handleReconnect = () => {
    if (xtermRef.current) {
      xtermRef.current.writeln('\r\n\x1b[33mReconnecting...\x1b[0m')
      writePrompt(true)
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-[#1a1b26]">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-[#1a1b26] border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400">
            {isConnected ? t('terminal.connected', 'Verbunden') : t('terminal.disconnected', 'Getrennt')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title={t('terminal.clear', 'Löschen')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleReconnect}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title={t('terminal.reconnect', 'Neu verbinden')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        className="flex-1 min-h-0 overflow-hidden"
        style={{ padding: '8px' }}
      />
    </div>
  )
}
