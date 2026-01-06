import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import { Plus, Save, Trash2, Edit3, Check, X, FileText, ChevronDown } from 'lucide-react'
import { useWhiteboardStore, type DiagramListItem } from '@/stores/whiteboardStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import '@excalidraw/excalidraw/index.css'

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
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveTimeoutId, setSaveTimeoutId] = useState<number | null>(null)

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
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId)
      }

      // Auto-save after 3 seconds of inactivity
      const timeoutId = window.setTimeout(async () => {
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

        // Generate thumbnail
        let thumbnail = ''
        try {
          if (elements.length > 0) {
            const blob = await exportToBlob({
              elements: elements as never[],
              appState: { exportBackground: true, viewBackgroundColor: appState.viewBackgroundColor },
              files,
              maxWidthOrHeight: 200,
            })
            thumbnail = await blobToBase64(blob)
          }
        } catch {
          // Thumbnail generation failed, continue without it
        }

        await saveDiagram(currentDiagram.id, content, thumbnail)
        setHasUnsavedChanges(false)
      }, 3000)

      setSaveTimeoutId(timeoutId)
    },
    [currentDiagram, saveDiagram, saveTimeoutId]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId)
      }
    }
  }, [saveTimeoutId])

  // Manual save
  const handleManualSave = useCallback(async () => {
    if (!currentDiagram || !excalidrawAPI) return

    // Clear auto-save timeout
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId)
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

    // Generate thumbnail
    let thumbnail = ''
    try {
      if (elements.length > 0) {
        const blob = await exportToBlob({
          elements,
          appState: { exportBackground: true, viewBackgroundColor: appState.viewBackgroundColor },
          files,
          maxWidthOrHeight: 200,
        })
        thumbnail = await blobToBase64(blob)
      }
    } catch {
      // Continue without thumbnail
    }

    await saveDiagram(currentDiagram.id, content, thumbnail)
    setHasUnsavedChanges(false)
  }, [currentDiagram, excalidrawAPI, saveDiagram, saveTimeoutId])

  // Load diagram
  const handleLoadDiagram = async (diagram: DiagramListItem) => {
    if (hasUnsavedChanges) {
      await handleManualSave()
    }
    await loadDiagram(diagram.id)
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

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {/* Diagram Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors min-w-[200px]">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="flex-1 text-left truncate">
                {currentDiagram?.title || t('whiteboard.selectDiagram', 'Diagramm wählen...')}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 max-h-[300px] overflow-y-auto">
            {diagrams.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {t('whiteboard.noDiagrams', 'Keine Diagramme')}
              </div>
            ) : (
              diagrams.map((diagram) => (
                <DropdownMenuItem
                  key={diagram.id}
                  onClick={() => handleLoadDiagram(diagram)}
                  className={`flex items-center gap-2 ${
                    currentDiagram?.id === diagram.id ? 'bg-lavender-50 dark:bg-lavender-900/20' : ''
                  }`}
                >
                  {diagram.thumbnail ? (
                    <img
                      src={diagram.thumbnail}
                      alt=""
                      className="w-8 h-8 rounded object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{diagram.title}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(diagram.updated_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  {currentDiagram?.id === diagram.id && (
                    <Check className="w-4 h-4 text-lavender-500" />
                  )}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Current Diagram Actions */}
        {currentDiagram && (
          <>
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
                className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={t('whiteboard.rename', 'Umbenennen')}
              >
                <Edit3 className="w-3.5 h-3.5 text-gray-500" />
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
          </>
        )}

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
        {currentDiagram ? (
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
              },
            }}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <FileText className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg mb-4">{t('whiteboard.noDiagramSelected', 'Kein Diagramm ausgewählt')}</p>
            <button
              onClick={() => createDiagram()}
              className="flex items-center gap-2 px-4 py-2 bg-lavender-500 hover:bg-lavender-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('whiteboard.createFirst', 'Erstes Diagramm erstellen')}
            </button>
          </div>
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
