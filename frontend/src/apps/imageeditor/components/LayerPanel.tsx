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
  Eraser,
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

export function LayerPanel() {
  const { t } = useTranslation()
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    layerId: null,
  })

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
    removeBackground,
    isRemovingBackground,
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

  return (
    <div className="flex flex-col h-full">
      {/* Layer List */}
      <div className="flex-1 overflow-y-auto">
        {[...layers].reverse().map((layer, index) => (
          <div
            key={layer.id}
            onClick={() => selectLayer(layer.id)}
            onContextMenu={(e) => handleContextMenu(e, layer.id)}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
              selectedLayerId === layer.id
                ? 'bg-violet-600/30'
                : 'hover:bg-gray-800'
            }`}
          >
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

            {/* AI Tools */}
            {selectedLayer.imageData && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  AI Tools
                </label>
                <button
                  onClick={() => removeBackground(selectedLayer.id)}
                  disabled={selectedLayer.locked || isRemovingBackground}
                  className="w-full flex items-center justify-center gap-2 p-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 rounded text-xs font-medium transition-all"
                  title={t('imageeditor.removeBackground')}
                >
                  {isRemovingBackground ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('imageeditor.removingBackground')}
                    </>
                  ) : (
                    <>
                      <Eraser className="w-4 h-4" />
                      {t('imageeditor.removeBackground')}
                    </>
                  )}
                </button>
              </div>
            )}
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
    </div>
  )
}
