import { useEffect, useRef, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface GraphNode {
  id: number
  title: string
  icon: string
  x: number
  y: number
  vx: number
  vy: number
}

interface GraphEdge {
  source: number
  target: number
}

interface GraphViewProps {
  nodes: { id: number; title: string; icon: string }[]
  edges: { source_id: number; target_id: number }[]
  onNodeClick: (nodeId: number) => void
  currentPageId: number | null
}

export function GraphView({ nodes: inputNodes, edges: inputEdges, onNodeClick, currentPageId }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<number | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const nodesRef = useRef<GraphNode[]>([])
  const animationRef = useRef<number | null>(null)

  // Initialize nodes with positions
  useEffect(() => {
    const centerX = dimensions.width / 2
    const centerY = dimensions.height / 2

    nodesRef.current = inputNodes.map((node, i) => ({
      id: node.id,
      title: node.title,
      icon: node.icon,
      x: centerX + (Math.random() - 0.5) * 300,
      y: centerY + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
    }))
  }, [inputNodes, dimensions])

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Force-directed layout simulation
  useEffect(() => {
    const nodes = nodesRef.current
    if (nodes.length === 0) return

    const edges: GraphEdge[] = inputEdges.map(e => ({
      source: e.source_id,
      target: e.target_id,
    }))

    const simulate = () => {
      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2

      // Apply forces
      for (const node of nodes) {
        // Center gravity
        node.vx += (centerX - node.x) * 0.001
        node.vy += (centerY - node.y) * 0.001

        // Repulsion between nodes
        for (const other of nodes) {
          if (node.id === other.id) continue
          const dx = node.x - other.x
          const dy = node.y - other.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 2000 / (dist * dist)
          node.vx += (dx / dist) * force
          node.vy += (dy / dist) * force
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const source = nodes.find(n => n.id === edge.source)
        const target = nodes.find(n => n.id === edge.target)
        if (!source || !target) continue

        const dx = target.x - source.x
        const dy = target.y - source.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (dist - 150) * 0.01

        source.vx += (dx / dist) * force
        source.vy += (dy / dist) * force
        target.vx -= (dx / dist) * force
        target.vy -= (dy / dist) * force
      }

      // Update positions with damping
      for (const node of nodes) {
        node.vx *= 0.9
        node.vy *= 0.9
        node.x += node.vx
        node.y += node.vy

        // Keep in bounds
        node.x = Math.max(50, Math.min(dimensions.width - 50, node.x))
        node.y = Math.max(50, Math.min(dimensions.height - 50, node.y))
      }

      // Draw
      draw()
      animationRef.current = requestAnimationFrame(simulate)
    }

    simulate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [inputEdges, dimensions])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const nodes = nodesRef.current
    const edges: GraphEdge[] = inputEdges.map(e => ({
      source: e.source_id,
      target: e.target_id,
    }))

    // Clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    // Apply transform
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Draw edges
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 1.5
    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.source)
      const target = nodes.find(n => n.id === edge.target)
      if (!source || !target) continue

      ctx.beginPath()
      ctx.moveTo(source.x, source.y)
      ctx.lineTo(target.x, target.y)
      ctx.stroke()
    }

    // Draw nodes
    for (const node of nodes) {
      const isHovered = hoveredNode === node.id
      const isCurrent = currentPageId === node.id
      const radius = isHovered ? 28 : 24

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)

      if (isCurrent) {
        ctx.fillStyle = '#8b5cf6'
      } else if (isHovered) {
        ctx.fillStyle = '#a78bfa'
      } else {
        ctx.fillStyle = '#374151'
      }
      ctx.fill()

      // Border
      ctx.strokeStyle = isCurrent ? '#c4b5fd' : '#4b5563'
      ctx.lineWidth = 2
      ctx.stroke()

      // Icon
      ctx.font = '16px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      ctx.fillText(node.icon || '📄', node.x, node.y)

      // Title (below node)
      if (isHovered || isCurrent) {
        ctx.font = '12px system-ui'
        ctx.fillStyle = '#d1d5db'
        const title = node.title.length > 20 ? node.title.slice(0, 20) + '...' : node.title
        ctx.fillText(title || 'Untitled', node.x, node.y + 40)
      }
    }

    ctx.restore()
  }, [inputEdges, zoom, pan, hoveredNode, currentPageId, dimensions])

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    // Check for hover
    const nodes = nodesRef.current
    let found = false
    for (const node of nodes) {
      const dx = x - node.x
      const dy = y - node.y
      if (Math.sqrt(dx * dx + dy * dy) < 24) {
        setHoveredNode(node.id)
        found = true
        break
      }
    }
    if (!found) setHoveredNode(null)

    // Handle pan
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    const nodes = nodesRef.current
    for (const node of nodes) {
      const dx = x - node.x
      const dy = y - node.y
      if (Math.sqrt(dx * dx + dy * dy) < 24) {
        onNodeClick(node.id)
        break
      }
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.max(0.3, Math.min(3, z * delta)))
  }

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setZoom(z => Math.min(3, z * 1.2))}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-gray-800/90 rounded-lg p-3 text-xs text-gray-400">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span>Current page</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-violet-500" />
          <span>Link</span>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 bg-gray-800/90 rounded-lg px-3 py-2 text-xs text-gray-400">
        {inputNodes.length} pages · {inputEdges.length} links
      </div>
    </div>
  )
}
