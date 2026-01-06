import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useEffect, useRef, useMemo, memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { Window as WindowType } from '@/stores/windowStore'
import { useWindowStore } from '@/stores/windowStore'
import { Window } from './Window'

interface WindowManagerProps {
  windows: WindowType[]
}

export function WindowManager({ windows }: WindowManagerProps) {
  const activeWindowId = useWindowStore((state) => state.activeWindowId)
  const stageManagerEnabled = useWindowStore((state) => state.stageManagerEnabled)
  const showThumbnails = useWindowStore((state) => state.showStageThumbnails)
  const setShowThumbnails = useWindowStore((state) => state.setShowStageThumbnails)
  const focusWindow = useWindowStore((state) => state.focusWindow)
  const closeWindow = useWindowStore((state) => state.closeWindow)
  const centerActiveWindow = useWindowStore((state) => state.centerActiveWindow)

  const hideTimeoutRef = useRef<number | null>(null)
  const lastCenteredWindowRef = useRef<string | null>(null)

  // Memoize derived state to prevent unnecessary recalculations
  const visibleWindows = useMemo(
    () => windows.filter((w) => !w.isMinimized),
    [windows]
  )

  const activeWindow = useMemo(
    () => visibleWindows.find((w) => w.id === activeWindowId),
    [visibleWindows, activeWindowId]
  )

  const inactiveWindows = useMemo(
    () => visibleWindows.filter((w) => w.id !== activeWindowId),
    [visibleWindows, activeWindowId]
  )

  // Effect 1: Hide thumbnails when Stage Manager is disabled
  useEffect(() => {
    if (!stageManagerEnabled) {
      setShowThumbnails(false)
    }
  }, [stageManagerEnabled, setShowThumbnails])

  // Effect 2: Center active window when it changes (Stage Manager only)
  // Use ref to prevent centering the same window multiple times
  useEffect(() => {
    if (stageManagerEnabled && activeWindowId && lastCenteredWindowRef.current !== activeWindowId) {
      lastCenteredWindowRef.current = activeWindowId
      // Use requestAnimationFrame to batch with other updates
      requestAnimationFrame(() => {
        centerActiveWindow()
      })
    }
  }, [stageManagerEnabled, activeWindowId, centerActiveWindow])

  // Effect 3: Ensure a window is active when Stage Manager is enabled
  useEffect(() => {
    if (stageManagerEnabled && visibleWindows.length > 0 && !activeWindowId) {
      focusWindow(visibleWindows[0].id)
    }
  }, [stageManagerEnabled, visibleWindows.length, activeWindowId, focusWindow])

  // Stage Manager Modus
  if (stageManagerEnabled && visibleWindows.length > 0) {
    return (
      <LayoutGroup>
        {/* Thumbnail-Leiste oben für inaktive Fenster - nur bei Hover am oberen Rand */}
        <AnimatePresence mode="sync">
          {inactiveWindows.length > 0 && showThumbnails && (
            <motion.div
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }}
              className="absolute left-1/2 -translate-x-1/2 top-4 z-[9999] flex flex-row gap-4"
              onMouseEnter={() => {
                if (hideTimeoutRef.current) {
                  clearTimeout(hideTimeoutRef.current)
                  hideTimeoutRef.current = null
                }
                setShowThumbnails(true)
              }}
              onMouseLeave={() => {
                hideTimeoutRef.current = window.setTimeout(() => {
                  setShowThumbnails(false)
                }, 1300)
              }}
            >
              {inactiveWindows.map((window, index) => (
                <ScaledWindowThumbnail
                  key={window.id}
                  window={window}
                  index={index}
                  onClick={() => focusWindow(window.id)}
                  onClose={() => closeWindow(window.id)}
                  horizontal
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Aktives Fenster mit Layout-Animation */}
        <AnimatePresence mode="sync">
          {activeWindow && !activeWindow.isMaximized && (
            <motion.div
              key={activeWindow.id}
              layoutId={`stage-window-${activeWindow.id}`}
              initial={false}
              animate={{
                x: activeWindow.position.x,
                y: activeWindow.position.y,
                scale: 1,
                opacity: 1,
              }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 350,
                damping: 30,
                mass: 0.8,
              }}
              className="absolute left-0 top-0"
              style={{ zIndex: activeWindow.zIndex }}
            >
              <Window window={activeWindow} isStageManaged />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Maximiertes Fenster - direkt gerendert ohne Positions-Wrapper */}
        {activeWindow && activeWindow.isMaximized && (
          <Window window={activeWindow} />
        )}
      </LayoutGroup>
    )
  }

  // Normaler Modus: Alle Fenster frei positioniert mit Layout-Animationen
  return (
    <LayoutGroup>
      <AnimatePresence mode="sync">
        {visibleWindows.map((window) => (
          <Window key={window.id} window={window} />
        ))}
      </AnimatePresence>
    </LayoutGroup>
  )
}

interface ScaledWindowThumbnailProps {
  window: WindowType
  index: number
  onClick: () => void
  onClose: () => void
  horizontal?: boolean
}

// Memoized thumbnail component to prevent unnecessary re-renders
const ScaledWindowThumbnail = memo(function ScaledWindowThumbnail({
  window,
  index,
  onClick,
  onClose,
  horizontal
}: ScaledWindowThumbnailProps) {
  const { t } = useTranslation()

  // Memoize calculations
  const { thumbnailWidth, thumbnailHeight, scale } = useMemo(() => {
    const width = horizontal ? 140 : 180
    const height = (window.size.height / window.size.width) * width
    return {
      thumbnailWidth: width,
      thumbnailHeight: height,
      scale: width / window.size.width
    }
  }, [window.size.width, window.size.height, horizontal])

  // Memoize close handler to prevent prop changes
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }, [onClose])

  return (
    <motion.div
      layoutId={`stage-window-${window.id}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.8,
        delay: index * 0.03,
      }}
      whileHover={{ scale: 1.06, y: horizontal ? 6 : 0, x: horizontal ? 0 : 10 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      role="button"
      tabIndex={0}
      className="group relative cursor-pointer"
      style={{ width: thumbnailWidth, height: thumbnailHeight + 24 }}
    >
      {/* Thumbnail Container */}
      <div
        className="absolute top-0 left-0 right-0 rounded-xl shadow-xl overflow-hidden transition-all duration-300 group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.35)]"
        style={{ height: thumbnailHeight }}
      >
        {/* Skalierter Fenster-Inhalt */}
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: window.size.width,
            height: window.size.height,
            pointerEvents: 'none',
          }}
        >
          <Window window={window} isThumbnail />
        </div>

        {/* Gradient Overlay am unteren Rand für bessere Text-Lesbarkeit */}
        <div
          className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
          }}
        />
      </div>

      {/* Active Indicator - oben bei horizontal, links bei vertikal */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className={horizontal
          ? "absolute left-1/2 -translate-x-1/2 -top-2 h-1.5 w-12 rounded-full bg-gradient-to-r from-lavender-400 to-lavender-600 origin-center shadow-lg shadow-lavender-500/40"
          : "absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-full bg-gradient-to-b from-lavender-400 to-lavender-600 origin-center shadow-lg shadow-lavender-500/40"
        }
      />

      {/* Close Button - Mitte oben */}
      <button
        onClick={handleClose}
        className="absolute left-1/2 -translate-x-1/2 -top-2 z-20 w-5 h-5 rounded-full bg-gold-600 hover:bg-gold-700 flex items-center justify-center shadow-md"
      >
        <X className="w-3 h-3 text-white" />
      </button>

      {/* App Title */}
      <div
        className="absolute left-0 right-0 text-center"
        style={{ bottom: 0 }}
      >
        <span className="text-[11px] font-medium text-white truncate block max-w-full px-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {t(window.title)}
        </span>
      </div>
    </motion.div>
  )
})
