import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Download, Image as ImageIcon, Check } from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import type { ExportSettings, Filters, Layer, TextEffects } from '../types'
import { DEFAULT_TEXT_EFFECTS } from '../types'

// Build CSS filter string from Filters object
const buildFilterString = (f: Filters): string => {
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
}

// Check if filters need pixel manipulation (not just CSS filters)
const needsPixelManipulation = (f: Filters): boolean => {
  return f.sharpen > 0 || f.noise > 0 || f.pixelate > 0 || f.posterize > 0 ||
         f.vignette > 0 || f.emboss || f.edgeDetect || f.tintAmount > 0
}

// Apply pixel-based filters to ImageData
const applyPixelFilters = (ctx: CanvasRenderingContext2D, f: Filters, width: number, height: number) => {
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
      const smallWidth = Math.ceil(width / size)
      const smallHeight = Math.ceil(height / size)
      tempCtx.drawImage(ctx.canvas, 0, 0, smallWidth, smallHeight)
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(tempCanvas, 0, 0, smallWidth, smallHeight, 0, 0, width, height)
      ctx.imageSmoothingEnabled = true
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
    const amount = f.noise * 2.55
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue
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
}

// Render curved text along an arc
const renderCurvedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  effects: TextEffects,
  fontColor: string,
  fontSize: number
) => {
  ctx.save()

  const curveAmount = effects.curve / 100
  const arcHeight = width * 0.3 * Math.abs(curveAmount)
  const isConvex = curveAmount > 0

  const chord = width * 0.8
  const radius = arcHeight > 0 ? (arcHeight / 2 + (chord * chord) / (8 * arcHeight)) : 1000000

  const centerY = isConvex ? y + radius : y - radius + fontSize
  const totalAngle = 2 * Math.asin(chord / (2 * radius))

  const textWidth = ctx.measureText(text).width
  const startAngle = isConvex ? Math.PI - totalAngle / 2 : totalAngle / 2
  const anglePerChar = (totalAngle * textWidth) / (text.length * chord)

  ctx.translate(x, centerY)

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const charWidth = ctx.measureText(char).width
    const charAngle = startAngle + (i + 0.5) * anglePerChar * (isConvex ? 1 : -1)

    ctx.save()
    ctx.rotate(charAngle + (isConvex ? Math.PI / 2 : -Math.PI / 2))
    ctx.translate(0, -radius)

    if (effects.glow.enabled) {
      ctx.shadowColor = effects.glow.color
      ctx.shadowBlur = effects.glow.intensity
      ctx.fillStyle = effects.glow.color
      ctx.fillText(char, -charWidth / 2, 0)
    }

    if (effects.shadow.enabled) {
      ctx.shadowColor = effects.shadow.color
      ctx.shadowBlur = effects.shadow.blur
      ctx.shadowOffsetX = effects.shadow.offsetX
      ctx.shadowOffsetY = effects.shadow.offsetY
    } else {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    }

    if (effects.outline.enabled) {
      ctx.strokeStyle = effects.outline.color
      ctx.lineWidth = effects.outline.width * 2
      ctx.lineJoin = 'round'
      ctx.strokeText(char, -charWidth / 2, 0)
    }

    ctx.fillStyle = fontColor
    ctx.fillText(char, -charWidth / 2, 0)

    ctx.restore()
  }

  ctx.restore()
}

// Render text layer with effects
const renderTextLayer = (ctx: CanvasRenderingContext2D, layer: Layer) => {
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
    // Render glow effect
    if (effects.glow.enabled) {
      ctx.save()
      ctx.shadowColor = effects.glow.color
      ctx.shadowBlur = effects.glow.intensity
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
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
}

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

const FORMATS = [
  { value: 'png', label: 'PNG', description: 'Verlustfrei, mit Transparenz' },
  { value: 'jpeg', label: 'JPEG', description: 'Komprimiert, ohne Transparenz' },
  { value: 'webp', label: 'WebP', description: 'Modern, beste Kompression' },
] as const

const SCALES = [
  { value: 0.5, label: '50%' },
  { value: 1, label: '100%' },
  { value: 2, label: '200%' },
] as const

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { currentProject, filterMode, filters: globalFilters } = useImageEditorStore()

  const [settings, setSettings] = useState<ExportSettings>({
    format: 'png',
    quality: 90,
    scale: 1,
    backgroundColor: 'transparent',
  })

  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (!currentProject) return

    setIsExporting(true)

    try {
      // Create a canvas with the exported content
      const canvas = document.createElement('canvas')
      canvas.width = currentProject.width * settings.scale
      canvas.height = currentProject.height * settings.scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Scale for export first
      ctx.scale(settings.scale, settings.scale)

      // Fill background - first with project background, then override if export setting is different
      if (settings.backgroundColor === 'transparent') {
        // Use project background color
        ctx.fillStyle = currentProject.backgroundColor
        ctx.fillRect(0, 0, currentProject.width, currentProject.height)
      } else {
        // Use export setting background
        ctx.fillStyle = settings.backgroundColor
        ctx.fillRect(0, 0, currentProject.width, currentProject.height)
      }

      // Draw each visible layer with filters
      for (const layer of currentProject.layers) {
        if (!layer.visible) continue

        // Handle text layers
        if (layer.type === 'text' && layer.text) {
          renderTextLayer(ctx, layer)
          continue
        }

        // Handle image layers
        if (layer.imageData) {
          await new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              // Determine which filters to apply
              const activeFilters = filterMode === 'layer' ? (layer.filters || globalFilters) : globalFilters
              const filterStr = buildFilterString(activeFilters)
              const needsPixel = needsPixelManipulation(activeFilters)

              if (needsPixel) {
                // Create temp canvas for pixel manipulation
                const tempCanvas = document.createElement('canvas')
                tempCanvas.width = layer.width
                tempCanvas.height = layer.height
                const tempCtx = tempCanvas.getContext('2d')
                if (tempCtx) {
                  // Apply CSS filters first
                  tempCtx.filter = filterStr
                  tempCtx.drawImage(img, 0, 0, layer.width, layer.height)
                  tempCtx.filter = 'none'

                  // Apply pixel filters
                  applyPixelFilters(tempCtx, activeFilters, layer.width, layer.height)

                  // Draw to main canvas with transforms
                  ctx.save()
                  ctx.globalAlpha = layer.opacity / 100
                  ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation
                  ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2)
                  ctx.rotate((layer.rotation * Math.PI) / 180)
                  ctx.translate(-layer.width / 2, -layer.height / 2)
                  ctx.drawImage(tempCanvas, 0, 0)
                  ctx.restore()
                }
              } else {
                // Just CSS filters, draw directly
                ctx.save()
                ctx.globalAlpha = layer.opacity / 100
                ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation
                ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2)
                ctx.rotate((layer.rotation * Math.PI) / 180)
                ctx.translate(-layer.width / 2, -layer.height / 2)
                ctx.filter = filterStr
                ctx.drawImage(img, 0, 0, layer.width, layer.height)
                ctx.filter = 'none'
                ctx.restore()
              }
              resolve()
            }
            img.src = layer.imageData!
          })
        }
      }

      // Export to blob
      const mimeType = `image/${settings.format}`
      const quality = settings.format === 'png' ? undefined : settings.quality / 100

      canvas.toBlob(
        (blob) => {
          if (!blob) return

          // Download file
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${currentProject.name}.${settings.format}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          setIsExporting(false)
          onClose()
        },
        mimeType,
        quality
      )
    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
    }
  }, [currentProject, settings, onClose, filterMode, globalFilters])

  if (!isOpen || !currentProject) return null

  const outputWidth = Math.round(currentProject.width * settings.scale)
  const outputHeight = Math.round(currentProject.height * settings.scale)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold">{t('imageeditor.exportImage')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg">
            <ImageIcon className="w-10 h-10 text-gray-500" />
            <div>
              <p className="font-medium">{currentProject.name}</p>
              <p className="text-sm text-gray-400">
                {outputWidth} × {outputHeight} px
              </p>
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">{t('imageeditor.format')}</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((format) => (
                <button
                  key={format.value}
                  onClick={() => setSettings((s) => ({ ...s, format: format.value }))}
                  className={`p-3 rounded-lg text-sm transition-colors ${
                    settings.format === format.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="font-medium block">{format.label}</span>
                  <span className="text-xs opacity-70">{format.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quality (only for JPEG/WebP) */}
          {settings.format !== 'png' && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{t('imageeditor.quality')}</span>
                <span>{settings.quality}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.quality}
                onChange={(e) => setSettings((s) => ({ ...s, quality: Number(e.target.value) }))}
                className="w-full accent-violet-500"
              />
            </div>
          )}

          {/* Scale */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">{t('imageeditor.scale')}</label>
            <div className="flex gap-2">
              {SCALES.map((scale) => (
                <button
                  key={scale.value}
                  onClick={() => setSettings((s) => ({ ...s, scale: scale.value }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${
                    settings.scale === scale.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {scale.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background (only for PNG/WebP) */}
          {settings.format !== 'jpeg' && (
            <div>
              <label className="text-sm text-gray-400 block mb-2">{t('imageeditor.background')}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSettings((s) => ({ ...s, backgroundColor: 'transparent' }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                    settings.backgroundColor === 'transparent'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded border border-gray-500"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)',
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                    }}
                  />
                  Transparent
                </button>
                <button
                  onClick={() => setSettings((s) => ({ ...s, backgroundColor: '#ffffff' }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                    settings.backgroundColor === '#ffffff'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="w-4 h-4 rounded bg-white border border-gray-500" />
                  Weiß
                </button>
                <button
                  onClick={() => setSettings((s) => ({ ...s, backgroundColor: '#000000' }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                    settings.backgroundColor === '#000000'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="w-4 h-4 rounded bg-black border border-gray-500" />
                  Schwarz
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isExporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exportiere...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t('imageeditor.export')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
