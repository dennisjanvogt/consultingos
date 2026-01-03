import { useState } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, Home, Star, StarOff, Image, Film, Music, FileText } from 'lucide-react'
import { type FileCategory, CATEGORY_INFO } from '../utils/fileCategories'
import type { Folder } from '@/api/types'

interface SidebarProps {
  activeFilters: FileCategory[]
  onFilterToggle: (category: FileCategory) => void
  currentFolderId: number | null
  folders: Folder[]
  sidebarFolders: Folder[]
  onFolderClick: (folder: Folder | null) => void
  onDropOnFolder?: (folderId: number | null, e: React.DragEvent) => void
  onToggleSidebarVisibility?: (folderId: number) => void
}

const FILTER_CATEGORIES: FileCategory[] = ['images', 'videos', 'music', 'documents']

// Standard-Ordner Namen (für Sortierung)
const STANDARD_FOLDERS = ['Bilder', 'Videos', 'Musik', 'Dokumente']

// Icons für Standard-Ordner basierend auf Namen
const FOLDER_ICONS: Record<string, { icon: typeof Image; color: string }> = {
  'Bilder': { icon: Image, color: 'text-pink-500' },
  'Videos': { icon: Film, color: 'text-purple-500' },
  'Musik': { icon: Music, color: 'text-green-500' },
  'Dokumente': { icon: FileText, color: 'text-violet-500' },
}

function getFolderIcon(folderName: string, isActive: boolean, isDragOver: boolean) {
  const config = FOLDER_ICONS[folderName]
  if (config) {
    const Icon = config.icon
    return <Icon className={`w-4 h-4 ${isDragOver || isActive ? 'text-violet-500' : config.color}`} />
  }
  return <FolderOpen className={`w-4 h-4 ${isDragOver || isActive ? 'text-violet-500' : 'text-yellow-500'}`} />
}

function isStandardFolder(name: string): boolean {
  return STANDARD_FOLDERS.includes(name)
}

function sortFolders(folders: Folder[]): Folder[] {
  return [...folders].sort((a, b) => {
    const aIsStandard = isStandardFolder(a.name)
    const bIsStandard = isStandardFolder(b.name)

    // Standard-Ordner zuerst
    if (aIsStandard && !bIsStandard) return -1
    if (!aIsStandard && bIsStandard) return 1

    // Innerhalb Standard-Ordner: nach definierter Reihenfolge
    if (aIsStandard && bIsStandard) {
      return STANDARD_FOLDERS.indexOf(a.name) - STANDARD_FOLDERS.indexOf(b.name)
    }

    // Andere alphabetisch
    return a.name.localeCompare(b.name)
  })
}

export function Sidebar({
  activeFilters,
  onFilterToggle,
  currentFolderId,
  folders,
  sidebarFolders,
  onFolderClick,
  onDropOnFolder,
  onToggleSidebarVisibility
}: SidebarProps) {
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null | 'root'>(null)
  const [showAllFolders, setShowAllFolders] = useState(false)

  const handleDragOver = (e: React.DragEvent, folderId: number | null) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(folderId === null ? 'root' : folderId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)
  }

  const handleDrop = (e: React.DragEvent, folderId: number | null) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)
    onDropOnFolder?.(folderId, e)
  }

  // Ordner die in der Sidebar angezeigt werden (sortiert: Standard-Ordner zuerst)
  const displayFolders = sortFolders(showAllFolders ? folders : sidebarFolders)

  return (
    <div className="w-14 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col">
      {/* Filter Icons */}
      <div className="p-2 space-y-1">
        <div className="text-[8px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center mb-2">
          Filter
        </div>

        <div className="flex flex-col items-center gap-1">
          {FILTER_CATEGORIES.map((category) => {
            const info = CATEGORY_INFO[category]
            const Icon = info.icon
            const isActive = activeFilters.includes(category)

            return (
              <motion.button
                key={category}
                onClick={() => onFilterToggle(category)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                  isActive
                    ? 'bg-violet-500/20 ring-2 ring-violet-500/50'
                    : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={info.label}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-violet-500' : info.color}`} />
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Trennlinie */}
      <div className="mx-2 border-t border-gray-200 dark:border-gray-700" />

      {/* Ordner */}
      <div className="p-2 flex-1 overflow-y-auto">
        <div className="text-[8px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center mb-2">
          Ordner
        </div>

        {/* Hauptordner */}
        <motion.button
          onClick={() => onFolderClick(null)}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className={`w-full flex items-center justify-center p-2 rounded-lg transition-all mb-1 ${
            dragOverFolderId === 'root'
              ? 'bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-400'
              : currentFolderId === null
                ? 'bg-gray-200/70 dark:bg-gray-700/70'
                : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title="Hauptordner"
        >
          <Home className={`w-4 h-4 ${currentFolderId === null ? 'text-violet-500' : 'text-gray-500'}`} />
        </motion.button>

        {/* Ordner Liste */}
        <div className="space-y-0.5">
          {displayFolders.map((folder) => {
            const isDragOver = dragOverFolderId === folder.id
            const isActive = currentFolderId === folder.id
            const isInSidebar = sidebarFolders.some(f => f.id === folder.id)

            // Erste 3 Buchstaben des Ordnernamens
            const shortLabel = folder.name.slice(0, 3).toUpperCase()

            return (
              <div key={folder.id} className="relative group">
                <motion.button
                  onClick={() => onFolderClick(folder)}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  className={`w-full flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all ${
                    isDragOver
                      ? 'bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-400'
                      : isActive
                        ? 'bg-gray-200/70 dark:bg-gray-700/70'
                        : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title={folder.name}
                >
                  {getFolderIcon(folder.name, isActive, isDragOver)}
                  <span className={`text-[8px] font-semibold mt-0.5 ${
                    isActive ? 'text-violet-500' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {shortLabel}
                  </span>
                </motion.button>

                {/* Favorit Toggle - nur im erweiterten Modus */}
                {showAllFolders && onToggleSidebarVisibility && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleSidebarVisibility(folder.id)
                    }}
                    className="absolute -right-1 -top-1 w-4 h-4 bg-white dark:bg-gray-800 rounded-full shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title={isInSidebar ? 'Aus Sidebar entfernen' : 'Zur Sidebar hinzufügen'}
                  >
                    {isInSidebar ? (
                      <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <StarOff className="w-2.5 h-2.5 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Mehr anzeigen */}
        {folders.length > sidebarFolders.length && (
          <button
            onClick={() => setShowAllFolders(!showAllFolders)}
            className="w-full mt-2 text-[9px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showAllFolders ? 'Weniger' : `+${folders.length - sidebarFolders.length}`}
          </button>
        )}
      </div>

      {/* Keyboard Hint */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <div className="text-[8px] text-gray-400 dark:text-gray-500 text-center">
          <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">1-4</kbd>
        </div>
      </div>
    </div>
  )
}
