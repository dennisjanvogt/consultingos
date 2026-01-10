import { useRef, useEffect, useCallback, useState } from 'react'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import { DEFAULT_TEXT_EFFECTS, DEFAULT_FILTERS, DEFAULT_LAYER_EFFECTS } from '../types'
import type { Layer, Filters, LayerEffects } from '../types'

interface CanvasProps {
  onTextClick?: (position: { x: number; y: number }) => void
}

export function Canvas({ onTextClick }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const moveStartPoint = useRef<{ x: number; y: number } | null>(null)
  const isDraggingLayer = useRef(false)
  const DRAG_THRESHOLD = 3 // Pixels before starting actual move
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

  // Hover layer for Canva-style selection
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null)

  // Track pending image loads to trigger re-render when complete
  const pendingImagesRef = useRef(0)
  const [imagesLoaded, setImagesLoaded] = useState(0)

  // Layer resize state
  const [isResizingLayer, setIsResizingLayer] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState<{
    mouseX: number
    mouseY: number
    layerX: number
    layerY: number
    layerWidth: number
    layerHeight: number
  } | null>(null)

  // Crop preview state - stores original bounds when cropping in freeTransform mode
  const [cropPreview, setCropPreview] = useState<{
    layerId: string
    originalX: number
    originalY: number
    originalWidth: number
    originalHeight: number
  } | null>(null)

  // Inline text editing state
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const textInputRef = useRef<HTMLTextAreaElement>(null)

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
    updateLayerText,
    getSelectedLayer,
    setLayerPosition,
    resizeLayer,
    setLayerTransform,
    setBrushSettings,
    addImageAsLayer,
    selectLayer,
    filters,
    filterMode,
    livePreview,
    fitToViewTrigger,
    cropLayerToBounds,
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

  // Build filter string from a Filters object (for layer-specific filters)
  const buildFilterString = useCallback((f: Filters): string => {
    const filterParts: string[] = []

    if (f.brightness !== 0) {
      filterParts.push(`brightness(${100 + f.brightness}%)`)
    }
    if (f.contrast !== 0) {
      filterParts.push(`contrast(${100 + f.contrast}%)`)
    }
    if (f.saturation !== 0) {
      filterParts.push(`saturate(${100 + f.saturation}%)`)
    }
    if (f.hue !== 0) {
      filterParts.push(`hue-rotate(${f.hue}deg)`)
    }
    if (f.blur > 0) {
      filterParts.push(`blur(${f.blur}px)`)
    }
    if (f.grayscale) {
      filterParts.push('grayscale(100%)')
    }
    if (f.sepia) {
      filterParts.push('sepia(100%)')
    }
    if (f.invert) {
      filterParts.push('invert(100%)')
    }

    return filterParts.length > 0 ? filterParts.join(' ') : 'none'
  }, [])

  // Check if filters need pixel manipulation (not just CSS filters)
  const needsPixelManipulation = useCallback((f: Filters): boolean => {
    return f.sharpen > 0 || f.noise > 0 || f.pixelate > 0 || f.posterize > 0 ||
           f.vignette > 0 || f.emboss || f.edgeDetect || f.tintAmount > 0
  }, [])

  // Get layer at a specific position (Canva-style selection with pixel-perfect transparency detection)
  const getLayerAtPosition = useCallback((x: number, y: number): Layer | null => {
    if (!currentProject) return null

    // Iterate from top to bottom (last layer = topmost)
    const layers = [...currentProject.layers].reverse()

    // Track first layer that's in bounds but has transparent pixel (fallback)
    let fallbackLayer: Layer | null = null

    for (const layer of layers) {
      if (!layer.visible || layer.locked) continue

      // Bounding box check first
      const inBounds = x >= layer.x && x <= layer.x + layer.width &&
          y >= layer.y && y <= layer.y + layer.height

      if (inBounds) {
        // For image layers, check pixel transparency
        if (layer.type === 'image') {
          const layerCanvas = layerCanvasesRef.current.get(layer.id)
          if (layerCanvas) {
            const ctx = layerCanvas.getContext('2d')
            if (ctx) {
              // Convert click position to layer-local coordinates
              const localX = Math.floor(x - layer.x)
              const localY = Math.floor(y - layer.y)

              // Make sure we're within the canvas bounds
              if (localX >= 0 && localX < layerCanvas.width &&
                  localY >= 0 && localY < layerCanvas.height) {
                const pixel = ctx.getImageData(localX, localY, 1, 1).data
                const alpha = pixel[3]

                // If pixel is mostly transparent, save as fallback and continue
                if (alpha < 10) {
                  if (!fallbackLayer) {
                    fallbackLayer = layer
                  }
                  continue
                }
              }
            }
          }
        }

        // Found a solid pixel or non-image layer
        return layer
      }
    }

    // If no solid pixel found, return the fallback (first layer in bounds)
    return fallbackLayer
  }, [currentProject])

  // Apply pixel-based filters to ImageData
  const applyPixelFilters = useCallback((ctx: CanvasRenderingContext2D, f: Filters, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    // Pixelate (do first as it changes structure)
    if (f.pixelate > 1) {
      const size = Math.max(2, Math.floor(f.pixelate))
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = width
      tempCanvas.height = height
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        // Scale down
        const smallWidth = Math.ceil(width / size)
        const smallHeight = Math.ceil(height / size)
        tempCtx.drawImage(ctx.canvas, 0, 0, smallWidth, smallHeight)
        // Scale back up with pixelation
        ctx.imageSmoothingEnabled = false
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(tempCanvas, 0, 0, smallWidth, smallHeight, 0, 0, width, height)
        ctx.imageSmoothingEnabled = true
        // Re-get imageData after pixelation
        const newImageData = ctx.getImageData(0, 0, width, height)
        for (let i = 0; i < data.length; i++) {
          data[i] = newImageData.data[i]
        }
      }
    }

    // Posterize (reduce color levels)
    if (f.posterize > 0 && f.posterize < 256) {
      const levels = Math.max(2, f.posterize)
      const step = 255 / (levels - 1)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(Math.round(data[i] / step) * step)
        data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step)
        data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step)
      }
    }

    // Noise
    if (f.noise > 0) {
      const amount = f.noise * 2.55 // 0-255 range
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue // Skip transparent
        const noise = (Math.random() - 0.5) * amount
        data[i] = Math.max(0, Math.min(255, data[i] + noise))
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
      }
    }

    // Tint
    if (f.tintAmount > 0 && f.tintColor) {
      const hex = f.tintColor.replace('#', '')
      const tintR = parseInt(hex.substring(0, 2), 16)
      const tintG = parseInt(hex.substring(2, 4), 16)
      const tintB = parseInt(hex.substring(4, 6), 16)
      const amount = f.tintAmount / 100
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue
        data[i] = data[i] * (1 - amount) + tintR * amount
        data[i + 1] = data[i + 1] * (1 - amount) + tintG * amount
        data[i + 2] = data[i + 2] * (1 - amount) + tintB * amount
      }
    }

    // Vignette
    if (f.vignette > 0) {
      const centerX = width / 2
      const centerY = height / 2
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)
      const strength = f.vignette / 100
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          if (data[i + 3] === 0) continue
          const dx = x - centerX
          const dy = y - centerY
          const dist = Math.sqrt(dx * dx + dy * dy) / maxDist
          const vignette = 1 - (dist * dist * strength)
          data[i] *= vignette
          data[i + 1] *= vignette
          data[i + 2] *= vignette
        }
      }
    }

    // Sharpen (3x3 convolution)
    if (f.sharpen > 0) {
      const amount = f.sharpen / 100
      const kernel = [
        0, -amount, 0,
        -amount, 1 + 4 * amount, -amount,
        0, -amount, 0
      ]
      const tempData = new Uint8ClampedArray(data)
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = (y * width + x) * 4
          if (tempData[i + 3] === 0) continue
          for (let c = 0; c < 3; c++) {
            let sum = 0
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const ki = ((y + ky) * width + (x + kx)) * 4 + c
                sum += tempData[ki] * kernel[(ky + 1) * 3 + (kx + 1)]
              }
            }
            data[i + c] = Math.max(0, Math.min(255, sum))
          }
        }
      }
    }

    // Emboss
    if (f.emboss) {
      const kernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2]
      const tempData = new Uint8ClampedArray(data)
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = (y * width + x) * 4
          if (tempData[i + 3] === 0) continue
          for (let c = 0; c < 3; c++) {
            let sum = 128
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const ki = ((y + ky) * width + (x + kx)) * 4 + c
                sum += tempData[ki] * kernel[(ky + 1) * 3 + (kx + 1)]
              }
            }
            data[i + c] = Math.max(0, Math.min(255, sum))
          }
        }
      }
    }

    // Edge Detection
    if (f.edgeDetect) {
      const kernel = [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      const tempData = new Uint8ClampedArray(data)
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = (y * width + x) * 4
          if (tempData[i + 3] === 0) continue
          for (let c = 0; c < 3; c++) {
            let sum = 0
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const ki = ((y + ky) * width + (x + kx)) * 4 + c
                sum += tempData[ki] * kernel[(ky + 1) * 3 + (kx + 1)]
              }
            }
            data[i + c] = Math.max(0, Math.min(255, sum))
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [])

  // Layer canvases for compositing
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map())
  // Track which imageData we've drawn for each layer to detect changes
  const layerImageDataRef = useRef<Map<string, string>>(new Map())

  // Initialize layer canvases when project changes
  useEffect(() => {
    if (!currentProject) return

    currentProject.layers.forEach((layer) => {
      let canvas = layerCanvasesRef.current.get(layer.id)
      const lastImageData = layerImageDataRef.current.get(layer.id)
      const imageDataChanged = layer.imageData && layer.imageData !== lastImageData

      // Create canvas if it doesn't exist
      if (!canvas) {
        canvas = document.createElement('canvas')
        canvas.width = currentProject.width
        canvas.height = currentProject.height
        layerCanvasesRef.current.set(layer.id, canvas)
      }

      // Draw/redraw image if imageData exists and has changed
      if (layer.imageData && (!lastImageData || imageDataChanged)) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Clear canvas before drawing new image
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          pendingImagesRef.current++
          const img = new Image()
          img.onload = () => {
            // Draw scaled to fill the entire canvas - rendering will scale to layer dimensions
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)
            // Track that we've drawn this imageData
            layerImageDataRef.current.set(layer.id, layer.imageData!)
            // Trigger re-render after image is loaded
            pendingImagesRef.current--
            setImagesLoaded((n) => n + 1)
          }
          img.src = layer.imageData
        }
      }
    })

    // Clean up removed layers
    layerCanvasesRef.current.forEach((_, id) => {
      if (!currentProject.layers.find((l) => l.id === id)) {
        layerCanvasesRef.current.delete(id)
        layerImageDataRef.current.delete(id)
      }
    })
  }, [currentProject])

  // Track last project ID to detect project changes
  const lastProjectIdRef = useRef<string | null>(null)

  // Helper function to calculate and set fit-to-view zoom
  const calculateFitToView = useCallback(() => {
    const container = containerRef.current
    if (!container || !currentProject) return

    // Calculate available space (subtract padding)
    const containerWidth = container.clientWidth - 48
    const containerHeight = container.clientHeight - 48

    // Calculate zoom to fit
    const scaleX = containerWidth / currentProject.width
    const scaleY = containerHeight / currentProject.height
    const fitZoom = Math.min(scaleX, scaleY) * 100

    // Clamp between 10% and 100% (don't zoom in beyond 100%)
    const clampedZoom = Math.max(10, Math.min(100, Math.floor(fitZoom)))

    setZoom(clampedZoom)
  }, [currentProject, setZoom])

  // Track project ID changes (for reference, but no auto-fit)
  useEffect(() => {
    if (currentProject) {
      lastProjectIdRef.current = currentProject.id
    }
  }, [currentProject?.id])

  // Fit to view when triggered by button only
  useEffect(() => {
    if (fitToViewTrigger > 0 && currentProject) {
      // Small delay to ensure container is properly sized
      const timer = setTimeout(calculateFitToView, 100)
      return () => clearTimeout(timer)
    }
  }, [fitToViewTrigger, calculateFitToView, currentProject])

  // Render text layer with effects
  const renderTextLayer = useCallback((ctx: CanvasRenderingContext2D, layer: Layer) => {
    if (layer.type !== 'text' || !layer.text) return

    const effects = layer.textEffects || DEFAULT_TEXT_EFFECTS
    const fontSize = layer.fontSize || 48
    const fontFamily = layer.fontFamily || 'Arial'
    const fontWeight = layer.fontWeight || 400
    const textAlign = layer.textAlign || 'left'
    const fontColor = layer.fontColor || '#ffffff'

    ctx.save()
    ctx.globalAlpha = layer.opacity / 100
    ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation

    // Apply transforms
    ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2)
    ctx.rotate((layer.rotation * Math.PI) / 180)
    ctx.translate(-layer.width / 2, -layer.height / 2)

    // Set font
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    ctx.textAlign = textAlign
    ctx.textBaseline = 'top'

    // Calculate text position based on alignment
    let textX = 0
    if (textAlign === 'center') {
      textX = layer.width / 2
    } else if (textAlign === 'right') {
      textX = layer.width
    }

    // Handle curved text
    if (effects.curve !== 0) {
      renderCurvedText(ctx, layer.text, textX, fontSize / 2, layer.width, effects, fontColor, fontSize)
    } else {
      // Render glow effect (multiple blurred shadows)
      if (effects.glow.enabled) {
        ctx.save()
        ctx.shadowColor = effects.glow.color
        ctx.shadowBlur = effects.glow.intensity
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        // Draw multiple times for stronger glow
        ctx.fillStyle = effects.glow.color
        for (let i = 0; i < 3; i++) {
          ctx.fillText(layer.text, textX, fontSize / 2)
        }
        ctx.restore()
      }

      // Render shadow effect
      if (effects.shadow.enabled) {
        ctx.save()
        ctx.shadowColor = effects.shadow.color
        ctx.shadowBlur = effects.shadow.blur
        ctx.shadowOffsetX = effects.shadow.offsetX
        ctx.shadowOffsetY = effects.shadow.offsetY
        ctx.fillStyle = fontColor
        ctx.fillText(layer.text, textX, fontSize / 2)
        ctx.restore()
      }

      // Render outline effect
      if (effects.outline.enabled) {
        ctx.save()
        ctx.strokeStyle = effects.outline.color
        ctx.lineWidth = effects.outline.width * 2
        ctx.lineJoin = 'round'
        ctx.strokeText(layer.text, textX, fontSize / 2)
        ctx.restore()
      }

      // Render main text
      ctx.fillStyle = fontColor
      ctx.fillText(layer.text, textX, fontSize / 2)
    }

    ctx.restore()
  }, [])

  // Render curved text along an arc
  const renderCurvedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    width: number,
    effects: typeof DEFAULT_TEXT_EFFECTS,
    fontColor: string,
    fontSize: number
  ) => {
    ctx.save()

    // Calculate arc properties based on curve value (-100 to 100)
    const curveAmount = effects.curve / 100
    const isConvex = curveAmount > 0

    // Measure total text width first
    const textWidth = ctx.measureText(text).width

    // Calculate radius based on curve amount
    // Use text width to determine sensible radius - smaller curve = larger radius
    const minRadius = textWidth / Math.PI // Minimum radius for half circle
    const maxRadius = textWidth * 10 // Very flat curve
    const radius = minRadius + (maxRadius - minRadius) * (1 - Math.abs(curveAmount))

    // Calculate total angle span based on text width and radius
    // arc length = radius * angle, so angle = textWidth / radius
    const totalAngle = textWidth / radius

    // Arc center position
    const arcCenterX = x
    const arcCenterY = isConvex ? y + radius : y - radius + fontSize

    // Starting angle (center the text on the arc)
    // For convex (curving up), text goes from left to right on bottom of arc
    // For concave (curving down), text goes from left to right on top of arc
    const startAngle = isConvex
      ? -Math.PI / 2 - totalAngle / 2  // Start from left side of top
      : Math.PI / 2 - totalAngle / 2   // Start from left side of bottom

    // Calculate character widths and positions
    const chars: { char: string; width: number }[] = []
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      chars.push({ char, width: ctx.measureText(char).width })
    }

    // Move to arc center
    ctx.translate(arcCenterX, arcCenterY)

    // Track current angle position
    let currentAngle = startAngle

    // Draw each character
    for (let i = 0; i < chars.length; i++) {
      const { char, width: charWidth } = chars[i]

      // Angle for this character (center of character)
      const charAngle = currentAngle + (charWidth / 2) / radius

      ctx.save()

      // Rotate to the angle position on the arc
      ctx.rotate(charAngle)

      // Move outward from center to the arc radius
      // For convex, text is below arc center, so we translate negative (up in rotated space)
      // For concave, text is above arc center, so we translate positive (down in rotated space)
      ctx.translate(0, isConvex ? -radius : radius)

      // Rotate character to be upright
      // For convex, the character needs to face outward (away from center)
      // For concave, the character needs to face inward (toward center)
      if (!isConvex) {
        ctx.rotate(Math.PI) // Flip the character for concave curve
      }

      // Apply effects to each character
      if (effects.glow.enabled) {
        ctx.shadowColor = effects.glow.color
        ctx.shadowBlur = effects.glow.intensity
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        ctx.fillStyle = effects.glow.color
        for (let g = 0; g < 3; g++) {
          ctx.fillText(char, -charWidth / 2, 0)
        }
      }

      if (effects.shadow.enabled) {
        ctx.save()
        ctx.shadowColor = effects.shadow.color
        ctx.shadowBlur = effects.shadow.blur
        ctx.shadowOffsetX = effects.shadow.offsetX
        ctx.shadowOffsetY = effects.shadow.offsetY
        ctx.fillStyle = fontColor
        ctx.fillText(char, -charWidth / 2, 0)
        ctx.restore()
      }

      if (effects.outline.enabled) {
        ctx.save()
        ctx.strokeStyle = effects.outline.color
        ctx.lineWidth = effects.outline.width * 2
        ctx.lineJoin = 'round'
        ctx.strokeText(char, -charWidth / 2, 0)
        ctx.restore()
      }

      // Draw the main character
      ctx.fillStyle = fontColor
      ctx.fillText(char, -charWidth / 2, 0)

      ctx.restore()

      // Move to next character position
      currentAngle += charWidth / radius
    }

    ctx.restore()
  }

  // Render layer effects (shadows and glows) for image/shape layers
  const renderLayerEffects = useCallback((
    ctx: CanvasRenderingContext2D,
    layer: Layer,
    layerCanvas: HTMLCanvasElement,
    effects: LayerEffects
  ) => {
    // Draw outer glow (before main image)
    if (effects.outerGlow.enabled) {
      ctx.save()
      ctx.globalAlpha = effects.outerGlow.opacity / 100

      // Create glow by drawing blurred versions
      for (let i = 0; i < 3; i++) {
        ctx.shadowColor = effects.outerGlow.color
        ctx.shadowBlur = effects.outerGlow.blur + effects.outerGlow.spread
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        ctx.drawImage(layerCanvas, 0, 0, layerCanvas.width, layerCanvas.height, 0, 0, layer.width, layer.height)
      }
      ctx.restore()

      // Clear the actual image we just drew, keeping only the shadow
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.drawImage(layerCanvas, 0, 0, layerCanvas.width, layerCanvas.height, 0, 0, layer.width, layer.height)
      ctx.restore()
    }

    // Draw drop shadow (before main image)
    if (effects.dropShadow.enabled) {
      ctx.save()
      ctx.globalAlpha = effects.dropShadow.opacity / 100
      ctx.shadowColor = effects.dropShadow.color
      ctx.shadowBlur = effects.dropShadow.blur
      ctx.shadowOffsetX = effects.dropShadow.offsetX
      ctx.shadowOffsetY = effects.dropShadow.offsetY

      // Draw the image to create shadow, then remove it
      ctx.drawImage(layerCanvas, 0, 0, layerCanvas.width, layerCanvas.height, 0, 0, layer.width, layer.height)
      ctx.restore()

      // Clear the actual image we just drew, keeping only the shadow
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.drawImage(layerCanvas, 0, 0, layerCanvas.width, layerCanvas.height, 0, 0, layer.width, layer.height)
      ctx.restore()
    }
  }, [])

  // Render inner effects (after main image)
  const renderInnerEffects = useCallback((
    ctx: CanvasRenderingContext2D,
    layer: Layer,
    layerCanvas: HTMLCanvasElement,
    effects: LayerEffects
  ) => {
    // Inner glow - draw glow on the inside edges of the shape
    if (effects.innerGlow.enabled) {
      ctx.save()
      ctx.globalAlpha = effects.innerGlow.opacity / 100
      ctx.globalCompositeOperation = 'source-atop'

      // Create inner glow by inverting and using shadow
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = layer.width
      tempCanvas.height = layer.height
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        // Draw the layer shape
        tempCtx.drawImage(layerCanvas, 0, 0, layerCanvas.width, layerCanvas.height, 0, 0, layer.width, layer.height)

        // Draw inward shadow by drawing scaled up version with shadow
        tempCtx.globalCompositeOperation = 'source-in'
        tempCtx.shadowColor = effects.innerGlow.color
        tempCtx.shadowBlur = effects.innerGlow.blur
        tempCtx.shadowOffsetX = 0
        tempCtx.shadowOffsetY = 0

        // Draw border stroke inward
        tempCtx.strokeStyle = effects.innerGlow.color
        tempCtx.lineWidth = effects.innerGlow.blur * 2

        // Use the alpha channel to create inner glow
        for (let i = 0; i < 2; i++) {
          tempCtx.drawImage(layerCanvas, 0, 0, layerCanvas.width, layerCanvas.height, 0, 0, layer.width, layer.height)
        }

        ctx.drawImage(tempCanvas, 0, 0)
      }
      ctx.restore()
    }

    // Inner shadow
    if (effects.innerShadow.enabled) {
      ctx.save()
      ctx.globalCompositeOperation = 'source-atop'
      ctx.globalAlpha = effects.innerShadow.opacity / 100

      // Create inner shadow using inverted shape
      const tempCanvas = document.createElement('canvas')
      const padding = effects.innerShadow.blur * 2 + Math.abs(effects.innerShadow.offsetX) + Math.abs(effects.innerShadow.offsetY)
      tempCanvas.width = layer.width + padding * 2
      tempCanvas.height = layer.height + padding * 2
      const tempCtx = tempCanvas.getContext('2d')

      if (tempCtx) {
        // Fill with shadow color
        tempCtx.fillStyle = effects.innerShadow.color
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

        // Cut out the shape (offset to create shadow direction)
        tempCtx.globalCompositeOperation = 'destination-out'
        tempCtx.shadowColor = effects.innerShadow.color
        tempCtx.shadowBlur = effects.innerShadow.blur
        tempCtx.shadowOffsetX = -effects.innerShadow.offsetX
        tempCtx.shadowOffsetY = -effects.innerShadow.offsetY
        tempCtx.drawImage(
          layerCanvas,
          0, 0, layerCanvas.width, layerCanvas.height,
          padding + effects.innerShadow.offsetX,
          padding + effects.innerShadow.offsetY,
          layer.width, layer.height
        )

        // Draw only where original shape is
        ctx.drawImage(tempCanvas, -padding, -padding)
      }
      ctx.restore()
    }
  }, [])

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

      // Render text layers with effects
      if (layer.type === 'text' && layer.text) {
        renderTextLayer(ctx, layer)
        return
      }

      const layerCanvas = layerCanvasesRef.current.get(layer.id)
      if (!layerCanvas) return

      ctx.save()
      ctx.globalAlpha = layer.opacity / 100
      ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation

      // Determine which filters to apply
      let activeFilters: Filters | null = null
      if (livePreview && filterMode === 'layer' && layer.id === selectedLayerId) {
        activeFilters = filters
      } else if (livePreview && filterMode === 'global') {
        activeFilters = {
          ...(layer.filters || DEFAULT_FILTERS),
          brightness: (layer.filters?.brightness || 0) + filters.brightness,
          contrast: (layer.filters?.contrast || 0) + filters.contrast,
          saturation: (layer.filters?.saturation || 0) + filters.saturation,
          hue: (layer.filters?.hue || 0) + filters.hue,
          blur: (layer.filters?.blur || 0) + filters.blur,
          sharpen: (layer.filters?.sharpen || 0) + filters.sharpen,
          noise: (layer.filters?.noise || 0) + filters.noise,
          pixelate: (layer.filters?.pixelate || 0) + filters.pixelate,
          posterize: filters.posterize || layer.filters?.posterize || 0,
          vignette: (layer.filters?.vignette || 0) + filters.vignette,
          grayscale: layer.filters?.grayscale || filters.grayscale,
          sepia: layer.filters?.sepia || filters.sepia,
          invert: layer.filters?.invert || filters.invert,
          emboss: layer.filters?.emboss || filters.emboss,
          edgeDetect: layer.filters?.edgeDetect || filters.edgeDetect,
          tintColor: filters.tintColor || layer.filters?.tintColor || '#ff0000',
          tintAmount: (layer.filters?.tintAmount || 0) + filters.tintAmount,
        }
      } else if (layer.filters) {
        activeFilters = layer.filters
      }

      const layerFilterStr = activeFilters ? buildFilterString(activeFilters) : 'none'
      const needsPixel = activeFilters && needsPixelManipulation(activeFilters)

      // Get layer effects
      const layerEffects = layer.layerEffects || DEFAULT_LAYER_EFFECTS
      const hasOuterEffects = layerEffects.dropShadow.enabled || layerEffects.outerGlow.enabled
      const hasInnerEffects = layerEffects.innerShadow.enabled || layerEffects.innerGlow.enabled

      // Apply transforms
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2)
      ctx.rotate((layer.rotation * Math.PI) / 180)
      ctx.translate(-layer.width / 2, -layer.height / 2)

      // Render outer effects first (drop shadow, outer glow)
      if (hasOuterEffects && (layer.type === 'image' || layer.type === 'shape')) {
        renderLayerEffects(ctx, layer, layerCanvas, layerEffects)
      }

      // Check if this layer is being crop-previewed (freeTransform resize in progress)
      const isCropPreview = cropPreview && cropPreview.layerId === layer.id && isResizingLayer

      if (isCropPreview) {
        // Crop preview mode: show original image clipped to current bounds
        // Draw at original scale, offset to show the correct portion
        const offsetX = layer.x - cropPreview.originalX
        const offsetY = layer.y - cropPreview.originalY

        // First draw the parts that will be cropped with low opacity
        ctx.save()
        ctx.globalAlpha = (layer.opacity / 100) * 0.2
        ctx.filter = layerFilterStr
        // Draw full image at original size, offset by the difference
        ctx.drawImage(
          layerCanvas,
          0, 0, layerCanvas.width, layerCanvas.height,
          -offsetX, -offsetY, cropPreview.originalWidth, cropPreview.originalHeight
        )
        ctx.restore()

        // Then draw the kept portion at full opacity with clip
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, layer.width, layer.height)
        ctx.clip()
        ctx.globalAlpha = layer.opacity / 100
        ctx.filter = layerFilterStr
        ctx.drawImage(
          layerCanvas,
          0, 0, layerCanvas.width, layerCanvas.height,
          -offsetX, -offsetY, cropPreview.originalWidth, cropPreview.originalHeight
        )
        ctx.restore()
      } else if (needsPixel && activeFilters) {
        // Need pixel manipulation - use temp canvas
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = layer.width
        tempCanvas.height = layer.height
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx) {
          // Apply CSS filters first
          tempCtx.filter = layerFilterStr
          tempCtx.drawImage(layerCanvas, 0, 0, layerCanvas.width, layerCanvas.height, 0, 0, layer.width, layer.height)
          tempCtx.filter = 'none'
          // Apply pixel-based filters
          applyPixelFilters(tempCtx, activeFilters, layer.width, layer.height)
          // Draw result to main canvas
          ctx.drawImage(tempCanvas, 0, 0)
        }
      } else {
        // Just CSS filters
        ctx.filter = layerFilterStr
        ctx.drawImage(layerCanvas, 0, 0, layerCanvas.width, layerCanvas.height, 0, 0, layer.width, layer.height)
      }

      // Render inner effects after the main layer (inner shadow, inner glow)
      if (hasInnerEffects && (layer.type === 'image' || layer.type === 'shape')) {
        ctx.filter = 'none'
        renderInnerEffects(ctx, layer, layerCanvas, layerEffects)
      }

      ctx.restore()
    })
  }, [currentProject, renderTextLayer, livePreview, filterMode, selectedLayerId, filters, buildFilterString, needsPixelManipulation, applyPixelFilters, renderLayerEffects, renderInnerEffects, cropPreview, isResizingLayer])

  // Render when project changes or images load
  useEffect(() => {
    render()
  }, [render, currentProject, imagesLoaded])

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

  // Global mouse events for layer resize
  useEffect(() => {
    if (!isResizingLayer) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!resizeStart || !resizeHandle || !selectedLayerId || !canvasRef.current || !currentProject) return

      // Get the canvas wrapper element for coordinate calculation
      const rect = canvasRef.current.getBoundingClientRect()

      // Calculate coordinates relative to canvas, accounting for zoom
      // The canvas display size is scaled by zoom/100
      const scale = 100 / zoom
      const x = (e.clientX - rect.left) * scale
      const y = (e.clientY - rect.top) * scale

      const dx = x - resizeStart.mouseX
      const dy = y - resizeStart.mouseY

      let newX = resizeStart.layerX
      let newY = resizeStart.layerY
      let newWidth = resizeStart.layerWidth
      let newHeight = resizeStart.layerHeight

      // Calculate aspect ratio
      const aspectRatio = resizeStart.layerWidth / resizeStart.layerHeight
      const isFreeTransform = activeTool === 'freeTransform'
      const isCornerHandle = ['nw', 'ne', 'se', 'sw'].includes(resizeHandle)

      switch (resizeHandle) {
        case 'nw':
          if (isFreeTransform) {
            newX = resizeStart.layerX + dx
            newY = resizeStart.layerY + dy
            newWidth = resizeStart.layerWidth - dx
            newHeight = resizeStart.layerHeight - dy
          } else {
            // Maintain aspect ratio - use the larger delta
            const deltaW = -dx
            const deltaH = -dy
            const scaleByWidth = deltaW / resizeStart.layerWidth
            const scaleByHeight = deltaH / resizeStart.layerHeight
            const scale = Math.abs(scaleByWidth) > Math.abs(scaleByHeight) ? scaleByWidth : scaleByHeight
            newWidth = resizeStart.layerWidth * (1 + scale)
            newHeight = resizeStart.layerHeight * (1 + scale)
            newX = resizeStart.layerX + resizeStart.layerWidth - newWidth
            newY = resizeStart.layerY + resizeStart.layerHeight - newHeight
          }
          break
        case 'n':
          newY = resizeStart.layerY + dy
          newHeight = resizeStart.layerHeight - dy
          break
        case 'ne':
          if (isFreeTransform) {
            newY = resizeStart.layerY + dy
            newWidth = resizeStart.layerWidth + dx
            newHeight = resizeStart.layerHeight - dy
          } else {
            const deltaW = dx
            const deltaH = -dy
            const scaleByWidth = deltaW / resizeStart.layerWidth
            const scaleByHeight = deltaH / resizeStart.layerHeight
            const scale = Math.abs(scaleByWidth) > Math.abs(scaleByHeight) ? scaleByWidth : scaleByHeight
            newWidth = resizeStart.layerWidth * (1 + scale)
            newHeight = resizeStart.layerHeight * (1 + scale)
            newY = resizeStart.layerY + resizeStart.layerHeight - newHeight
          }
          break
        case 'e':
          newWidth = resizeStart.layerWidth + dx
          break
        case 'se':
          if (isFreeTransform) {
            newWidth = resizeStart.layerWidth + dx
            newHeight = resizeStart.layerHeight + dy
          } else {
            const deltaW = dx
            const deltaH = dy
            const scaleByWidth = deltaW / resizeStart.layerWidth
            const scaleByHeight = deltaH / resizeStart.layerHeight
            const scale = Math.abs(scaleByWidth) > Math.abs(scaleByHeight) ? scaleByWidth : scaleByHeight
            newWidth = resizeStart.layerWidth * (1 + scale)
            newHeight = resizeStart.layerHeight * (1 + scale)
          }
          break
        case 's':
          newHeight = resizeStart.layerHeight + dy
          break
        case 'sw':
          if (isFreeTransform) {
            newX = resizeStart.layerX + dx
            newWidth = resizeStart.layerWidth - dx
            newHeight = resizeStart.layerHeight + dy
          } else {
            const deltaW = -dx
            const deltaH = dy
            const scaleByWidth = deltaW / resizeStart.layerWidth
            const scaleByHeight = deltaH / resizeStart.layerHeight
            const scale = Math.abs(scaleByWidth) > Math.abs(scaleByHeight) ? scaleByWidth : scaleByHeight
            newWidth = resizeStart.layerWidth * (1 + scale)
            newHeight = resizeStart.layerHeight * (1 + scale)
            newX = resizeStart.layerX + resizeStart.layerWidth - newWidth
          }
          break
        case 'w':
          newX = resizeStart.layerX + dx
          newWidth = resizeStart.layerWidth - dx
          break
      }

      // Minimum size constraints
      if (newWidth >= 20 && newHeight >= 20) {
        setLayerTransform(selectedLayerId, Math.round(newX), Math.round(newY), Math.round(newWidth), Math.round(newHeight))
      }
    }

    const handleGlobalMouseUp = () => {
      if (isResizingLayer && selectedLayerId) {
        // In freeTransform mode, apply crop after resize
        if (activeTool === 'freeTransform' && cropPreview && cropPreview.layerId === selectedLayerId) {
          // Apply the crop to the layer image data with original bounds for true cropping
          cropLayerToBounds(selectedLayerId, {
            x: cropPreview.originalX,
            y: cropPreview.originalY,
            width: cropPreview.originalWidth,
            height: cropPreview.originalHeight,
          })
          setCropPreview(null)
        } else {
          pushHistory('Resize Layer')
        }
      }
      setIsResizingLayer(false)
      setResizeHandle(null)
      setResizeStart(null)
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isResizingLayer, resizeStart, resizeHandle, selectedLayerId, currentProject, zoom, setLayerTransform, pushHistory, activeTool, cropPreview, cropLayerToBounds])

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
      if (!selectedLayerId || !currentProject) return

      const layer = currentProject.layers.find(l => l.id === selectedLayerId)
      if (!layer) return

      const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
      if (!layerCanvas) return
      const ctx = layerCanvas.getContext('2d')
      if (!ctx) return

      // Transform coordinates from project space to layer canvas space
      // Layer canvas is at project size, but layer is drawn at layer.x, layer.y with layer.width, layer.height
      const scaleX = layerCanvas.width / layer.width
      const scaleY = layerCanvas.height / layer.height
      const fromX = (from.x - layer.x) * scaleX
      const fromY = (from.y - layer.y) * scaleY
      const toX = (to.x - layer.x) * scaleX
      const toY = (to.y - layer.y) * scaleY

      const isPencil = activeTool === 'pencil'
      const isEraser = activeTool === 'eraser'
      const isHighlighter = activeTool === 'highlighter'
      const settings = isEraser ? eraserSettings : brushSettings

      // Scale brush size to match canvas coordinate system
      const scaledSize = settings.size * Math.max(scaleX, scaleY)

      ctx.save()
      ctx.lineCap = isPencil ? 'square' : 'round'
      ctx.lineJoin = isPencil ? 'miter' : 'round'
      ctx.lineWidth = isHighlighter ? scaledSize * 2 : scaledSize
      ctx.globalAlpha = isHighlighter ? 0.3 : settings.opacity / 100

      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)' // Color doesn't matter for destination-out, but stroke needs a style
      } else if (isHighlighter) {
        ctx.globalCompositeOperation = 'multiply'
        ctx.strokeStyle = brushSettings.color
      } else {
        ctx.strokeStyle = brushSettings.color
      }

      // Disable antialiasing for pencil
      if (isPencil) {
        ctx.imageSmoothingEnabled = false
      }

      // Draw line from last point to current point
      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
      ctx.stroke()
      ctx.restore()

      render()
    },
    [selectedLayerId, currentProject, activeTool, brushSettings, eraserSettings, render]
  )

  // Draw spray effect
  const drawSpray = useCallback(
    (x: number, y: number) => {
      if (!selectedLayerId || !currentProject) return

      const layer = currentProject.layers.find(l => l.id === selectedLayerId)
      if (!layer) return

      const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
      if (!layerCanvas) return
      const ctx = layerCanvas.getContext('2d')
      if (!ctx) return

      // Transform coordinates from project space to layer canvas space
      const scaleX = layerCanvas.width / layer.width
      const scaleY = layerCanvas.height / layer.height
      const canvasX = (x - layer.x) * scaleX
      const canvasY = (y - layer.y) * scaleY

      const radius = (brushSettings.size / 2) * Math.max(scaleX, scaleY)
      const density = Math.floor(brushSettings.size / 2)

      ctx.save()
      ctx.fillStyle = brushSettings.color
      ctx.globalAlpha = brushSettings.opacity / 100

      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2
        const r = Math.random() * radius
        const px = canvasX + Math.cos(angle) * r
        const py = canvasY + Math.sin(angle) * r
        ctx.fillRect(px, py, 1, 1)
      }

      ctx.restore()
      render()
    },
    [selectedLayerId, currentProject, brushSettings, render]
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
      if (constrained && activeTool !== 'line' && activeTool !== 'arrow') {
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
      } else if (activeTool === 'arrow') {
        // Draw arrow with head
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

        const headLength = Math.min(30, Math.sqrt(Math.pow(endX - start.x, 2) + Math.pow(endY - start.y, 2)) * 0.3)
        const angle = Math.atan2(endY - start.y, endX - start.x)

        // Draw line
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(endX, endY)
        ctx.strokeStyle = shapeSettings.fillColor
        ctx.lineWidth = shapeSettings.strokeWidth
        ctx.stroke()

        // Draw arrow head
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - headLength * Math.cos(angle - Math.PI / 6),
          endY - headLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          endX - headLength * Math.cos(angle + Math.PI / 6),
          endY - headLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.closePath()
        ctx.fillStyle = shapeSettings.fillColor
        ctx.fill()
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
      } else if (activeTool === 'polygon') {
        // Draw regular hexagon (6 sides)
        const sides = 6
        const centerX = x + width / 2
        const centerY = y + height / 2
        const radius = Math.min(Math.abs(width), Math.abs(height)) / 2

        ctx.beginPath()
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
          const px = centerX + radius * Math.cos(angle)
          const py = centerY + radius * Math.sin(angle)
          if (i === 0) {
            ctx.moveTo(px, py)
          } else {
            ctx.lineTo(px, py)
          }
        }
        ctx.closePath()
        if (shapeSettings.filled) {
          ctx.fill()
        }
        if (shapeSettings.stroked) {
          ctx.stroke()
        }
      } else if (activeTool === 'star') {
        // Draw 5-pointed star
        const points = 5
        const centerX = x + width / 2
        const centerY = y + height / 2
        const outerRadius = Math.min(Math.abs(width), Math.abs(height)) / 2
        const innerRadius = outerRadius * 0.4

        ctx.beginPath()
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius
          const angle = (i * Math.PI) / points - Math.PI / 2
          const px = centerX + radius * Math.cos(angle)
          const py = centerY + radius * Math.sin(angle)
          if (i === 0) {
            ctx.moveTo(px, py)
          } else {
            ctx.lineTo(px, py)
          }
        }
        ctx.closePath()
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

  // Heal brush - simplified content-aware healing
  const applyHeal = useCallback(
    (x: number, y: number) => {
      if (!selectedLayerId || !currentProject) return

      const layerCanvas = layerCanvasesRef.current.get(selectedLayerId)
      const ctx = layerCanvas?.getContext('2d')
      if (!ctx) return

      const size = retouchSettings.size
      const strength = retouchSettings.strength / 100

      // Get image data for area around brush
      const sx = Math.max(0, Math.floor(x - size))
      const sy = Math.max(0, Math.floor(y - size))
      const sw = Math.min(size * 2, currentProject.width - sx)
      const sh = Math.min(size * 2, currentProject.height - sy)

      if (sw <= 0 || sh <= 0) return

      const imageData = ctx.getImageData(sx, sy, sw, sh)
      const data = imageData.data

      // Sample colors from the edges to fill the center
      const centerX = size
      const centerY = size
      const radius = size / 2

      // Get average colors from outside the brush area
      let avgR = 0, avgG = 0, avgB = 0, count = 0
      for (let py = 0; py < sh; py++) {
        for (let px = 0; px < sw; px++) {
          const dist = Math.sqrt(Math.pow(px - centerX, 2) + Math.pow(py - centerY, 2))
          // Sample from ring around brush
          if (dist > radius && dist < radius * 1.5) {
            const idx = (py * sw + px) * 4
            avgR += data[idx]
            avgG += data[idx + 1]
            avgB += data[idx + 2]
            count++
          }
        }
      }

      if (count > 0) {
        avgR = Math.round(avgR / count)
        avgG = Math.round(avgG / count)
        avgB = Math.round(avgB / count)

        // Blend center pixels towards average
        for (let py = 0; py < sh; py++) {
          for (let px = 0; px < sw; px++) {
            const dist = Math.sqrt(Math.pow(px - centerX, 2) + Math.pow(py - centerY, 2))
            if (dist < radius) {
              const idx = (py * sw + px) * 4
              const falloff = 1 - (dist / radius)
              const blend = strength * falloff

              data[idx] = Math.round(data[idx] * (1 - blend) + avgR * blend)
              data[idx + 1] = Math.round(data[idx + 1] * (1 - blend) + avgG * blend)
              data[idx + 2] = Math.round(data[idx + 2] * (1 - blend) + avgB * blend)
            }
          }
        }

        ctx.putImageData(imageData, sx, sy)
        render()
      }
    },
    [selectedLayerId, currentProject, retouchSettings, render]
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
      if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'pencil' || activeTool === 'highlighter') {
        if (!layer || layer.locked) return

        isDrawing.current = true
        lastPoint.current = coords
        pushHistory(activeTool === 'eraser' ? 'Erase' : activeTool === 'highlighter' ? 'Highlight' : 'Paint')

        // Draw single point
        drawStroke(coords, coords)
      }
      // Spray tool
      else if (activeTool === 'spray') {
        if (!layer || layer.locked) return
        isDrawing.current = true
        lastPoint.current = coords
        pushHistory('Spray')
        drawSpray(coords.x, coords.y)
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
      // Move tool - Canva-style: click to select layer, then drag to move
      else if (activeTool === 'move') {
        const clickedLayer = getLayerAtPosition(coords.x, coords.y)
        if (clickedLayer) {
          // Auto-select the clicked layer
          selectLayer(clickedLayer.id)
          // Store start point but don't start dragging yet (wait for threshold)
          moveStartPoint.current = coords
          lastPoint.current = coords
          isDraggingLayer.current = false
          isDrawing.current = true
        } else {
          // Click on empty area: deselect
          selectLayer(null)
          moveStartPoint.current = null
          isDraggingLayer.current = false
        }
      }
      // Select tool - just select layer without moving
      else if (activeTool === 'select') {
        const clickedLayer = getLayerAtPosition(coords.x, coords.y)
        if (clickedLayer) {
          selectLayer(clickedLayer.id)
        } else {
          selectLayer(null)
        }
      }
      // FreeTransform tool - click on empty area to deselect
      else if (activeTool === 'freeTransform') {
        const clickedLayer = getLayerAtPosition(coords.x, coords.y)
        if (clickedLayer) {
          selectLayer(clickedLayer.id)
        } else {
          selectLayer(null)
        }
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
      // Shape tools (line, rectangle, ellipse, polygon, star, arrow)
      else if (['line', 'rectangle', 'ellipse', 'polygon', 'star', 'arrow'].includes(activeTool)) {
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
      // Heal brush
      else if (activeTool === 'heal') {
        if (!layer || layer.locked) return
        isDrawing.current = true
        lastPoint.current = coords
        pushHistory('Heal')
        applyHeal(coords.x, coords.y)
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
    [currentProject, activeTool, isSpacePressed, getCanvasCoords, getSelectedLayer, pushHistory, drawStroke, drawSpray, setBrushSettings, onTextClick, floodFill, selectedLayerId, updateLayerImage, setCloneSettings, cloneSettings.sourceX, applyRetouch, applyHeal, magicWandSelect, getLayerAtPosition, selectLayer]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update cursor position for brush preview (show for all drawing tools)
      const cursorTools = ['brush', 'eraser', 'pencil', 'highlighter', 'spray', 'blur', 'sharpen', 'smudge', 'dodge', 'burn', 'clone', 'heal']
      if (cursorTools.includes(activeTool)) {
        setCursorPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })
      }

      // Hover detection for Canva-style selection
      if (activeTool === 'select' || activeTool === 'move' || activeTool === 'freeTransform') {
        const coords = getCanvasCoords(e)
        if (coords) {
          const hoveredLayer = getLayerAtPosition(coords.x, coords.y)
          setHoveredLayerId(hoveredLayer?.id || null)
        }
      } else {
        setHoveredLayerId(null)
      }

      // Handle panning
      if (isPanning && panStart.current && containerRef.current) {
        const dx = e.clientX - panStart.current.x
        const dy = e.clientY - panStart.current.y
        containerRef.current.scrollLeft = panStart.current.scrollX - dx
        containerRef.current.scrollTop = panStart.current.scrollY - dy
        return
      }

      // Layer resizing is handled by global mouse events in useEffect
      // to work correctly even when mouse leaves the canvas
      if (isResizingLayer) {
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
      if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'pencil' || activeTool === 'highlighter') {
        drawStroke(lastPoint.current, coords)
        lastPoint.current = coords
      }
      // Spray tool
      else if (activeTool === 'spray') {
        drawSpray(coords.x, coords.y)
        lastPoint.current = coords
      }
      // Move tool - with drag threshold to prevent accidental micro-movements
      else if (activeTool === 'move' && selectedLayerId) {
        // Check if we've passed the drag threshold
        if (!isDraggingLayer.current && moveStartPoint.current) {
          const distX = Math.abs(coords.x - moveStartPoint.current.x)
          const distY = Math.abs(coords.y - moveStartPoint.current.y)
          if (distX > DRAG_THRESHOLD || distY > DRAG_THRESHOLD) {
            isDraggingLayer.current = true
            pushHistory('Move Layer')
          }
        }

        // Only move if we're actually dragging (past threshold)
        if (isDraggingLayer.current) {
          const dx = coords.x - lastPoint.current.x
          const dy = coords.y - lastPoint.current.y
          const layer = getSelectedLayer()
          if (layer && !layer.locked) {
            setLayerPosition(selectedLayerId, layer.x + dx, layer.y + dy)
          }
          lastPoint.current = coords
        }
      }
      // Retouch tools
      else if (['blur', 'sharpen', 'smudge', 'dodge', 'burn'].includes(activeTool)) {
        applyRetouch(coords.x, coords.y)
        lastPoint.current = coords
      }
      // Heal brush
      else if (activeTool === 'heal') {
        applyHeal(coords.x, coords.y)
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
    [activeTool, selectedLayerId, isPanning, isCropping, isDrawingShape, isSelecting, isResizingLayer, getCanvasCoords, drawStroke, drawSpray, getSelectedLayer, setLayerPosition, applyRetouch, applyHeal, applyClone, cloneSettings, setCloneSettings, getLayerAtPosition, pushHistory]
  )

  const handleMouseUp = useCallback(() => {
    // Layer resizing is ended by global mouse events in useEffect
    if (isResizingLayer) {
      return
    }

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
      if (['line', 'rectangle', 'ellipse', 'polygon', 'star', 'arrow'].includes(activeTool)) {
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
    const drawingTools = ['brush', 'eraser', 'pencil', 'highlighter', 'spray', 'blur', 'sharpen', 'smudge', 'dodge', 'burn', 'clone', 'heal']
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
    isDraggingLayer.current = false
    moveStartPoint.current = null
  }, [activeTool, selectedLayerId, isPanning, isCropping, isDrawingShape, isSelecting, isResizingLayer, cropStart, cropEnd, shapeStart, shapeEnd, selectionStart, selectionEnd, lassoPath, shiftPressed, setCrop, setSelection, updateLayerImage, drawShape, drawGradient, pushHistory])

  // Cursor style
  const getCursor = () => {
    if (isSpacePressed) return 'grab'
    if (isPanning) return 'grabbing'

    switch (activeTool) {
      case 'brush':
      case 'pencil':
      case 'eraser':
      case 'highlighter':
      case 'spray':
      case 'blur':
      case 'sharpen':
      case 'smudge':
      case 'dodge':
      case 'burn':
      case 'clone':
      case 'heal':
        return 'none' // Hide cursor when we show custom brush preview
      case 'move':
        return 'move'
      case 'eyedropper':
      case 'bucket':
      case 'crop':
      case 'line':
      case 'rectangle':
      case 'ellipse':
      case 'polygon':
      case 'star':
      case 'arrow':
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
    if (activeTool === 'brush' || activeTool === 'pencil' || activeTool === 'spray') {
      return (brushSettings.size * zoom) / 100
    } else if (activeTool === 'highlighter') {
      return (brushSettings.size * 2 * zoom) / 100
    } else if (activeTool === 'eraser') {
      return (eraserSettings.size * zoom) / 100
    } else if (['blur', 'sharpen', 'smudge', 'dodge', 'burn', 'heal'].includes(activeTool)) {
      return (retouchSettings.size * zoom) / 100
    } else if (activeTool === 'clone') {
      return (cloneSettings.size * zoom) / 100
    }
    return 20
  }

  // Get brush cursor color
  const getBrushCursorColor = () => {
    if (activeTool === 'eraser') return 'rgba(255, 255, 255, 0.8)'
    if (activeTool === 'brush' || activeTool === 'pencil' || activeTool === 'spray') return brushSettings.color
    if (activeTool === 'highlighter') return brushSettings.color + '80'
    if (activeTool === 'dodge') return 'rgba(255, 255, 200, 0.8)'
    if (activeTool === 'burn') return 'rgba(100, 50, 0, 0.8)'
    if (activeTool === 'blur') return 'rgba(150, 150, 255, 0.8)'
    if (activeTool === 'clone') return 'rgba(100, 255, 100, 0.8)'
    if (activeTool === 'heal') return 'rgba(255, 150, 150, 0.8)'
    return 'rgba(255, 255, 255, 0.8)'
  }

  // Should show brush cursor
  const cursorTools = ['brush', 'pencil', 'eraser', 'highlighter', 'spray', 'blur', 'sharpen', 'smudge', 'dodge', 'burn', 'clone', 'heal']
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

  // Drag and drop handlers - must be before early return to maintain hook order
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

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950 text-gray-500">
        No project open
      </div>
    )
  }

  const displayWidth = (currentProject.width * zoom) / 100
  const displayHeight = (currentProject.height * zoom) / 100

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
      onMouseDown={(e) => {
        // Click on background pattern (outside canvas) should deselect
        // Only deselect if clicking directly on the container background itself
        if (e.target === containerRef.current) {
          selectLayer(null)
        }
      }}
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
            // Filters are now applied per-layer in the render function
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp()
            setCursorPos(null)
          }}
          onDoubleClick={(e) => {
            // Check if double-clicked on a text layer
            const rect = e.currentTarget.getBoundingClientRect()
            const x = (e.clientX - rect.left) / (zoom / 100)
            const y = (e.clientY - rect.top) / (zoom / 100)

            // Find text layer at this position
            const layers = currentProject?.layers || []
            for (let i = layers.length - 1; i >= 0; i--) {
              const layer = layers[i]
              if (layer.type === 'text' && layer.visible && !layer.locked) {
                if (
                  x >= layer.x &&
                  x <= layer.x + layer.width &&
                  y >= layer.y &&
                  y <= layer.y + layer.height
                ) {
                  setEditingTextLayerId(layer.id)
                  setEditingText(layer.text || '')
                  selectLayer(layer.id)
                  setTimeout(() => textInputRef.current?.focus(), 50)
                  break
                }
              }
            }
          }}
        />

        {/* Hover outline for Canva-style selection */}
        {hoveredLayerId && hoveredLayerId !== selectedLayerId && (() => {
          const hoveredLayer = currentProject?.layers.find(l => l.id === hoveredLayerId)
          if (!hoveredLayer) return null
          const scale = zoom / 100
          return (
            <div
              className="absolute border-2 border-violet-400/50 pointer-events-none"
              style={{
                left: hoveredLayer.x * scale,
                top: hoveredLayer.y * scale,
                width: hoveredLayer.width * scale,
                height: hoveredLayer.height * scale,
              }}
            />
          )
        })()}

        {/* Layer resize handles */}
        {(activeTool === 'select' || activeTool === 'move' || activeTool === 'freeTransform') && selectedLayerId && (() => {
          const layer = getSelectedLayer()
          if (!layer) return null

          const scale = zoom / 100
          const handleSize = 10
          const handles = [
            { id: 'nw', x: layer.x * scale - handleSize / 2, y: layer.y * scale - handleSize / 2, cursor: 'nw-resize' },
            { id: 'n', x: (layer.x + layer.width / 2) * scale - handleSize / 2, y: layer.y * scale - handleSize / 2, cursor: 'n-resize' },
            { id: 'ne', x: (layer.x + layer.width) * scale - handleSize / 2, y: layer.y * scale - handleSize / 2, cursor: 'ne-resize' },
            { id: 'e', x: (layer.x + layer.width) * scale - handleSize / 2, y: (layer.y + layer.height / 2) * scale - handleSize / 2, cursor: 'e-resize' },
            { id: 'se', x: (layer.x + layer.width) * scale - handleSize / 2, y: (layer.y + layer.height) * scale - handleSize / 2, cursor: 'se-resize' },
            { id: 's', x: (layer.x + layer.width / 2) * scale - handleSize / 2, y: (layer.y + layer.height) * scale - handleSize / 2, cursor: 's-resize' },
            { id: 'sw', x: layer.x * scale - handleSize / 2, y: (layer.y + layer.height) * scale - handleSize / 2, cursor: 'sw-resize' },
            { id: 'w', x: layer.x * scale - handleSize / 2, y: (layer.y + layer.height / 2) * scale - handleSize / 2, cursor: 'w-resize' },
          ]

          return (
            <>
              {/* Bounding box */}
              <div
                className="absolute border-2 border-violet-500 pointer-events-none"
                style={{
                  left: layer.x * scale,
                  top: layer.y * scale,
                  width: layer.width * scale,
                  height: layer.height * scale,
                }}
              />
              {/* Resize handles */}
              {handles.map((handle) => (
                <div
                  key={handle.id}
                  className="absolute bg-white border-2 border-violet-500 rounded-sm hover:bg-violet-200 transition-colors"
                  style={{
                    left: handle.x,
                    top: handle.y,
                    width: handleSize,
                    height: handleSize,
                    cursor: handle.cursor,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setIsResizingLayer(true)
                    setResizeHandle(handle.id)
                    // Calculate coordinates consistently with the global mouse move handler
                    if (canvasRef.current) {
                      const rect = canvasRef.current.getBoundingClientRect()
                      const zoomScale = 100 / zoom
                      const mouseX = (e.clientX - rect.left) * zoomScale
                      const mouseY = (e.clientY - rect.top) * zoomScale
                      setResizeStart({
                        mouseX,
                        mouseY,
                        layerX: layer.x,
                        layerY: layer.y,
                        layerWidth: layer.width,
                        layerHeight: layer.height,
                      })
                      // In freeTransform mode, start crop preview
                      if (activeTool === 'freeTransform') {
                        setCropPreview({
                          layerId: layer.id,
                          originalX: layer.x,
                          originalY: layer.y,
                          originalWidth: layer.width,
                          originalHeight: layer.height,
                        })
                      }
                    }
                  }}
                />
              ))}
            </>
          )
        })()}

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
            {activeTool === 'polygon' && (() => {
              let width = shapeEnd.x - shapeStart.x
              let height = shapeEnd.y - shapeStart.y
              if (shiftPressed) {
                const size = Math.max(Math.abs(width), Math.abs(height))
                width = width < 0 ? -size : size
                height = height < 0 ? -size : size
              }
              const centerX = shapeStart.x + width / 2
              const centerY = shapeStart.y + height / 2
              const radius = Math.min(Math.abs(width), Math.abs(height)) / 2
              const sides = 6
              const points = []
              for (let i = 0; i < sides; i++) {
                const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
                points.push(`${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)}`)
              }
              return (
                <polygon
                  points={points.join(' ')}
                  fill={shapeSettings.filled ? shapeSettings.fillColor + '80' : 'none'}
                  stroke={shapeSettings.stroked || !shapeSettings.filled ? shapeSettings.strokeColor : 'none'}
                  strokeWidth={shapeSettings.strokeWidth}
                  strokeDasharray="5,5"
                />
              )
            })()}
            {activeTool === 'star' && (() => {
              let width = shapeEnd.x - shapeStart.x
              let height = shapeEnd.y - shapeStart.y
              if (shiftPressed) {
                const size = Math.max(Math.abs(width), Math.abs(height))
                width = width < 0 ? -size : size
                height = height < 0 ? -size : size
              }
              const centerX = shapeStart.x + width / 2
              const centerY = shapeStart.y + height / 2
              const outerRadius = Math.min(Math.abs(width), Math.abs(height)) / 2
              const innerRadius = outerRadius * 0.4
              const numPoints = 5
              const points = []
              for (let i = 0; i < numPoints * 2; i++) {
                const r = i % 2 === 0 ? outerRadius : innerRadius
                const angle = (i * Math.PI) / numPoints - Math.PI / 2
                points.push(`${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`)
              }
              return (
                <polygon
                  points={points.join(' ')}
                  fill={shapeSettings.filled ? shapeSettings.fillColor + '80' : 'none'}
                  stroke={shapeSettings.stroked || !shapeSettings.filled ? shapeSettings.strokeColor : 'none'}
                  strokeWidth={shapeSettings.strokeWidth}
                  strokeDasharray="5,5"
                />
              )
            })()}
            {activeTool === 'arrow' && (() => {
              let endX = shapeEnd.x
              let endY = shapeEnd.y
              if (shiftPressed) {
                const dx = shapeEnd.x - shapeStart.x
                const dy = shapeEnd.y - shapeStart.y
                const angle = Math.atan2(dy, dx)
                const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
                const length = Math.sqrt(dx * dx + dy * dy)
                endX = shapeStart.x + Math.cos(snappedAngle) * length
                endY = shapeStart.y + Math.sin(snappedAngle) * length
              }
              const headLength = Math.min(30, Math.sqrt(Math.pow(endX - shapeStart.x, 2) + Math.pow(endY - shapeStart.y, 2)) * 0.3)
              const angle = Math.atan2(endY - shapeStart.y, endX - shapeStart.x)
              const arrowPoints = [
                `${endX},${endY}`,
                `${endX - headLength * Math.cos(angle - Math.PI / 6)},${endY - headLength * Math.sin(angle - Math.PI / 6)}`,
                `${endX - headLength * Math.cos(angle + Math.PI / 6)},${endY - headLength * Math.sin(angle + Math.PI / 6)}`,
              ]
              return (
                <>
                  <line
                    x1={shapeStart.x}
                    y1={shapeStart.y}
                    x2={endX}
                    y2={endY}
                    stroke={shapeSettings.fillColor}
                    strokeWidth={shapeSettings.strokeWidth}
                    strokeDasharray="5,5"
                  />
                  <polygon
                    points={arrowPoints.join(' ')}
                    fill={shapeSettings.fillColor + '80'}
                    strokeDasharray="5,5"
                  />
                </>
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
                <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(100,150,255,0.5)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}

        {/* Inline text editing overlay */}
        {editingTextLayerId && (() => {
          const layer = currentProject.layers.find((l) => l.id === editingTextLayerId)
          if (!layer) return null

          const scale = zoom / 100
          return (
            <div
              className="absolute"
              style={{
                left: layer.x * scale,
                top: layer.y * scale,
                width: Math.max(200, layer.width * scale),
                minHeight: layer.height * scale,
              }}
            >
              <textarea
                ref={textInputRef}
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={() => {
                  if (editingText.trim()) {
                    pushHistory('Edit Text')
                    updateLayerText(editingTextLayerId, editingText)
                  }
                  setEditingTextLayerId(null)
                  setEditingText('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingTextLayerId(null)
                    setEditingText('')
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (editingText.trim()) {
                      pushHistory('Edit Text')
                      updateLayerText(editingTextLayerId, editingText)
                    }
                    setEditingTextLayerId(null)
                    setEditingText('')
                  }
                }}
                className="w-full h-full bg-transparent border-2 border-violet-500 rounded outline-none resize-none p-2"
                style={{
                  fontFamily: layer.fontFamily || 'Arial',
                  fontSize: (layer.fontSize || 32) * scale,
                  fontWeight: layer.fontWeight || 400,
                  color: layer.fontColor || '#ffffff',
                  textAlign: layer.textAlign || 'center',
                  lineHeight: 1.2,
                }}
              />
            </div>
          )
        })()}

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
