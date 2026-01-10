import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  ImagePlus,
  Type,
  Square,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Merge,
  Layers,
  Pencil,
  GripVertical,
  Scissors,
  Wand2,
  X,
  Loader2,
} from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import type { BlendMode, LayerType } from '../types'

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
]

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  layerId: string | null
}

interface AIEditDialogState {
  visible: boolean
  layerId: string | null
}

export function LayerPanel() {
  const { t, i18n } = useTranslation()
  const isGerman = i18n.language === 'de'
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Drag and drop state
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null)
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    layerId: null,
  })

  // AI Edit dialog state
  const [aiEditDialog, setAiEditDialog] = useState<AIEditDialogState>({
    visible: false,
    layerId: null,
  })
  const [aiEditPrompt, setAiEditPrompt] = useState('')
  const aiEditInputRef = useRef<HTMLInputElement>(null)

  const {
    currentProject,
    selectedLayerId,
    addLayer,
    deleteLayer,
    duplicateLayer,
    selectLayer,
    reorderLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setLayerOpacity,
    setLayerBlendMode,
    renameLayer,
    rotateLayer,
    flipLayerHorizontal,
    flipLayerVertical,
    mergeLayerDown,
    flattenLayers,
    getSelectedLayer,
    addImageAsLayer,
    trimLayer,
    editImageWithAI,
    isEditingImage,
  } = useImageEditorStore()

  const handleImportImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        await addImageAsLayer(file)
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const selectedLayer = getSelectedLayer()
  const layers = currentProject?.layers || []

  // Focus input when editing starts
  useEffect(() => {
    if (editingLayerId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingLayerId])

  // Focus AI edit input when dialog opens
  useEffect(() => {
    if (aiEditDialog.visible && aiEditInputRef.current) {
      aiEditInputRef.current.focus()
    }
  }, [aiEditDialog.visible])

  // Handle AI edit submission
  const handleAIEditSubmit = async () => {
    if (!aiEditDialog.layerId || !aiEditPrompt.trim()) return
    await editImageWithAI(aiEditDialog.layerId, aiEditPrompt.trim())
    setAiEditDialog({ visible: false, layerId: null })
    setAiEditPrompt('')
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }))
      }
    }

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu.visible])

  // Handle right-click on layer
  const handleContextMenu = useCallback((e: React.MouseEvent, layerId: string) => {
    e.preventDefault()
    e.stopPropagation()
    selectLayer(layerId)
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      layerId,
    })
  }, [selectLayer])

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  const handleStartRename = (layerId: string, currentName: string) => {
    setEditingLayerId(layerId)
    setEditingName(currentName)
  }

  const handleFinishRename = () => {
    if (editingLayerId && editingName.trim()) {
      renameLayer(editingLayerId, editingName.trim())
    }
    setEditingLayerId(null)
    setEditingName('')
  }

  const handleCancelRename = () => {
    setEditingLayerId(null)
    setEditingName('')
  }

  const handleMoveUp = (layerId: string) => {
    const index = layers.findIndex((l) => l.id === layerId)
    if (index < layers.length - 1) {
      reorderLayer(layerId, index + 1)
    }
  }

  const handleMoveDown = (layerId: string) => {
    const index = layers.findIndex((l) => l.id === layerId)
    if (index > 0) {
      reorderLayer(layerId, index - 1)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', layerId)
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLayerId(null)
    setDragOverLayerId(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (layerId !== draggedLayerId) {
      setDragOverLayerId(layerId)
    }
  }

  const handleDragLeave = () => {
    setDragOverLayerId(null)
  }

  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault()
    setDragOverLayerId(null)

    if (!draggedLayerId || draggedLayerId === targetLayerId) return

    // Get indices in original (non-reversed) array
    const draggedIndex = layers.findIndex((l) => l.id === draggedLayerId)
    const targetIndex = layers.findIndex((l) => l.id === targetLayerId)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      reorderLayer(draggedLayerId, targetIndex)
    }

    setDraggedLayerId(null)
  }

  const getLayerIcon = (type: LayerType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />
      case 'text':
        return <Type className="w-4 h-4" />
      case 'shape':
        return <Square className="w-4 h-4" />
      default:
        return <ImageIcon className="w-4 h-4" />
    }
  }

  // Clear selection when clicking on empty space
  const handleClearSelection = useCallback((e: React.MouseEvent) => {
    // Only clear if clicking directly on the container, not on a child
    if (e.target === e.currentTarget) {
      selectLayer(null)
    }
  }, [selectLayer])

  return (
    <div className="flex flex-col h-full">
      {/* Layer List */}
      <div className="flex-1 overflow-y-auto" onClick={handleClearSelection}>
        {[...layers].reverse().map((layer, index) => (
          <div
            key={layer.id}
            draggable={!layer.locked}
            onDragStart={(e) => handleDragStart(e, layer.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, layer.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, layer.id)}
            onClick={(e) => {
              e.stopPropagation()
              selectLayer(layer.id)
            }}
            onContextMenu={(e) => handleContextMenu(e, layer.id)}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
              selectedLayerId === layer.id
                ? 'bg-violet-600/30'
                : 'hover:bg-gray-800'
            } ${
              dragOverLayerId === layer.id
                ? 'border-t-2 border-violet-500'
                : ''
            } ${
              draggedLayerId === layer.id
                ? 'opacity-50'
                : ''
            }`}
          >
            {/* Drag Handle */}
            <div className={`cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 ${layer.locked ? 'opacity-30' : ''}`}>
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Visibility */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleLayerVisibility(layer.id)
              }}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              {layer.visible ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>

            {/* Thumbnail */}
            <div className="w-10 h-10 bg-gray-800 rounded overflow-hidden flex items-center justify-center border border-gray-700">
              {layer.imageData ? (
                <img
                  src={layer.imageData}
                  alt={layer.name}
                  className="w-full h-full object-cover"
                />
              ) : layer.type === 'text' && layer.text ? (
                <span
                  className="text-[8px] leading-none text-center truncate px-0.5"
                  style={{
                    fontFamily: layer.fontFamily || 'Arial',
                    fontWeight: layer.fontWeight || 400,
                    color: layer.fontColor || '#ffffff',
                  }}
                >
                  {layer.text.slice(0, 5)}
                </span>
              ) : (
                <span className="text-gray-500">{getLayerIcon(layer.type)}</span>
              )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              {editingLayerId === layer.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename()
                    if (e.key === 'Escape') handleCancelRename()
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-1 py-0.5 bg-gray-900 border border-violet-500 rounded text-sm focus:outline-none"
                />
              ) : (
                <p
                  className="text-sm truncate cursor-text"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    handleStartRename(layer.id, layer.name)
                  }}
                  title={t('imageeditor.doubleClickRename')}
                >
                  {layer.name}
                </p>
              )}
              <p className="text-xs text-gray-500">{layer.type}</p>
            </div>

            {/* Lock */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleLayerLock(layer.id)
              }}
              className={`p-1 rounded ${
                layer.locked
                  ? 'text-yellow-500 bg-yellow-500/20'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {layer.locked ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Layer Actions */}
      <div className="border-t border-gray-800 p-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImportImage}
        />

        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => addLayer('image')}
            className="p-1.5 hover:bg-gray-700 rounded"
            title={t('imageeditor.addLayer')}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 hover:bg-gray-700 rounded"
            title={t('imageeditor.importImage')}
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectedLayerId && duplicateLayer(selectedLayerId)}
            disabled={!selectedLayerId}
            className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30"
            title={t('imageeditor.duplicateLayer')}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectedLayerId && handleMoveUp(selectedLayerId)}
            disabled={!selectedLayerId || layers.findIndex((l) => l.id === selectedLayerId) === layers.length - 1}
            className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30"
            title={t('imageeditor.moveUp')}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectedLayerId && handleMoveDown(selectedLayerId)}
            disabled={!selectedLayerId || layers.findIndex((l) => l.id === selectedLayerId) === 0}
            className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30"
            title={t('imageeditor.moveDown')}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectedLayerId && deleteLayer(selectedLayerId)}
            disabled={!selectedLayerId || layers.length <= 1}
            className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30 text-red-400"
            title={t('imageeditor.deleteLayer')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Layer Properties */}
        {selectedLayer && (
          <div className="space-y-3 mt-3 pt-3 border-t border-gray-800">
            {/* Opacity */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{t('imageeditor.opacity')}</span>
                <span>{selectedLayer.opacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={selectedLayer.opacity}
                onChange={(e) => setLayerOpacity(selectedLayer.id, Number(e.target.value))}
                className="w-full accent-violet-500"
                disabled={selectedLayer.locked}
              />
            </div>

            {/* Blend Mode */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {t('imageeditor.blendMode')}
              </label>
              <select
                value={selectedLayer.blendMode}
                onChange={(e) => setLayerBlendMode(selectedLayer.id, e.target.value as BlendMode)}
                disabled={selectedLayer.locked}
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {BLEND_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Transform */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Transform
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => rotateLayer(selectedLayer.id, 90)}
                  disabled={selectedLayer.locked}
                  className="flex-1 flex items-center justify-center gap-1 p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-xs transition-colors"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => flipLayerHorizontal(selectedLayer.id)}
                  disabled={selectedLayer.locked}
                  className="flex-1 flex items-center justify-center gap-1 p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-xs transition-colors"
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => flipLayerVertical(selectedLayer.id)}
                  disabled={selectedLayer.locked}
                  className="flex-1 flex items-center justify-center gap-1 p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-xs transition-colors"
                  title="Flip Vertical"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Merge / Flatten */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {t('imageeditor.layers')}
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => mergeLayerDown(selectedLayer.id)}
                  disabled={selectedLayer.locked || layers.findIndex((l) => l.id === selectedLayer.id) === 0}
                  className="flex-1 flex items-center justify-center gap-1 p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-xs transition-colors"
                  title={t('imageeditor.mergeDown')}
                >
                  <Merge className="w-3.5 h-3.5" />
                  <span className="truncate">{t('imageeditor.mergeDown')}</span>
                </button>
                <button
                  onClick={() => flattenLayers()}
                  disabled={layers.length <= 1}
                  className="flex-1 flex items-center justify-center gap-1 p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-xs transition-colors"
                  title={t('imageeditor.flatten')}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="truncate">{t('imageeditor.flatten')}</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.layerId && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[160px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          {(() => {
            const targetLayer = layers.find((l) => l.id === contextMenu.layerId)
            if (!targetLayer) return null
            const layerIndex = layers.findIndex((l) => l.id === contextMenu.layerId)

            return (
              <>
                {/* Duplicate */}
                <button
                  onClick={() => {
                    duplicateLayer(contextMenu.layerId!)
                    closeContextMenu()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {t('imageeditor.duplicateLayer')}
                </button>

                {/* Trim - remove transparent areas */}
                <button
                  onClick={() => {
                    trimLayer(contextMenu.layerId!)
                    closeContextMenu()
                  }}
                  disabled={targetLayer.locked || targetLayer.type === 'text'}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors disabled:opacity-30"
                >
                  <Scissors className="w-4 h-4" />
                  {isGerman ? 'Zuschneiden (Auto-Trim)' : 'Auto-Trim'}
                </button>

                {/* AI Edit */}
                <button
                  onClick={() => {
                    setAiEditDialog({ visible: true, layerId: contextMenu.layerId })
                    closeContextMenu()
                  }}
                  disabled={targetLayer.locked || targetLayer.type === 'text' || !targetLayer.imageData}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors disabled:opacity-30 text-violet-400"
                >
                  <Wand2 className="w-4 h-4" />
                  {isGerman ? 'Mit KI bearbeiten' : 'AI Edit'}
                </button>

                {/* Delete */}
                <button
                  onClick={() => {
                    if (layers.length > 1) {
                      deleteLayer(contextMenu.layerId!)
                    }
                    closeContextMenu()
                  }}
                  disabled={layers.length <= 1}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors text-red-400 disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('imageeditor.deleteLayer')}
                </button>

                {/* Separator */}
                <div className="my-1 border-t border-gray-700" />

                {/* Merge Down */}
                <button
                  onClick={() => {
                    mergeLayerDown(contextMenu.layerId!)
                    closeContextMenu()
                  }}
                  disabled={targetLayer.locked || layerIndex === 0}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors disabled:opacity-30"
                >
                  <Merge className="w-4 h-4" />
                  {t('imageeditor.mergeDown')}
                </button>

                {/* Flatten */}
                <button
                  onClick={() => {
                    flattenLayers()
                    closeContextMenu()
                  }}
                  disabled={layers.length <= 1}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors disabled:opacity-30"
                >
                  <Layers className="w-4 h-4" />
                  {t('imageeditor.flatten')}
                </button>

                {/* Separator */}
                <div className="my-1 border-t border-gray-700" />

                {/* Rename */}
                <button
                  onClick={() => {
                    handleStartRename(contextMenu.layerId!, targetLayer.name)
                    closeContextMenu()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  {t('imageeditor.rename')}
                </button>

                {/* Lock/Unlock */}
                <button
                  onClick={() => {
                    toggleLayerLock(contextMenu.layerId!)
                    closeContextMenu()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors"
                >
                  {targetLayer.locked ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      {t('imageeditor.unlock')}
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      {t('imageeditor.lock')}
                    </>
                  )}
                </button>
              </>
            )
          })()}
        </div>
      )}

      {/* AI Edit Dialog */}
      {aiEditDialog.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-96 max-w-[90vw]">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2 text-violet-400">
                <Wand2 className="w-5 h-5" />
                <h3 className="font-semibold">
                  {isGerman ? 'Mit KI bearbeiten' : 'AI Edit'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setAiEditDialog({ visible: false, layerId: null })
                  setAiEditPrompt('')
                }}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm text-gray-400 mb-2">
                {isGerman ? 'Beschreibe die gewünschte Änderung:' : 'Describe the desired change:'}
              </label>
              <input
                ref={aiEditInputRef}
                type="text"
                value={aiEditPrompt}
                onChange={(e) => setAiEditPrompt(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation() // Prevent global keyboard handlers from intercepting keys
                  if (e.key === 'Enter' && !isEditingImage) {
                    handleAIEditSubmit()
                  }
                  if (e.key === 'Escape') {
                    setAiEditDialog({ visible: false, layerId: null })
                    setAiEditPrompt('')
                  }
                }}
                placeholder={isGerman ? 'z.B. "Mache den Hintergrund blau"' : 'e.g. "Make the background blue"'}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                disabled={isEditingImage}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setAiEditDialog({ visible: false, layerId: null })
                    setAiEditPrompt('')
                  }}
                  disabled={isEditingImage}
                  className="px-4 py-2 text-sm hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isGerman ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  onClick={handleAIEditSubmit}
                  disabled={!aiEditPrompt.trim() || isEditingImage}
                  className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isEditingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isGerman ? 'Bearbeite...' : 'Editing...'}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      {isGerman ? 'Bearbeiten' : 'Edit'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
