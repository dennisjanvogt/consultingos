import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Library, X, Trash2, Pencil, Check, Plus, Search, ChevronRight, FolderOpen, FolderEdit } from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import type { LayerAsset } from '@/stores/imageEditorStore'

// Predefined user categories
const USER_CATEGORIES = ['Animals', 'Backgrounds', 'Icons', 'Shapes', 'Text', 'Other']

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
    updateLayerAssetCategory,
    fetchLayerAssets,
  } = useImageEditorStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['AI', 'Tech']))
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Build list of all existing categories for the dropdown
  const allCategories = useMemo(() => {
    const cats = new Set<string>(USER_CATEGORIES)
    layerAssets.forEach((asset) => {
      if (asset.category && asset.category !== 'Uncategorized') {
        cats.add(asset.category)
      }
    })
    return Array.from(cats).sort()
  }, [layerAssets])

  // Build category tree from assets
  const categoryTree = useMemo(() => {
    const tree: Record<string, { count: number; subcategories: Record<string, number> }> = {}

    layerAssets.forEach((asset) => {
      const category = asset.category || 'Uncategorized'
      const parts = category.split('/')
      const group = parts[0]
      const sub = parts.slice(1).join('/') || null

      if (!tree[group]) {
        tree[group] = { count: 0, subcategories: {} }
      }
      tree[group].count++

      if (sub) {
        tree[group].subcategories[sub] = (tree[group].subcategories[sub] || 0) + 1
      }
    })

    return tree
  }, [layerAssets])

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

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
        } else if (editingCategoryId !== null) {
          setEditingCategoryId(null)
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, editingId, editingCategoryId, onClose])

  const filteredAssets = layerAssets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    let matchesCategory = !selectedCategory
    if (selectedCategory) {
      if (selectedCategory === 'Uncategorized') {
        matchesCategory = !asset.category || asset.category === '' || asset.category === 'Uncategorized'
      } else {
        matchesCategory = asset.category === selectedCategory ||
          asset.category?.startsWith(selectedCategory + '/')
      }
    }
    return matchesSearch && matchesCategory
  })

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

  const handleStartCategoryEdit = (asset: LayerAsset, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCategoryId(asset.id)
  }

  const handleCategoryChange = async (assetId: number, category: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    await updateLayerAssetCategory(assetId, category)
    setEditingCategoryId(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[900px] max-w-[95vw] max-h-[85vh] flex flex-col">
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

        {/* Main content with sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-48 border-r border-gray-700 overflow-y-auto flex-shrink-0">
            <div className="p-2">
              {/* All Assets */}
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  selectedCategory === null
                    ? 'bg-green-600/20 text-green-400'
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span>{isGerman ? 'Alle' : 'All'}</span>
                <span className="ml-auto text-xs text-gray-500">{layerAssets.length}</span>
              </button>

              {/* Category Groups */}
              {Object.entries(categoryTree)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([group, data]) => (
                  <div key={group} className="mt-1">
                    {/* Group Header */}
                    <button
                      onClick={() => {
                        if (Object.keys(data.subcategories).length > 0) {
                          toggleGroup(group)
                        } else {
                          setSelectedCategory(group)
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                        selectedCategory === group
                          ? 'bg-green-600/20 text-green-400'
                          : 'hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      {Object.keys(data.subcategories).length > 0 && (
                        <ChevronRight
                          className={`w-3 h-3 transition-transform ${
                            expandedGroups.has(group) ? 'rotate-90' : ''
                          }`}
                        />
                      )}
                      {Object.keys(data.subcategories).length === 0 && <span className="w-3" />}
                      <span className="font-medium">{group}</span>
                      <span className="ml-auto text-xs text-gray-500">{data.count}</span>
                    </button>

                    {/* Subcategories */}
                    {expandedGroups.has(group) && Object.keys(data.subcategories).length > 0 && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        {Object.entries(data.subcategories)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([sub, count]) => (
                            <button
                              key={sub}
                              onClick={() => setSelectedCategory(`${group}/${sub}`)}
                              className={`w-full text-left px-3 py-1.5 rounded text-xs flex items-center gap-2 ${
                                selectedCategory === `${group}/${sub}`
                                  ? 'bg-green-600/20 text-green-400'
                                  : 'hover:bg-gray-700 text-gray-400'
                              }`}
                            >
                              <span>{sub}</span>
                              <span className="ml-auto text-gray-500">{count}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Right side: Search + Grid */}
          <div className="flex-1 flex flex-col overflow-hidden">
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
              {selectedCategory && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">{isGerman ? 'Kategorie:' : 'Category:'}</span>
                  <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded">
                    {selectedCategory}
                  </span>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Grid Content */}
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
                      <>
                        <p className="text-xs truncate" title={asset.name}>
                          {asset.name}
                        </p>
                        {asset.category && (
                          <p className="text-[10px] text-gray-500 truncate">
                            {asset.category}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Hover actions - Admin only */}
                  {isAdmin && editingId !== asset.id && editingCategoryId !== asset.id && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartCategoryEdit(asset, e)}
                        className="p-1.5 bg-gray-800/90 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
                        title={isGerman ? 'Kategorie ändern' : 'Change category'}
                      >
                        <FolderEdit className="w-3 h-3" />
                      </button>
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

                  {/* Category edit dropdown */}
                  {editingCategoryId === asset.id && (
                    <div
                      className="absolute top-2 right-2 left-2 bg-gray-800 rounded p-2 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        autoFocus
                        value={asset.category || ''}
                        onChange={(e) => handleCategoryChange(asset.id, e.target.value, e)}
                        onBlur={() => setEditingCategoryId(null)}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-600"
                      >
                        <option value="">{isGerman ? 'Ohne Kategorie' : 'Uncategorized'}</option>
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
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
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700 text-xs text-gray-500">
          <span>
            {filteredAssets.length} {isGerman ? 'Assets' : 'assets'}
            {selectedCategory && ` in ${selectedCategory}`}
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
