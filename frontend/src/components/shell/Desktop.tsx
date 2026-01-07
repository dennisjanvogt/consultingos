import { useEffect, useCallback } from 'react'
import { Dock } from './Dock'
import { BottomBar } from './BottomBar'
import { WindowManager } from './WindowManager'
import { MenuBar } from './MenuBar'
import { Spotlight } from './Spotlight'
import { AIOrb } from './AIOrb'
import { AppOverview } from './AppOverview'
import { useWindowStore } from '@/stores/windowStore'
import { useMasterDataStore } from '@/stores/masterdataStore'
import { useTransactionsStore } from '@/stores/transactionsStore'
import { useWhiteboardStore } from '@/stores/whiteboardStore'

export function Desktop() {
  const windows = useWindowStore((state) => state.windows)
  const tileAllWindows = useWindowStore((state) => state.tileAllWindows)
  const isSpotlightOpen = useWindowStore((state) => state.isSpotlightOpen)
  const setSpotlightOpen = useWindowStore((state) => state.setSpotlightOpen)
  const isAppOverviewOpen = useWindowStore((state) => state.isAppOverviewOpen)
  const setAppOverviewOpen = useWindowStore((state) => state.setAppOverviewOpen)


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

      // ESC - Aktives Fenster schließen oder Settings öffnen wenn keine App offen
      // Spotlight/AppOverview haben eigene ESC-Handler, die zuerst greifen
      // Skip if a modal/preview is open (marked with data-modal-open)
      const hasOpenModal = document.querySelector('[data-modal-open="true"]')
      if (e.key === 'Escape' && !isInput && !hasOpenModal && !isSpotlightOpen && !isAppOverviewOpen) {
        const windowState = useWindowStore.getState()
        const visibleWindows = windowState.windows.filter(w => !w.isMinimized)

        if (windowState.activeWindowId) {
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

          // For whiteboard: let the app handle ESC when in editor or project view
          if (activeWindow?.appId === 'whiteboard') {
            const whiteboardState = useWhiteboardStore.getState()
            if (whiteboardState.view === 'editor' || whiteboardState.currentProjectId !== null) {
              // Let WhiteboardApp's own ESC handler take care of it
              return
            }
          }

          e.preventDefault()
          e.stopPropagation()
          windowState.closeWindow(windowState.activeWindowId)
        } else if (visibleWindows.length === 0) {
          // Keine Fenster offen - Settings öffnen
          e.preventDefault()
          e.stopPropagation()
          windowState.openWindow('settings')
        }
      }

      // Space - Maximize active window (global, unabhängig von Focus)
      if ((e.key === ' ' || e.code === 'Space') && !isInput) {
        const windowState = useWindowStore.getState()
        if (windowState.activeWindowId && !isSpotlightOpen && !isAppOverviewOpen) {
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
      if (e.key === 'ArrowRight' && !isSpotlightOpen && !isAppOverviewOpen) {
        e.preventDefault()
        const windowState = useWindowStore.getState()
        // Stage Manager deaktivieren falls aktiv
        if (windowState.stageManagerEnabled) {
          windowState.toggleStageManager()
        }
        tileAllWindows()
      }

      // Meta/Command key - Toggle App Overview (GNOME-style)
      if (e.key === 'Meta' && !e.repeat && !isSpotlightOpen) {
        e.preventDefault()
        setAppOverviewOpen(!isAppOverviewOpen)
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
  }, [isSpotlightOpen, isAppOverviewOpen, tileAllWindows, setAppOverviewOpen])

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
            className="w-[768px] h-[480px] opacity-[0.07] dark:opacity-[0.04] select-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.225"
          >
            {/* Golden Rectangle outer */}
            <rect x="1" y="1" width="142" height="87" rx="2" />
            {/* Golden spiral using quarter circles - Fibonacci sequence */}
            <path d="M 89 1 A 55 55 0 0 1 144 56" />
            <path d="M 144 56 A 34 34 0 0 1 110 90" />
            <path d="M 110 88 A 21 21 0 0 1 89 67" />
            <path d="M 89 67 A 13 13 0 0 1 102 54" />
            <path d="M 102 54 A 8 8 0 0 1 94 62" />
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

      </div>

      {/* Bottom Bar */}
      <BottomBar />

      {/* Spotlight AI Assistant */}
      <Spotlight isOpen={isSpotlightOpen} onClose={closeSpotlight} />

      {/* App Overview (GNOME-style) */}
      <AppOverview />
    </div>
  )
}
