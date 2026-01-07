import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Pin, Trash2, Palette } from 'lucide-react'
import { useNotesStore } from '@/stores/notesStore'
import { useConfirmStore } from '@/stores/confirmStore'
import type { Note, NoteColor } from '@/api/types'

const COLORS: { id: NoteColor; class: string; label: string }[] = [
  { id: 'default', class: 'bg-gray-200 dark:bg-gray-700', label: 'Default' },
  { id: 'yellow', class: 'bg-yellow-200 dark:bg-yellow-700', label: 'Gelb' },
  { id: 'green', class: 'bg-green-200 dark:bg-green-700', label: 'Grün' },
  { id: 'blue', class: 'bg-blue-200 dark:bg-blue-700', label: 'Blau' },
  { id: 'pink', class: 'bg-pink-200 dark:bg-pink-700', label: 'Pink' },
]

const NOTE_BG_COLORS: Record<NoteColor, string> = {
  default: 'bg-white dark:bg-gray-800',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20',
  green: 'bg-green-50 dark:bg-green-900/20',
  blue: 'bg-blue-50 dark:bg-blue-900/20',
  pink: 'bg-pink-50 dark:bg-pink-900/20',
}

export function NotesApp() {
  const { t } = useTranslation()
  const {
    notes,
    selectedNoteId,
    isLoading,
    searchQuery,
    fetchNotes,
    updateNote,
    deleteNote,
    togglePin,
    selectNote,
    setSearchQuery,
    getSelectedNote,
  } = useNotesStore()
  const confirm = useConfirmStore(state => state.confirm)

  const [localTitle, setLocalTitle] = useState('')
  const [localContent, setLocalContent] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)

  const selectedNote = getSelectedNote()

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when selected note changes
  useEffect(() => {
    if (selectedNote) {
      setLocalTitle(selectedNote.title)
      setLocalContent(selectedNote.content)
    } else {
      setLocalTitle('')
      setLocalContent('')
    }
  }, [selectedNote?.id])

  // Debounced auto-save
  const debouncedSave = useCallback((id: number, title: string, content: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      updateNote(id, { title, content })
    }, 500)
  }, [updateNote])

  const handleTitleChange = (value: string) => {
    setLocalTitle(value)
    if (selectedNote) {
      debouncedSave(selectedNote.id, value, localContent)
    }
  }

  const handleContentChange = (value: string) => {
    setLocalContent(value)
    if (selectedNote) {
      debouncedSave(selectedNote.id, localTitle, value)
    }
  }

  const handleDeleteNote = async (note: Note) => {
    const confirmed = await confirm({
      title: t('notes.deleteNote'),
      message: t('notes.deleteConfirm', { title: note.title || t('notes.untitled') }),
      confirmLabel: t('common.delete'),
      variant: 'danger',
    })
    if (confirmed) {
      await deleteNote(note.id)
    }
  }

  const handleColorChange = async (color: NoteColor) => {
    if (selectedNote) {
      await updateNote(selectedNote.id, { color })
    }
    setShowColorPicker(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return t('notes.minutesAgo', { count: Math.max(1, diffMins) })
    if (diffHours < 24) return t('notes.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('notes.daysAgo', { count: diffDays })
    return date.toLocaleDateString()
  }

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Notes List */}
      <div className="w-72 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('notes.search')}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-violet-500 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>
          ) : notes.length === 0 ? (
            <div className="p-4 text-center text-gray-500">{t('notes.noNotes')}</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => selectNote(note.id)}
                  className={`w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                    selectedNoteId === note.id ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {note.is_pinned && (
                      <Pin className="h-3 w-3 text-violet-500 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {note.title || t('notes.untitled')}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {note.content || t('notes.noContent')}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(note.updated_at)}
                      </div>
                    </div>
                    {note.color !== 'default' && (
                      <div className={`w-2 h-2 rounded-full ${COLORS.find(c => c.id === note.color)?.class}`} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Main Content - Note Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* Editor */}
            <div className={`flex-1 flex flex-col ${NOTE_BG_COLORS[selectedNote.color]}`}>
              <input
                type="text"
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={t('notes.titlePlaceholder')}
                className="px-6 pt-6 pb-2 text-2xl font-semibold bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
              <textarea
                value={localContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={t('notes.contentPlaceholder')}
                className="flex-1 px-6 pb-6 text-gray-700 dark:text-gray-300 bg-transparent border-0 focus:ring-0 resize-none placeholder-gray-400"
              />
            </div>

            {/* Toolbar */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2">
                {/* Color Picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title={t('notes.changeColor')}
                  >
                    <Palette className="h-5 w-5 text-gray-500" />
                  </button>
                  {showColorPicker && (
                    <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex gap-1">
                      {COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => handleColorChange(color.id)}
                          className={`w-6 h-6 rounded-full ${color.class} ${
                            selectedNote.color === color.id ? 'ring-2 ring-violet-500 ring-offset-2' : ''
                          }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Pin */}
                <button
                  onClick={() => togglePin(selectedNote.id)}
                  className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedNote.is_pinned ? 'text-violet-500' : 'text-gray-500'
                  }`}
                  title={selectedNote.is_pinned ? t('notes.unpin') : t('notes.pin')}
                >
                  <Pin className="h-5 w-5" />
                </button>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDeleteNote(selectedNote)}
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                title={t('notes.deleteNote')}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-lg">{t('notes.selectNote')}</div>
              <div className="text-sm mt-1">{t('notes.orCreateNew')}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
