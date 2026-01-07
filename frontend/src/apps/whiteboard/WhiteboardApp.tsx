import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import { Plus, Save, Trash2, Edit3, Check, X, FileText, ArrowLeft } from 'lucide-react'
import { useWhiteboardStore, type DiagramListItem } from '@/stores/whiteboardStore'

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
    diagrams,
    currentDiagram,
    isLoading,
    isSaving,
    fetchDiagrams,
    loadDiagram,
    createDiagram,
    saveDiagram,
    renameDiagram,
    deleteDiagram,
    setCurrentDiagram,
  } = useWhiteboardStore()

  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI>(null)
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  )
  const [view, setView] = useState<'gallery' | 'editor'>('gallery')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const saveTimeoutRef = useRef<number | null>(null)

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

  // Fetch diagrams on mount
  useEffect(() => {
    fetchDiagrams()
  }, [fetchDiagrams])

  // Auto-save with debounce
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[], appState: any, files: any) => {
      if (!currentDiagram) return

      setHasUnsavedChanges(true)

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

        await saveDiagram(currentDiagram.id, content, thumbnail)
        setHasUnsavedChanges(false)
      }, 3000)
    },
    [currentDiagram, saveDiagram]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
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
  }, [currentDiagram, excalidrawAPI, saveDiagram])

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
    await createDiagram()
    setView('editor')
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
    if (!confirm(t('whiteboard.confirmDelete', 'Diagramm wirklich löschen?'))) return

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

  // Loading state
  if (isLoading && !currentDiagram) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-pulse text-gray-500">{t('common.loading', 'Laden...')}</div>
      </div>
    )
  }

  // Gallery View
  if (view === 'gallery') {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        {/* Gallery Content */}
        <div className="flex-1 overflow-auto p-6">
          {diagrams.length === 0 && !isLoading ? (
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
              {diagrams.map((diagram) => (
                <button
                  key={diagram.id}
                  onClick={() => handleLoadDiagram(diagram)}
                  className="group flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 hover:border-lavender-400 dark:hover:border-lavender-500 hover:shadow-lg transition-all overflow-hidden bg-white dark:bg-gray-800 text-left"
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
                </button>
              ))}

              {/* Create New Card */}
              <button
                onClick={handleCreate}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-lavender-400 dark:hover:border-lavender-500 hover:bg-lavender-50 dark:hover:bg-lavender-900/10 transition-all aspect-[4/3] text-gray-400 dark:text-gray-500 hover:text-lavender-600 dark:hover:text-lavender-400"
              >
                <Plus className="w-10 h-10 mb-2" />
                <span className="text-sm font-medium">{t('whiteboard.newDiagram', 'Neu')}</span>
              </button>
            </div>
          )}
        </div>
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

        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Title / Rename */}
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

        {/* Save Button */}
        <button
          onClick={handleManualSave}
          disabled={isSaving || !hasUnsavedChanges}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            hasUnsavedChanges
              ? 'bg-gold-600 hover:bg-gold-700 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {isSaving ? t('whiteboard.saving', 'Speichert...') : t('whiteboard.save', 'Speichern')}
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDeleteDiagram}
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 transition-colors"
          title={t('whiteboard.delete', 'Löschen')}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Status indicator */}
        <div className="flex-1" />
        {isSaving && (
          <span className="text-xs text-gray-500 animate-pulse">
            {t('whiteboard.autoSaving', 'Speichert...')}
          </span>
        )}
        {hasUnsavedChanges && !isSaving && (
          <span className="text-xs text-gold-600">
            {t('whiteboard.unsaved', 'Ungespeichert')}
          </span>
        )}
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
