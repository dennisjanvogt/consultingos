import { useRef, useEffect, useCallback, useState } from 'react'
import { useImageEditorStore } from '@/stores/imageEditorStore'

interface CanvasProps {
  onTextClick?: (position: { x: number; y: number }) => void
}

export function Canvas({ onTextClick }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const panStart = useRef<{ x: number; y: number; scrollX: number; scrollY: number } | null>(null)

  // Crop state
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  // Shape preview state
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null)
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null)
  const [isDrawingShape, setIsDrawingShape] = useState(false)
  const [shiftPressed, setShiftPressed] = useState(false)

  // Selection state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null)
  const [lassoPath, setLassoPath] = useState<{ x: number; y: number }[]>([])
  const [marchingAntsOffset, setMarchingAntsOffset] = useState(0)

  // Brush cursor position (screen coordinates relative to canvas container)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false)

  const {
    currentProject,
    selectedLayerId,
    activeTool,
    brushSettings,
    eraserSettings,
    shapeSettings,
    gradientSettings,
    bucketSettings,
    cloneSettings,
    retouchSettings,
    setCloneSettings,
    showGrid,
    gridSize,
    zoom,
    setZoom,
    crop,
    setCrop,
    applyCrop,
    selection,
    setSelection,
    clearSelection,
    pushHistory,
    updateLayerImage,
    getSelectedLayer,
    setLayerPosition,
    setBrushSettings,
    addImageAsLayer,
    filters,
    livePreview,
  } = useImageEditorStore()

  // Generate CSS filter string for live preview
  const getCssFilterString = useCallback(() => {
    if (!livePreview) return 'none'

    const filterParts: string[] = []

    // Brightness: -100 to 100 -> 0 to 200%
    if (filters.brightness !== 0) {
      filterParts.push(`brightness(${100 + filters.brightness}%)`)
    }

    // Contrast: -100 to 100 -> 0 to 200%
    if (filters.contrast !== 0) {
      filterParts.push(`contrast(${100 + filters.contrast}%)`)
    }

    // Saturation: -100 to 100 -> 0 to 200%
    if (filters.saturation !== 0) {
      filterParts.push(`saturate(${100 + filters.saturation}%)`)
    }

    // Hue rotation: -180 to 180 degrees
    if (filters.hue !== 0) {
      filterParts.push(`hue-rotate(${filters.hue}deg)`)
    }

    // Blur: 0 to 20px
    if (filters.blur > 0) {
      filterParts.push(`blur(${filters.blur}px)`)
    }

    // Grayscale
    if (filters.grayscale) {
      filterParts.push('grayscale(100%)')
    }

    // Sepia
    if (filters.sepia) {
      filterParts.push('sepia(100%)')
    }

    // Invert
    if (filters.invert) {
      filterParts.push('invert(100%)')
    }

    return filterParts.length > 0 ? filterParts.join(' ') : 'none'
  }, [livePreview, filters])

  // Layer canvases for compositing
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map())

  // Initialize layer canvases when project changes
  useEffect(() => {
    if (!currentProject) return

    currentProject.layers.forEach((layer) => {
      if (!layerCanvasesRef.current.has(layer.id)) {
        const canvas = document.createElement('canvas')
        canvas.width = currentProject.width
        canvas.height = currentProject.height
        layerCanvasesRef.current.set(layer.id, canvas)

        // If layer has imageData, draw it
        if (layer.imageData) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            const img = new Image()
            img.onload = () => {
              ctx.drawImage(img, 0, 0)
            }
            img.src = layer.imageData
          }
        }
      }
    })

    // Clean up removed layers
    layerCanvasesRef.current.forEach((_, id) => {
      if (!currentProject.layers.find((l) => l.id === id)) {
        layerCanvasesRef.current.delete(id)
      }
    })
  }, [currentProject])

  // Composite all layers to main canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !currentProject) return

    // Clear canvas
    ctx.fillStyle = currentProject.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw each visible layer
    currentProject.layers.forEach((layer) => {
      if (!layer.visible) return

      const layerCanvas = layerCanvasesRef.current.get(layer.id)
      if (!layerCanvas) return

      ctx.save()
      ctx.globalAlpha = layer.opacity / 100
      ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation

      // Apply transforms
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2)
      ctx.rotate((layer.rotation * Math.PI) / 180)
      ctx.translate(-layer.width / 2, -layer.height / 2)

      ctx.drawImage(layerCanvas, 0, 0)
      ctx.restore()
    })
  }, [currentProject])

  // Render when project changes
  useEffect(() => {
    render()
  }, [render, currentProject])

  // Marching ants animation
  useEffect(() => {
    if (!selection.active && !isSelecting) return

    const interval = setInterval(() => {
      setMarchingAntsOffset((prev) => (prev + 1) % 16)
    }, 80)

    return () => clearInterval(interval)
  }, [selection.active, isSelecting])

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -10 : 10
        setZoom(Math.max(10, Math.min(400, zoom + delta)))
      }
    },
    [zoom, setZoom]
  )

  // Space key for panning, Shift for constrained drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpacePressed(true)
      }
      if (e.key === 'Shift') {
        setShiftPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
        setIsPanning(false)
        panStart.current = null
      }
      if (e.key === 'Shift') {
        setShiftPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Get canvas coordinates from mouse event
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent) => {
      if (!currentProject) return null

      // Use nativeEvent.offsetX/Y which gives position relative to the target element
      // Then scale by zoom to convert from display coordinates to canvas coordinates
      const scale = 100 / zoom

      return {
        x: e.nativeEvent.offsetX * scale,
        y: e.nativeEvent.offsetY * scale,
      }
    },
    [currentProject, zoom]
  )

  // Draw brush/pencil stroke
  const drawStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      if (!selectedLayerId) return

      const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
      const ctx = layerCanvas?.getContext('2d')
      if (!ctx) return

      const isPencil = activeTool === 'pencil'
      const isEraser = activeTool === 'eraser'
      const settings = isEraser ? eraserSettings : brushSettings

      ctx.save()
      ctx.lineCap = isPencil ? 'square' : 'round'
      ctx.lineJoin = isPencil ? 'miter' : 'round'
      ctx.lineWidth = settings.size
      ctx.globalAlpha = settings.opacity / 100

      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out'
      } else {
        ctx.strokeStyle = brushSettings.color
      }

      // Disable antialiasing for pencil
      if (isPencil) {
        ctx.imageSmoothingEnabled = false
      }

      // Draw line from last point to current point
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      ctx.restore()

      render()
    },
    [selectedLayerId, activeTool, brushSettings, eraserSettings, render]
  )

  // Draw shape to layer
  const drawShape = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }, constrained: boolean) => {
      if (!selectedLayerId || !currentProject) return

      const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
      const ctx = layerCanvas?.getContext('2d')
      if (!ctx) return

      let x = start.x
      let y = start.y
      let width = end.x - start.x
      let height = end.y - start.y

      // Constrain to square/circle if shift is pressed
      if (constrained && activeTool !== 'line') {
        const size = Math.max(Math.abs(width), Math.abs(height))
        width = width < 0 ? -size : size
        height = height < 0 ? -size : size
      }

      ctx.save()
      ctx.lineWidth = shapeSettings.strokeWidth
      ctx.strokeStyle = shapeSettings.strokeColor
      ctx.fillStyle = shapeSettings.fillColor

      if (activeTool === 'line') {
        // For line, constrain to 45 degree angles
        let endX = end.x
        let endY = end.y
        if (constrained) {
          const dx = end.x - start.x
          const dy = end.y - start.y
          const angle = Math.atan2(dy, dx)
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
          const length = Math.sqrt(dx * dx + dy * dy)
          endX = start.x + Math.cos(snappedAngle) * length
          endY = start.y + Math.sin(snappedAngle) * length
        }
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(endX, endY)
        ctx.lineWidth = shapeSettings.strokeWidth
        ctx.strokeStyle = shapeSettings.fillColor
        ctx.stroke()
      } else if (activeTool === 'rectangle') {
        if (shapeSettings.filled) {
          ctx.fillRect(x, y, width, height)
        }
        if (shapeSettings.stroked) {
          ctx.strokeRect(x, y, width, height)
        }
      } else if (activeTool === 'ellipse') {
        const centerX = x + width / 2
        const centerY = y + height / 2
        const radiusX = Math.abs(width / 2)
        const radiusY = Math.abs(height / 2)
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
        if (shapeSettings.filled) {
          ctx.fill()
        }
        if (shapeSettings.stroked) {
          ctx.stroke()
        }
      }

      ctx.restore()
      render()
    },
    [selectedLayerId, currentProject, activeTool, shapeSettings, render]
  )

  // Flood fill (bucket tool)
  const floodFill = useCallback(
    (startX: number, startY: number) => {
      if (!selectedLayerId || !currentProject) return

      const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
      const ctx = layerCanvas?.getContext('2d')
      if (!ctx) return

      const imageData = ctx.getImageData(0, 0, currentProject.width, currentProject.height)
      const data = imageData.data
      const width = currentProject.width
      const height = currentProject.height

      // Get target color at click position
      const startIdx = (Math.floor(startY) * width + Math.floor(startX)) * 4
      const targetR = data[startIdx]
      const targetG = data[startIdx + 1]
      const targetB = data[startIdx + 2]
      const targetA = data[startIdx + 3]

      // Parse fill color
      const fillColor = brushSettings.color
      const fillR = parseInt(fillColor.slice(1, 3), 16)
      const fillG = parseInt(fillColor.slice(3, 5), 16)
      const fillB = parseInt(fillColor.slice(5, 7), 16)

      // Don't fill if already same color
      if (Math.abs(targetR - fillR) < 3 && Math.abs(targetG - fillG) < 3 && Math.abs(targetB - fillB) < 3) {
        return
      }

      const tolerance = bucketSettings.tolerance
      const stack: [number, number][] = [[Math.floor(startX), Math.floor(startY)]]
      const visited = new Set<string>()

      const colorMatch = (idx: number) => {
        return (
          Math.abs(data[idx] - targetR) <= tolerance &&
          Math.abs(data[idx + 1] - targetG) <= tolerance &&
          Math.abs(data[idx + 2] - targetB) <= tolerance &&
          Math.abs(data[idx + 3] - targetA) <= tolerance
        )
      }

      while (stack.length > 0) {
        const [x, y] = stack.pop()!
        const key = `${x},${y}`
        if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) continue
        visited.add(key)

        const idx = (y * width + x) * 4
        if (!colorMatch(idx)) continue

        // Fill pixel
        data[idx] = fillR
        data[idx + 1] = fillG
        data[idx + 2] = fillB
        data[idx + 3] = 255

        // Add neighbors
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
      }

      ctx.putImageData(imageData, 0, 0)
      render()
    },
    [selectedLayerId, currentProject, brushSettings.color, bucketSettings.tolerance, render]
  )

  // Draw gradient
  const drawGradient = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      if (!selectedLayerId || !currentProject) return

      const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
      const ctx = layerCanvas?.getContext('2d')
      if (!ctx) return

      let gradient: CanvasGradient
      if (gradientSettings.type === 'linear') {
        gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y)
      } else {
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
        gradient = ctx.createRadialGradient(start.x, start.y, 0, start.x, start.y, radius)
      }

      gradient.addColorStop(0, gradientSettings.startColor)
      gradient.addColorStop(1, gradientSettings.endColor)

      ctx.save()
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, currentProject.width, currentProject.height)
      ctx.restore()
      render()
    },
    [selectedLayerId, currentProject, gradientSettings, render]
  )

  // Retouch brush (blur, dodge, burn)
  const applyRetouch = useCallback(
    (x: number, y: number) => {
      if (!selectedLayerId || !currentProject) return

      const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
      const ctx = layerCanvas?.getContext('2d')
      if (!ctx) return

      const size = retouchSettings.size
      const strength = retouchSettings.strength / 100

      // Get image data for the brush area
      const sx = Math.max(0, Math.floor(x - size / 2))
      const sy = Math.max(0, Math.floor(y - size / 2))
      const sw = Math.min(size, currentProject.width - sx)
      const sh = Math.min(size, currentProject.height - sy)

      if (sw <= 0 || sh <= 0) return

      const imageData = ctx.getImageData(sx, sy, sw, sh)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const px = (i / 4) % sw
        const py = Math.floor((i / 4) / sw)
        const dist = Math.sqrt(Math.pow(px - sw / 2, 2) + Math.pow(py - sh / 2, 2))
        if (dist > size / 2) continue

        const falloff = 1 - (dist / (size / 2))

        if (activeTool === 'dodge') {
          // Lighten
          data[i] = Math.min(255, data[i] + (255 - data[i]) * strength * falloff)
          data[i + 1] = Math.min(255, data[i + 1] + (255 - data[i + 1]) * strength * falloff)
          data[i + 2] = Math.min(255, data[i + 2] + (255 - data[i + 2]) * strength * falloff)
        } else if (activeTool === 'burn') {
          // Darken
          data[i] = Math.max(0, data[i] - data[i] * strength * falloff)
          data[i + 1] = Math.max(0, data[i + 1] - data[i + 1] * strength * falloff)
          data[i + 2] = Math.max(0, data[i + 2] - data[i + 2] * strength * falloff)
        } else if (activeTool === 'blur') {
          // Simple box blur approximation
          // For a proper blur, we'd need to sample neighbors, but this is a quick approximation
          const blurAmount = strength * falloff * 0.1
          data[i] = data[i] * (1 - blurAmount) + 128 * blurAmount
          data[i + 1] = data[i + 1] * (1 - blurAmount) + 128 * blurAmount
          data[i + 2] = data[i + 2] * (1 - blurAmount) + 128 * blurAmount
        }
      }

      ctx.putImageData(imageData, sx, sy)
      render()
    },
    [selectedLayerId, currentProject, activeTool, retouchSettings, render]
  )

  // Clone stamp
  const applyClone = useCallback(
    (x: number, y: number) => {
      if (!selectedLayerId || !currentProject || cloneSettings.sourceX === null || cloneSettings.sourceY === null) return

      const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
      const ctx = layerCanvas?.getContext('2d')
      if (!ctx) return

      const size = cloneSettings.size
      const sourceX = cloneSettings.sourceX + cloneSettings.offsetX
      const sourceY = cloneSettings.sourceY + cloneSettings.offsetY

      // Get source image data
      const srcX = Math.max(0, Math.floor(sourceX - size / 2))
      const srcY = Math.max(0, Math.floor(sourceY - size / 2))
      const srcW = Math.min(size, currentProject.width - srcX)
      const srcH = Math.min(size, currentProject.height - srcY)

      if (srcW <= 0 || srcH <= 0) return

      const sourceData = ctx.getImageData(srcX, srcY, srcW, srcH)

      // Apply to destination with circular mask
      const destX = Math.max(0, Math.floor(x - size / 2))
      const destY = Math.max(0, Math.floor(y - size / 2))

      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.globalAlpha = cloneSettings.opacity / 100
      ctx.putImageData(sourceData, destX, destY)
      ctx.restore()

      render()
    },
    [selectedLayerId, currentProject, cloneSettings, render]
  )

  // Magic wand selection
  const magicWandSelect = useCallback(
    (startX: number, startY: number) => {
      if (!currentProject) return

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      const imageData = ctx.getImageData(0, 0, currentProject.width, currentProject.height)
      const data = imageData.data
      const width = currentProject.width
      const height = currentProject.height

      // Get target color at click position
      const startIdx = (Math.floor(startY) * width + Math.floor(startX)) * 4
      const targetR = data[startIdx]
      const targetG = data[startIdx + 1]
      const targetB = data[startIdx + 2]
      const targetA = data[startIdx + 3]

      const tolerance = bucketSettings.tolerance
      const visited = new Set<string>()
      const stack: [number, number][] = [[Math.floor(startX), Math.floor(startY)]]
      const selectedPixels: { x: number; y: number }[] = []

      // Track bounds for selection rectangle
      let minX = Math.floor(startX)
      let maxX = Math.floor(startX)
      let minY = Math.floor(startY)
      let maxY = Math.floor(startY)

      const colorMatch = (idx: number) => {
        return (
          Math.abs(data[idx] - targetR) <= tolerance &&
          Math.abs(data[idx + 1] - targetG) <= tolerance &&
          Math.abs(data[idx + 2] - targetB) <= tolerance &&
          Math.abs(data[idx + 3] - targetA) <= tolerance
        )
      }

      while (stack.length > 0) {
        const [x, y] = stack.pop()!
        const key = `${x},${y}`
        if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) continue
        visited.add(key)

        const idx = (y * width + x) * 4
        if (!colorMatch(idx)) continue

        selectedPixels.push({ x, y })
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)

        // Add neighbors
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
      }

      // Set selection as bounding rectangle
      if (selectedPixels.length > 0) {
        setSelection({
          type: 'rectangle',
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
          active: true,
        })
      }
    },
    [currentProject, bucketSettings.tolerance, setSelection]
  )

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!currentProject) return

      // Space+drag to pan
      if (isSpacePressed) {
        setIsPanning(true)
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          scrollX: containerRef.current?.scrollLeft || 0,
          scrollY: containerRef.current?.scrollTop || 0,
        }
        return
      }

      const coords = getCanvasCoords(e)
      if (!coords) return

      const layer = getSelectedLayer()

      // Drawing tools
      if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'pencil') {
        if (!layer || layer.locked) return

        isDrawing.current = true
        lastPoint.current = coords
        pushHistory(activeTool === 'eraser' ? 'Erase' : 'Paint')

        // Draw single point
        drawStroke(coords, coords)
      }
      // Eyedropper
      else if (activeTool === 'eyedropper') {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx) return

        const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data
        const hex = `#${[pixel[0], pixel[1], pixel[2]]
          .map((x) => x.toString(16).padStart(2, '0'))
          .join('')}`
        setBrushSettings({ color: hex })
      }
      // Move tool
      else if (activeTool === 'move') {
        isDrawing.current = true
        lastPoint.current = coords
      }
      // Text tool
      else if (activeTool === 'text') {
        onTextClick?.(coords)
      }
      // Crop tool
      else if (activeTool === 'crop') {
        setIsCropping(true)
        setCropStart(coords)
        setCropEnd(coords)
      }
      // Shape tools (line, rectangle, ellipse)
      else if (['line', 'rectangle', 'ellipse'].includes(activeTool)) {
        if (!layer || layer.locked) return
        setIsDrawingShape(true)
        setShapeStart(coords)
        setShapeEnd(coords)
        pushHistory(`Draw ${activeTool}`)
      }
      // Bucket fill
      else if (activeTool === 'bucket') {
        if (!layer || layer.locked) return
        pushHistory('Fill')
        floodFill(coords.x, coords.y)
        // Save immediately
        if (selectedLayerId) {
          const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
          if (layerCanvas) {
            updateLayerImage(selectedLayerId, layerCanvas.toDataURL('image/png'))
          }
        }
      }
      // Gradient tool
      else if (activeTool === 'gradient') {
        if (!layer || layer.locked) return
        setIsDrawingShape(true)
        setShapeStart(coords)
        setShapeEnd(coords)
        pushHistory('Gradient')
      }
      // Clone stamp - Alt+click to set source
      else if (activeTool === 'clone') {
        if (!layer || layer.locked) return
        if (e.altKey) {
          setCloneSettings({ sourceX: coords.x, sourceY: coords.y, offsetX: 0, offsetY: 0 })
        } else if (cloneSettings.sourceX !== null) {
          isDrawing.current = true
          lastPoint.current = coords
          pushHistory('Clone')
        }
      }
      // Retouch tools (blur, dodge, burn)
      else if (['blur', 'sharpen', 'smudge', 'dodge', 'burn'].includes(activeTool)) {
        if (!layer || layer.locked) return
        isDrawing.current = true
        lastPoint.current = coords
        pushHistory(activeTool.charAt(0).toUpperCase() + activeTool.slice(1))
        applyRetouch(coords.x, coords.y)
      }
      // Selection tools
      else if (['rectSelect', 'ellipseSelect'].includes(activeTool)) {
        setIsSelecting(true)
        setSelectionStart(coords)
        setSelectionEnd(coords)
        setLassoPath([])
      }
      // Lasso selection
      else if (activeTool === 'lassoSelect') {
        setIsSelecting(true)
        setSelectionStart(coords)
        setLassoPath([coords])
      }
      // Magic wand
      else if (activeTool === 'magicWand') {
        magicWandSelect(coords.x, coords.y)
      }
    },
    [currentProject, activeTool, isSpacePressed, getCanvasCoords, getSelectedLayer, pushHistory, drawStroke, setBrushSettings, onTextClick, floodFill, selectedLayerId, updateLayerImage, setCloneSettings, cloneSettings.sourceX, applyRetouch, magicWandSelect]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update cursor position for brush preview (show for all drawing tools)
      const cursorTools = ['brush', 'eraser', 'pencil', 'blur', 'sharpen', 'smudge', 'dodge', 'burn', 'clone']
      if (cursorTools.includes(activeTool)) {
        setCursorPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })
      }

      // Handle panning
      if (isPanning && panStart.current && containerRef.current) {
        const dx = e.clientX - panStart.current.x
        const dy = e.clientY - panStart.current.y
        containerRef.current.scrollLeft = panStart.current.scrollX - dx
        containerRef.current.scrollTop = panStart.current.scrollY - dy
        return
      }

      // Handle crop dragging
      if (isCropping) {
        const coords = getCanvasCoords(e)
        if (coords) {
          setCropEnd(coords)
        }
        return
      }

      // Handle shape/gradient preview
      if (isDrawingShape) {
        const coords = getCanvasCoords(e)
        if (coords) {
          setShapeEnd(coords)
        }
        return
      }

      // Handle selection dragging
      if (isSelecting) {
        const coords = getCanvasCoords(e)
        if (coords) {
          if (activeTool === 'lassoSelect') {
            setLassoPath((prev) => [...prev, coords])
          } else {
            setSelectionEnd(coords)
          }
        }
        return
      }

      if (!isDrawing.current) return

      const coords = getCanvasCoords(e)
      if (!coords || !lastPoint.current) return

      // Drawing tools
      if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'pencil') {
        drawStroke(lastPoint.current, coords)
        lastPoint.current = coords
      }
      // Move tool
      else if (activeTool === 'move' && selectedLayerId) {
        const dx = coords.x - lastPoint.current.x
        const dy = coords.y - lastPoint.current.y
        const layer = getSelectedLayer()
        if (layer && !layer.locked) {
          setLayerPosition(selectedLayerId, layer.x + dx, layer.y + dy)
        }
        lastPoint.current = coords
      }
      // Retouch tools
      else if (['blur', 'sharpen', 'smudge', 'dodge', 'burn'].includes(activeTool)) {
        applyRetouch(coords.x, coords.y)
        lastPoint.current = coords
      }
      // Clone stamp
      else if (activeTool === 'clone' && cloneSettings.sourceX !== null) {
        // Update offset as we move
        const offsetX = coords.x - lastPoint.current.x
        const offsetY = coords.y - lastPoint.current.y
        setCloneSettings({ offsetX: cloneSettings.offsetX + offsetX, offsetY: cloneSettings.offsetY + offsetY })
        applyClone(coords.x, coords.y)
        lastPoint.current = coords
      }
    },
    [activeTool, selectedLayerId, isPanning, isCropping, isDrawingShape, isSelecting, getCanvasCoords, drawStroke, getSelectedLayer, setLayerPosition, applyRetouch, applyClone, cloneSettings, setCloneSettings]
  )

  const handleMouseUp = useCallback(() => {
    // End panning
    if (isPanning) {
      setIsPanning(false)
      panStart.current = null
      return
    }

    // End crop selection
    if (isCropping && cropStart && cropEnd) {
      const x = Math.min(cropStart.x, cropEnd.x)
      const y = Math.min(cropStart.y, cropEnd.y)
      const width = Math.abs(cropEnd.x - cropStart.x)
      const height = Math.abs(cropEnd.y - cropStart.y)

      if (width > 10 && height > 10) {
        setCrop({ x, y, width, height, active: true })
      }
      setIsCropping(false)
      return
    }

    // End selection
    if (isSelecting) {
      if (activeTool === 'lassoSelect' && lassoPath.length > 2) {
        // Calculate bounding box for lasso
        const xs = lassoPath.map((p) => p.x)
        const ys = lassoPath.map((p) => p.y)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)

        setSelection({
          type: 'freehand',
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          path: lassoPath,
          active: true,
        })
      } else if (selectionStart && selectionEnd) {
        const x = Math.min(selectionStart.x, selectionEnd.x)
        const y = Math.min(selectionStart.y, selectionEnd.y)
        const width = Math.abs(selectionEnd.x - selectionStart.x)
        const height = Math.abs(selectionEnd.y - selectionStart.y)

        if (width > 5 && height > 5) {
          setSelection({
            type: activeTool === 'ellipseSelect' ? 'ellipse' : 'rectangle',
            x,
            y,
            width,
            height,
            active: true,
          })
        }
      }

      setIsSelecting(false)
      setSelectionStart(null)
      setSelectionEnd(null)
      setLassoPath([])
      return
    }

    // End shape drawing
    if (isDrawingShape && shapeStart && shapeEnd) {
      if (['line', 'rectangle', 'ellipse'].includes(activeTool)) {
        drawShape(shapeStart, shapeEnd, shiftPressed)
      } else if (activeTool === 'gradient') {
        drawGradient(shapeStart, shapeEnd)
      }

      // Save layer
      if (selectedLayerId) {
        const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
        if (layerCanvas) {
          updateLayerImage(selectedLayerId, layerCanvas.toDataURL('image/png'))
        }
      }

      setIsDrawingShape(false)
      setShapeStart(null)
      setShapeEnd(null)
      return
    }

    // Save drawing tools
    const drawingTools = ['brush', 'eraser', 'pencil', 'blur', 'sharpen', 'smudge', 'dodge', 'burn', 'clone']
    if (isDrawing.current && drawingTools.includes(activeTool)) {
      if (selectedLayerId) {
        const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
        if (layerCanvas) {
          const imageData = layerCanvas.toDataURL('image/png')
          updateLayerImage(selectedLayerId, imageData)
        }
      }
    }
    isDrawing.current = false
    lastPoint.current = null
  }, [activeTool, selectedLayerId, isPanning, isCropping, isDrawingShape, isSelecting, cropStart, cropEnd, shapeStart, shapeEnd, selectionStart, selectionEnd, lassoPath, shiftPressed, setCrop, setSelection, updateLayerImage, drawShape, drawGradient])

  // Cursor style
  const getCursor = () => {
    if (isSpacePressed) return 'grab'
    if (isPanning) return 'grabbing'

    switch (activeTool) {
      case 'brush':
      case 'pencil':
      case 'eraser':
      case 'blur':
      case 'sharpen':
      case 'smudge':
      case 'dodge':
      case 'burn':
      case 'clone':
        return 'none' // Hide cursor when we show custom brush preview
      case 'move':
        return 'move'
      case 'eyedropper':
      case 'bucket':
      case 'crop':
      case 'line':
      case 'rectangle':
      case 'ellipse':
      case 'gradient':
      case 'rectSelect':
      case 'ellipseSelect':
      case 'lassoSelect':
      case 'magicWand':
        return 'crosshair'
      case 'text':
        return 'text'
      default:
        return 'default'
    }
  }

  // Calculate brush cursor size in display pixels
  const getBrushCursorSize = () => {
    if (activeTool === 'brush' || activeTool === 'pencil') {
      return (brushSettings.size * zoom) / 100
    } else if (activeTool === 'eraser') {
      return (eraserSettings.size * zoom) / 100
    } else if (['blur', 'sharpen', 'smudge', 'dodge', 'burn'].includes(activeTool)) {
      return (retouchSettings.size * zoom) / 100
    } else if (activeTool === 'clone') {
      return (cloneSettings.size * zoom) / 100
    }
    return 20
  }

  // Get brush cursor color
  const getBrushCursorColor = () => {
    if (activeTool === 'eraser') return 'rgba(255, 255, 255, 0.8)'
    if (activeTool === 'brush' || activeTool === 'pencil') return brushSettings.color
    if (activeTool === 'dodge') return 'rgba(255, 255, 200, 0.8)'
    if (activeTool === 'burn') return 'rgba(100, 50, 0, 0.8)'
    if (activeTool === 'blur') return 'rgba(150, 150, 255, 0.8)'
    if (activeTool === 'clone') return 'rgba(100, 255, 100, 0.8)'
    return 'rgba(255, 255, 255, 0.8)'
  }

  // Should show brush cursor
  const cursorTools = ['brush', 'pencil', 'eraser', 'blur', 'sharpen', 'smudge', 'dodge', 'burn', 'clone']
  const showBrushCursor = cursorTools.includes(activeTool) && cursorPos && !isSpacePressed && !isPanning

  // Calculate crop rectangle for display
  const getCropRect = () => {
    if (!cropStart || !cropEnd) return null
    const x = Math.min(cropStart.x, cropEnd.x)
    const y = Math.min(cropStart.y, cropEnd.y)
    const width = Math.abs(cropEnd.x - cropStart.x)
    const height = Math.abs(cropEnd.y - cropStart.y)
    return { x, y, width, height }
  }

  const cropRect = isCropping ? getCropRect() : (crop.active ? crop : null)

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950 text-gray-500">
        No project open
      </div>
    )
  }

  const displayWidth = (currentProject.width * zoom) / 100
  const displayHeight = (currentProject.height * zoom) / 100

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const imageFiles = files.filter((file) => file.type.startsWith('image/'))

      for (const file of imageFiles) {
        await addImageAsLayer(file)
      }
    },
    [addImageAsLayer]
  )

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-auto bg-gray-950 flex items-center justify-center p-4 relative ${
        isDragOver ? 'ring-4 ring-inset ring-violet-500' : ''
      }`}
      style={{
        backgroundImage:
          'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      }}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gray-900 px-6 py-4 rounded-xl shadow-2xl border border-violet-500">
            <p className="text-white text-lg font-medium">Drop images to add as layers</p>
          </div>
        </div>
      )}
      <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
        <canvas
          ref={canvasRef}
          width={currentProject.width}
          height={currentProject.height}
          className="shadow-2xl"
          style={{
            cursor: getCursor(),
            width: displayWidth,
            height: displayHeight,
            imageRendering: zoom > 100 ? 'pixelated' : 'auto',
            filter: getCssFilterString(),
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp()
            setCursorPos(null)
          }}
        />

        {/* Brush cursor preview */}
        {showBrushCursor && cursorPos && (
          <div
            className="absolute pointer-events-none border rounded-full"
            style={{
              left: cursorPos.x - getBrushCursorSize() / 2,
              top: cursorPos.y - getBrushCursorSize() / 2,
              width: getBrushCursorSize(),
              height: getBrushCursorSize(),
              borderColor: getBrushCursorColor(),
              borderWidth: 1,
              backgroundColor: `${getBrushCursorColor()}20`,
            }}
          >
            {/* Center crosshair */}
            <div
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 2px rgba(0,0,0,0.8)',
              }}
            />
          </div>
        )}

        {/* Shape preview overlay */}
        {isDrawingShape && shapeStart && shapeEnd && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={displayWidth}
            height={displayHeight}
            viewBox={`0 0 ${currentProject.width} ${currentProject.height}`}
          >
            {activeTool === 'line' && (
              <line
                x1={shapeStart.x}
                y1={shapeStart.y}
                x2={shiftPressed ? (() => {
                  const dx = shapeEnd.x - shapeStart.x
                  const dy = shapeEnd.y - shapeStart.y
                  const angle = Math.atan2(dy, dx)
                  const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
                  const length = Math.sqrt(dx * dx + dy * dy)
                  return shapeStart.x + Math.cos(snappedAngle) * length
                })() : shapeEnd.x}
                y2={shiftPressed ? (() => {
                  const dx = shapeEnd.x - shapeStart.x
                  const dy = shapeEnd.y - shapeStart.y
                  const angle = Math.atan2(dy, dx)
                  const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
                  const length = Math.sqrt(dx * dx + dy * dy)
                  return shapeStart.y + Math.sin(snappedAngle) * length
                })() : shapeEnd.y}
                stroke={shapeSettings.fillColor}
                strokeWidth={shapeSettings.strokeWidth}
                strokeDasharray="5,5"
              />
            )}
            {activeTool === 'rectangle' && (() => {
              let width = shapeEnd.x - shapeStart.x
              let height = shapeEnd.y - shapeStart.y
              if (shiftPressed) {
                const size = Math.max(Math.abs(width), Math.abs(height))
                width = width < 0 ? -size : size
                height = height < 0 ? -size : size
              }
              return (
                <rect
                  x={width < 0 ? shapeStart.x + width : shapeStart.x}
                  y={height < 0 ? shapeStart.y + height : shapeStart.y}
                  width={Math.abs(width)}
                  height={Math.abs(height)}
                  fill={shapeSettings.filled ? shapeSettings.fillColor + '80' : 'none'}
                  stroke={shapeSettings.stroked || !shapeSettings.filled ? shapeSettings.strokeColor : 'none'}
                  strokeWidth={shapeSettings.strokeWidth}
                  strokeDasharray="5,5"
                />
              )
            })()}
            {activeTool === 'ellipse' && (() => {
              let width = shapeEnd.x - shapeStart.x
              let height = shapeEnd.y - shapeStart.y
              if (shiftPressed) {
                const size = Math.max(Math.abs(width), Math.abs(height))
                width = width < 0 ? -size : size
                height = height < 0 ? -size : size
              }
              return (
                <ellipse
                  cx={shapeStart.x + width / 2}
                  cy={shapeStart.y + height / 2}
                  rx={Math.abs(width / 2)}
                  ry={Math.abs(height / 2)}
                  fill={shapeSettings.filled ? shapeSettings.fillColor + '80' : 'none'}
                  stroke={shapeSettings.stroked || !shapeSettings.filled ? shapeSettings.strokeColor : 'none'}
                  strokeWidth={shapeSettings.strokeWidth}
                  strokeDasharray="5,5"
                />
              )
            })()}
            {activeTool === 'gradient' && (
              <>
                <defs>
                  <linearGradient id="gradientPreview" x1={shapeStart.x} y1={shapeStart.y} x2={shapeEnd.x} y2={shapeEnd.y} gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={gradientSettings.startColor} />
                    <stop offset="100%" stopColor={gradientSettings.endColor} />
                  </linearGradient>
                </defs>
                <line
                  x1={shapeStart.x}
                  y1={shapeStart.y}
                  x2={shapeEnd.x}
                  y2={shapeEnd.y}
                  stroke="url(#gradientPreview)"
                  strokeWidth="4"
                />
                <circle cx={shapeStart.x} cy={shapeStart.y} r="6" fill={gradientSettings.startColor} stroke="white" strokeWidth="2" />
                <circle cx={shapeEnd.x} cy={shapeEnd.y} r="6" fill={gradientSettings.endColor} stroke="white" strokeWidth="2" />
              </>
            )}
          </svg>
        )}

        {/* Grid overlay */}
        {showGrid && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={displayWidth}
            height={displayHeight}
            viewBox={`0 0 ${currentProject.width} ${currentProject.height}`}
          >
            <defs>
              <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}

        {/* Selection preview overlay (while dragging) */}
        {isSelecting && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={displayWidth}
            height={displayHeight}
            viewBox={`0 0 ${currentProject.width} ${currentProject.height}`}
          >
            {activeTool === 'rectSelect' && selectionStart && selectionEnd && (
              <rect
                x={Math.min(selectionStart.x, selectionEnd.x)}
                y={Math.min(selectionStart.y, selectionEnd.y)}
                width={Math.abs(selectionEnd.x - selectionStart.x)}
                height={Math.abs(selectionEnd.y - selectionStart.y)}
                fill="rgba(100, 100, 255, 0.1)"
                stroke="#4488ff"
                strokeWidth="1"
                strokeDasharray="4,4"
                strokeDashoffset={marchingAntsOffset}
              />
            )}
            {activeTool === 'ellipseSelect' && selectionStart && selectionEnd && (
              <ellipse
                cx={(selectionStart.x + selectionEnd.x) / 2}
                cy={(selectionStart.y + selectionEnd.y) / 2}
                rx={Math.abs(selectionEnd.x - selectionStart.x) / 2}
                ry={Math.abs(selectionEnd.y - selectionStart.y) / 2}
                fill="rgba(100, 100, 255, 0.1)"
                stroke="#4488ff"
                strokeWidth="1"
                strokeDasharray="4,4"
                strokeDashoffset={marchingAntsOffset}
              />
            )}
            {activeTool === 'lassoSelect' && lassoPath.length > 1 && (
              <polyline
                points={lassoPath.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(100, 100, 255, 0.1)"
                stroke="#4488ff"
                strokeWidth="1"
                strokeDasharray="4,4"
                strokeDashoffset={marchingAntsOffset}
              />
            )}
          </svg>
        )}

        {/* Active selection overlay (marching ants) */}
        {selection.active && !isSelecting && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={displayWidth}
            height={displayHeight}
            viewBox={`0 0 ${currentProject.width} ${currentProject.height}`}
          >
            {selection.type === 'rectangle' && (
              <rect
                x={selection.x}
                y={selection.y}
                width={selection.width}
                height={selection.height}
                fill="none"
                stroke="white"
                strokeWidth="1"
                strokeDasharray="4,4"
                strokeDashoffset={marchingAntsOffset}
              />
            )}
            {selection.type === 'rectangle' && (
              <rect
                x={selection.x}
                y={selection.y}
                width={selection.width}
                height={selection.height}
                fill="none"
                stroke="black"
                strokeWidth="1"
                strokeDasharray="4,4"
                strokeDashoffset={marchingAntsOffset + 4}
              />
            )}
            {selection.type === 'ellipse' && (
              <>
                <ellipse
                  cx={selection.x + selection.width / 2}
                  cy={selection.y + selection.height / 2}
                  rx={selection.width / 2}
                  ry={selection.height / 2}
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  strokeDashoffset={marchingAntsOffset}
                />
                <ellipse
                  cx={selection.x + selection.width / 2}
                  cy={selection.y + selection.height / 2}
                  rx={selection.width / 2}
                  ry={selection.height / 2}
                  fill="none"
                  stroke="black"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  strokeDashoffset={marchingAntsOffset + 4}
                />
              </>
            )}
            {selection.type === 'freehand' && selection.path && (
              <>
                <polygon
                  points={selection.path.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  strokeDashoffset={marchingAntsOffset}
                />
                <polygon
                  points={selection.path.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="black"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  strokeDashoffset={marchingAntsOffset + 4}
                />
              </>
            )}
          </svg>
        )}

        {/* Crop overlay */}
        {cropRect && (
          <>
            {/* Darkened areas */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(to right,
                  rgba(0,0,0,0.6) ${(cropRect.x / currentProject.width) * 100}%,
                  transparent ${(cropRect.x / currentProject.width) * 100}%,
                  transparent ${((cropRect.x + cropRect.width) / currentProject.width) * 100}%,
                  rgba(0,0,0,0.6) ${((cropRect.x + cropRect.width) / currentProject.width) * 100}%
                )`,
              }}
            />
            {/* Crop border */}
            <div
              className="absolute border-2 border-violet-500 border-dashed pointer-events-none"
              style={{
                left: `${(cropRect.x / currentProject.width) * 100}%`,
                top: `${(cropRect.y / currentProject.height) * 100}%`,
                width: `${(cropRect.width / currentProject.width) * 100}%`,
                height: `${(cropRect.height / currentProject.height) * 100}%`,
              }}
            >
              {/* Size indicator */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                {Math.round(cropRect.width)} × {Math.round(cropRect.height)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
