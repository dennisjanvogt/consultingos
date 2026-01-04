import { useState, useEffect } from 'react'
import { Dock } from './Dock'
import { BottomBar } from './BottomBar'
import { WindowManager } from './WindowManager'
import { MenuBar } from './MenuBar'
import { Spotlight } from './Spotlight'
import { useWindowStore } from '@/stores/windowStore'
import { useMasterDataStore } from '@/stores/masterdataStore'
import { useTransactionsStore } from '@/stores/transactionsStore'

export function Desktop() {
  const windows = useWindowStore((state) => state.windows)
  const tileAllWindows = useWindowStore((state) => state.tileAllWindows)
  const stageManagerEnabled = useWindowStore((state) => state.stageManagerEnabled)
  const toggleStageManager = useWindowStore((state) => state.toggleStageManager)
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false)

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
      if (e.key === 'Escape' && !isInput) {
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

      // Option/Alt key to open Spotlight (only when closed)
      // When open, the Spotlight component handles Option for voice recording
      if (e.key === 'Alt' && !isSpotlightOpen) {
        e.preventDefault()
        setIsSpotlightOpen(true)
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

    window.addEventListener('keydown', handleKeyDown, true)  // Capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isSpotlightOpen, tileAllWindows, stageManagerEnabled, toggleStageManager])

  return (
    <div className="desktop-bg h-screen w-screen flex flex-col overflow-hidden">
      {/* Menu Bar */}
      <MenuBar onOpenSpotlight={() => setIsSpotlightOpen(true)} />

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

        {/* Dock - Overlay */}
        <Dock />
      </div>

      {/* Bottom Bar */}
      <BottomBar />

      {/* Spotlight AI Assistant */}
      <Spotlight isOpen={isSpotlightOpen} onClose={() => setIsSpotlightOpen(false)} />
    </div>
  )
}
