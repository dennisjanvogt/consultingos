import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Trash2, Edit2, Sparkles, Loader2 } from 'lucide-react'
import { useAIStore } from '@/stores/aiStore'
import { HelperForm } from './HelperForm'
import type { AIHelper } from '@/api/types'

interface HelperDialogProps {
  open: boolean
  onClose: () => void
}

export function HelperDialog({ open, onClose }: HelperDialogProps) {
  const [editingHelper, setEditingHelper] = useState<AIHelper | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatingWithAI, setIsCreatingWithAI] = useState(false)

  const { helpers, deleteHelper, isLoadingHelpers } = useAIStore()

  // ESC key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !editingHelper && !isCreating && !isCreatingWithAI) {
      onClose()
    }
  }, [onClose, editingHelper, isCreating, isCreatingWithAI])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  const handleDelete = async (id: number) => {
    if (confirm('Helfer wirklich löschen?')) {
      await deleteHelper(id)
    }
  }

  const handleCloseForm = () => {
    setEditingHelper(null)
    setIsCreating(false)
    setIsCreatingWithAI(false)
  }

  // Show form if editing or creating
  if (editingHelper || isCreating || isCreatingWithAI) {
    return (
      <HelperForm
        helper={editingHelper}
        isAIAssisted={isCreatingWithAI}
        onClose={handleCloseForm}
        onSave={handleCloseForm}
      />
    )
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="fixed top-8 bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Helfer verwalten</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingHelpers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : helpers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Noch keine Helfer erstellt.</p>
              <p className="text-sm mt-1">Erstelle deinen ersten Helfer!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {helpers.map((helper) => (
                <div
                  key={helper.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group"
                >
                  <span className="text-2xl">{helper.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{helper.name}</span>
                      {helper.is_default && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">
                          Standard
                        </span>
                      )}
                    </div>
                    {helper.description && (
                      <p className="text-sm text-gray-500 truncate">{helper.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {helper.enabled_tools.length === 0
                        ? 'Alle Tools'
                        : `${helper.enabled_tools.length} Tools`}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingHelper(helper)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Bearbeiten"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!helper.is_default && (
                      <button
                        onClick={() => handleDelete(helper.id)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsCreating(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Manuell erstellen
          </button>
          <button
            onClick={() => setIsCreatingWithAI(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Mit AI erstellen
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
