import { motion, useDragControls, useMotionValue } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { type Window as WindowType, useWindowStore } from '@/stores/windowStore'
import { useKanbanStore } from '@/stores/kanbanStore'
import { useTimeTrackingStore, type TimeTrackingTab } from '@/stores/timetrackingStore'
import { useDocumentsStore } from '@/stores/documentsStore'
import { X, Minus, Square, Grid3X3, List, FolderPlus, Upload } from 'lucide-react'
import type { KanbanBoard } from '@/api/types'

// Resize constraints
const MIN_WIDTH = 400
const MIN_HEIGHT = 300

// App Components
import { DashboardApp } from '@/apps/dashboard/DashboardApp'
import { MasterDataApp } from '@/apps/masterdata/MasterDataApp'
import { TransactionsApp } from '@/apps/transactions/TransactionsApp'
import { SettingsApp } from '@/apps/settings/SettingsApp'
import { DocumentsApp } from '@/apps/documents/DocumentsApp'
import { CalendarApp } from '@/apps/calendar/CalendarApp'
import { KanbanApp } from '@/apps/kanban/KanbanApp'
import { TimeTrackingApp } from '@/apps/timetracking/TimeTrackingApp'
import { ImageViewerApp } from '@/apps/imageviewer/ImageViewerApp'

interface WindowProps {
  window: WindowType
  isThumbnail?: boolean
  isStageCenter?: boolean
  isStageManaged?: boolean // Position wird vom Parent kontrolliert (für Layout-Animation)
}

const appComponents = {
  dashboard: DashboardApp,
  masterdata: MasterDataApp,
  transactions: TransactionsApp,
  settings: SettingsApp,
  documents: DocumentsApp,
  calendar: CalendarApp,
  kanban: KanbanApp,
  timetracking: TimeTrackingApp,
  imageviewer: ImageViewerApp,
}

export function Window({ window, isThumbnail = false, isStageCenter = false, isStageManaged = false }: WindowProps) {
  const dragControls = useDragControls()
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const resizeDirectionRef = useRef<string | null>(null)
  const resizeTargetRef = useRef<HTMLElement | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0, winX: 0, winY: 0 })

  // Motion values für smooth dragging UND resizing (bypasses React re-renders!)
  const x = useMotionValue(window.position.x)
  const y = useMotionValue(window.position.y)
  const width = useMotionValue(window.size.width)
  const height = useMotionValue(window.size.height)

  const {
    closeWindow,
    tileWindow,
    untileWindow,
    maximizeWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
    activeWindowId,
  } = useWindowStore()

  const isActive = activeWindowId === window.id
  const AppComponent = appComponents[window.appId]

  // Keyboard handler für Fenster
  const handleWindowKeyDown = (e: React.KeyboardEvent) => {
    // Don't trigger if typing in an input or contenteditable
    const target = e.target as HTMLElement
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    ) {
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      closeWindow(window.id)
    } else if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      e.stopPropagation()
      maximizeWindow(window.id)
    }
  }

  // Sync position AND size from store to motion values (when not dragging/resizing)
  useEffect(() => {
    if (!isDragging && !isResizing && !isThumbnail) {
      x.set(window.position.x)
      y.set(window.position.y)
      width.set(window.size.width)
      height.set(window.size.height)
    }
  }, [window.position.x, window.position.y, window.size.width, window.size.height, isDragging, isResizing, x, y, width, height, isThumbnail])

  const handleDragStart = () => {
    setIsDragging(true)
    // Untile wenn getiled
    if (window.isTiled) {
      untileWindow(window.id)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    updateWindowPosition(window.id, {
      x: x.get(),
      y: y.get(),
    })
  }

  // Resize handlers - using MotionValues for smooth 60fps updates
  const handleResizeMove = useCallback((e: PointerEvent) => {
    const direction = resizeDirectionRef.current
    if (!direction) return

    const dx = e.clientX - startPosRef.current.x
    const dy = e.clientY - startPosRef.current.y

    let newWidth = startPosRef.current.width
    let newHeight = startPosRef.current.height
    let newX = startPosRef.current.winX
    let newY = startPosRef.current.winY

    // Direction-basierte Berechnung
    if (direction.includes('e')) newWidth += dx
    if (direction.includes('w')) { newWidth -= dx; newX += dx }
    if (direction.includes('s')) newHeight += dy
    if (direction.includes('n')) { newHeight -= dy; newY += dy }

    // Min/Max Constraints
    const maxWidth = globalThis.window?.innerWidth - 50 || 1200
    const maxHeight = globalThis.window?.innerHeight - 100 || 700

    // Clamp values with position adjustment for w/n resize
    if (newWidth < MIN_WIDTH) {
      if (direction.includes('w')) newX = startPosRef.current.winX + startPosRef.current.width - MIN_WIDTH
      newWidth = MIN_WIDTH
    }
    if (newWidth > maxWidth) newWidth = maxWidth
    if (newHeight < MIN_HEIGHT) {
      if (direction.includes('n')) newY = startPosRef.current.winY + startPosRef.current.height - MIN_HEIGHT
      newHeight = MIN_HEIGHT
    }
    if (newHeight > maxHeight) newHeight = maxHeight

    // Update MotionValues directly - NO React re-renders! Buttery smooth.
    width.set(newWidth)
    height.set(newHeight)
    if (direction.includes('w') || direction.includes('n')) {
      x.set(newX)
      y.set(newY)
    }
  }, [width, height, x, y])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    resizeDirectionRef.current = null

    // Release pointer capture
    if (resizeTargetRef.current && pointerIdRef.current !== null) {
      resizeTargetRef.current.releasePointerCapture(pointerIdRef.current)
    }
    resizeTargetRef.current = null
    pointerIdRef.current = null

    // NOW persist to store (single update at the end)
    updateWindowSize(window.id, { width: width.get(), height: height.get() })
    updateWindowPosition(window.id, { x: x.get(), y: y.get() })
  }, [window.id, updateWindowSize, updateWindowPosition, width, height, x, y])

  const handleResizeStart = useCallback((e: React.PointerEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()

    // Don't resize if maximized or tiled
    if (window.isMaximized || window.isTiled) return

    // Capture pointer for smooth tracking even when mouse leaves element
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    resizeTargetRef.current = target
    pointerIdRef.current = e.pointerId

    setIsResizing(true)
    resizeDirectionRef.current = direction
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: width.get(),
      height: height.get(),
      winX: x.get(),
      winY: y.get(),
    }

    // Use the target element for events (pointer capture)
    target.addEventListener('pointermove', handleResizeMove as EventListener)
    target.addEventListener('pointerup', handleResizeEnd as EventListener)
    target.addEventListener('lostpointercapture', handleResizeEnd as EventListener)
  }, [window.isMaximized, window.isTiled, width, height, x, y, handleResizeMove, handleResizeEnd])

  // Cleanup resize listeners on unmount
  useEffect(() => {
    return () => {
      if (resizeTargetRef.current) {
        resizeTargetRef.current.removeEventListener('pointermove', handleResizeMove as EventListener)
        resizeTargetRef.current.removeEventListener('pointerup', handleResizeEnd as EventListener)
        resizeTargetRef.current.removeEventListener('lostpointercapture', handleResizeEnd as EventListener)
      }
    }
  }, [handleResizeMove, handleResizeEnd])

  // Check if resize is allowed
  const canResize = !window.isMaximized && !window.isTiled

  // Thumbnail-Modus: Nur visuelles Rendering ohne Interaktion
  if (isThumbnail) {
    return (
      <div
        className="glass rounded-xl overflow-hidden window-shadow flex flex-col"
        style={{
          width: window.size.width,
          height: window.size.height,
        }}
      >
        {/* Mini Title Bar */}
        <div className="h-8 flex items-center px-3 glass-header shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-sm font-medium absolute left-1/2 -translate-x-1/2">
            {window.title}
          </span>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-hidden bg-white/50 dark:bg-black/30">
          <AppComponent />
        </div>
      </div>
    )
  }

  // Maximiertes Fenster - MUSS vor isStageManaged geprüft werden!
  if (window.isMaximized) {
    return (
      <motion.div
        className={`absolute glass rounded-none overflow-hidden window-shadow flex flex-col outline-none ${
          isActive ? 'ring-1 ring-white/20' : ''
        }`}
        style={{
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          zIndex: window.zIndex,
        }}
        tabIndex={0}
        onKeyDown={handleWindowKeyDown}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.15, duration: 0.36 }}
        onMouseDown={() => focusWindow(window.id)}
      >
        <TitleBar
          window={window}
          onClose={() => closeWindow(window.id)}
          onTile={() => tileWindow(window.id)}
          onMaximize={() => maximizeWindow(window.id)}
        />
        <div className="flex-1 overflow-auto bg-white/50 dark:bg-black/30">
          <AppComponent />
        </div>
      </motion.div>
    )
  }

  // Stage Manager Modus: Position wird vom Parent kontrolliert, aber Drag ist möglich
  if (isStageManaged) {
    return (
      <motion.div
        className={`glass rounded-xl overflow-hidden window-shadow flex flex-col outline-none ${
          isActive ? 'ring-1 ring-white/20' : ''
        }`}
        style={{
          width,
          height,
          willChange: isResizing ? 'width, height, transform' : 'auto',
        }}
        tabIndex={0}
        onKeyDown={handleWindowKeyDown}
        onMouseDown={() => focusWindow(window.id)}
        drag={!isResizing}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Resize Handles */}
        <ResizeHandles onResizeStart={handleResizeStart} canResize={canResize} />

        {/* Title Bar - drag handle */}
        <div
          className="h-8 flex items-center justify-between px-3 glass-header cursor-move select-none shrink-0"
          onPointerDown={(e) => { if (!isResizing) dragControls.start(e) }}
        >
          <TitleBarContent
            window={window}
            onClose={() => closeWindow(window.id)}
            onTile={() => tileWindow(window.id)}
            onMaximize={() => maximizeWindow(window.id)}
          />
        </div>
        <div className={`flex-1 overflow-auto bg-white/50 dark:bg-black/30 ${isDragging || isResizing ? 'select-none' : ''}`}>
          <AppComponent />
        </div>
      </motion.div>
    )
  }

  // Normales Fenster (draggable) - wird auch im Stage Manager verwendet
  return (
    <motion.div
      className={`absolute glass rounded-xl overflow-hidden window-shadow flex flex-col outline-none ${
        isActive ? 'ring-1 ring-white/20' : ''
      }`}
      style={{
        x,
        y,
        width,
        height,
        zIndex: window.zIndex,
        willChange: isResizing ? 'width, height, transform' : 'auto',
      }}
      tabIndex={0}
      onKeyDown={handleWindowKeyDown}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', bounce: 0.2, duration: 0.36 }}
      onMouseDown={() => focusWindow(window.id)}
      drag={!isResizing}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Resize Handles */}
      <ResizeHandles onResizeStart={handleResizeStart} canResize={canResize} />

      {/* Title Bar - drag handle */}
      <div
        className="h-8 flex items-center justify-between px-3 glass-header cursor-move select-none shrink-0"
        onPointerDown={(e) => {
          if (!isResizing) dragControls.start(e)
        }}
      >
        <TitleBarContent
          window={window}
          onClose={() => closeWindow(window.id)}
          onTile={() => tileWindow(window.id)}
          onMaximize={() => maximizeWindow(window.id)}
        />
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-auto bg-white/50 dark:bg-black/30 ${isDragging || isResizing ? 'select-none' : ''}`}>
        <AppComponent />
      </div>
    </motion.div>
  )
}

interface TitleBarProps {
  window: WindowType
  onClose: () => void
  onTile: () => void
  onMaximize: () => void
}

function TitleBar({ window, onClose, onTile, onMaximize }: TitleBarProps) {
  return (
    <div className="h-8 flex items-center justify-between px-3 glass-header select-none shrink-0">
      <TitleBarContent
        window={window}
        onClose={onClose}
        onTile={onTile}
        onMaximize={onMaximize}
      />
    </div>
  )
}

const KANBAN_BOARDS: { id: KanbanBoard; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'private', label: 'Private' },
  { id: 'archive', label: 'Archive' },
]

const TIMETRACKING_TABS: { id: TimeTrackingTab; labelKey: string; label: string }[] = [
  { id: 'entries', labelKey: 'timetracking.entries', label: 'Einträge' },
  { id: 'projects', labelKey: 'timetracking.projects', label: 'Projekte' },
  { id: 'clients', labelKey: 'timetracking.clients', label: 'Kunden' },
  { id: 'reports', labelKey: 'timetracking.reports', label: 'Auswertung' },
]

function TitleBarContent({ window, onClose, onTile, onMaximize }: TitleBarProps) {
  const { t } = useTranslation()
  const { activeBoard, setActiveBoard } = useKanbanStore()
  const { activeTab, setActiveTab } = useTimeTrackingStore()

  return (
    <>
      {/* Traffic lights */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center group"
        >
          <X className="w-2 h-2 opacity-0 group-hover:opacity-100 text-red-900" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTile()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors flex items-center justify-center group"
        >
          <Minus className="w-2 h-2 opacity-0 group-hover:opacity-100 text-yellow-900" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMaximize()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center group"
        >
          <Square className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 text-green-900" />
        </button>
      </div>

      {/* Title */}
      <span className="text-sm font-medium absolute left-1/2 -translate-x-1/2 pointer-events-none">
        {window.title}
      </span>

      {/* Right side - App-specific controls */}
      <div className="flex items-center gap-1">
        {window.appId === 'kanban' && (
          <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-md p-0.5">
            {KANBAN_BOARDS.map((board) => (
              <button
                key={board.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveBoard(board.id)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${
                  activeBoard === board.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t(`kanban.boards.${board.id}`, board.label)}
              </button>
            ))}
          </div>
        )}
        {window.appId === 'timetracking' && (
          <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-md p-0.5">
            {TIMETRACKING_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveTab(tab.id)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t(tab.labelKey, tab.label)}
              </button>
            ))}
          </div>
        )}
        {window.appId === 'documents' && (
          <DocumentsTitleBarControls />
        )}
      </div>
    </>
  )
}

// Documents Title Bar Controls
function DocumentsTitleBarControls() {
  const { viewMode, setViewMode, setShowFolderForm, triggerFileUpload } = useDocumentsStore()

  return (
    <div className="flex items-center gap-1">
      {/* View Toggle */}
      <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-md p-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setViewMode('grid')
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`p-1 rounded transition-all ${
            viewMode === 'grid'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
          title="Rasteransicht"
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setViewMode('list')
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`p-1 rounded transition-all ${
            viewMode === 'list'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
          title="Listenansicht"
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New Folder */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowFolderForm(true)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="p-1 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        title="Neuer Ordner"
      >
        <FolderPlus className="w-3.5 h-3.5" />
      </button>

      {/* Upload */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          triggerFileUpload()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="p-1 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        title="Hochladen"
      >
        <Upload className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// Resize handles component
interface ResizeHandlesProps {
  onResizeStart: (e: React.PointerEvent, direction: string) => void
  canResize: boolean
}

function ResizeHandles({ onResizeStart, canResize }: ResizeHandlesProps) {
  if (!canResize) return null

  return (
    <>
      {/* Corners */}
      <div
        className="absolute -top-1 -left-1 w-3 h-3 cursor-nw-resize z-50"
        onPointerDown={(e) => onResizeStart(e, 'nw')}
      />
      <div
        className="absolute -top-1 -right-1 w-3 h-3 cursor-ne-resize z-50"
        onPointerDown={(e) => onResizeStart(e, 'ne')}
      />
      <div
        className="absolute -bottom-1 -left-1 w-3 h-3 cursor-sw-resize z-50"
        onPointerDown={(e) => onResizeStart(e, 'sw')}
      />
      <div
        className="absolute -bottom-1 -right-1 w-3 h-3 cursor-se-resize z-50"
        onPointerDown={(e) => onResizeStart(e, 'se')}
      />

      {/* Edges */}
      <div
        className="absolute top-2 -left-1 bottom-2 w-2 cursor-w-resize z-40"
        onPointerDown={(e) => onResizeStart(e, 'w')}
      />
      <div
        className="absolute top-2 -right-1 bottom-2 w-2 cursor-e-resize z-40"
        onPointerDown={(e) => onResizeStart(e, 'e')}
      />
      <div
        className="absolute -top-1 left-2 right-2 h-2 cursor-n-resize z-40"
        onPointerDown={(e) => onResizeStart(e, 'n')}
      />
      <div
        className="absolute -bottom-1 left-2 right-2 h-2 cursor-s-resize z-40"
        onPointerDown={(e) => onResizeStart(e, 's')}
      />
    </>
  )
}
