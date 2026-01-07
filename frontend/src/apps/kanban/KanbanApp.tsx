import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, MoreHorizontal, Calendar, Trash2, X } from 'lucide-react'
import { useKanbanStore } from '@/stores/kanbanStore'
import { useConfirmStore } from '@/stores/confirmStore'
import type { KanbanCard, KanbanColumn, KanbanColor, KanbanPriority } from '@/api/types'

const COLUMNS: { id: KanbanColumn; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To-Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'done', label: 'Done' },
]

const COLORS: { id: KanbanColor; class: string }[] = [
  { id: 'gray', class: 'bg-gray-400' },
  { id: 'violet', class: 'bg-lavender-500' },
  { id: 'green', class: 'bg-green-500' },
  { id: 'yellow', class: 'bg-gold-500' },
  { id: 'red', class: 'bg-red-500' },
  { id: 'purple', class: 'bg-purple-500' },
  { id: 'pink', class: 'bg-pink-500' },
  { id: 'orange', class: 'bg-orange-500' },
]

const PRIORITY_COLORS: Record<KanbanPriority, string> = {
  low: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function KanbanApp() {
  const { t } = useTranslation()
  const {
    cards,
    activeBoard,
    isLoading,
    fetchCards,
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    getCardsForColumn,
  } = useKanbanStore()
  const confirm = useConfirmStore(state => state.confirm)

  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null)
  const [newCardColumn, setNewCardColumn] = useState<KanbanColumn | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null)

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  // Native HTML5 Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, cardId: number) => {
    setDraggedCardId(cardId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(cardId))
  }

  const handleDragEnd = () => {
    setDraggedCardId(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, columnId: KanbanColumn) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget?.closest('[data-column]')) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetColumn: KanbanColumn) => {
    e.preventDefault()
    setDragOverColumn(null)
    setDraggedCardId(null)

    const cardId = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (isNaN(cardId)) return

    const card = cards.find((c) => c.id === cardId)
    if (!card) return

    // Only move if column changed
    if (card.column !== targetColumn) {
      const columnCards = getCardsForColumn(targetColumn)
      await moveCard(cardId, {
        board: activeBoard,
        column: targetColumn,
        position: columnCards.length,
      })
    }
  }

  const handleAddCard = async (column: KanbanColumn) => {
    if (!newCardTitle.trim()) return

    await createCard({
      title: newCardTitle.trim(),
      column,
      board: activeBoard,
    })

    setNewCardTitle('')
    setNewCardColumn(null)
  }

  const handleUpdateCard = async () => {
    if (!editingCard) return

    await updateCard(editingCard.id, {
      title: editingCard.title,
      description: editingCard.description,
      priority: editingCard.priority,
      color: editingCard.color,
      due_date: editingCard.due_date,
    })

    setEditingCard(null)
  }

  const handleDeleteCard = async (id: number) => {
    const confirmed = await confirm({
      title: t('kanban.deleteCard', 'Karte löschen'),
      message: t('kanban.confirmDelete', 'Karte wirklich löschen?'),
      confirmLabel: t('common.delete', 'Löschen'),
      variant: 'danger',
    })
    if (confirmed) {
      await deleteCard(id)
      setEditingCard(null)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {t('common.loading')}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Column Headers */}
            <div className="flex gap-3 mb-2 shrink-0">
              {COLUMNS.map((column) => (
                <div key={column.id} className="flex-1 min-w-[160px] flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t(`kanban.columns.${column.id}`, column.label)}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                      {getCardsForColumn(column.id).length}
                    </span>
                  </div>
                  <button
                    onClick={() => setNewCardColumn(column.id)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Columns */}
            <div className="flex gap-3 flex-1 min-h-0">
              {COLUMNS.map((column) => (
                <KanbanColumnComponent
                  key={column.id}
                  column={column}
                  cards={getCardsForColumn(column.id)}
                  onEditCard={setEditingCard}
                  isAddingCard={newCardColumn === column.id}
                  newCardTitle={newCardTitle}
                  onNewCardTitleChange={setNewCardTitle}
                  onSubmitNewCard={() => handleAddCard(column.id)}
                  onCancelNewCard={() => {
                    setNewCardColumn(null)
                    setNewCardTitle('')
                  }}
                  isDragOver={dragOverColumn === column.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  draggedCardId={draggedCardId}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEditingCard(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Color bar */}
            <div className={`h-2 ${COLORS.find((c) => c.id === editingCard.color)?.class || 'bg-gray-400'}`} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('kanban.editCard', 'Edit Card')}</h3>
              <button
                onClick={() => setEditingCard(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <div className="px-5 pb-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {t('kanban.title', 'Title')}
                </label>
                <input
                  type="text"
                  value={editingCard.title}
                  onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-lavender-500 transition-shadow"
                  placeholder="Card title..."
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {t('kanban.description', 'Description')}
                </label>
                <textarea
                  value={editingCard.description}
                  onChange={(e) => setEditingCard({ ...editingCard, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-lavender-500 transition-shadow resize-none"
                  placeholder="Add a description..."
                />
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    {t('kanban.priority', 'Priority')}
                  </label>
                  <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setEditingCard({ ...editingCard, priority: p })}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                          editingCard.priority === p
                            ? p === 'high'
                              ? 'bg-red-500 text-white'
                              : p === 'medium'
                                ? 'bg-gold-500 text-white'
                                : 'bg-gray-500 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {t(`kanban.priorities.${p}`, p)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    {t('kanban.dueDate', 'Due Date')}
                  </label>
                  <input
                    type="date"
                    value={editingCard.due_date || ''}
                    onChange={(e) => setEditingCard({ ...editingCard, due_date: e.target.value || null })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border-0 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-lavender-500 transition-shadow"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  {t('kanban.color', 'Color')}
                </label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setEditingCard({ ...editingCard, color: color.id })}
                      className={`w-8 h-8 rounded-full ${color.class} transition-transform hover:scale-110 ${
                        editingCard.color === color.id
                          ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-gray-900 dark:ring-white scale-110'
                          : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => handleDeleteCard(editingCard.id)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCard(null)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleUpdateCard}
                  className="px-4 py-2 text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface KanbanColumnProps {
  column: { id: KanbanColumn; label: string }
  cards: KanbanCard[]
  onEditCard: (card: KanbanCard) => void
  isAddingCard: boolean
  newCardTitle: string
  onNewCardTitleChange: (value: string) => void
  onSubmitNewCard: () => void
  onCancelNewCard: () => void
  isDragOver: boolean
  onDragStart: (e: React.DragEvent, cardId: number) => void
  onDragEnd: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent, columnId: KanbanColumn) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, columnId: KanbanColumn) => void
  draggedCardId: number | null
}

function KanbanColumnComponent({
  column,
  cards,
  onEditCard,
  isAddingCard,
  newCardTitle,
  onNewCardTitleChange,
  onSubmitNewCard,
  onCancelNewCard,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  draggedCardId,
}: KanbanColumnProps) {
  const { t } = useTranslation()

  return (
    <div
      data-column={column.id}
      className={`flex-1 min-w-[160px] flex flex-col rounded-xl transition-colors p-2 ${
        isDragOver
          ? 'bg-lavender-100 dark:bg-lavender-900/30 ring-2 ring-lavender-400 ring-inset'
          : 'bg-gray-100 dark:bg-gray-800/50'
      }`}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto min-h-[100px]">
        {cards.map((card) => (
          <KanbanCardComponent
            key={card.id}
            card={card}
            onEdit={onEditCard}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggedCardId === card.id}
          />
        ))}

        {/* New Card Input */}
        {isAddingCard && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
            <input
              type="text"
              value={newCardTitle}
              onChange={(e) => onNewCardTitleChange(e.target.value)}
              placeholder={t('kanban.newCardPlaceholder', 'Enter card title...')}
              className="w-full px-2 py-1 text-sm bg-transparent border-none outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmitNewCard()
                if (e.key === 'Escape') onCancelNewCard()
              }}
            />
            <div className="flex gap-1 mt-2">
              <button
                onClick={onSubmitNewCard}
                className="flex-1 px-2 py-1 text-xs bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded"
              >
                {t('common.add')}
              </button>
              <button
                onClick={onCancelNewCard}
                className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface KanbanCardComponentProps {
  card: KanbanCard
  onEdit: (card: KanbanCard) => void
  onDragStart: (e: React.DragEvent, cardId: number) => void
  onDragEnd: (e: React.DragEvent) => void
  isDragging: boolean
}

function KanbanCardComponent({ card, onEdit, onDragStart, onDragEnd, isDragging }: KanbanCardComponentProps) {
  const colorClass = COLORS.find((c) => c.id === card.color)?.class || 'bg-gray-400'

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onDragEnd={onDragEnd}
      className={`group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
      }`}
    >
      {/* Color bar */}
      <div className={`h-1 ${colorClass}`} />

      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{card.title}</p>
            {card.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(card)
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[card.priority]}`}>
            {card.priority}
          </span>

          {card.due_date && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <Calendar className="w-3 h-3" />
              {new Date(card.due_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
