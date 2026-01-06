import { create } from 'zustand'

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter'
export type WidgetType = 'chart' | 'info' | 'table' | 'list'

export interface ChartDataPoint {
  name: string
  value?: number // Optional for multi-line charts that use yKeys
  [key: string]: string | number | undefined
}

export type LineStyle = 'solid' | 'dashed' | 'dotted'

export interface Widget {
  id: string
  type: WidgetType
  title: string
  data: ChartDataPoint[] | string | string[][]
  chartType?: ChartType
  xKey?: string
  yKey?: string
  // Multi-line support
  yKeys?: string[]
  lineStyles?: Record<string, LineStyle>
  color?: string
}

interface AIDashboardState {
  widgets: Widget[]
  expandedWidgetId: string | null
  addWidget: (widget: Omit<Widget, 'id'>) => string
  removeWidget: (id: string) => void
  clearWidgets: () => void
  updateWidget: (id: string, updates: Partial<Widget>) => void
  reorderWidgets: (fromIndex: number, toIndex: number) => void
  setExpandedWidget: (id: string | null) => void
}

// Helper to create a hash/fingerprint of widget content for duplicate detection
const getWidgetFingerprint = (widget: Omit<Widget, 'id'>): string => {
  const key = {
    type: widget.type,
    title: widget.title,
    chartType: widget.chartType,
    // For data comparison, stringify it (handles arrays and strings)
    data: JSON.stringify(widget.data),
  }
  return JSON.stringify(key)
}

export const useAIDashboardStore = create<AIDashboardState>((set, get) => ({
  widgets: [],
  expandedWidgetId: null,

  addWidget: (widget) => {
    const { widgets } = get()

    // Check for duplicate by comparing fingerprints
    const newFingerprint = getWidgetFingerprint(widget)
    const existingWidget = widgets.find(w => getWidgetFingerprint(w) === newFingerprint)

    if (existingWidget) {
      // Widget already exists, return existing ID
      console.log('Widget already exists, skipping duplicate:', widget.title)
      return existingWidget.id
    }

    // Create new widget
    const id = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const newWidget: Widget = { ...widget, id }
    set((state) => ({ widgets: [...state.widgets, newWidget] }))
    return id
  },

  removeWidget: (id) => {
    set((state) => ({
      widgets: state.widgets.filter((w) => w.id !== id),
      expandedWidgetId: state.expandedWidgetId === id ? null : state.expandedWidgetId,
    }))
  },

  clearWidgets: () => {
    set({ widgets: [], expandedWidgetId: null })
  },

  updateWidget: (id, updates) => {
    set((state) => ({
      widgets: state.widgets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }))
  },

  reorderWidgets: (fromIndex, toIndex) => {
    set((state) => {
      const newWidgets = [...state.widgets]
      const [movedWidget] = newWidgets.splice(fromIndex, 1)
      newWidgets.splice(toIndex, 0, movedWidget)
      return { widgets: newWidgets }
    })
  },

  setExpandedWidget: (id) => {
    set({ expandedWidgetId: id })
  },
}))
