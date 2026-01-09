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
} from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import type { Tool, BlendMode } from './types'
import { Canvas } from './components/Canvas'
import { LayerPanel } from './components/LayerPanel'
import { FilterPanel } from './components/FilterPanel'
import { ExportDialog } from './components/ExportDialog'
import { TextDialog } from './components/TextDialog'
import { HistoryPanel } from './components/HistoryPanel'
import { ToolDropdown } from './components/ToolDropdown'
import { ShortcutHelpDialog } from './components/ShortcutHelpDialog'
import { ToastContainer } from './components/Toast'

// Tool definitions with groups
const TOOLS: { id: Tool; icon: React.ReactNode; label: string; shortcut: string; group: string }[] = [
  // Selection Tools
  { id: 'select', icon: <MousePointer className="w-4 h-4" />, label: 'Select', shortcut: 'V', group: 'select' },
  { id: 'rectSelect', icon: <SquareDashed className="w-4 h-4" />, label: 'Rect Select', shortcut: 'Q', group: 'select' },
  { id: 'ellipseSelect', icon: <CircleDashed className="w-4 h-4" />, label: 'Ellipse Select', shortcut: 'W', group: 'select' },
  { id: 'lassoSelect', icon: <Lasso className="w-4 h-4" />, label: 'Lasso', shortcut: 'A', group: 'select' },
  { id: 'magicWand', icon: <Wand2 className="w-4 h-4" />, label: 'Magic Wand', shortcut: 'F', group: 'select' },
  { id: 'move', icon: <Move className="w-4 h-4" />, label: 'Move', shortcut: 'M', group: 'select' },
  // Drawing Tools
  { id: 'brush', icon: <Paintbrush className="w-4 h-4" />, label: 'Brush', shortcut: 'B', group: 'draw' },
  { id: 'pencil', icon: <Pencil className="w-4 h-4" />, label: 'Pencil', shortcut: 'P', group: 'draw' },
  { id: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'Eraser', shortcut: 'E', group: 'draw' },
  // Shape Tools
  { id: 'line', icon: <Minus className="w-4 h-4" />, label: 'Line', shortcut: 'L', group: 'shape' },
  { id: 'rectangle', icon: <Square className="w-4 h-4" />, label: 'Rectangle', shortcut: 'R', group: 'shape' },
  { id: 'ellipse', icon: <Circle className="w-4 h-4" />, label: 'Ellipse', shortcut: 'O', group: 'shape' },
  // Fill Tools
  { id: 'bucket', icon: <PaintBucket className="w-4 h-4" />, label: 'Bucket', shortcut: 'K', group: 'fill' },
  { id: 'gradient', icon: <Palette className="w-4 h-4" />, label: 'Gradient', shortcut: 'G', group: 'fill' },
  // Retouch Tools
  { id: 'blur', icon: <Droplets className="w-4 h-4" />, label: 'Blur', shortcut: 'J', group: 'retouch' },
  { id: 'dodge', icon: <Sun className="w-4 h-4" />, label: 'Dodge', shortcut: 'D', group: 'retouch' },
  { id: 'burn', icon: <Moon className="w-4 h-4" />, label: 'Burn', shortcut: 'N', group: 'retouch' },
  { id: 'clone', icon: <Stamp className="w-4 h-4" />, label: 'Clone', shortcut: 'S', group: 'retouch' },
  // Other Tools
  { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text', shortcut: 'T', group: 'other' },
  { id: 'crop', icon: <Crop className="w-4 h-4" />, label: 'Crop', shortcut: 'C', group: 'other' },
  { id: 'eyedropper', icon: <Pipette className="w-4 h-4" />, label: 'Eyedropper', shortcut: 'I', group: 'other' },
]

// Tool groups for dropdown menu
const TOOL_GROUPS = [
  { id: 'select', label: 'Selection', icon: <MousePointer className="w-4 h-4" /> },
  { id: 'draw', label: 'Drawing', icon: <Paintbrush className="w-4 h-4" /> },
  { id: 'shape', label: 'Shapes', icon: <Square className="w-4 h-4" /> },
  { id: 'fill', label: 'Fill', icon: <PaintBucket className="w-4 h-4" /> },
  { id: 'retouch', label: 'Retouch', icon: <Droplets className="w-4 h-4" /> },
  { id: 'other', label: 'Other', icon: <Type className="w-4 h-4" /> },
]

export function ImageEditorApp() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectWidth, setNewProjectWidth] = useState(1920)
  const [newProjectHeight, setNewProjectHeight] = useState(1080)
  const [rightPanel, setRightPanel] = useState<'filters' | 'history'>('filters')
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
  } = useImageEditorStore()

  // Only show projects that have saved data
  const availableProjects = projects.filter((p) => savedProjects[p.id])

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
        l: 'line',
        r: 'rectangle',
        o: 'ellipse',
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
          {availableProjects.length === 0 ? (
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
            <div className="bg-gray-800 rounded-xl w-full max-w-md p-6">
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
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNewProjectWidth(1920)
                      setNewProjectHeight(1080)
                    }}
                    className="px-3 py-1 bg-gray-700 rounded text-xs"
                  >
                    1920×1080
                  </button>
                  <button
                    onClick={() => {
                      setNewProjectWidth(1280)
                      setNewProjectHeight(720)
                    }}
                    className="px-3 py-1 bg-gray-700 rounded text-xs"
                  >
                    1280×720
                  </button>
                  <button
                    onClick={() => {
                      setNewProjectWidth(1080)
                      setNewProjectHeight(1080)
                    }}
                    className="px-3 py-1 bg-gray-700 rounded text-xs"
                  >
                    1080×1080
                  </button>
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
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-800 bg-gray-850">
        {/* Left: Back & Tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={closeProject}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title={t('imageeditor.back')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-700 mx-1" />
          {/* Tool Dropdowns */}
          {TOOL_GROUPS.map((group) => (
            <ToolDropdown
              key={group.id}
              label={group.label}
              groupIcon={group.icon}
              tools={TOOLS.filter((t) => t.group === group.id)}
              activeTool={activeTool}
              onSelectTool={setActiveTool}
            />
          ))}
        </div>

        {/* Center: Project Name */}
        <div className="text-sm font-medium text-gray-300">
          {currentProject?.name || 'Untitled'}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-2 hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
            title={t('imageeditor.undo')}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-2 hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
            title={t('imageeditor.redo')}
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-700 mx-1" />
          <button
            onClick={() => setShowExportDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('imageeditor.export')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Tool Settings */}
        <div className="w-56 border-r border-gray-800 overflow-y-auto">
          <div className="p-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
              {activeTool === 'brush' ? t('imageeditor.brush') : activeTool === 'eraser' ? t('imageeditor.eraser') : t('imageeditor.tool')}
            </h3>

            {(activeTool === 'brush' || activeTool === 'eraser') && (
              <div className="space-y-4">
                {/* Size */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.size')}</span>
                    <span>{activeTool === 'brush' ? brushSettings.size : eraserSettings.size}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    value={activeTool === 'brush' ? brushSettings.size : eraserSettings.size}
                    onChange={(e) =>
                      activeTool === 'brush'
                        ? setBrushSettings({ size: Number(e.target.value) })
                        : setEraserSettings({ size: Number(e.target.value) })
                    }
                    className="w-full accent-violet-500"
                  />
                </div>

                {/* Hardness */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.hardness')}</span>
                    <span>{activeTool === 'brush' ? brushSettings.hardness : eraserSettings.hardness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeTool === 'brush' ? brushSettings.hardness : eraserSettings.hardness}
                    onChange={(e) =>
                      activeTool === 'brush'
                        ? setBrushSettings({ hardness: Number(e.target.value) })
                        : setEraserSettings({ hardness: Number(e.target.value) })
                    }
                    className="w-full accent-violet-500"
                  />
                </div>

                {/* Opacity */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.opacity')}</span>
                    <span>{activeTool === 'brush' ? brushSettings.opacity : eraserSettings.opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeTool === 'brush' ? brushSettings.opacity : eraserSettings.opacity}
                    onChange={(e) =>
                      activeTool === 'brush'
                        ? setBrushSettings({ opacity: Number(e.target.value) })
                        : setEraserSettings({ opacity: Number(e.target.value) })
                    }
                    className="w-full accent-violet-500"
                  />
                </div>

                {/* Color (only for brush) */}
                {activeTool === 'brush' && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{t('imageeditor.color')}</span>
                      <span>{brushSettings.color}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={brushSettings.color}
                        onChange={(e) => {
                          setBrushSettings({ color: e.target.value })
                          addRecentColor(e.target.value)
                        }}
                        className="w-10 h-10 rounded cursor-pointer border-none"
                      />
                      <div className="flex-1">
                        {/* Recent colors */}
                        <div className="text-xs text-gray-500 mb-1">{t('imageeditor.recentColors')}</div>
                        <div className="grid grid-cols-5 gap-1">
                          {recentColors.map((color, index) => (
                            <button
                              key={`${color}-${index}`}
                              onClick={() => setBrushSettings({ color })}
                              className={`w-5 h-5 rounded border ${
                                brushSettings.color.toLowerCase() === color.toLowerCase()
                                  ? 'border-violet-500 ring-1 ring-violet-500'
                                  : 'border-gray-600'
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                        {/* Basic colors */}
                        <div className="text-xs text-gray-500 mt-2 mb-1">{t('imageeditor.basicColors')}</div>
                        <div className="grid grid-cols-5 gap-1">
                          {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#808080', '#c0c0c0'].map(
                            (color) => (
                              <button
                                key={color}
                                onClick={() => {
                                  setBrushSettings({ color })
                                  addRecentColor(color)
                                }}
                                className={`w-5 h-5 rounded border ${
                                  brushSettings.color.toLowerCase() === color.toLowerCase()
                                    ? 'border-violet-500 ring-1 ring-violet-500'
                                    : 'border-gray-600'
                                }`}
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTool === 'text' && (
              <div className="text-sm text-gray-400">
                {t('imageeditor.textHelp')}
              </div>
            )}

            {activeTool === 'crop' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  {t('imageeditor.cropHelp')}
                </p>
                {crop.active && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">
                      {Math.round(crop.width)} × {Math.round(crop.height)} px
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={applyCrop}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded text-sm font-medium transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        {t('imageeditor.applyCrop')}
                      </button>
                      <button
                        onClick={cancelCrop}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                      >
                        <X className="w-4 h-4" />
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pencil Tool */}
            {activeTool === 'pencil' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.size')}</span>
                    <span>{brushSettings.size}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSettings.size}
                    onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
                    className="w-full accent-violet-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.color')}</span>
                  </div>
                  <input
                    type="color"
                    value={brushSettings.color}
                    onChange={(e) => {
                      setBrushSettings({ color: e.target.value })
                      addRecentColor(e.target.value)
                    }}
                    className="w-full h-8 rounded cursor-pointer border-none"
                  />
                </div>
              </div>
            )}

            {/* Shape Tools (Line, Rectangle, Ellipse) */}
            {['line', 'rectangle', 'ellipse'].includes(activeTool) && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShapeSettings({ filled: true, stroked: false })}
                    className={`flex-1 py-1.5 rounded text-xs ${shapeSettings.filled && !shapeSettings.stroked ? 'bg-violet-600' : 'bg-gray-700'}`}
                  >
                    {t('imageeditor.filled')}
                  </button>
                  <button
                    onClick={() => setShapeSettings({ filled: false, stroked: true })}
                    className={`flex-1 py-1.5 rounded text-xs ${!shapeSettings.filled && shapeSettings.stroked ? 'bg-violet-600' : 'bg-gray-700'}`}
                  >
                    {t('imageeditor.stroke')}
                  </button>
                  <button
                    onClick={() => setShapeSettings({ filled: true, stroked: true })}
                    className={`flex-1 py-1.5 rounded text-xs ${shapeSettings.filled && shapeSettings.stroked ? 'bg-violet-600' : 'bg-gray-700'}`}
                  >
                    {t('imageeditor.both')}
                  </button>
                </div>
                {(shapeSettings.filled || activeTool === 'line') && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">{t('imageeditor.fillColor')}</div>
                    <input
                      type="color"
                      value={shapeSettings.fillColor}
                      onChange={(e) => setShapeSettings({ fillColor: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer border-none"
                    />
                  </div>
                )}
                {shapeSettings.stroked && activeTool !== 'line' && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">{t('imageeditor.strokeColor')}</div>
                    <input
                      type="color"
                      value={shapeSettings.strokeColor}
                      onChange={(e) => setShapeSettings({ strokeColor: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer border-none"
                    />
                  </div>
                )}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.strokeWidth')}</span>
                    <span>{shapeSettings.strokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={shapeSettings.strokeWidth}
                    onChange={(e) => setShapeSettings({ strokeWidth: Number(e.target.value) })}
                    className="w-full accent-violet-500"
                  />
                </div>
                <p className="text-xs text-gray-500">{t('imageeditor.shiftForSquare')}</p>
              </div>
            )}

            {/* Bucket Fill Tool */}
            {activeTool === 'bucket' && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-400 mb-1">{t('imageeditor.fillColor')}</div>
                  <input
                    type="color"
                    value={brushSettings.color}
                    onChange={(e) => {
                      setBrushSettings({ color: e.target.value })
                      addRecentColor(e.target.value)
                    }}
                    className="w-full h-8 rounded cursor-pointer border-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.tolerance')}</span>
                    <span>{bucketSettings.tolerance}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={bucketSettings.tolerance}
                    onChange={(e) => setBucketSettings({ tolerance: Number(e.target.value) })}
                    className="w-full accent-violet-500"
                  />
                </div>
              </div>
            )}

            {/* Gradient Tool */}
            {activeTool === 'gradient' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setGradientSettings({ type: 'linear' })}
                    className={`flex-1 py-1.5 rounded text-xs ${gradientSettings.type === 'linear' ? 'bg-violet-600' : 'bg-gray-700'}`}
                  >
                    {t('imageeditor.linear')}
                  </button>
                  <button
                    onClick={() => setGradientSettings({ type: 'radial' })}
                    className={`flex-1 py-1.5 rounded text-xs ${gradientSettings.type === 'radial' ? 'bg-violet-600' : 'bg-gray-700'}`}
                  >
                    {t('imageeditor.radial')}
                  </button>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">{t('imageeditor.startColor')}</div>
                  <input
                    type="color"
                    value={gradientSettings.startColor}
                    onChange={(e) => setGradientSettings({ startColor: e.target.value })}
                    className="w-full h-8 rounded cursor-pointer border-none"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">{t('imageeditor.endColor')}</div>
                  <input
                    type="color"
                    value={gradientSettings.endColor}
                    onChange={(e) => setGradientSettings({ endColor: e.target.value })}
                    className="w-full h-8 rounded cursor-pointer border-none"
                  />
                </div>
                <div
                  className="h-6 rounded"
                  style={{
                    background: gradientSettings.type === 'linear'
                      ? `linear-gradient(to right, ${gradientSettings.startColor}, ${gradientSettings.endColor})`
                      : `radial-gradient(circle, ${gradientSettings.startColor}, ${gradientSettings.endColor})`
                  }}
                />
              </div>
            )}

            {/* Retouch Tools (Blur, Dodge, Burn) */}
            {['blur', 'sharpen', 'smudge', 'dodge', 'burn'].includes(activeTool) && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.size')}</span>
                    <span>{retouchSettings.size}px</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={retouchSettings.size}
                    onChange={(e) => setRetouchSettings({ size: Number(e.target.value) })}
                    className="w-full accent-violet-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.strength')}</span>
                    <span>{retouchSettings.strength}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={retouchSettings.strength}
                    onChange={(e) => setRetouchSettings({ strength: Number(e.target.value) })}
                    className="w-full accent-violet-500"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {activeTool === 'blur' && t('imageeditor.blurHelp')}
                  {activeTool === 'dodge' && t('imageeditor.dodgeHelp')}
                  {activeTool === 'burn' && t('imageeditor.burnHelp')}
                </p>
              </div>
            )}

            {/* Clone Stamp Tool */}
            {activeTool === 'clone' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.size')}</span>
                    <span>{cloneSettings.size}px</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    value={cloneSettings.size}
                    onChange={(e) => setCloneSettings({ size: Number(e.target.value) })}
                    className="w-full accent-violet-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.hardness')}</span>
                    <span>{cloneSettings.hardness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={cloneSettings.hardness}
                    onChange={(e) => setCloneSettings({ hardness: Number(e.target.value) })}
                    className="w-full accent-violet-500"
                  />
                </div>
                <p className="text-xs text-gray-500">{t('imageeditor.cloneHelp')}</p>
                {cloneSettings.sourceX !== null && (
                  <div className="text-xs text-green-400">
                    {t('imageeditor.sourceSet')}: ({Math.round(cloneSettings.sourceX)}, {Math.round(cloneSettings.sourceY!)})
                  </div>
                )}
              </div>
            )}

            {/* Selection Tools */}
            {['rectSelect', 'ellipseSelect', 'lassoSelect'].includes(activeTool) && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400">
                  {activeTool === 'rectSelect' && t('imageeditor.rectSelectHelp')}
                  {activeTool === 'ellipseSelect' && t('imageeditor.ellipseSelectHelp')}
                  {activeTool === 'lassoSelect' && t('imageeditor.lassoSelectHelp')}
                </p>
              </div>
            )}

            {/* Magic Wand Tool */}
            {activeTool === 'magicWand' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.tolerance')}</span>
                    <span>{bucketSettings.tolerance}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={bucketSettings.tolerance}
                    onChange={(e) => setBucketSettings({ tolerance: Number(e.target.value) })}
                    className="w-full accent-violet-500"
                  />
                </div>
                <p className="text-xs text-gray-500">{t('imageeditor.magicWandHelp')}</p>
              </div>
            )}

            {/* Grid Toggle */}
            <div className="mt-6 pt-4 border-t border-gray-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="w-4 h-4 accent-violet-500"
                />
                <Grid3X3 className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">{t('imageeditor.showGrid')}</span>
              </label>
              {showGrid && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('imageeditor.gridSize')}</span>
                    <span>{gridSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>
              )}
            </div>
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
              onClick={() => setZoom(100)}
              className="p-1 hover:bg-gray-700 rounded ml-2"
              title="Fit"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Panel: Layers (always visible) & Filters/History (tabs) */}
        <div ref={rightPanelRef} className="w-64 border-l border-gray-800 flex flex-col overflow-hidden">
          {/* Layers Section - Always Visible */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Layers className="w-3.5 h-3.5" />
                {t('imageeditor.layers')}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <LayerPanel />
            </div>
          </div>

          {/* Resizable Splitter - Improved with larger click area */}
          <div
            className="h-3 cursor-ns-resize flex items-center justify-center group relative"
            onMouseDown={() => setIsResizing(true)}
          >
            {/* Background line */}
            <div className={`absolute inset-x-0 h-px top-1/2 -translate-y-1/2 transition-colors ${
              isResizing ? 'bg-violet-500' : 'bg-gray-700 group-hover:bg-gray-600'
            }`} />
            {/* Drag handle */}
            <div className={`relative w-12 h-1.5 rounded-full transition-all ${
              isResizing
                ? 'bg-violet-500 scale-110'
                : 'bg-gray-600 group-hover:bg-violet-400 group-hover:scale-105'
            }`} />
          </div>

          {/* Filters/History Tabs */}
          <div className="flex flex-col" style={{ height: bottomPanelHeight }}>
            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setRightPanel('filters')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs transition-colors ${
                  rightPanel === 'filters'
                    ? 'text-white border-b-2 border-violet-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                {t('imageeditor.filters')}
              </button>
              <button
                onClick={() => setRightPanel('history')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs transition-colors ${
                  rightPanel === 'history'
                    ? 'text-white border-b-2 border-violet-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                {t('imageeditor.history')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {rightPanel === 'filters' && <FilterPanel />}
              {rightPanel === 'history' && <HistoryPanel />}
            </div>
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
