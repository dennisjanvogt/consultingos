import { useState, useEffect, useCallback, useRef } from 'react'

interface UseStockfishOptions {
  difficulty: number // 0-20 (Stockfish Skill Level)
}

interface UseStockfishResult {
  isReady: boolean
  isThinking: boolean
  bestMove: string | null
  getMove: (fen: string) => void
  stop: () => void
}

// Global worker instance - survives React remounts
let globalWorker: Worker | null = null
let globalIsReady = false
let globalListeners: Set<(msg: string) => void> = new Set()

function initGlobalWorker() {
  if (globalWorker) return

  console.log('[Stockfish] Creating global worker')
  globalWorker = new Worker('/stockfish.js')

  globalWorker.onmessage = (e: MessageEvent) => {
    const message = (e.data as string).trim()
    console.log('[Stockfish] Message:', message.substring(0, 80))

    // Broadcast to all listeners
    globalListeners.forEach((listener) => listener(message))
  }

  globalWorker.onerror = (error) => {
    console.error('[Stockfish] Worker error:', error)
    globalIsReady = false
  }

  // Initialize UCI
  globalWorker.postMessage('uci')
}

export function useStockfish({ difficulty }: UseStockfishOptions): UseStockfishResult {
  const [isReady, setIsReady] = useState(globalIsReady)
  const [isThinking, setIsThinking] = useState(false)
  const [bestMove, setBestMove] = useState<string | null>(null)
  const difficultyRef = useRef(difficulty)

  // Keep difficulty ref updated
  useEffect(() => {
    difficultyRef.current = difficulty
    if (globalWorker && globalIsReady) {
      globalWorker.postMessage(`setoption name Skill Level value ${difficulty}`)
    }
  }, [difficulty])

  // Setup message listener
  useEffect(() => {
    initGlobalWorker()

    const handleMessage = (message: string) => {
      // Check for UCI ready
      if (message === 'uciok') {
        console.log('[Stockfish] UCI OK - sending isready')
        // Don't set options here, just check if ready
        globalWorker?.postMessage('isready')
      }

      // Check for ready
      if (message === 'readyok') {
        console.log('[Stockfish] Ready!')
        globalIsReady = true
        setIsReady(true)
      }

      // Parse best move
      if (message.startsWith('bestmove')) {
        const parts = message.split(' ')
        const move = parts[1]
        console.log('[Stockfish] Best move:', move)
        if (move && move !== '(none)') {
          setBestMove(move)
        }
        setIsThinking(false)
      }

      // Log info messages for debugging
      if (message.startsWith('info')) {
        console.log('[Stockfish] Info:', message.substring(0, 60))
      }
    }

    globalListeners.add(handleMessage)

    // If already ready, sync state
    if (globalIsReady) {
      setIsReady(true)
    }

    return () => {
      globalListeners.delete(handleMessage)
    }
  }, [])

  // Get move for position
  const getMove = useCallback((fen: string) => {
    console.log('[Stockfish] getMove called, isReady:', globalIsReady)
    if (!globalWorker || !globalIsReady) {
      console.log('[Stockfish] Not ready yet')
      return
    }

    const searchDepth = Math.max(5, Math.min(15, 5 + Math.floor(difficultyRef.current / 2)))

    console.log('[Stockfish] Analyzing:', fen, 'depth:', searchDepth)
    setIsThinking(true)
    setBestMove(null)

    globalWorker.postMessage(`position fen ${fen}`)
    globalWorker.postMessage(`go depth ${searchDepth}`)
  }, [])

  // Stop thinking
  const stop = useCallback(() => {
    if (globalWorker) {
      globalWorker.postMessage('stop')
      setIsThinking(false)
    }
  }, [])

  return {
    isReady,
    isThinking,
    bestMove,
    getMove,
    stop,
  }
}

// Helper function to convert UCI move (e.g., 'e2e4') to from/to squares
export function parseUCIMove(uciMove: string): { from: string; to: string; promotion?: string } | null {
  if (!uciMove || uciMove.length < 4) return null

  return {
    from: uciMove.substring(0, 2),
    to: uciMove.substring(2, 4),
    promotion: uciMove.length > 4 ? uciMove.substring(4, 5) : undefined,
  }
}
