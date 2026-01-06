import { ChartWidget } from '@/apps/aidashboard/components/ChartWidget'
import { TableWidget } from '@/apps/aidashboard/components/TableWidget'
import { InfoWidget } from '@/apps/aidashboard/components/InfoWidget'
import type { Widget, ChartType, ChartDataPoint } from '@/stores/aiDashboardStore'

export interface InlineWidgetData {
  type: 'chart' | 'table' | 'info'
  title: string
  data: ChartDataPoint[] | string | string[][]
  chartType?: ChartType
  color?: string
}

interface InlineChatWidgetProps {
  widget: InlineWidgetData
}

export function InlineChatWidget({ widget }: InlineChatWidgetProps) {
  // Convert inline widget data to full Widget format
  const fullWidget: Widget = {
    id: `inline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: widget.type,
    title: widget.title,
    data: widget.data,
    chartType: widget.chartType,
    color: widget.color || '#8b5cf6',
  }

  return (
    <div className="my-3 rounded-lg overflow-hidden bg-slate-900/80 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
      {/* Compact Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-violet-900/40 via-cyan-900/20 to-violet-900/40 border-b border-violet-500/20">
        <h4 className="text-sm font-medium text-violet-200">{widget.title}</h4>
      </div>

      {/* Widget Content */}
      <div
        className="p-2"
        style={{
          height: widget.type === 'info' ? 'auto' : '220px',
          width: '100%',
          minWidth: '280px',
          minHeight: widget.type === 'chart' ? '200px' : 'auto',
        }}
      >
        {widget.type === 'chart' && <ChartWidget widget={fullWidget} />}
        {widget.type === 'table' && <TableWidget widget={fullWidget} />}
        {widget.type === 'info' && <InfoWidget widget={fullWidget} />}
      </div>
    </div>
  )
}

/**
 * Parse message content and extract inline widget markers
 * Returns the text content without markers and an array of widgets
 */
export function parseMessageContent(content: string): {
  textContent: string
  widgets: InlineWidgetData[]
} {
  const widgetRegex = /<!-- INLINE_WIDGET:(.*?) -->/g
  const widgets: InlineWidgetData[] = []
  let textContent = content

  let match
  while ((match = widgetRegex.exec(content)) !== null) {
    try {
      const widgetData = JSON.parse(match[1]) as InlineWidgetData
      widgets.push(widgetData)
    } catch (e) {
      console.error('Failed to parse inline widget:', e)
    }
  }

  // Remove widget markers from text content
  textContent = content.replace(widgetRegex, '').trim()

  return { textContent, widgets }
}
