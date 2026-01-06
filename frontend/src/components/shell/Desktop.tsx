import { useEffect, useCallback, useState } from 'react'
import { Dock } from './Dock'
import { BottomBar } from './BottomBar'
import { WindowManager } from './WindowManager'
import { MenuBar } from './MenuBar'
import { Spotlight } from './Spotlight'
import { AIOrb } from './AIOrb'
import { useWindowStore } from '@/stores/windowStore'
import { useMasterDataStore } from '@/stores/masterdataStore'
import { useTransactionsStore } from '@/stores/transactionsStore'
import { Keyboard } from 'lucide-react'

export function Desktop() {
  const windows = useWindowStore((state) => state.windows)
  const tileAllWindows = useWindowStore((state) => state.tileAllWindows)
  const isSpotlightOpen = useWindowStore((state) => state.isSpotlightOpen)
  const setSpotlightOpen = useWindowStore((state) => state.setSpotlightOpen)

  const [showShortcuts, setShowShortcuts] = useState(false)

  // Stabile Callbacks für MenuBar und Spotlight
  const openSpotlight = useCallback(() => setSpotlightOpen(true), [setSpotlightOpen])
  const closeSpotlight = useCallback(() => setSpotlightOpen(false), [setSpotlightOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignoriere wenn in Input-Feldern
      const target = e.target as HTMLElement
      const isInput = target instanceof HTMLInputElement ||
                      target instanceof HTMLTextAreaElement ||
                      target instanceof HTMLSelectElement ||
                      target.isContentEditable

      // ESC - Aktives Fenster schließen (global, unabhängig von Focus)
      // Spotlight hat eigenen ESC-Handler, der zuerst greift
      // Skip if a modal/preview is open (marked with data-modal-open)
      const hasOpenModal = document.querySelector('[data-modal-open="true"]')
      if (e.key === 'Escape' && !isInput && !hasOpenModal) {
        const windowState = useWindowStore.getState()
        if (windowState.activeWindowId && !isSpotlightOpen) {
          const activeWindow = windowState.windows.find(w => w.id === windowState.activeWindowId)

          // For masterdata/transactions: go back to home first, then close
          if (activeWindow?.appId === 'masterdata') {
            const masterDataState = useMasterDataStore.getState()
            if (masterDataState.activeView !== 'home') {
              e.preventDefault()
              e.stopPropagation()
              masterDataState.setActiveView('home')
              return
            }
          }
          if (activeWindow?.appId === 'transactions') {
            const transactionsState = useTransactionsStore.getState()
            if (transactionsState.activeView !== 'home') {
              e.preventDefault()
              e.stopPropagation()
              transactionsState.setActiveView('home')
              return
            }
          }

          e.preventDefault()
          e.stopPropagation()
          windowState.closeWindow(windowState.activeWindowId)
        }
      }

      // Space - Maximize active window (global, unabhängig von Focus)
      if ((e.key === ' ' || e.code === 'Space') && !isInput) {
        const windowState = useWindowStore.getState()
        if (windowState.activeWindowId && !isSpotlightOpen) {
          e.preventDefault()
          e.stopPropagation()
          windowState.maximizeWindow(windowState.activeWindowId)
        }
      }

      // Option/Alt key DOWN - Start AI Orb (push-to-talk)
      // Ignore repeated events (key held down)
      if (e.key === 'Alt' && !e.repeat && !isSpotlightOpen) {
        const currentOrbOpen = useWindowStore.getState().isOrbOpen
        if (!currentOrbOpen) {
          e.preventDefault()
          useWindowStore.getState().setOrbOpen(true)
        }
      }

      // Arrow Right - Stage Manager aus + Alle Fenster tilen/untilen
      if (e.key === 'ArrowRight' && !isSpotlightOpen) {
        e.preventDefault()
        const windowState = useWindowStore.getState()
        // Stage Manager deaktivieren falls aktiv
        if (windowState.stageManagerEnabled) {
          windowState.toggleStageManager()
        }
        tileAllWindows()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Option/Alt key UP - Stop AI Orb and send (push-to-talk)
      if (e.key === 'Alt') {
        const currentOrbOpen = useWindowStore.getState().isOrbOpen
        if (currentOrbOpen) {
          e.preventDefault()
          useWindowStore.getState().setOrbOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)  // Capture phase
    window.addEventListener('keyup', handleKeyUp, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
    // Alt/Orb handlers use getState() for fresh values
  }, [isSpotlightOpen, tileAllWindows])

  return (
    <div className="desktop-bg h-screen w-screen flex flex-col overflow-hidden">
      {/* Menu Bar */}
      <MenuBar onOpenSpotlight={openSpotlight} />

      {/* Desktop Area with Windows */}
      <div className="flex-1 relative">
        {/* Centered Logo Watermark - Golden Ratio */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            viewBox="0 0 144 89"
            className="w-48 h-30 opacity-[0.07] dark:opacity-[0.04] select-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {/* Golden Rectangle outer */}
            <rect x="1" y="1" width="142" height="87" rx="2" />
            {/* Golden spiral using quarter circles - Fibonacci sequence */}
            {/* 55x55 */}
            <path d="M 89 1 A 55 55 0 0 1 144 56" />
            {/* 34x34 */}
            <path d="M 144 56 A 34 34 0 0 1 110 90" />
            {/* 21x21 */}
            <path d="M 110 88 A 21 21 0 0 1 89 67" />
            {/* 13x13 */}
            <path d="M 89 67 A 13 13 0 0 1 102 54" />
            {/* 8x8 */}
            <path d="M 102 54 A 8 8 0 0 1 94 62" />
            {/* 5x5 */}
            <path d="M 94 62 A 5 5 0 0 1 99 57" />
            {/* Center point - the eye */}
            <circle cx="97" cy="59" r="2" fill="currentColor" />
          </svg>
        </div>
        <WindowManager windows={windows} />

        {/* AI Orb - Schwebendes Indikator wenn Chat minimiert */}
        <AIOrb />

        {/* Dock - Overlay */}
        <Dock />

        {/* Keyboard Shortcuts Help - Bottom Left */}
        <div
          className="absolute bottom-2 left-4 z-10"
          onMouseEnter={() => setShowShortcuts(true)}
          onMouseLeave={() => setShowShortcuts(false)}
        >
          {showShortcuts ? (
            <div className="glass rounded-lg p-3 text-xs space-y-1.5 min-w-[160px] animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-4">
                <span className="opacity-60">AI Orb (halten)</span>
                <kbd className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[10px] font-mono">⌥</kbd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="opacity-60">Max/Minimieren</span>
                <kbd className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[10px] font-mono">Space</kbd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="opacity-60">Schließen</span>
                <kbd className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[10px] font-mono">ESC</kbd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="opacity-60">Tiling</span>
                <kbd className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[10px] font-mono">→</kbd>
              </div>
            </div>
          ) : (
            <button
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors opacity-30 hover:opacity-60"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <BottomBar />

      {/* Spotlight AI Assistant */}
      <Spotlight isOpen={isSpotlightOpen} onClose={closeSpotlight} />
    </div>
  )
}
