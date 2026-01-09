import { useTranslation } from 'react-i18next'
import { History, Undo2, Redo2 } from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'

export function HistoryPanel() {
  const { t } = useTranslation()
  const { history, historyIndex, undo, redo } = useImageEditorStore()

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <div className="p-3 space-y-3">
      {/* Undo/Redo Buttons */}
      <div className="flex gap-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-gray-700 rounded text-sm transition-colors"
          title={t('imageeditor.undo')}
        >
          <Undo2 className="w-4 h-4" />
          {t('imageeditor.undo')}
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-gray-700 rounded text-sm transition-colors"
          title={t('imageeditor.redo')}
        >
          <Redo2 className="w-4 h-4" />
          {t('imageeditor.redo')}
        </button>
      </div>

      {/* History List */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <History className="w-3 h-3" />
          <span>{t('imageeditor.history')}</span>
          <span className="text-gray-500">({history.length})</span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">
            {t('imageeditor.noHistory')}
          </p>
        ) : (
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                  index === historyIndex
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                    : index < historyIndex
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-800/50 text-gray-500'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    index === historyIndex
                      ? 'bg-violet-400'
                      : index < historyIndex
                      ? 'bg-gray-500'
                      : 'bg-gray-600'
                  }`}
                />
                <span className="truncate flex-1">{entry.name}</span>
                <span className="text-[10px] text-gray-500">
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <p className="text-[10px] text-gray-500 text-center">
        Cmd/Ctrl+Z: Undo • Cmd/Ctrl+Shift+Z: Redo
      </p>
    </div>
  )
}
