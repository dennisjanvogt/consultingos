import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Library, X, Trash2, Pencil, Check, Plus, Search } from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import type { LayerAsset } from '@/stores/imageEditorStore'

interface LayerLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  isAdmin?: boolean
}

export default function LayerLibraryModal({ isOpen, onClose, isAdmin = false }: LayerLibraryModalProps) {
  const { i18n } = useTranslation()
  const isGerman = i18n.language === 'de'

  const {
    layerAssets,
    insertLayerFromLibrary,
    deleteLayerAsset,
    renameLayerAsset,
    fetchLayerAssets,
  } = useImageEditorStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // Fetch assets when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLayerAssets()
    }
  }, [isOpen, fetchLayerAssets])

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId !== null) {
          setEditingId(null)
          setEditingName('')
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, editingId, onClose])

  const filteredAssets = layerAssets.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleInsert = (asset: LayerAsset) => {
    insertLayerFromLibrary(asset.id)
    onClose()
  }

  const handleDelete = async (assetId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(isGerman ? 'Asset wirklich löschen?' : 'Delete this asset?')) {
      await deleteLayerAsset(assetId)
    }
  }

  const handleStartEdit = (asset: LayerAsset, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(asset.id)
    setEditingName(asset.name)
  }

  const handleSaveEdit = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (editingId !== null && editingName.trim()) {
      await renameLayerAsset(editingId, editingName.trim())
    }
    setEditingId(null)
    setEditingName('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 text-green-600">
            <Library className="w-5 h-5" />
            <h3 className="font-semibold">
              {isGerman ? 'Asset-Bibliothek' : 'Asset Library'}
            </h3>
            <span className="text-xs text-gray-500">
              ({layerAssets.length} {isGerman ? 'Elemente' : 'items'})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isGerman ? 'Assets durchsuchen...' : 'Search assets...'}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Library className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-center">
                {searchQuery
                  ? isGerman
                    ? 'Keine Assets gefunden'
                    : 'No assets found'
                  : isGerman
                  ? 'Noch keine Assets gespeichert'
                  : 'No assets saved yet'}
              </p>
              {!searchQuery && (
                <p className="text-sm text-center mt-2">
                  {isGerman
                    ? 'Rechtsklick auf einen Layer → "In Bibliothek speichern"'
                    : 'Right-click a layer → "Save to Library"'}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => handleInsert(asset)}
                  className="group relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-green-600 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-[repeating-conic-gradient(#374151_0%_25%,#1f2937_0%_50%)] bg-[length:16px_16px] flex items-center justify-center p-2">
                    <img
                      src={asset.thumbnail || asset.imageData}
                      alt={asset.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  {/* Name */}
                  <div className="p-2 border-t border-gray-700">
                    {editingId === asset.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') {
                              setEditingId(null)
                              setEditingName('')
                            }
                          }}
                          className="flex-1 px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-600"
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 hover:bg-gray-700 rounded text-green-600"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs truncate" title={asset.name}>
                        {asset.name}
                      </p>
                    )}
                  </div>

                  {/* Hover actions - Admin only */}
                  {isAdmin && editingId !== asset.id && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartEdit(asset, e)}
                        className="p-1.5 bg-gray-800/90 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
                        title={isGerman ? 'Umbenennen' : 'Rename'}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(asset.id, e)}
                        className="p-1.5 bg-gray-800/90 hover:bg-red-600 rounded text-gray-300 hover:text-white"
                        title={isGerman ? 'Löschen' : 'Delete'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Dimensions badge */}
                  <div className="absolute bottom-10 left-2 px-1.5 py-0.5 bg-gray-800/90 rounded text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {asset.width} × {asset.height}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700 text-xs text-gray-500">
          <span>
            {isGerman ? 'Klicke auf ein Asset zum Einfügen' : 'Click an asset to insert'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isGerman ? 'Schließen' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
