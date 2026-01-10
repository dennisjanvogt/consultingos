import { motion, useDragControls, useMotionValue } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { type Window as WindowType, useWindowStore } from '@/stores/windowStore'
import { useKanbanStore } from '@/stores/kanbanStore'
import { useTimeTrackingStore, type TimeTrackingTab } from '@/stores/timetrackingStore'
import { useDocumentsStore } from '@/stores/documentsStore'
import { useMasterDataStore } from '@/stores/masterdataStore'
import { useTransactionsStore } from '@/stores/transactionsStore'
import { useAIStore } from '@/stores/aiStore'
import { useChessStore } from '@/stores/chessStore'
import { useCalendarStore } from '@/stores/calendarStore'
import { useWhiteboardStore } from '@/stores/whiteboardStore'
import { useRecordingStore } from '@/stores/recordingStore'
import { useNotesStore } from '@/stores/notesStore'
import { useWorkflowStore } from '@/stores/workflowStore'
import { useGoStore } from '@/stores/goStore'
import { useKnowledgebaseStore } from '@/stores/knowledgebaseStore'
import { useAdminStore } from '@/stores/adminStore'
import { useVaultStore } from '@/stores/vaultStore'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import { X, Square, Grid3X3, List, FolderPlus, Upload, Plus, Settings2, LogOut, Save, Circle, FileText, Play, BarChart3, Clock, Users, Network, Undo2, Redo2, Download } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import type { KanbanBoard } from '@/api/types'

import { appRegistry } from '@/config/apps'
import { ErrorBoundary } from './ErrorBoundary'

// Resize constraints
const MIN_WIDTH = 400
const MIN_HEIGHT = 300

interface WindowProps {
  window: WindowType
  isThumbnail?: boolean
  isStageCenter?: boolean
  isStageManaged?: boolean // Position wird vom Parent kontrolliert (für Layout-Animation)
}

// App Components kommen jetzt aus der zentralen Registry
const getAppComponent = (appId: string): React.ComponentType => {
  return appRegistry[appId]?.component || (() => <div>App nicht gefunden</div>)
}

export function Window({ window, isThumbnail = false, isStageCenter = false, isStageManaged = false }: WindowProps) {
  const dragControls = useDragControls()
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const resizeDirectionRef = useRef<string | null>(null)
  const resizeTargetRef = useRef<HTMLElement | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0, winX: 0, winY: 0 })
  // Store actual handler refs for proper cleanup (prevents memory leaks)
  const resizeMoveHandlerRef = useRef<EventListener | null>(null)
  const resizeEndHandlerRef = useRef<EventListener | null>(null)

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
    toggleFullscreen,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
    activeWindowId,
  } = useWindowStore()

  const isActive = activeWindowId === window.id
  const AppComponent = getAppComponent(window.appId)

  // Keyboard handler für Fenster (Space for maximize)
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

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      e.stopPropagation()
      maximizeWindow(window.id)
    }
  }

  // Sync position AND size from store to motion values (when not dragging/resizing)
  // Note: x, y, width, height are MotionValues (stable objects) - don't include in deps
  useEffect(() => {
    if (!isDragging && !isResizing && !isThumbnail) {
      x.set(window.position.x)
      y.set(window.position.y)
      width.set(window.size.width)
      height.set(window.size.height)
    }
  }, [window.position.x, window.position.y, window.size.width, window.size.height, isDragging, isResizing, isThumbnail])

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
  }, []) // MotionValues are stable objects, no deps needed

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
  }, [window.id, updateWindowSize, updateWindowPosition]) // MotionValues are stable

  const handleResizeStart = useCallback((e: React.PointerEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()

    // Don't resize if maximized, tiled, or fullscreen
    if (window.isMaximized || window.isTiled || window.isFullscreen) return

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

    // Store handler refs for proper cleanup
    resizeMoveHandlerRef.current = handleResizeMove as EventListener
    resizeEndHandlerRef.current = handleResizeEnd as EventListener

    // Use the target element for events (pointer capture)
    target.addEventListener('pointermove', resizeMoveHandlerRef.current)
    target.addEventListener('pointerup', resizeEndHandlerRef.current)
    target.addEventListener('lostpointercapture', resizeEndHandlerRef.current)
  }, [window.isMaximized, window.isTiled, handleResizeMove, handleResizeEnd])

  // Cleanup resize listeners on unmount - uses refs to remove exact handlers that were added
  useEffect(() => {
    return () => {
      if (resizeTargetRef.current && resizeMoveHandlerRef.current && resizeEndHandlerRef.current) {
        resizeTargetRef.current.removeEventListener('pointermove', resizeMoveHandlerRef.current)
        resizeTargetRef.current.removeEventListener('pointerup', resizeEndHandlerRef.current)
        resizeTargetRef.current.removeEventListener('lostpointercapture', resizeEndHandlerRef.current)
      }
    }
  }, []) // No deps - cleanup uses refs

  // Check if resize is allowed
  const canResize = !window.isMaximized && !window.isTiled && !window.isFullscreen

  // Thumbnail-Modus: Nur visuelles Rendering ohne Interaktion
  if (isThumbnail) {
    return (
      <div
        className="glass rounded-xl overflow-hidden window-shadow flex flex-col relative group/thumb"
        style={{
          width: window.size.width,
          height: window.size.height,
        }}
      >
        {/* Mini Title Bar */}
        <div className="h-8 flex items-center px-3 glass-header shrink-0">
          <div className="flex items-center gap-1">
            <div className="w-5 h-4 rounded bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <X className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="w-5 h-4 rounded bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <Square className="w-2 h-2 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
          <ThumbnailTitle title={window.title} />
        </div>
        {/* Content */}
        <div className="flex-1 overflow-hidden bg-white/50 dark:bg-black/30">
          <ErrorBoundary>
            <AppComponent />
          </ErrorBoundary>
        </div>
      </div>
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
          willChange: isDragging ? 'transform' : isResizing ? 'width, height' : 'auto',
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
          onDoubleClick={() => maximizeWindow(window.id)}
        >
          <TitleBarContent
            window={window}
            onClose={() => closeWindow(window.id)}
            onTile={() => tileWindow(window.id)}
            onMaximize={() => maximizeWindow(window.id)}
          />
        </div>
        <div className={`flex-1 overflow-auto bg-white/50 dark:bg-black/30 ${isDragging || isResizing ? 'select-none' : ''}`}>
          <ErrorBoundary>
            <AppComponent />
          </ErrorBoundary>
        </div>
      </motion.div>
    )
  }

  // Normales Fenster (draggable) - handles both maximized, fullscreen, and normal states
  // Using a single return to prevent component remounting on maximize/minimize

  // Determine window style based on state
  const getWindowStyle = () => {
    if (window.isFullscreen) {
      return {
        position: 'fixed' as const,
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999, // Above everything including menubar and dock
      }
    }
    if (window.isMaximized) {
      return {
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        zIndex: window.zIndex,
      }
    }
    return {
      x,
      y,
      width,
      height,
      zIndex: window.zIndex,
      willChange: isDragging ? 'transform' : isResizing ? 'width, height' : 'auto',
    }
  }

  return (
    <motion.div
      layout
      layoutId={`window-${window.id}`}
      data-window-id={window.id}
      className={`${window.isFullscreen ? 'fixed' : 'absolute'} glass overflow-hidden window-shadow flex flex-col outline-none ${
        window.isMaximized || window.isFullscreen ? 'rounded-none' : 'rounded-xl'
      } ${isActive ? 'ring-1 ring-white/20' : ''}`}
      style={getWindowStyle()}
      tabIndex={0}
      onKeyDown={handleWindowKeyDown}
      initial={false}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 25,
        layout: { type: 'spring', stiffness: 180, damping: 28, mass: 1 }
      }}
      onMouseDown={() => focusWindow(window.id)}
      drag={!isResizing && !window.isMaximized && !window.isFullscreen}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Resize Handles - hidden when maximized or fullscreen */}
      {!window.isMaximized && !window.isFullscreen && <ResizeHandles onResizeStart={handleResizeStart} canResize={canResize} />}

      {/* Title Bar - drag handle */}
      <div
        className={`h-8 flex items-center justify-between px-3 glass-header select-none shrink-0 ${
          window.isMaximized || window.isFullscreen ? '' : 'cursor-move'
        }`}
        onPointerDown={(e) => {
          if (!isResizing && !window.isMaximized && !window.isFullscreen) dragControls.start(e)
        }}
        onDoubleClick={() => maximizeWindow(window.id)}
      >
        <TitleBarContent
          window={window}
          onClose={() => closeWindow(window.id)}
          onTile={() => tileWindow(window.id)}
          onMaximize={() => toggleFullscreen(window.id)}
        />
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-auto bg-white/50 dark:bg-black/30 ${isDragging || isResizing ? 'select-none' : ''}`}>
        <ErrorBoundary>
          <AppComponent />
        </ErrorBoundary>
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

// Calendar Title Bar Controls
function CalendarTitleBarControls() {
  const { t } = useTranslation()
  const { setShowEventForm } = useCalendarStore()

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        setShowEventForm(true)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-gold-600 hover:bg-gold-700 text-white transition-all shadow-sm"
    >
      <Plus className="w-3 h-3" />
      {t('calendar.newEvent', 'Neuer Termin')}
    </button>
  )
}

// Notes Title Bar Controls
function NotesTitleBarControls() {
  const { t } = useTranslation()
  const { createNote } = useNotesStore()

  return (
    <button
      onClick={async (e) => {
        e.stopPropagation()
        await createNote()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-gold-600 hover:bg-gold-700 text-white transition-all shadow-sm"
    >
      <Plus className="w-3 h-3" />
      {t('notes.newNote')}
    </button>
  )
}

// Knowledgebase Title Bar Controls
function KnowledgebaseTitleBarControls() {
  const { t } = useTranslation()
  const { setShowExpertForm } = useKnowledgebaseStore()

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        setShowExpertForm(true)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-gold-600 hover:bg-gold-700 text-white transition-all shadow-sm"
    >
      <Plus className="w-3 h-3" />
      {t('knowledgebase.newExpert', 'Neuer Experte')}
    </button>
  )
}

// Admin Title Bar Controls
function AdminTitleBarControls() {
  const { activeTab, setActiveTab } = useAdminStore()

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setActiveTab('pending')
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
          activeTab === 'pending'
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        <Clock className="w-3 h-3" />
        Ausstehend
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setActiveTab('all')
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
          activeTab === 'all'
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        <Users className="w-3 h-3" />
        Alle
      </button>
    </div>
  )
}

// Vault Title Bar Controls
function VaultTitleBarControls() {
  const { t } = useTranslation()
  const { viewMode, setViewMode } = useVaultStore()

  return (
    <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-md p-0.5">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setViewMode('pages')
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded transition-all ${
          viewMode === 'pages'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        <List className="w-3 h-3" />
        {t('vault.pages', 'Pages')}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setViewMode('graph')
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded transition-all ${
          viewMode === 'graph'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        <Network className="w-3 h-3" />
        {t('vault.graph', 'Graph')}
      </button>
    </div>
  )
}

// Workflows Title Bar Controls
function WorkflowsTitleBarControls() {
  const { t } = useTranslation()
  const { viewMode, setViewMode } = useWorkflowStore()

  const tabs = [
    { id: 'templates' as const, label: t('workflows.templates'), icon: FileText, color: 'bg-yellow-500 hover:bg-yellow-600' },
    { id: 'active' as const, label: t('workflows.active'), icon: Play, color: 'bg-emerald-700 hover:bg-emerald-800' },
    { id: 'dashboard' as const, label: t('workflows.dashboard'), icon: BarChart3, color: 'bg-rose-800 hover:bg-rose-900' },
  ]

  return (
    <div className="flex items-center gap-1">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = viewMode === tab.id
        return (
          <button
            key={tab.id}
            onClick={(e) => {
              e.stopPropagation()
              setViewMode(tab.id)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md transition-all shadow-sm ${
              isActive
                ? `${tab.color} text-white`
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Icon className="w-3 h-3" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// Whiteboard Title Bar Controls - Save Button with unsaved indicator
function WhiteboardTitleBarControls() {
  const { view, hasUnsavedChanges, isSaving } = useWhiteboardStore()

  // Only show in editor view
  if (view !== 'editor') return null

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        // Trigger save via custom event (component will listen)
        window.dispatchEvent(new CustomEvent('whiteboard-save'))
      }}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={isSaving || !hasUnsavedChanges}
      className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md transition-all shadow-sm ${
        hasUnsavedChanges
          ? 'bg-gold-600 hover:bg-gold-700 text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
      }`}
    >
      <Save className={`w-3 h-3 ${isSaving ? 'animate-pulse' : ''}`} />
      {isSaving ? 'Speichert...' : hasUnsavedChanges ? 'Speichern' : 'Gespeichert'}
    </button>
  )
}

// Chess Title Bar Controls
function ChessTitleBarControls() {
  const { setShowNewGameModal } = useChessStore()

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        setShowNewGameModal(true)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-gold-600 hover:bg-gold-700 text-white transition-all shadow-sm"
    >
      <Plus className="w-3 h-3" />
      Neues Spiel
    </button>
  )
}

// All available tools for the settings menu
const IMAGE_EDITOR_ALL_TOOLS = [
  { id: 'select', label: 'Select (V)', group: 'Selection' },
  { id: 'rectSelect', label: 'Rect Select (Q)', group: 'Selection' },
  { id: 'ellipseSelect', label: 'Ellipse Select (W)', group: 'Selection' },
  { id: 'lassoSelect', label: 'Lasso (A)', group: 'Selection' },
  { id: 'magicWand', label: 'Magic Wand (F)', group: 'Selection' },
  { id: 'move', label: 'Move (M)', group: 'Selection' },
  { id: 'freeTransform', label: 'Free Transform (\\)', group: 'Selection' },
  { id: 'brush', label: 'Brush (B)', group: 'Drawing' },
  { id: 'pencil', label: 'Pencil (P)', group: 'Drawing' },
  { id: 'eraser', label: 'Eraser (E)', group: 'Drawing' },
  { id: 'highlighter', label: 'Highlighter (Z)', group: 'Drawing' },
  { id: 'spray', label: 'Spray (X)', group: 'Drawing' },
  { id: 'bucket', label: 'Bucket (K)', group: 'Fill' },
  { id: 'gradient', label: 'Gradient (G)', group: 'Fill' },
  { id: 'blur', label: 'Blur (J)', group: 'Retouch' },
  { id: 'dodge', label: 'Dodge (D)', group: 'Retouch' },
  { id: 'burn', label: 'Burn (N)', group: 'Retouch' },
  { id: 'clone', label: 'Clone (S)', group: 'Retouch' },
  { id: 'heal', label: 'Heal (/)', group: 'Retouch' },
  { id: 'text', label: 'Text (T)', group: 'Other' },
  { id: 'crop', label: 'Crop (C)', group: 'Other' },
  { id: 'eyedropper', label: 'Eyedropper (I)', group: 'Other' },
] as const

// Image Editor Title Bar Controls
function ImageEditorTitleBarControls() {
  const { undo, redo, canUndo, canRedo, setShowExportDialog, viewMode, disabledTools, toggleToolEnabled } = useImageEditorStore()
  const [showToolSettings, setShowToolSettings] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const settingsRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const isInDropdown = settingsRef.current?.contains(target)
      const isInButton = buttonRef.current?.contains(target)
      if (!isInDropdown && !isInButton) {
        setShowToolSettings(false)
      }
    }
    if (showToolSettings) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showToolSettings])

  // Calculate dropdown position when opened
  const handleOpenSettings = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setShowToolSettings(!showToolSettings)
  }

  // Only show in editor view
  if (viewMode !== 'editor') return null

  // Group tools by category
  const toolsByGroup = IMAGE_EDITOR_ALL_TOOLS.reduce((acc, tool) => {
    if (!acc[tool.group]) acc[tool.group] = []
    acc[tool.group].push(tool)
    return acc
  }, {} as Record<string, typeof IMAGE_EDITOR_ALL_TOOLS[number][]>)

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation()
          undo()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={!canUndo()}
        className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
        title="Undo"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          redo()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={!canRedo()}
        className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
        title="Redo"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      {/* Tool Settings */}
      <div>
        <button
          ref={buttonRef}
          onClick={handleOpenSettings}
          onPointerDown={(e) => e.stopPropagation()}
          className={`p-1.5 rounded transition-colors ${showToolSettings ? 'bg-violet-600 text-white' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
          title="Tool Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {showToolSettings && createPortal(
          <div
            ref={settingsRef}
            className="fixed w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto"
            style={{ top: dropdownPos.top, right: dropdownPos.right, zIndex: 999999 }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-gray-700">
              <span className="text-xs font-semibold text-gray-400">Tools ein/aus</span>
            </div>
            {Object.entries(toolsByGroup).map(([group, tools]) => (
              <div key={group} className="p-1">
                <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase">{group}</div>
                {tools.map((tool) => (
                  <label
                    key={tool.id}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-gray-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!disabledTools.includes(tool.id as any)}
                      onChange={() => toggleToolEnabled(tool.id as any)}
                      className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-violet-500"
                    />
                    <span className="text-xs text-gray-300">{tool.label}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>,
          document.body
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowExportDialog(true)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-gold-600 hover:bg-gold-700 text-white transition-all shadow-sm"
      >
        <Download className="w-3 h-3" />
        Export
      </button>
    </div>
  )
}

// Go Title Bar Controls
function GoTitleBarControls() {
  const { setShowNewGameModal } = useGoStore()

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        setShowNewGameModal(true)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-yellow-600 hover:bg-yellow-700 text-white transition-all shadow-sm"
    >
      <Plus className="w-3 h-3" />
      Neues Spiel
    </button>
  )
}

function SettingsTitleBarControls() {
  const { t } = useTranslation()
  const { logout } = useAuthStore()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowLogoutConfirm(true)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-red-500/80 hover:bg-red-500 text-white transition-all"
      >
        <LogOut className="w-3 h-3" />
        {t('auth.logout', 'Abmelden')}
      </button>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowLogoutConfirm(false)}
          data-modal-open="true"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm mx-4 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('auth.logoutConfirmTitle', 'Abmelden?')}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {t('auth.logoutConfirmMessage', 'Möchtest du dich wirklich abmelden?')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('common.cancel', 'Abbrechen')}
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false)
                  logout()
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                {t('auth.logout', 'Abmelden')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function TitleBarContent({ window, onClose, onTile, onMaximize }: TitleBarProps) {
  const { t } = useTranslation()
  const { activeBoard, setActiveBoard } = useKanbanStore()
  const { activeTab, setActiveTab } = useTimeTrackingStore()
  const { isRecording, targetWindowId, startWindowRecording, stopRecording, isUploading } = useRecordingStore()

  const isRecordingThisWindow = isRecording && targetWindowId === window.id

  const handleRecordClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isRecordingThisWindow) {
      stopRecording()
    } else if (!isRecording) {
      startWindowRecording(window.id)
    }
  }

  return (
    <>
      {/* Window Controls - Modern Style */}
      <div className="flex items-center gap-1 relative z-10">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-6 h-5 rounded-md bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 hover:from-red-400 hover:to-red-500 border border-gray-300/50 dark:border-gray-500/50 hover:border-red-400/50 transition-all duration-150 flex items-center justify-center group shadow-sm"
          title={t('window.close', 'Schließen')}
        >
          <X className="w-3 h-3 text-gray-500 dark:text-gray-300 group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMaximize()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-6 h-5 rounded-md bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 hover:from-lavender-400 hover:to-lavender-500 border border-gray-300/50 dark:border-gray-500/50 hover:border-lavender-400/50 transition-all duration-150 flex items-center justify-center group shadow-sm"
          title={t('window.maximize', 'Maximieren')}
        >
          <Square className="w-2.5 h-2.5 text-gray-500 dark:text-gray-300 group-hover:text-white transition-colors" />
        </button>
        {/* Record Button */}
        <button
          onClick={handleRecordClick}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={isUploading || (isRecording && !isRecordingThisWindow)}
          className={`w-6 h-5 rounded-md transition-all duration-150 flex items-center justify-center group shadow-sm border ${
            isRecordingThisWindow
              ? 'bg-gradient-to-b from-red-400 to-red-500 border-red-400/50'
              : 'bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 hover:from-gold-400 hover:to-gold-500 border-gray-300/50 dark:border-gray-500/50 hover:border-gold-400/50'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title={isRecordingThisWindow ? t('window.stopRecording', 'Aufnahme stoppen') : t('window.recordWindow', 'Fenster aufnehmen')}
        >
          <Circle className={`w-2.5 h-2.5 ${
            isRecordingThisWindow
              ? 'text-white fill-white animate-pulse'
              : 'text-gray-500 dark:text-gray-300 group-hover:text-white'
          } transition-colors`} />
        </button>
      </div>

      {/* Title */}
      <span className="text-sm font-medium absolute left-1/2 -translate-x-1/2 pointer-events-none">
        {t(window.title)}
      </span>

      {/* Right side - App-specific controls */}
      <div className="flex items-center gap-1 relative z-10">
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
        {window.appId === 'masterdata' && (
          <MasterDataTitleBarControls />
        )}
        {window.appId === 'transactions' && (
          <TransactionsTitleBarControls />
        )}
        {window.appId === 'calendar' && (
          <CalendarTitleBarControls />
        )}
        {window.appId === 'whiteboard' && (
          <WhiteboardTitleBarControls />
        )}
        {window.appId === 'chat' && (
          <ChatTitleBarControls />
        )}
        {window.appId === 'chess' && (
          <ChessTitleBarControls />
        )}
        {window.appId === 'go' && (
          <GoTitleBarControls />
        )}
        {window.appId === 'settings' && (
          <SettingsTitleBarControls />
        )}
        {window.appId === 'notes' && (
          <NotesTitleBarControls />
        )}
        {window.appId === 'workflows' && (
          <WorkflowsTitleBarControls />
        )}
        {window.appId === 'knowledgebase' && (
          <KnowledgebaseTitleBarControls />
        )}
        {window.appId === 'admin' && (
          <AdminTitleBarControls />
        )}
        {window.appId === 'vault' && (
          <VaultTitleBarControls />
        )}
        {window.appId === 'imageeditor' && (
          <ImageEditorTitleBarControls />
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

// MasterData Title Bar Controls
function MasterDataTitleBarControls() {
  const { t } = useTranslation()
  const { activeView, triggerNewForm } = useMasterDataStore()

  // Only show when not on home view
  if (activeView === 'home') return null

  const getButtonLabel = () => {
    switch (activeView) {
      case 'customers': return t('masterdata.newCustomer', 'Neuer Kunde')
      case 'products': return t('masterdata.newProduct', 'Neues Produkt')
      case 'taxrates': return t('masterdata.newTaxRate', 'Neuer Steuersatz')
      case 'ttprojects': return t('masterdata.newProject', 'Neues Projekt')
      case 'ttclients': return t('masterdata.newClient', 'Neuer Kunde')
      default: return t('common.new', 'Neu')
    }
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        triggerNewForm()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-gold-600 hover:bg-gold-700 text-white transition-all shadow-sm"
    >
      <Plus className="w-3 h-3" />
      {getButtonLabel()}
    </button>
  )
}

// Transactions Title Bar Controls
function TransactionsTitleBarControls() {
  const { t } = useTranslation()
  const { activeView, triggerNewForm } = useTransactionsStore()

  // Only show when not on home view
  if (activeView === 'home') return null

  const getButtonLabel = () => {
    switch (activeView) {
      case 'invoices': return t('transactions.newInvoice', 'Neue Rechnung')
      case 'quotes': return t('transactions.newQuote', 'Neues Angebot')
      case 'creditnotes': return t('transactions.newCreditNote', 'Neue Gutschrift')
      case 'timeentries': return t('transactions.newTimeEntry', 'Neuer Zeiteintrag')
      default: return t('common.new', 'Neu')
    }
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        triggerNewForm()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-gold-600 hover:bg-gold-700 text-white transition-all shadow-sm"
    >
      <Plus className="w-3 h-3" />
      {getButtonLabel()}
    </button>
  )
}

// Chat Title Bar Controls
function ChatTitleBarControls() {
  const { clearCurrentConversation, setShowHelperDialog } = useAIStore()

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation()
          clearCurrentConversation()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-gold-600 hover:bg-gold-700 text-white transition-all shadow-sm"
      >
        <Plus className="w-3 h-3" />
        Neues Gespräch
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowHelperDialog(true)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-gold-600 hover:bg-gold-700 text-white transition-all shadow-sm"
      >
        <Settings2 className="w-3 h-3" />
        Helfer
      </button>
    </div>
  )
}


// Thumbnail Title with translation
function ThumbnailTitle({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <span className="text-sm font-medium absolute left-1/2 -translate-x-1/2">
      {t(title)}
    </span>
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
