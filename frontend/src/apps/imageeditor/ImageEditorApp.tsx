import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  FolderOpen,
  Save,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointer,
  Move,
  Paintbrush,
  Pencil,
  Eraser,
  Highlighter,
  SprayCan,
  Type,
  Crop,
  Pipette,
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Image as ImageIcon,
  Layers,
  Sliders,
  RotateCcw,
  History,
  Check,
  X,
  Minus,
  Square,
  Circle,
  Pentagon,
  Star,
  ArrowRight,
  PaintBucket,
  Palette,
  Stamp,
  Droplets,
  Sun,
  Moon,
  Grid3X3,
  SquareDashed,
  CircleDashed,
  Lasso,
  Wand2,
  Heart,
  Sparkles,
  Shapes,
} from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import type { Tool, BlendMode } from './types'
import { Canvas } from './components/Canvas'
import { LayerPanel } from './components/LayerPanel'
import { FilterPanel } from './components/FilterPanel'
import { ExportDialog } from './components/ExportDialog'
import { TextDialog } from './components/TextDialog'
import { HistoryPanel } from './components/HistoryPanel'
import { ElementsPanel } from './components/ElementsPanel'
import { TextEffectsPanel } from './components/TextEffectsPanel'
import { TextPropertiesPanel } from './components/TextPropertiesPanel'
import { MagicPanel } from './components/MagicPanel'
import { TextPanel } from './components/TextPanel'
import { ToolDropdown } from './components/ToolDropdown'
import { ShortcutHelpDialog } from './components/ShortcutHelpDialog'
import { ToastContainer } from './components/Toast'

// All tool definitions with groups
const ALL_TOOLS: { id: Tool; icon: React.ReactNode; label: string; shortcut: string; group: string }[] = [
  // Selection Tools
  { id: 'select', icon: <MousePointer className="w-4 h-4" />, label: 'Select', shortcut: 'V', group: 'select' },
  { id: 'rectSelect', icon: <SquareDashed className="w-4 h-4" />, label: 'Rect Select', shortcut: 'Q', group: 'select' },
  { id: 'ellipseSelect', icon: <CircleDashed className="w-4 h-4" />, label: 'Ellipse Select', shortcut: 'W', group: 'select' },
  { id: 'lassoSelect', icon: <Lasso className="w-4 h-4" />, label: 'Lasso', shortcut: 'A', group: 'select' },
  { id: 'magicWand', icon: <Wand2 className="w-4 h-4" />, label: 'Magic Wand', shortcut: 'F', group: 'select' },
  { id: 'move', icon: <Move className="w-4 h-4" />, label: 'Move', shortcut: 'M', group: 'select' },
  { id: 'freeTransform', icon: <Maximize2 className="w-4 h-4" />, label: 'Free Transform', shortcut: '\\', group: 'select' },
  // Drawing Tools
  { id: 'brush', icon: <Paintbrush className="w-4 h-4" />, label: 'Brush', shortcut: 'B', group: 'draw' },
  { id: 'pencil', icon: <Pencil className="w-4 h-4" />, label: 'Pencil', shortcut: 'P', group: 'draw' },
  { id: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'Eraser', shortcut: 'E', group: 'draw' },
  { id: 'highlighter', icon: <Highlighter className="w-4 h-4" />, label: 'Highlighter', shortcut: 'Z', group: 'draw' },
  { id: 'spray', icon: <SprayCan className="w-4 h-4" />, label: 'Spray', shortcut: 'X', group: 'draw' },
  // Fill Tools (Shapes are now in Elements panel)
  { id: 'bucket', icon: <PaintBucket className="w-4 h-4" />, label: 'Bucket', shortcut: 'K', group: 'fill' },
  { id: 'gradient', icon: <Palette className="w-4 h-4" />, label: 'Gradient', shortcut: 'G', group: 'fill' },
  // Retouch Tools
  { id: 'blur', icon: <Droplets className="w-4 h-4" />, label: 'Blur', shortcut: 'J', group: 'retouch' },
  { id: 'dodge', icon: <Sun className="w-4 h-4" />, label: 'Dodge', shortcut: 'D', group: 'retouch' },
  { id: 'burn', icon: <Moon className="w-4 h-4" />, label: 'Burn', shortcut: 'N', group: 'retouch' },
  { id: 'clone', icon: <Stamp className="w-4 h-4" />, label: 'Clone', shortcut: 'S', group: 'retouch' },
  { id: 'heal', icon: <Heart className="w-4 h-4" />, label: 'Heal', shortcut: '/', group: 'retouch' },
  // Other Tools
  { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text', shortcut: 'T', group: 'other' },
  { id: 'crop', icon: <Crop className="w-4 h-4" />, label: 'Crop', shortcut: 'C', group: 'other' },
  { id: 'eyedropper', icon: <Pipette className="w-4 h-4" />, label: 'Eyedropper', shortcut: 'I', group: 'other' },
]

// Tool groups for dropdown menu (Shapes moved to Elements panel)
const TOOL_GROUPS = [
  { id: 'select', label: 'Selection', icon: <MousePointer className="w-4 h-4" /> },
  { id: 'draw', label: 'Drawing', icon: <Paintbrush className="w-4 h-4" /> },
  { id: 'fill', label: 'Fill', icon: <PaintBucket className="w-4 h-4" /> },
  { id: 'retouch', label: 'Retouch', icon: <Droplets className="w-4 h-4" /> },
  { id: 'other', label: 'Other', icon: <Type className="w-4 h-4" /> },
]

// Compact Tool Bar Component for top toolbar
function CompactToolBar() {
  const { activeTool, setActiveTool, disabledTools } = useImageEditorStore()
  const enabledTools = ALL_TOOLS.filter(tool => !disabledTools.includes(tool.id))

  return (
    <div className="flex items-center gap-0.5">
      {enabledTools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
            activeTool === tool.id
              ? 'bg-violet-600 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
          title={`${tool.label} (${tool.shortcut})`}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  )
}

// Inline Tool Options for toolbar
function InlineToolOptions() {
  const {
    activeTool,
    brushSettings,
    setBrushSettings,
    eraserSettings,
    setEraserSettings,
    bucketSettings,
    setBucketSettings,
    gradientSettings,
    setGradientSettings,
    retouchSettings,
    setRetouchSettings,
    cloneSettings,
    setCloneSettings,
    addRecentColor,
  } = useImageEditorStore()

  // Show size slider for drawing tools
  const sizeTools = ['brush', 'pencil', 'eraser', 'highlighter', 'spray', 'blur', 'dodge', 'burn', 'clone', 'heal']
  const colorTools = ['brush', 'pencil', 'highlighter', 'spray', 'bucket']

  if (!sizeTools.includes(activeTool) && !colorTools.includes(activeTool) && activeTool !== 'gradient') {
    return null
  }

  const getSize = () => {
    if (activeTool === 'eraser') return eraserSettings.size
    if (['blur', 'dodge', 'burn', 'heal'].includes(activeTool)) return retouchSettings.size
    if (activeTool === 'clone') return cloneSettings.size
    return brushSettings.size
  }

  const setSize = (size: number) => {
    if (activeTool === 'eraser') setEraserSettings({ size })
    else if (['blur', 'dodge', 'burn', 'heal'].includes(activeTool)) setRetouchSettings({ size })
    else if (activeTool === 'clone') setCloneSettings({ size })
    else setBrushSettings({ size })
  }

  const maxSize = activeTool === 'clone' ? 200 : ['blur', 'dodge', 'burn', 'heal'].includes(activeTool) ? 100 : 500

  return (
    <div className="flex items-center gap-3 ml-3 pl-3 border-l border-gray-700">
      {/* Size */}
      {sizeTools.includes(activeTool) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-8">{getSize()}px</span>
          <input
            type="range"
            min="1"
            max={maxSize}
            value={getSize()}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-24 h-1 accent-violet-500"
          />
        </div>
      )}

      {/* Color */}
      {colorTools.includes(activeTool) && (
        <input
          type="color"
          value={brushSettings.color}
          onChange={(e) => {
            setBrushSettings({ color: e.target.value })
            addRecentColor(e.target.value)
          }}
          className="w-7 h-7 rounded cursor-pointer border border-gray-600"
        />
      )}

      {/* Gradient colors */}
      {activeTool === 'gradient' && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={gradientSettings.startColor}
            onChange={(e) => setGradientSettings({ startColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer border border-gray-600"
            title="Start"
          />
          <span className="text-gray-500">→</span>
          <input
            type="color"
            value={gradientSettings.endColor}
            onChange={(e) => setGradientSettings({ endColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer border border-gray-600"
            title="End"
          />
          <div className="flex gap-1 ml-1">
            <button
              onClick={() => setGradientSettings({ type: 'linear' })}
              className={`px-2 py-0.5 text-xs rounded ${gradientSettings.type === 'linear' ? 'bg-violet-600' : 'bg-gray-700'}`}
            >
              Linear
            </button>
            <button
              onClick={() => setGradientSettings({ type: 'radial' })}
              className={`px-2 py-0.5 text-xs rounded ${gradientSettings.type === 'radial' ? 'bg-violet-600' : 'bg-gray-700'}`}
            >
              Radial
            </button>
          </div>
        </div>
      )}

      {/* Tolerance for bucket */}
      {activeTool === 'bucket' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Tol:</span>
          <input
            type="range"
            min="0"
            max="255"
            value={bucketSettings.tolerance}
            onChange={(e) => setBucketSettings({ tolerance: Number(e.target.value) })}
            className="w-16 h-1 accent-violet-500"
          />
          <span className="text-xs text-gray-500 w-6">{bucketSettings.tolerance}</span>
        </div>
      )}
    </div>
  )
}

export function ImageEditorApp() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectWidth, setNewProjectWidth] = useState(1920)
  const [newProjectHeight, setNewProjectHeight] = useState(1080)
  // rightPanelTab is now from the store for persistence
  const [showTextDialog, setShowTextDialog] = useState(false)
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 })
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200)
  const [isResizing, setIsResizing] = useState(false)
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const rightPanelRef = useRef<HTMLDivElement>(null)

  // Handle resizing of bottom panel
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!rightPanelRef.current) return
      const rect = rightPanelRef.current.getBoundingClientRect()
      const newHeight = rect.bottom - e.clientY
      // Clamp between 100px and 400px
      setBottomPanelHeight(Math.max(100, Math.min(400, newHeight)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const {
    viewMode,
    setViewMode,
    currentProject,
    projects,
    savedProjects,
    activeTool,
    setActiveTool,
    rightPanelTab,
    setRightPanelTab,
    brushSettings,
    setBrushSettings,
    eraserSettings,
    setEraserSettings,
    shapeSettings,
    setShapeSettings,
    gradientSettings,
    setGradientSettings,
    bucketSettings,
    setBucketSettings,
    cloneSettings,
    setCloneSettings,
    retouchSettings,
    setRetouchSettings,
    recentColors,
    addRecentColor,
    showGrid,
    setShowGrid,
    gridSize,
    setGridSize,
    zoom,
    setZoom,
    crop,
    applyCrop,
    cancelCrop,
    showExportDialog,
    setShowExportDialog,
    selectedLayerId,
    selection,
    clearSelection,
    deleteLayer,
    newProject,
    openProject,
    closeProject,
    deleteProject,
    importImage,
    undo,
    redo,
    canUndo,
    canRedo,
    loadProjectsFromBackend,
    isLoading,
    triggerFitToView,
  } = useImageEditorStore()

  // Load projects from backend on mount
  useEffect(() => {
    loadProjectsFromBackend()
  }, [loadProjectsFromBackend])

  // Projects come from backend now, not local savedProjects
  const availableProjects = projects

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdKey = isMac ? e.metaKey : e.ctrlKey

      // Undo/Redo
      if (cmdKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if ((cmdKey && e.key === 'z' && e.shiftKey) || (cmdKey && e.key === 'y')) {
        e.preventDefault()
        redo()
        return
      }

      // Export
      if (cmdKey && e.key === 'e') {
        e.preventDefault()
        setShowExportDialog(true)
        return
      }

      // Toggle grid
      if (cmdKey && e.key === 'g') {
        e.preventDefault()
        setShowGrid(!showGrid)
        return
      }

      // Shortcut help dialog (Cmd+? or Cmd+/)
      if (cmdKey && (e.key === '?' || e.key === '/')) {
        e.preventDefault()
        setShowShortcutHelp((prev) => !prev)
        return
      }

      // Delete layer or clear selection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (selection.active) {
          clearSelection()
        } else if (selectedLayerId && currentProject && currentProject.layers.length > 1) {
          deleteLayer(selectedLayerId)
        }
        return
      }

      // Clear selection with Escape
      if (e.key === 'Escape') {
        if (selection.active) {
          e.preventDefault()
          clearSelection()
        }
        return
      }

      // Tool shortcuts
      const toolShortcuts: Record<string, Tool> = {
        v: 'select',
        q: 'rectSelect',
        w: 'ellipseSelect',
        a: 'lassoSelect',
        f: 'magicWand',
        m: 'move',
        b: 'brush',
        p: 'pencil',
        e: 'eraser',
        k: 'bucket',
        g: 'gradient',
        j: 'blur',
        d: 'dodge',
        n: 'burn',
        s: 'clone',
        t: 'text',
        c: 'crop',
        i: 'eyedropper',
      }

      if (!cmdKey && toolShortcuts[e.key.toLowerCase()]) {
        e.preventDefault()
        setActiveTool(toolShortcuts[e.key.toLowerCase()])
        return
      }

      // Brush size for tools that support it
      const sizeableTools = ['brush', 'pencil', 'eraser', 'blur', 'dodge', 'burn', 'clone']
      if (e.key === '[' && sizeableTools.includes(activeTool)) {
        e.preventDefault()
        if (activeTool === 'brush' || activeTool === 'pencil') {
          setBrushSettings({ size: Math.max(1, brushSettings.size - 5) })
        } else if (activeTool === 'eraser') {
          setEraserSettings({ size: Math.max(1, eraserSettings.size - 5) })
        } else if (['blur', 'dodge', 'burn'].includes(activeTool)) {
          setRetouchSettings({ size: Math.max(1, retouchSettings.size - 5) })
        } else if (activeTool === 'clone') {
          setCloneSettings({ size: Math.max(1, cloneSettings.size - 5) })
        }
        return
      }
      if (e.key === ']' && sizeableTools.includes(activeTool)) {
        e.preventDefault()
        if (activeTool === 'brush' || activeTool === 'pencil') {
          setBrushSettings({ size: Math.min(500, brushSettings.size + 5) })
        } else if (activeTool === 'eraser') {
          setEraserSettings({ size: Math.min(500, eraserSettings.size + 5) })
        } else if (['blur', 'dodge', 'burn'].includes(activeTool)) {
          setRetouchSettings({ size: Math.min(100, retouchSettings.size + 5) })
        } else if (activeTool === 'clone') {
          setCloneSettings({ size: Math.min(200, cloneSettings.size + 5) })
        }
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, brushSettings, eraserSettings, retouchSettings, cloneSettings, showGrid, undo, redo, setActiveTool, setBrushSettings, setEraserSettings, setRetouchSettings, setCloneSettings, setShowGrid, setShowExportDialog, setShowShortcutHelp, selection, clearSelection, selectedLayerId, deleteLayer, currentProject])

  const handleImportImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    await importImage(file)
  }, [importImage])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) {
        await handleImportImage(file)
      }
    },
    [handleImportImage]
  )

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await handleImportImage(file)
      }
      e.target.value = ''
    },
    [handleImportImage]
  )

  const handleNewProject = () => {
    if (!newProjectName.trim()) return
    newProject(newProjectName, newProjectWidth, newProjectHeight)
    setShowNewDialog(false)
    setNewProjectName('')
  }

  // Projects View
  if (viewMode === 'projects') {
    return (
      <div
        className="h-full flex flex-col bg-gray-900 text-white"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h1 className="text-lg font-semibold">{t('imageeditor.projects')}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              {t('imageeditor.open')}
            </button>
            <button
              onClick={() => setShowNewDialog(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('imageeditor.newProject')}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Projects Grid */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm">{t('common.loading')}</p>
            </div>
          ) : availableProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg mb-2">{t('imageeditor.noProjects')}</p>
              <p className="text-sm">{t('imageeditor.createFirst')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {availableProjects.map((project) => (
                <div
                  key={project.id}
                  className="group relative bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-violet-500 transition-all cursor-pointer"
                  onClick={() => openProject(project.id)}
                >
                  <div className="aspect-video bg-gray-700 flex items-center justify-center">
                    {project.thumbnailUrl ? (
                      <img
                        src={project.thumbnailUrl}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-gray-500" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteProject(project.id)
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Project Dialog */}
        {showNewDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">{t('imageeditor.newProject')}</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">{t('imageeditor.projectName')}</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={t('imageeditor.projectName')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">{t('imageeditor.width')}</label>
                    <input
                      type="number"
                      value={newProjectWidth}
                      onChange={(e) => setNewProjectWidth(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">{t('imageeditor.height')}</label>
                    <input
                      type="number"
                      value={newProjectHeight}
                      onChange={(e) => setNewProjectHeight(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                {/* Preset Categories */}
                <div className="space-y-3">
                  {/* YouTube */}
                  <div>
                    <p className="text-xs text-red-400 font-medium mb-1.5 flex items-center gap-1">
                      <span>YouTube</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => { setNewProjectWidth(1280); setNewProjectHeight(720) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Thumbnail (1280×720)
                      </button>
                      <button onClick={() => { setNewProjectWidth(2560); setNewProjectHeight(1440) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Banner (2560×1440)
                      </button>
                      <button onClick={() => { setNewProjectWidth(1920); setNewProjectHeight(1080) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        End Screen (1920×1080)
                      </button>
                    </div>
                  </div>

                  {/* Instagram */}
                  <div>
                    <p className="text-xs text-pink-400 font-medium mb-1.5">Instagram</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => { setNewProjectWidth(1080); setNewProjectHeight(1080) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Post (1080×1080)
                      </button>
                      <button onClick={() => { setNewProjectWidth(1080); setNewProjectHeight(1350) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Portrait (1080×1350)
                      </button>
                      <button onClick={() => { setNewProjectWidth(1080); setNewProjectHeight(1920) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Story/Reels (1080×1920)
                      </button>
                    </div>
                  </div>

                  {/* Facebook */}
                  <div>
                    <p className="text-xs text-blue-400 font-medium mb-1.5">Facebook</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => { setNewProjectWidth(1200); setNewProjectHeight(630) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Post (1200×630)
                      </button>
                      <button onClick={() => { setNewProjectWidth(820); setNewProjectHeight(312) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Cover (820×312)
                      </button>
                      <button onClick={() => { setNewProjectWidth(1080); setNewProjectHeight(1080) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Ad (1080×1080)
                      </button>
                    </div>
                  </div>

                  {/* Twitter/X */}
                  <div>
                    <p className="text-xs text-gray-300 font-medium mb-1.5">X / Twitter</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => { setNewProjectWidth(1600); setNewProjectHeight(900) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Post (1600×900)
                      </button>
                      <button onClick={() => { setNewProjectWidth(1500); setNewProjectHeight(500) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Header (1500×500)
                      </button>
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <p className="text-xs text-sky-400 font-medium mb-1.5">LinkedIn</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => { setNewProjectWidth(1200); setNewProjectHeight(627) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Post (1200×627)
                      </button>
                      <button onClick={() => { setNewProjectWidth(1584); setNewProjectHeight(396) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Banner (1584×396)
                      </button>
                    </div>
                  </div>

                  {/* TikTok & Pinterest */}
                  <div>
                    <p className="text-xs text-cyan-400 font-medium mb-1.5">TikTok & Pinterest</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => { setNewProjectWidth(1080); setNewProjectHeight(1920) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        TikTok (1080×1920)
                      </button>
                      <button onClick={() => { setNewProjectWidth(1000); setNewProjectHeight(1500) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Pinterest Pin (1000×1500)
                      </button>
                    </div>
                  </div>

                  {/* Standard */}
                  <div>
                    <p className="text-xs text-violet-400 font-medium mb-1.5">Standard</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => { setNewProjectWidth(1920); setNewProjectHeight(1080) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        Full HD (1920×1080)
                      </button>
                      <button onClick={() => { setNewProjectWidth(3840); setNewProjectHeight(2160) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        4K (3840×2160)
                      </button>
                      <button onClick={() => { setNewProjectWidth(2480); setNewProjectHeight(3508) }} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                        A4 Print (2480×3508)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowNewDialog(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleNewProject}
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('common.create')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Editor View
  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Top Toolbar - Tools + Options + Project Name */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-800 bg-gray-850">
        {/* Left: Back button + Tools + Options */}
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={closeProject}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors shrink-0"
            title={t('imageeditor.back')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-700 shrink-0" />
          <CompactToolBar />
          <InlineToolOptions />
        </div>

        {/* Right: Editable Project Name */}
        <div className="flex items-center shrink-0">
          <input
            type="text"
            value={currentProject?.name || ''}
            onChange={(e) => {
              useImageEditorStore.getState().updateProjectName(e.target.value)
            }}
            className="bg-transparent text-sm font-medium text-gray-300 border-b border-transparent hover:border-gray-600 focus:border-violet-500 focus:outline-none px-2 py-1 text-right w-48"
            placeholder="Projektname"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Layers Only */}
        <div className="w-[270px] border-r border-gray-800 flex flex-col overflow-hidden">
          {/* Layers Header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 shrink-0 border-b border-gray-700">
            <Layers className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-300 uppercase">{t('imageeditor.layers')}</span>
          </div>
          {/* Layers Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <LayerPanel />
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Canvas
            onTextClick={(pos) => {
              setTextPosition(pos)
              setShowTextDialog(true)
            }}
          />

          {/* Zoom Controls */}
          <div className="flex items-center justify-center gap-2 py-2 border-t border-gray-800">
            <button
              onClick={() => setZoom(Math.max(10, zoom - 10))}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm w-14 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(400, zoom + 10))}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => triggerFitToView()}
              className="p-1 hover:bg-gray-700 rounded ml-2"
              title="Fit to View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Panel: Elements, Text, Magic, Filters, History */}
        <div ref={rightPanelRef} className="w-64 border-l border-gray-800 flex flex-col overflow-hidden">
          {/* Tab Buttons */}
          <div className="flex border-b border-gray-800 shrink-0">
            <button
              onClick={() => setRightPanelTab('elements')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors ${
                rightPanelTab === 'elements'
                  ? 'text-white border-b-2 border-violet-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Shapes className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRightPanelTab('text')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors ${
                rightPanelTab === 'text'
                  ? 'text-white border-b-2 border-violet-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRightPanelTab('magic')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors ${
                rightPanelTab === 'magic'
                  ? 'text-white border-b-2 border-violet-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRightPanelTab('filters')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors ${
                rightPanelTab === 'filters'
                  ? 'text-white border-b-2 border-violet-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRightPanelTab('history')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors ${
                rightPanelTab === 'history'
                  ? 'text-white border-b-2 border-violet-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Text Properties - shown when text layer is selected */}
            {currentProject?.layers.find((l) => l.id === selectedLayerId)?.type === 'text' && (
              <div className="border-b border-gray-700">
                <TextPropertiesPanel />
                <TextEffectsPanel />
              </div>
            )}
            {rightPanelTab === 'elements' && <ElementsPanel />}
            {rightPanelTab === 'text' && <TextPanel />}
            {rightPanelTab === 'magic' && <MagicPanel />}
            {rightPanelTab === 'filters' && <FilterPanel />}
            {rightPanelTab === 'history' && <HistoryPanel />}
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      {/* Text Dialog */}
      <TextDialog
        isOpen={showTextDialog}
        onClose={() => setShowTextDialog(false)}
        position={textPosition}
      />

      {/* Shortcut Help Dialog */}
      <ShortcutHelpDialog
        isOpen={showShortcutHelp}
        onClose={() => setShowShortcutHelp(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  )
}
