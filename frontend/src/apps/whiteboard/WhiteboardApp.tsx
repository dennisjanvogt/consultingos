import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import { Plus, Trash2, Edit3, Check, X, FileText, ArrowLeft, Folder, FolderPlus, Sparkles } from 'lucide-react'
import { useWhiteboardStore, type DiagramListItem, type WhiteboardProject } from '@/stores/whiteboardStore'
import { useConfirmStore } from '@/stores/confirmStore'
import { architectureLibraryItems } from './architectureLibrary'
import { MermaidGeneratorDialog } from './MermaidGeneratorDialog'

import '@excalidraw/excalidraw/index.css'

// Hide Excalidraw branding elements and move help to right
const excalidrawStyles = `
  .excalidraw .welcome-screen-center,
  .excalidraw .welcome-screen-decor,
  .excalidraw [href*="twitter.com"],
  .excalidraw [href*="x.com"],
  .excalidraw [href*="github.com/excalidraw"],
  .excalidraw [href*="discord"],
  .excalidraw .MainMenu__socials,
  .excalidraw .HelpDialog__header:has([href]),
  .excalidraw .HelpDialog a[href*="excalidraw"],
  .excalidraw [class*="socials"],
  .excalidraw .help-icon__heading:has(a) {
    display: none !important;
  }

  /* Move help button to right side */
  .excalidraw .HelpButton {
    left: auto !important;
    right: 12px !important;
  }
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPI = any

export default function WhiteboardApp() {
  const { t } = useTranslation()
  const {
    projects,
    diagrams,
    currentDiagram,
    currentProjectId,
    view,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    fetchProjects,
    createProject,
    renameProject,
    deleteProject,
    setCurrentProjectId,
    fetchDiagrams,
    loadDiagram,
    createDiagram,
    saveDiagram,
    renameDiagram,
    moveDiagram,
    deleteDiagram,
    setCurrentDiagram,
    setView,
    setHasUnsavedChanges,
  } = useWhiteboardStore()

  const confirm = useConfirmStore(state => state.confirm)

  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI>(null)
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  )
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [renamingProjectId, setRenamingProjectId] = useState<number | null>(null)
  const [projectRenameValue, setProjectRenameValue] = useState('')
  const [draggingDiagramId, setDraggingDiagramId] = useState<number | null>(null)
  const [dropTargetProjectId, setDropTargetProjectId] = useState<number | null>(null)
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  const [aiDialogMode, setAIDialogMode] = useState<'create' | 'insert'>('create')
  const saveTimeoutRef = useRef<number | null>(null)
  const handleManualSaveRef = useRef<(() => Promise<void>) | null>(null)

  // Inject custom styles to hide Excalidraw branding
  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.textContent = excalidrawStyles
    document.head.appendChild(styleElement)
    return () => styleElement.remove()
  }, [])

  // Watch for dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Fetch projects and diagrams on mount
  useEffect(() => {
    fetchProjects()
    fetchDiagrams()
  }, [fetchProjects, fetchDiagrams])

  // Refetch diagrams when project changes
  useEffect(() => {
    if (currentProjectId !== null) {
      fetchDiagrams(currentProjectId)
    } else {
      fetchDiagrams()
    }
  }, [currentProjectId, fetchDiagrams])

  // ESC key to go back (instead of closing app)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // In editor view: go back to gallery
        if (view === 'editor') {
          e.preventDefault()
          e.stopPropagation()
          setView('gallery')
          return
        }
        // In gallery view with project open: go back to root
        if (view === 'gallery' && currentProjectId !== null) {
          e.preventDefault()
          e.stopPropagation()
          setCurrentProjectId(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [view, currentProjectId, setCurrentProjectId, setView])

  // Auto-save with debounce - use ref to avoid re-creating callback
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[], appState: any, files: any) => {
      const diagram = useWhiteboardStore.getState().currentDiagram
      if (!diagram) return

      // Only update if not already marked as unsaved (prevents re-render loop)
      if (!useWhiteboardStore.getState().hasUnsavedChanges) {
        useWhiteboardStore.getState().setHasUnsavedChanges(true)
      }

      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Auto-save after 3 seconds of inactivity
      saveTimeoutRef.current = window.setTimeout(async () => {
        const content = {
          elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
            zoom: appState.zoom,
          },
          files,
        }

        // Generate thumbnail (larger size, zoomed out, respect dark mode)
        let thumbnail = ''
        try {
          if (elements.length > 0) {
            const isDark = document.documentElement.classList.contains('dark')
            const blob = await exportToBlob({
              elements: elements as never[],
              appState: {
                exportBackground: true,
                viewBackgroundColor: isDark ? '#1f2937' : '#ffffff',
              },
              files,
              maxWidthOrHeight: 1000,
              exportPadding: 400,
            })
            thumbnail = await blobToBase64(blob)
          }
        } catch {
          // Thumbnail generation failed, continue without it
        }

        await saveDiagram(diagram.id, content, thumbnail)
        useWhiteboardStore.getState().setHasUnsavedChanges(false)
      }, 3000)
    },
    [saveDiagram]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Listen for save event from title bar button
  useEffect(() => {
    const handleSaveEvent = () => {
      handleManualSaveRef.current?.()
    }
    window.addEventListener('whiteboard-save', handleSaveEvent)
    return () => window.removeEventListener('whiteboard-save', handleSaveEvent)
  }, [])

  // Manual save
  const handleManualSave = useCallback(async () => {
    if (!currentDiagram || !excalidrawAPI) return

    // Clear auto-save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    const elements = excalidrawAPI.getSceneElements()
    const appState = excalidrawAPI.getAppState()
    const files = excalidrawAPI.getFiles()

    const content = {
      elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom,
      },
      files,
    }

    // Generate thumbnail (larger size, zoomed out, respect dark mode)
    let thumbnail = ''
    try {
      if (elements.length > 0) {
        const isDark = document.documentElement.classList.contains('dark')
        const blob = await exportToBlob({
          elements,
          appState: {
            exportBackground: true,
            viewBackgroundColor: isDark ? '#1f2937' : '#ffffff',
          },
          files,
          maxWidthOrHeight: 1000,
          exportPadding: 400,
        })
        thumbnail = await blobToBase64(blob)
      }
    } catch {
      // Continue without thumbnail
    }

    await saveDiagram(currentDiagram.id, content, thumbnail)
    setHasUnsavedChanges(false)
  }, [currentDiagram, excalidrawAPI, saveDiagram, setHasUnsavedChanges])

  // Keep ref updated for event listener
  useEffect(() => {
    handleManualSaveRef.current = handleManualSave
  }, [handleManualSave])

  // Load architecture library when API is ready
  useEffect(() => {
    if (!excalidrawAPI) return

    excalidrawAPI.updateLibrary({
      libraryItems: architectureLibraryItems,
      merge: true,
      openLibraryMenu: false,
      defaultStatus: 'published',
    })
  }, [excalidrawAPI])

  // Load diagram
  const handleLoadDiagram = async (diagram: DiagramListItem) => {
    if (hasUnsavedChanges) {
      await handleManualSave()
    }
    await loadDiagram(diagram.id)
    setHasUnsavedChanges(false)
    setView('editor')
  }

  // Create new diagram and open editor
  const handleCreate = async () => {
    if (hasUnsavedChanges) {
      await handleManualSave()
    }
    await createDiagram(undefined, currentProjectId)
    setView('editor')
  }

  // Create new project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    await createProject(newProjectName.trim())
    setNewProjectName('')
    setIsCreatingProject(false)
  }

  // Open project folder
  const handleOpenProject = (project: WhiteboardProject) => {
    setCurrentProjectId(project.id)
  }

  // Go back to root
  const handleBackToRoot = () => {
    setCurrentProjectId(null)
  }

  // Start renaming project
  const handleStartProjectRename = (project: WhiteboardProject) => {
    setRenamingProjectId(project.id)
    setProjectRenameValue(project.name)
  }

  // Confirm project rename
  const handleConfirmProjectRename = async () => {
    if (!renamingProjectId || !projectRenameValue.trim()) return
    await renameProject(renamingProjectId, projectRenameValue.trim())
    setRenamingProjectId(null)
    setProjectRenameValue('')
  }

  // Delete project
  const handleDeleteProject = async (projectId: number) => {
    const confirmed = await confirm({
      title: t('whiteboard.deleteProject', 'Projekt löschen'),
      message: t('whiteboard.confirmDeleteProject', 'Projekt wirklich löschen? Diagramme werden nicht gelöscht.'),
      confirmLabel: t('common.delete', 'Löschen'),
      variant: 'danger',
    })
    if (!confirmed) return
    await deleteProject(projectId)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, diagramId: number) => {
    setDraggingDiagramId(diagramId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', diagramId.toString())
  }

  const handleDragEnd = () => {
    setDraggingDiagramId(null)
    setDropTargetProjectId(null)
  }

  const handleDragOver = (e: React.DragEvent, projectId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetProjectId(projectId)
  }

  const handleDragLeave = () => {
    setDropTargetProjectId(null)
  }

  const handleDrop = async (e: React.DragEvent, projectId: number | null) => {
    e.preventDefault()
    const diagramId = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (diagramId && !isNaN(diagramId)) {
      await moveDiagram(diagramId, projectId)
      // Refetch to update the view
      fetchDiagrams(currentProjectId ?? undefined)
    }
    setDraggingDiagramId(null)
    setDropTargetProjectId(null)
  }

  // Special handlers for "root" drop zone (moving out of folder)
  const [isDropTargetRoot, setIsDropTargetRoot] = useState(false)

  const handleDragOverRoot = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDropTargetRoot(true)
  }

  const handleDragLeaveRoot = () => {
    setIsDropTargetRoot(false)
  }

  const handleDropRoot = async (e: React.DragEvent) => {
    e.preventDefault()
    const diagramId = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (diagramId && !isNaN(diagramId)) {
      await moveDiagram(diagramId, null)
      // Refetch current project to update the view
      fetchDiagrams(currentProjectId ?? undefined)
    }
    setDraggingDiagramId(null)
    setIsDropTargetRoot(false)
  }

  // Go back to gallery
  const handleBackToGallery = async () => {
    if (hasUnsavedChanges) {
      await handleManualSave()
    }
    setCurrentDiagram(null)
    setView('gallery')
    setHasUnsavedChanges(false)
  }

  // Delete diagram
  const handleDeleteDiagram = async () => {
    if (!currentDiagram) return
    const confirmed = await confirm({
      title: t('whiteboard.deleteDiagram', 'Diagramm löschen'),
      message: t('whiteboard.confirmDelete', 'Diagramm wirklich löschen?'),
      confirmLabel: t('common.delete', 'Löschen'),
      variant: 'danger',
    })
    if (!confirmed) return

    const success = await deleteDiagram(currentDiagram.id)
    if (success) {
      setCurrentDiagram(null)
      setHasUnsavedChanges(false)
      setView('gallery')
    }
  }

  // Rename
  const handleStartRename = () => {
    if (!currentDiagram) return
    setRenameValue(currentDiagram.title)
    setIsRenaming(true)
  }

  const handleConfirmRename = async () => {
    if (!currentDiagram || !renameValue.trim()) return
    await renameDiagram(currentDiagram.id, renameValue.trim())
    setIsRenaming(false)
  }

  const handleCancelRename = () => {
    setIsRenaming(false)
    setRenameValue('')
  }

  // AI diagram generation handlers
  const handleOpenAIDialog = (mode: 'create' | 'insert') => {
    setAIDialogMode(mode)
    setIsAIDialogOpen(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAIGenerated = async (elements: any[]) => {
    if (aiDialogMode === 'create') {
      // Create new diagram with generated elements
      const diagram = await createDiagram(undefined, currentProjectId)
      if (diagram) {
        // Load the diagram and then update it with elements
        await loadDiagram(diagram.id)
        // Wait for excalidraw to initialize then add elements
        setTimeout(() => {
          const api = excalidrawAPI
          if (api) {
            api.updateScene({ elements })
            api.scrollToContent(elements, { fitToContent: true })
          }
        }, 100)
      }
    } else {
      // Insert elements into current diagram
      if (excalidrawAPI) {
        const existingElements = excalidrawAPI.getSceneElements()
        // Offset new elements so they don't overlap
        const offsetElements = elements.map((el: { x: number; y: number }) => ({
          ...el,
          x: el.x + 100,
          y: el.y + 100,
        }))
        excalidrawAPI.updateScene({ elements: [...existingElements, ...offsetElements] })
        excalidrawAPI.scrollToContent(offsetElements, { fitToContent: true })
      }
    }
  }

  // Loading state
  if (isLoading && !currentDiagram) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-pulse text-gray-500">{t('common.loading', 'Laden...')}</div>
      </div>
    )
  }

  // Get current project name for breadcrumb
  const currentProject = projects.find(p => p.id === currentProjectId)

  // Filter diagrams for current view
  const visibleDiagrams = currentProjectId !== null
    ? diagrams.filter(d => d.project_id === currentProjectId)
    : diagrams.filter(d => d.project_id === null)

  // Gallery View
  if (view === 'gallery') {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        {/* Breadcrumb / Header */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          {currentProjectId !== null ? (
            <>
              <button
                onClick={handleBackToRoot}
                onDragOver={handleDragOverRoot}
                onDragLeave={handleDragLeaveRoot}
                onDrop={handleDropRoot}
                className={`text-sm transition-all px-2 py-1 -mx-2 -my-1 rounded ${
                  isDropTargetRoot
                    ? 'bg-lavender-100 dark:bg-lavender-900/30 text-lavender-700 dark:text-lavender-300 ring-2 ring-lavender-500'
                    : 'text-lavender-600 dark:text-lavender-400 hover:underline'
                }`}
              >
                {t('whiteboard.allDiagrams', 'Alle Diagramme')}
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {currentProject?.name}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('whiteboard.allDiagrams', 'Alle Diagramme')}
            </span>
          )}
        </div>

        {/* Gallery Content */}
        <div className="flex-1 overflow-auto p-6">
          {projects.length === 0 && visibleDiagrams.length === 0 && !isLoading ? (
            // Empty state
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <FileText className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg mb-4">{t('whiteboard.noDiagrams', 'Keine Diagramme')}</p>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-lavender-500 hover:bg-lavender-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t('whiteboard.createFirst', 'Erstes Diagramm erstellen')}
              </button>
            </div>
          ) : (
            // Gallery grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {/* Project Folders (only show at root level) */}
              {currentProjectId === null && projects.map((project) => (
                <div
                  key={`project-${project.id}`}
                  className={`group flex flex-col rounded-xl border transition-all overflow-hidden bg-white dark:bg-gray-800 ${
                    dropTargetProjectId === project.id
                      ? 'border-lavender-500 dark:border-lavender-400 ring-2 ring-lavender-500/50 scale-105 shadow-xl'
                      : 'border-gray-200 dark:border-gray-700 hover:border-lavender-400 dark:hover:border-lavender-500 hover:shadow-lg'
                  }`}
                  onDragOver={(e) => handleDragOver(e, project.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, project.id)}
                >
                  {/* Folder Icon */}
                  <button
                    onClick={() => handleOpenProject(project)}
                    className={`aspect-[4/3] flex items-center justify-center ${
                      dropTargetProjectId === project.id
                        ? 'bg-gradient-to-br from-lavender-100 to-lavender-200 dark:from-lavender-900/30 dark:to-lavender-800/30'
                        : 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30'
                    }`}
                  >
                    <Folder className={`w-16 h-16 ${
                      dropTargetProjectId === project.id
                        ? 'text-lavender-500 dark:text-lavender-400'
                        : 'text-amber-500 dark:text-amber-400'
                    }`} />
                  </button>
                  {/* Info */}
                  <div className="p-3 flex items-center gap-2">
                    {renamingProjectId === project.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={projectRenameValue}
                          onChange={(e) => setProjectRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmProjectRename()
                            if (e.key === 'Escape') setRenamingProjectId(null)
                          }}
                          className="flex-1 px-2 py-0.5 text-sm border border-lavender-500 rounded focus:outline-none focus:ring-1 focus:ring-lavender-500 bg-white dark:bg-gray-700"
                          autoFocus
                        />
                        <button
                          onClick={handleConfirmProjectRename}
                          className="p-0.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRenamingProjectId(null)}
                          className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                            {project.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {project.diagram_count} {project.diagram_count === 1 ? 'Diagramm' : 'Diagramme'}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartProjectRename(project)
                            }}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteProject(project.id)
                            }}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Diagrams */}
              {visibleDiagrams.map((diagram) => (
                <div
                  key={diagram.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, diagram.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleLoadDiagram(diagram)}
                  className={`group flex flex-col rounded-xl border transition-all overflow-hidden bg-white dark:bg-gray-800 text-left cursor-pointer ${
                    draggingDiagramId === diagram.id
                      ? 'opacity-50 scale-95 border-lavender-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-lavender-400 dark:hover:border-lavender-500 hover:shadow-lg'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    {diagram.thumbnail ? (
                      <img
                        src={diagram.thumbnail}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                      {diagram.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(diagram.updated_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              ))}

              {/* Create New Project Card (only at root) */}
              {currentProjectId === null && (
                isCreatingProject ? (
                  <div className="flex flex-col rounded-xl border-2 border-dashed border-lavender-400 dark:border-lavender-500 bg-lavender-50 dark:bg-lavender-900/10 aspect-[4/3] p-4">
                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                      <FolderPlus className="w-8 h-8 text-lavender-500" />
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateProject()
                          if (e.key === 'Escape') {
                            setIsCreatingProject(false)
                            setNewProjectName('')
                          }
                        }}
                        placeholder={t('whiteboard.projectName', 'Projektname')}
                        className="w-full px-2 py-1 text-sm border border-lavender-300 rounded focus:outline-none focus:ring-2 focus:ring-lavender-500 bg-white dark:bg-gray-800"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          setIsCreatingProject(false)
                          setNewProjectName('')
                        }}
                        className="flex-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {t('common.cancel', 'Abbrechen')}
                      </button>
                      <button
                        onClick={handleCreateProject}
                        className="flex-1 px-2 py-1 text-xs bg-lavender-500 hover:bg-lavender-600 text-white rounded"
                      >
                        {t('common.create', 'Erstellen')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreatingProject(true)}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all aspect-[4/3] text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400"
                  >
                    <FolderPlus className="w-10 h-10 mb-2" />
                    <span className="text-sm font-medium">{t('whiteboard.newProject', 'Neues Projekt')}</span>
                  </button>
                )
              )}

              {/* Create New Diagram Card */}
              <button
                onClick={handleCreate}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-lavender-400 dark:hover:border-lavender-500 hover:bg-lavender-50 dark:hover:bg-lavender-900/10 transition-all aspect-[4/3] text-gray-400 dark:text-gray-500 hover:text-lavender-600 dark:hover:text-lavender-400"
              >
                <Plus className="w-10 h-10 mb-2" />
                <span className="text-sm font-medium">{t('whiteboard.newDiagram', 'Neues Diagramm')}</span>
              </button>

              {/* Create with AI Card */}
              <button
                onClick={() => handleOpenAIDialog('create')}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all aspect-[4/3] text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400"
              >
                <Sparkles className="w-10 h-10 mb-2" />
                <span className="text-sm font-medium">{t('whiteboard.createWithAI', 'Mit AI erstellen')}</span>
              </button>
            </div>
          )}
        </div>

        {/* AI Mermaid Generator Dialog */}
        <MermaidGeneratorDialog
          open={isAIDialogOpen}
          onClose={() => setIsAIDialogOpen(false)}
          onGenerated={handleAIGenerated}
          mode={aiDialogMode}
        />
      </div>
    )
  }

  // Editor View
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {/* Back Button */}
        <button
          onClick={handleBackToGallery}
          className="flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back', 'Zurück')}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Title / Rename - Right side */}
        {isRenaming ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmRename()
                if (e.key === 'Escape') handleCancelRename()
              }}
              className="px-2 py-1 text-sm border border-lavender-500 rounded focus:outline-none focus:ring-1 focus:ring-lavender-500 bg-white dark:bg-gray-700"
              autoFocus
            />
            <button
              onClick={handleConfirmRename}
              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelRename}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartRename}
            className="flex items-center gap-1.5 px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('whiteboard.rename', 'Umbenennen')}
          >
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {currentDiagram?.title}
            </span>
            <Edit3 className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}

        {/* AI Insert Button */}
        <button
          onClick={() => handleOpenAIDialog('insert')}
          className="p-1.5 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 text-gray-500 hover:text-violet-600 transition-colors"
          title={t('whiteboard.insertWithAI', 'Mit AI einfügen')}
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDeleteDiagram}
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 transition-colors"
          title={t('whiteboard.delete', 'Löschen')}
        >
          <Trash2 className="w-4 h-4" />
        </button>

      </div>

      {/* Excalidraw Canvas */}
      <div className="flex-1 relative">
        {currentDiagram && (
          <Excalidraw
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            initialData={{
              elements: (currentDiagram.content as { elements?: never[] })?.elements || [],
              appState: {
                ...(currentDiagram.content as { appState?: Record<string, unknown> })?.appState,
                theme: isDarkMode ? 'dark' : 'light',
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              files: (currentDiagram.content as any)?.files,
            }}
            onChange={handleChange}
            theme={isDarkMode ? 'dark' : 'light'}
            langCode="de-DE"
            UIOptions={{
              canvasActions: {
                loadScene: false,
                saveToActiveFile: false,
                toggleTheme: false,
                export: false,
              },
              tools: {
                image: true,
              },
              welcomeScreen: false,
            }}
          />
        )}
      </div>

      {/* AI Mermaid Generator Dialog */}
      <MermaidGeneratorDialog
        open={isAIDialogOpen}
        onClose={() => setIsAIDialogOpen(false)}
        onGenerated={handleAIGenerated}
        mode={aiDialogMode}
      />
    </div>
  )
}

// Helper function to convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
