import { memo, useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { Widget, ChartDataPoint, LineStyle } from '@/stores/aiDashboardStore'

const COLORS = ['#8b5cf6', '#22d3ee', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#ef4444']

// Map line style to stroke-dasharray
const getStrokeDasharray = (style?: LineStyle): string => {
  switch (style) {
    case 'dashed': return '8 4'
    case 'dotted': return '2 4'
    default: return 'none'
  }
}

interface ChartWidgetProps {
  widget: Widget
}

// Simple tooltip style (no backdrop-filter for performance)
const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(139, 92, 246, 0.4)',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  color: '#e2e8f0',
}

// Grid styling
const gridStyle = {
  stroke: 'rgba(139, 92, 246, 0.15)',
  strokeDasharray: '3 3',
}

const axisStyle = {
  tick: { fontSize: 11, fill: '#94a3b8' },
  stroke: 'rgba(139, 92, 246, 0.3)',
}

// Common chart margins
const chartMargins = { top: 10, right: 10, left: -10, bottom: 0 }

export const ChartWidget = memo(function ChartWidget({ widget }: ChartWidgetProps) {
  const [isReady, setIsReady] = useState(false)

  // Delay render to ensure container is sized
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setIsReady(true)
    })
    return () => cancelAnimationFrame(timer)
  }, [])

  const data = widget.data as ChartDataPoint[]
  const xKey = widget.xKey || 'name'
  const yKey = widget.yKey || 'value'
  const yKeys = widget.yKeys || [yKey]
  const lineStyles = widget.lineStyles || {}
  const color = widget.color || '#8b5cf6'

  if (!isReady) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-500">
        <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={180}>
      <BarChart data={data} margin={chartMargins}>
        <defs>
          <linearGradient id={`barGrad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey={xKey} {...axisStyle} />
        <YAxis {...axisStyle} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
        <Bar dataKey={yKey} fill={`url(#barGrad-${widget.id})`} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )

  const renderLineChart = () => {
    const isMultiLine = yKeys.length > 1

    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={180}>
        <LineChart data={data} margin={chartMargins}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey={xKey} {...axisStyle} />
          <YAxis {...axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          {isMultiLine ? (
            yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                strokeDasharray={getStrokeDasharray(lineStyles[key])}
                dot={lineStyles[key] === 'dotted' ? false : { r: 3, fill: COLORS[index % COLORS.length] }}
                connectNulls={false}
                activeDot={{ r: 5, fill: '#22d3ee', stroke: COLORS[index % COLORS.length], strokeWidth: 2 }}
              />
            ))
          ) : (
            <Line
              type="monotone"
              dataKey={yKeys[0]}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5, fill: '#22d3ee', stroke: color, strokeWidth: 2 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={180}>
      <AreaChart data={data} margin={chartMargins}>
        <defs>
          <linearGradient id={`areaGrad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey={xKey} {...axisStyle} />
        <YAxis {...axisStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#areaGrad-${widget.id})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={180}>
      <PieChart>
        <Pie
          data={data}
          dataKey={yKey}
          nameKey={xKey}
          cx="50%"
          cy="50%"
          outerRadius="80%"
          innerRadius="30%"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={{ stroke: 'rgba(139, 92, 246, 0.5)' }}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={1}
            />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  )

  const renderScatterChart = () => (
    <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={180}>
      <ScatterChart data={data} margin={chartMargins}>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey={xKey} {...axisStyle} />
        <YAxis dataKey={yKey} {...axisStyle} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(139, 92, 246, 0.5)' }} />
        <Scatter data={data} fill={color} />
      </ScatterChart>
    </ResponsiveContainer>
  )

  const renderChart = () => {
    switch (widget.chartType) {
      case 'bar':
        return renderBarChart()
      case 'line':
        return renderLineChart()
      case 'area':
        return renderAreaChart()
      case 'pie':
        return renderPieChart()
      case 'scatter':
        return renderScatterChart()
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            Unbekannter Chart-Typ: {widget.chartType}
          </div>
        )
    }
  }

  return (
    <div className="h-full w-full" style={{ minHeight: '180px', minWidth: '200px' }}>
      {renderChart()}
    </div>
  )
})
