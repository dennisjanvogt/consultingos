import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Folder,
  FileText,
  FileImage,
  File,
  ChevronRight,
  ArrowLeft,
  Download,
  FolderOpen,
  Image,
  Film,
  Music,
  Star,
  StarOff,
  Home,
  Upload,
  Wand2,
} from 'lucide-react'
import { useDocumentsStore } from '@/stores/documentsStore'
import { useWindowStore } from '@/stores/windowStore'
import { useImageViewerStore } from '@/stores/imageViewerStore'
import { useVideoViewerStore } from '@/stores/videoViewerStore'
import { usePDFViewerStore } from '@/stores/pdfViewerStore'
import type { Folder as FolderType, Document as DocumentType } from '@/api/types'
import { type FileCategory, CATEGORY_INFO, getCategoryFromFileType } from './utils/fileCategories'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const MEDIA_BASE_URL = 'http://localhost:8000' // Ohne /api - für Media Files


// Standard folder icons (same as Sidebar)
const STANDARD_FOLDER_NAMES = ['Bilder', 'Videos', 'Musik', 'Dokumente']
const STANDARD_FOLDER_CONFIG: Record<string, { icon: typeof Image; color: string; bgColor: string }> = {
  'Bilder': { icon: Image, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  'Videos': { icon: Film, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  'Musik': { icon: Music, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  'Dokumente': { icon: FileText, color: 'text-lavender-600 dark:text-lavender-400', bgColor: 'bg-lavender-100 dark:bg-lavender-900/30' },
}

export function DocumentsApp() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'folder' | 'document'; id: number; name: string } | null>(null)
  const [showAutoSortModal, setShowAutoSortModal] = useState(false)
  const [isAutoSorting, setIsAutoSorting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const {
    folders,
    allFolders,
    documents,
    currentFolderId,
    folderPath,
    activeFilters,
    isLoading,
    viewMode,
    showFolderForm,
    setShowFolderForm,
    setFileInputRef,
    toggleFilter,
    fetchAllFolders,
    fetchFolders,
    fetchDocuments,
    deleteFolder,
    uploadDocument,
    deleteDocument,
    moveDocument,
    moveFolder,
    navigateToFolder,
    navigateUp,
    getFilteredDocuments,
    getSidebarFolders,
    toggleSidebarVisibility,
  } = useDocumentsStore()

  // Register file input ref with store
  useEffect(() => {
    setFileInputRef(fileInputRef.current)
  }, [setFileInputRef])

  // Sidebar-Ordner (alle angehefteten inkl. Standard-Ordner)
  const sidebarFolders = useMemo(() => {
    return getSidebarFolders()
  }, [allFolders, getSidebarFolders])

  // Hole alle Root-Ordner
  useEffect(() => {
    fetchAllFolders()
  }, [fetchAllFolders])

  // Keyboard Shortcuts für Filter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const filterMap: Record<string, FileCategory> = {
        '1': 'images',
        '2': 'videos',
        '3': 'music',
        '4': 'documents',
      }

      if (filterMap[e.key]) {
        toggleFilter(filterMap[e.key])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleFilter])

  // Gefilterte Dokumente
  const displayDocuments = useMemo(() => {
    return getFilteredDocuments()
  }, [activeFilters, documents, getFilteredDocuments])


  useEffect(() => {
    fetchFolders(currentFolderId)
    fetchDocuments(currentFolderId, searchQuery)
  }, [currentFolderId, fetchFolders, fetchDocuments])

  useEffect(() => {
    if (searchQuery) {
      fetchDocuments(null, searchQuery)
    } else {
      fetchDocuments(currentFolderId)
    }
  }, [searchQuery, currentFolderId, fetchDocuments])

  const handleDeleteFolder = (id: number, name: string) => {
    setDeleteConfirm({ type: 'folder', id, name })
  }

  const handleDeleteDocument = (id: number, name: string) => {
    setDeleteConfirm({ type: 'document', id, name })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'folder') {
      await deleteFolder(deleteConfirm.id)
    } else {
      await deleteDocument(deleteConfirm.id)
    }
    setDeleteConfirm(null)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (const file of files) {
      await uploadDocument(file, currentFolderId)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFolderClick = (folder: FolderType | null) => {
    setSearchQuery('')
    if (folder === null) {
      navigateToFolder(null)
    } else {
      // Direkt zum Ordner navigieren (nicht stacken)
      // Reset folderPath und setze nur diesen Ordner
      useDocumentsStore.setState({
        currentFolderId: folder.id,
        folderPath: [folder],
      })
    }
  }

  const handleCloseFolderForm = () => {
    setShowFolderForm(false)
    setEditingFolder(null)
  }

  // Open files in viewers
  const { openWindow } = useWindowStore()
  const { setCurrentImage } = useImageViewerStore()
  const { setCurrentVideo } = useVideoViewerStore()
  const { setCurrentPDF } = usePDFViewerStore()

  const handleOpenImage = (doc: DocumentType) => {
    setCurrentImage(doc)
    openWindow('imageviewer')
  }

  const handleOpenVideo = (doc: DocumentType) => {
    setCurrentVideo(doc)
    openWindow('videoviewer')
  }

  const handleOpenPDF = (doc: DocumentType) => {
    setCurrentPDF(doc)
    openWindow('pdfviewer')
  }

  // File upload drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDraggingFile(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)
    dragCounter.current = 0

    // Check if it's a file upload
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        await uploadDocument(file, currentFolderId)
      }
      return
    }
  }

  // Handle drop on folder (move item into folder)
  const handleDropOnFolder = async (targetFolderId: number | null, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const documentId = e.dataTransfer.getData('documentId')
    const folderId = e.dataTransfer.getData('folderId')

    if (documentId) {
      await moveDocument(parseInt(documentId), targetFolderId)
    } else if (folderId && (targetFolderId === null || parseInt(folderId) !== targetFolderId)) {
      await moveFolder(parseInt(folderId), targetFolderId)
    }
  }

  // Handle drop on "back" area (move to parent folder)
  const handleDropOnParent = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const documentId = e.dataTransfer.getData('documentId')
    const folderId = e.dataTransfer.getData('folderId')
    const parentId = folderPath.length > 1 ? folderPath[folderPath.length - 2].id : null

    if (documentId) {
      await moveDocument(parseInt(documentId), parentId)
    } else if (folderId) {
      await moveFolder(parseInt(folderId), parentId)
    }
  }

  // Aktive Filter für Header
  const activeFilterLabels = activeFilters.map(f => CATEGORY_INFO[f].label).join(', ')

  // Auto-sort: Mapping category to folder name
  const CATEGORY_TO_FOLDER: Record<string, string> = {
    images: 'Bilder',
    videos: 'Videos',
    music: 'Musik',
    documents: 'Dokumente',
  }

  // Get files that can be auto-sorted (only from root folder)
  const getAutoSortableFiles = useMemo(() => {
    // Only consider files in root folder
    if (currentFolderId !== null) return { total: 0, byCategory: {} as Record<string, DocumentType[]> }

    const byCategory: Record<string, DocumentType[]> = {
      images: [],
      videos: [],
      music: [],
      documents: [],
    }

    for (const doc of documents) {
      const category = getCategoryFromFileType(doc.file_type)
      if (category !== 'other' && category !== 'all' && byCategory[category]) {
        byCategory[category].push(doc)
      }
    }

    const total = Object.values(byCategory).reduce((sum, arr) => sum + arr.length, 0)
    return { total, byCategory }
  }, [documents, currentFolderId])

  // Execute auto-sort
  const handleAutoSort = async () => {
    setIsAutoSorting(true)

    try {
      const { byCategory } = getAutoSortableFiles

      for (const [category, docs] of Object.entries(byCategory)) {
        if (docs.length === 0) continue

        const folderName = CATEGORY_TO_FOLDER[category]
        const targetFolder = allFolders.find(f => f.name === folderName && f.parent_id === null)

        if (!targetFolder) {
          console.warn(`Target folder not found: ${folderName}`)
          continue
        }

        for (const doc of docs) {
          await moveDocument(doc.id, targetFolder.id)
        }
      }

      // Refresh documents after sorting
      await fetchDocuments(currentFolderId)
    } catch (error) {
      console.error('Auto-sort failed:', error)
    } finally {
      setIsAutoSorting(false)
      setShowAutoSortModal(false)
    }
  }

  return (
    <div className="h-full flex relative">
      {/* Folders Sidebar */}
      {sidebarFolders.length > 0 && (
        <QuickAccessSidebar
          folders={sidebarFolders}
          currentFolderId={currentFolderId}
          onFolderClick={handleFolderClick}
          onDropOnFolder={handleDropOnFolder}
        />
      )}

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 shrink-0">
            {folderPath.length > 0 && (
              <button
                onClick={navigateUp}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropOnParent}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {t('documents.title')}
            </h1>
            {activeFilters.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                • {activeFilterLabels}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={`${t('common.search')}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none transition-colors"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-1">
            {(['images', 'videos', 'music', 'documents'] as const).map((category) => {
              const info = CATEGORY_INFO[category]
              const Icon = info.icon
              const isActive = activeFilters.includes(category)
              return (
                <button
                  key={category}
                  onClick={() => toggleFilter(category)}
                  className={`p-1.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-lavender-100 dark:bg-lavender-900/30 ring-1 ring-lavender-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={`${info.label} (${category === 'images' ? '1' : category === 'videos' ? '2' : category === 'music' ? '3' : '4'})`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-lavender-500' : info.color}`} />
                </button>
              )
            })}
          </div>

          {/* Auto-Sort Button - only show in root folder with sortable files */}
          {currentFolderId === null && getAutoSortableFiles.total > 0 && (
            <button
              onClick={() => setShowAutoSortModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-lavender-100 dark:bg-lavender-900/30 text-lavender-700 dark:text-lavender-300 rounded-lg hover:bg-lavender-200 dark:hover:bg-lavender-900/50 transition-colors"
              title="Dateien automatisch sortieren"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Sortieren
            </button>
          )}

          {/* Hidden file input for upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            {t('common.loading')}
          </div>
        ) : folders.length === 0 && displayDocuments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            {t('documents.empty')}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-4">
            {/* All Folders in one row - Standard first, then Custom */}
            {(() => {
              const standardFolders = folders.filter(f => STANDARD_FOLDER_NAMES.includes(f.name))
                .sort((a, b) => STANDARD_FOLDER_NAMES.indexOf(a.name) - STANDARD_FOLDER_NAMES.indexOf(b.name))
              const customFolders = folders.filter(f => !STANDARD_FOLDER_NAMES.includes(f.name))
                .sort((a, b) => a.name.localeCompare(b.name))

              if (standardFolders.length === 0 && customFolders.length === 0) return null

              return (
                <div>
                  <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                    Ordner
                  </div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 90px))' }}>
                    {/* Standard folders first */}
                    {standardFolders.map((folder) => (
                      <FolderCard
                        key={`folder-${folder.id}`}
                        folder={folder}
                        onClick={() => handleFolderClick(folder)}
                        onEdit={() => {
                          setEditingFolder(folder)
                          setShowFolderForm(true)
                        }}
                        onDelete={() => handleDeleteFolder(folder.id, folder.name)}
                        onDrop={(e) => handleDropOnFolder(folder.id, e)}
                        onToggleSidebar={() => toggleSidebarVisibility(folder.id)}
                      />
                    ))}
                    {/* Separator between standard and custom */}
                    {standardFolders.length > 0 && customFolders.length > 0 && (
                      <div className="flex items-center justify-center">
                        <div className="h-12 w-px bg-gray-200 dark:bg-gray-700" />
                      </div>
                    )}
                    {/* Custom folders */}
                    {customFolders.map((folder) => (
                      <FolderCard
                        key={`folder-${folder.id}`}
                        folder={folder}
                        onClick={() => handleFolderClick(folder)}
                        onEdit={() => {
                          setEditingFolder(folder)
                          setShowFolderForm(true)
                        }}
                        onDelete={() => handleDeleteFolder(folder.id, folder.name)}
                        onDrop={(e) => handleDropOnFolder(folder.id, e)}
                        onToggleSidebar={() => toggleSidebarVisibility(folder.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Documents */}
            {displayDocuments.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Dateien
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 90px))' }}>
                  {displayDocuments.map((doc) => (
                    <DocumentCard
                      key={`doc-${doc.id}`}
                      document={doc}
                      onDelete={() => handleDeleteDocument(doc.id, doc.name)}
                      onOpenImage={handleOpenImage}
                      onOpenVideo={handleOpenVideo}
                      onOpenPDF={handleOpenPDF}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* All Folders - Standard first, then Custom */}
            {(() => {
              const standardFolders = folders.filter(f => STANDARD_FOLDER_NAMES.includes(f.name))
                .sort((a, b) => STANDARD_FOLDER_NAMES.indexOf(a.name) - STANDARD_FOLDER_NAMES.indexOf(b.name))
              const customFolders = folders.filter(f => !STANDARD_FOLDER_NAMES.includes(f.name))
                .sort((a, b) => a.name.localeCompare(b.name))

              if (standardFolders.length === 0 && customFolders.length === 0) return null

              return (
                <div>
                  <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                    Ordner
                  </div>
                  <div className="space-y-1">
                    {/* Standard folders */}
                    {standardFolders.map((folder) => (
                      <FolderRow
                        key={`folder-${folder.id}`}
                        folder={folder}
                        onClick={() => handleFolderClick(folder)}
                        onToggleSidebar={() => toggleSidebarVisibility(folder.id)}
                        onEdit={() => {
                          setEditingFolder(folder)
                          setShowFolderForm(true)
                        }}
                        onDelete={() => handleDeleteFolder(folder.id, folder.name)}
                        onDrop={(e) => handleDropOnFolder(folder.id, e)}
                      />
                    ))}
                    {/* Separator */}
                    {standardFolders.length > 0 && customFolders.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                    )}
                    {/* Custom folders */}
                    {customFolders.map((folder) => (
                      <FolderRow
                        key={`folder-${folder.id}`}
                        folder={folder}
                        onClick={() => handleFolderClick(folder)}
                        onToggleSidebar={() => toggleSidebarVisibility(folder.id)}
                        onEdit={() => {
                          setEditingFolder(folder)
                          setShowFolderForm(true)
                        }}
                        onDelete={() => handleDeleteFolder(folder.id, folder.name)}
                        onDrop={(e) => handleDropOnFolder(folder.id, e)}
                      />
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Documents */}
            {displayDocuments.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Dateien
                </div>
                <div className="space-y-1">
                  {displayDocuments.map((doc) => (
                    <DocumentRow
                      key={`doc-${doc.id}`}
                      document={doc}
                      onDelete={() => handleDeleteDocument(doc.id, doc.name)}
                      onOpenImage={handleOpenImage}
                      onOpenVideo={handleOpenVideo}
                      onOpenPDF={handleOpenPDF}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

        {/* Status Bar / Breadcrumb */}
        <div className="px-4 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <button
              onClick={() => navigateToFolder(null)}
              className="hover:text-gray-700 dark:hover:text-gray-300"
            >
              Dateien
            </button>
            {folderPath.map((folder, index) => (
              <span key={folder.id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <button
                  onClick={() => {
                    const newPath = folderPath.slice(0, index + 1)
                    useDocumentsStore.setState({
                      currentFolderId: folder.id,
                      folderPath: newPath,
                    })
                  }}
                  className="hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Folder Form Modal */}
        {showFolderForm && (
          <FolderForm
            folder={editingFolder}
            parentId={currentFolderId}
            onClose={handleCloseFolderForm}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                {deleteConfirm.type === 'folder' ? 'Ordner löschen?' : 'Datei löschen?'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Möchtest du "{deleteConfirm.name}" wirklich löschen?
                {deleteConfirm.type === 'folder' && ' Alle enthaltenen Dateien werden ebenfalls gelöscht.'}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Sort Confirmation Modal */}
        {showAutoSortModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-lavender-100 dark:bg-lavender-900/30 flex items-center justify-center">
                  <Wand2 className="h-5 w-5 text-lavender-600 dark:text-lavender-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  Dateien sortieren?
                </h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {getAutoSortableFiles.total} Dateien werden automatisch in die passenden Ordner verschoben:
              </p>

              <div className="space-y-2 mb-6">
                {Object.entries(getAutoSortableFiles.byCategory).map(([category, docs]) => {
                  if (!Array.isArray(docs) || docs.length === 0) return null
                  const folderName = CATEGORY_TO_FOLDER[category]
                  const info = CATEGORY_INFO[category as FileCategory]
                  const Icon = info?.icon || File
                  return (
                    <div key={category} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <Icon className={`h-4 w-4 ${info?.color || 'text-gray-500'}`} />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {docs.length} {docs.length === 1 ? 'Datei' : 'Dateien'} → <span className="font-medium">{folderName}</span>
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAutoSortModal(false)}
                  disabled={isAutoSorting}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAutoSort}
                  disabled={isAutoSorting}
                  className="px-4 py-2 text-sm bg-lavender-500 text-white rounded-lg hover:bg-lavender-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {isAutoSorting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sortiere...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Sortieren
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drop Zone Overlay */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-40 bg-lavender-500/10 border-2 border-dashed border-lavender-500 rounded-lg flex items-center justify-center pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-lg flex items-center gap-3">
              <Upload className="h-6 w-6 text-lavender-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('documents.dropHere')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Grid Card Components
interface FolderCardProps {
  folder: FolderType
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onDrop: (e: React.DragEvent) => void
  onToggleSidebar?: () => void
}

function FolderCard({ folder, onClick, onEdit, onDelete, onDrop, onToggleSidebar }: FolderCardProps) {
  const { t: _t } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('folderId', String(folder.id))
    e.dataTransfer.effectAllowed = 'move'
  }

  const isStandardFolder = STANDARD_FOLDER_CONFIG[folder.name] !== undefined

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        setIsDragOver(false)
        onDrop(e)
      }}
      className={`relative p-2 rounded-lg border transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${
        isDragOver
          ? 'bg-lavender-50 dark:bg-lavender-900/20 border-lavender-300 dark:border-lavender-600'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
      }`}
    >
      <button onClick={onClick} className="w-full text-center">
        {(() => {
          const config = STANDARD_FOLDER_CONFIG[folder.name]
          if (config) {
            const IconComponent = config.icon
            return (
              <div className={`w-10 h-10 mx-auto mb-1.5 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                <IconComponent className={`h-5 w-5 ${config.color}`} />
              </div>
            )
          }
          return (
            <div className="w-10 h-10 mx-auto mb-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              {isDragOver ? (
                <FolderOpen className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <Folder className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
          )
        })()}
        <div className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">
          {isStandardFolder ? folder.name.slice(0, 3).toUpperCase() : folder.name}
        </div>
      </button>

      {/* Sidebar Toggle - only for non-standard folders */}
      {!isStandardFolder && onToggleSidebar && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleSidebar()
          }}
          className="absolute top-0.5 left-0.5 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title={folder.show_in_sidebar ? 'Aus Schnellzugriff entfernen' : 'Zu Schnellzugriff hinzufügen'}
        >
          {folder.show_in_sidebar ? (
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          ) : (
            <StarOff className="h-3 w-3 text-gray-400" />
          )}
        </button>
      )}

      {/* Menu Button */}
      <div className="absolute top-0.5 right-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-3 w-3 text-gray-500" />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-4 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[100px]">
              <button
                onClick={() => {
                  onEdit()
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Pencil className="h-3 w-3" />
                Bearbeiten
              </button>
              <button
                onClick={() => {
                  onDelete()
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Trash2 className="h-3 w-3" />
                Löschen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'wmv', 'flv']
const PDF_EXTENSION = 'pdf'

interface DocumentCardProps {
  document: DocumentType
  onDelete: () => void
  onOpenImage: (doc: DocumentType) => void
  onOpenVideo: (doc: DocumentType) => void
  onOpenPDF: (doc: DocumentType) => void
}

function DocumentCard({ document, onDelete, onOpenImage, onOpenVideo, onOpenPDF }: DocumentCardProps) {
  const { t: _t } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('documentId', String(document.id))
    e.dataTransfer.effectAllowed = 'move'
  }

  const fileType = document.file_type?.toLowerCase() || ''
  const isImage = IMAGE_EXTENSIONS.includes(fileType)
  const isVideo = VIDEO_EXTENSIONS.includes(fileType)
  const isPDF = fileType === PDF_EXTENSION
  const imageUrl = document.file_url.startsWith('http')
    ? document.file_url
    : `${MEDIA_BASE_URL}${document.file_url}`

  const handleDownload = () => {
    window.open(imageUrl, '_blank')
  }

  const handleDoubleClick = () => {
    if (isImage) {
      onOpenImage(document)
    } else if (isVideo) {
      onOpenVideo(document)
    } else if (isPDF) {
      onOpenPDF(document)
    } else {
      handleDownload()
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
      className="relative p-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="text-center">
        {isImage ? (
          <div className="w-16 h-16 mx-auto mb-1.5 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
            <img
              src={imageUrl}
              alt={document.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-10 h-10 mx-auto mb-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            {getFileIcon(document.file_type, false)}
          </div>
        )}
        <div className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">
          {document.name}
        </div>
        <div className="text-[10px] text-gray-500">
          {formatFileSize(document.file_size)}
        </div>
      </div>

      {/* Menu Button */}
      <div className="absolute top-0.5 right-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-3 w-3 text-gray-500" />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-4 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[100px]">
              <button
                onClick={() => {
                  handleDownload()
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Download className="h-3 w-3" />
                Download
              </button>
              <button
                onClick={() => {
                  onDelete()
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Trash2 className="h-3 w-3" />
                Löschen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// List Row Components
interface FolderRowProps {
  folder: FolderType
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onDrop: (e: React.DragEvent) => void
  onToggleSidebar?: () => void
}

function FolderRow({ folder, onClick, onEdit, onDelete, onDrop, onToggleSidebar }: FolderRowProps) {
  const { t } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('folderId', String(folder.id))
    e.dataTransfer.effectAllowed = 'move'
  }

  const isStandardFolder = STANDARD_FOLDER_CONFIG[folder.name] !== undefined

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        setIsDragOver(false)
        onDrop(e)
      }}
      className={`flex items-center justify-between p-3 rounded-lg transition-colors group border cursor-move ${
        isDragOver
          ? 'bg-lavender-50 dark:bg-lavender-900/20 border-lavender-300 dark:border-lavender-600'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
      }`}
    >
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 text-left"
      >
        {(() => {
          const config = STANDARD_FOLDER_CONFIG[folder.name]
          if (config) {
            const IconComponent = config.icon
            return (
              <div className={`w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                <IconComponent className={`h-5 w-5 ${config.color}`} />
              </div>
            )
          }
          return (
            <div className="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              {isDragOver ? (
                <FolderOpen className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <Folder className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
          )
        })()}
        <div>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {folder.name}
          </div>
          <div className="text-xs text-gray-500">{t('documents.folder')}</div>
        </div>
      </button>

      <div className="flex items-center gap-1">
        {/* Sidebar Toggle - only for non-standard folders */}
        {!isStandardFolder && onToggleSidebar && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleSidebar()
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title={folder.show_in_sidebar ? 'Aus Schnellzugriff entfernen' : 'Zu Schnellzugriff hinzufügen'}
          >
            {folder.show_in_sidebar ? (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            ) : (
              <StarOff className="h-4 w-4 text-gray-400" />
            )}
          </button>
        )}

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-500" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                <button
                  onClick={() => {
                    onEdit()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => {
                    onDelete()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface DocumentRowProps {
  document: DocumentType
  onDelete: () => void
  onOpenImage: (doc: DocumentType) => void
  onOpenVideo: (doc: DocumentType) => void
  onOpenPDF: (doc: DocumentType) => void
}

function DocumentRow({ document, onDelete, onOpenImage, onOpenVideo, onOpenPDF }: DocumentRowProps) {
  const { t } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('documentId', String(document.id))
    e.dataTransfer.effectAllowed = 'move'
  }

  const fileType = document.file_type?.toLowerCase() || ''
  const isImage = IMAGE_EXTENSIONS.includes(fileType)
  const isVideo = VIDEO_EXTENSIONS.includes(fileType)
  const isPDF = fileType === PDF_EXTENSION
  const imageUrl = document.file_url.startsWith('http')
    ? document.file_url
    : `${MEDIA_BASE_URL}${document.file_url}`

  const handleDownload = () => {
    window.open(imageUrl, '_blank')
  }

  const handleDoubleClick = () => {
    if (isImage) {
      onOpenImage(document)
    } else if (isVideo) {
      onOpenVideo(document)
    } else if (isPDF) {
      onOpenPDF(document)
    } else {
      handleDownload()
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer"
    >
      <div className="flex items-center gap-3 flex-1">
        {isImage ? (
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
            <img
              src={imageUrl}
              alt={document.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            {getFileIcon(document.file_type, false)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
            {document.name}
          </div>
          <div className="text-xs text-gray-500">
            {document.file_type.toUpperCase()} • {formatFileSize(document.file_size)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Download className="h-4 w-4 text-gray-500" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-500" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                <button
                  onClick={() => {
                    handleDownload()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('documents.download')}
                </button>
                <button
                  onClick={() => {
                    onDelete()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getFileIcon(fileType: string, large: boolean) {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  const docTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt']
  const size = large ? 'h-8 w-8' : 'h-5 w-5'

  if (imageTypes.includes(fileType.toLowerCase())) {
    return <FileImage className={`${size} text-green-600 dark:text-green-400`} />
  }
  if (docTypes.includes(fileType.toLowerCase())) {
    return <FileText className={`${size} text-red-600 dark:text-red-400`} />
  }
  return <File className={`${size} text-gray-600 dark:text-gray-400`} />
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Folder Form
interface FolderFormProps {
  folder: FolderType | null
  parentId: number | null
  onClose: () => void
}

function FolderForm({ folder, parentId, onClose }: FolderFormProps) {
  const { t } = useTranslation()
  const { createFolder, updateFolder } = useDocumentsStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState(folder?.name || '')
  const [showInSidebar, setShowInSidebar] = useState(folder?.show_in_sidebar ?? true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)

    if (folder) {
      await updateFolder(folder.id, { name, parent_id: folder.parent_id, show_in_sidebar: showInSidebar })
    } else {
      await createFolder({ name, parent_id: parentId, show_in_sidebar: showInSidebar })
    }

    setIsSubmitting(false)
    onClose()
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            {folder ? t('common.edit') : t('documents.newFolder')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('documents.folderName')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              placeholder={t('documents.folderName')}
              autoFocus
              required
            />
          </div>

          {/* Show in Sidebar Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showInSidebar}
              onChange={(e) => setShowInSidebar(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-lavender-500 focus:ring-lavender-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              In Sidebar anzeigen
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-sm bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Quick Access Sidebar
interface QuickAccessSidebarProps {
  folders: FolderType[]
  currentFolderId: number | null
  onFolderClick: (folder: FolderType | null) => void
  onDropOnFolder: (folderId: number | null, e: React.DragEvent) => void
}

function QuickAccessSidebar({
  folders,
  currentFolderId,
  onFolderClick,
  onDropOnFolder,
}: QuickAccessSidebarProps) {
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null)

  // Split into special folders and custom folders
  const specialFolders = folders.filter(f => STANDARD_FOLDER_NAMES.includes(f.name))
    .sort((a, b) => STANDARD_FOLDER_NAMES.indexOf(a.name) - STANDARD_FOLDER_NAMES.indexOf(b.name))
  const customFolders = folders.filter(f => !STANDARD_FOLDER_NAMES.includes(f.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  const renderFolder = (folder: FolderType) => {
    const isDragOver = dragOverFolderId === folder.id
    const isActive = currentFolderId === folder.id

    return (
      <button
        key={folder.id}
        onClick={() => onFolderClick(folder)}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOverFolderId(folder.id)
        }}
        onDragLeave={() => setDragOverFolderId(null)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOverFolderId(null)
          onDropOnFolder(folder.id, e)
        }}
        className={`w-full flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all ${
          isDragOver
            ? 'bg-lavender-100 dark:bg-lavender-900/30 ring-2 ring-lavender-400'
            : isActive
              ? 'bg-gray-200/70 dark:bg-gray-700/70'
              : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
        }`}
        title={folder.name}
      >
        {(() => {
          const config = STANDARD_FOLDER_CONFIG[folder.name]
          if (config) {
            const IconComponent = config.icon
            return <IconComponent className={`w-4 h-4 ${isDragOver || isActive ? 'text-lavender-500' : config.color}`} />
          }
          return <Folder className={`w-4 h-4 ${isDragOver || isActive ? 'text-lavender-500' : 'text-yellow-500'}`} />
        })()}
        <span className={`text-[8px] font-semibold mt-0.5 truncate max-w-full ${
          isActive ? 'text-lavender-500' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {folder.name.slice(0, 4)}
        </span>
      </button>
    )
  }

  return (
    <div className="w-12 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col py-2">
      {/* All Files Button */}
      <div className="px-1.5 mb-2">
        <button
          onClick={() => onFolderClick(null)}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOverFolderId(-1) // Use -1 for root
          }}
          onDragLeave={() => setDragOverFolderId(null)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOverFolderId(null)
            onDropOnFolder(null, e)
          }}
          className={`w-full flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all ${
            dragOverFolderId === -1
              ? 'bg-lavender-100 dark:bg-lavender-900/30 ring-2 ring-lavender-400'
              : currentFolderId === null
                ? 'bg-gray-200/70 dark:bg-gray-700/70'
                : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
          }`}
          title="Alle Dateien"
        >
          <Home className={`w-4 h-4 ${dragOverFolderId === -1 || currentFolderId === null ? 'text-lavender-500' : 'text-gray-500'}`} />
          <span className={`text-[8px] font-semibold mt-0.5 ${
            dragOverFolderId === -1 || currentFolderId === null ? 'text-lavender-500' : 'text-gray-500 dark:text-gray-400'
          }`}>
            Alle
          </span>
        </button>
      </div>

      {/* Divider */}
      <div className="mx-2 border-t border-gray-200 dark:border-gray-700 mb-2" />

      {/* Special Folders */}
      {specialFolders.length > 0 && (
        <div className="px-1.5 space-y-1 mb-2">
          {specialFolders.map(renderFolder)}
        </div>
      )}

      {/* Divider */}
      {specialFolders.length > 0 && customFolders.length > 0 && (
        <div className="mx-2 border-t border-gray-200 dark:border-gray-700 mb-2" />
      )}

      {/* Custom Folders */}
      {customFolders.length > 0 && (
        <div className="flex-1 overflow-y-auto px-1.5 space-y-1">
          {customFolders.map(renderFolder)}
        </div>
      )}
    </div>
  )
}
