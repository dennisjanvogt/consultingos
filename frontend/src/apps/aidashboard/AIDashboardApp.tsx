import { memo, useCallback } from 'react'
import { X, BarChart3, FileText, Table2, Sparkles, Trash2, Maximize2, Minimize2, GripVertical } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAIDashboardStore, type Widget } from '@/stores/aiDashboardStore'
import { ChartWidget } from './components/ChartWidget'
import { InfoWidget } from './components/InfoWidget'
import { TableWidget } from './components/TableWidget'

// Memoized widget icon
const WidgetIcon = memo(({ type }: { type: Widget['type'] }) => {
  switch (type) {
    case 'chart':
      return <BarChart3 className="w-4 h-4 text-violet-400" />
    case 'info':
      return <FileText className="w-4 h-4 text-violet-400" />
    case 'table':
      return <Table2 className="w-4 h-4 text-violet-400" />
    default:
      return <Sparkles className="w-4 h-4 text-violet-400" />
  }
})
WidgetIcon.displayName = 'WidgetIcon'

// Memoized widget content renderer
const WidgetContent = memo(({ widget }: { widget: Widget }) => {
  switch (widget.type) {
    case 'chart':
      return <ChartWidget widget={widget} />
    case 'info':
      return <InfoWidget widget={widget} />
    case 'table':
      return <TableWidget widget={widget} />
    case 'list':
      return <InfoWidget widget={widget} />
    default:
      return null
  }
})
WidgetContent.displayName = 'WidgetContent'

// Sortable Widget Card - Optimized
const SortableWidgetCard = memo(({
  widget,
  onRemove,
  onExpand,
}: {
  widget: Widget
  onRemove: (id: string) => void
  onExpand: (id: string) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleRemove = useCallback(() => onRemove(widget.id), [onRemove, widget.id])
  const handleExpand = useCallback(() => onExpand(widget.id), [onExpand, widget.id])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl overflow-hidden flex flex-col bg-slate-900/95 border border-violet-500/30 shadow-lg shadow-violet-500/10 ${
        isDragging ? 'z-50 opacity-90 scale-[1.02] cursor-grabbing' : 'z-10'
      } transition-shadow hover:shadow-xl hover:shadow-violet-500/20`}
    >
      {/* Static gradient border glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/10 via-cyan-500/5 to-violet-500/10 pointer-events-none" />

      {/* Widget Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-violet-900/60 via-slate-900/80 to-cyan-900/40 border-b border-violet-500/30 relative z-10">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-gray-400 hover:text-violet-400 cursor-grab active:cursor-grabbing transition-colors"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <WidgetIcon type={widget.type} />
          <span className="text-sm font-medium truncate text-gray-100">{widget.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExpand}
            className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/20 rounded transition-colors"
            title="Vergrößern"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRemove}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
            title="Löschen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Widget Content */}
      <div
        className="relative z-10 p-3"
        style={{
          height: widget.type === 'chart' ? '280px' : 'auto',
          minHeight: widget.type === 'chart' ? '250px' : '150px',
          minWidth: '250px',
        }}
      >
        <WidgetContent widget={widget} />
      </div>
    </div>
  )
})
SortableWidgetCard.displayName = 'SortableWidgetCard'

// Expanded Widget Modal - Optimized (no infinite animations)
const ExpandedWidgetModal = memo(({
  widget,
  onClose,
}: {
  widget: Widget
  onClose: () => void
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl max-h-[85vh] bg-slate-900/98 rounded-2xl border border-violet-500/40 shadow-2xl shadow-violet-500/20 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-violet-900/70 via-slate-900/90 to-cyan-900/50 border-b border-violet-500/30">
          <div className="flex items-center gap-3">
            <WidgetIcon type={widget.type} />
            <span className="text-lg font-medium text-gray-100">{widget.title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className={widget.type === 'chart' ? 'h-[500px]' : 'min-h-[300px]'}>
            <WidgetContent widget={widget} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
})
ExpandedWidgetModal.displayName = 'ExpandedWidgetModal'

// Empty state - Optimized (CSS animation instead of JS)
const EmptyState = memo(() => (
  <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950">
    {/* Static background grid */}
    <div
      className="absolute inset-0 opacity-10 pointer-events-none"
      style={{
        backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
      }}
    />

    <div className="flex flex-col items-center relative z-10">
      <div className="rounded-full p-6 mb-6 bg-slate-900/80 border border-violet-500/30 shadow-lg shadow-violet-500/20">
        <Sparkles className="w-16 h-16 text-violet-400 animate-pulse-slow" />
      </div>
      <h2 className="text-xl font-medium mb-3 text-violet-300">AI Dashboard</h2>
      <p className="text-sm text-center max-w-md text-gray-400 leading-relaxed">
        Hier werden vom AI-Agenten erstellte Visualisierungen angezeigt.
        <br />
        <span className="text-violet-400/70">Frag den Agenten, dir Charts, Infos oder Tabellen zu erstellen!</span>
      </p>
    </div>
  </div>
))
EmptyState.displayName = 'EmptyState'

export function AIDashboardApp() {
  const { widgets, removeWidget, clearWidgets, reorderWidgets, expandedWidgetId, setExpandedWidget } = useAIDashboardStore()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id)
      const newIndex = widgets.findIndex((w) => w.id === over.id)
      reorderWidgets(oldIndex, newIndex)
    }
  }, [widgets, reorderWidgets])

  const expandedWidget = expandedWidgetId ? widgets.find((w) => w.id === expandedWidgetId) : null

  if (widgets.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 relative overflow-hidden">
      {/* Static background grid */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Static decorative orbs (CSS only, no JS animation) */}
      <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-cyan-500/8 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-violet-500/20 relative z-20">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <span className="font-semibold text-violet-100">AI Dashboard</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-cyan-300 border border-violet-500/30">
            {widgets.length} {widgets.length === 1 ? 'Widget' : 'Widgets'}
          </span>
        </div>
        <button
          onClick={clearWidgets}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Alle löschen
        </button>
      </div>

      {/* Widget Grid with DnD */}
      <div className="flex-1 overflow-auto p-5 relative z-10">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {widgets.map((widget) => (
                  <SortableWidgetCard
                    key={widget.id}
                    widget={widget}
                    onRemove={removeWidget}
                    onExpand={setExpandedWidget}
                  />
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Expanded Widget Modal */}
      <AnimatePresence>
        {expandedWidget && (
          <ExpandedWidgetModal
            widget={expandedWidget}
            onClose={() => setExpandedWidget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
