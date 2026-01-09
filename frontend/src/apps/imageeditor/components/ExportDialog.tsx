import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Download, Image as ImageIcon, Check } from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import type { ExportSettings } from '../types'

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

  const { currentProject } = useImageEditorStore()

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

      // Fill background
      if (settings.backgroundColor !== 'transparent') {
        ctx.fillStyle = settings.backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Scale for export
      ctx.scale(settings.scale, settings.scale)

      // Draw each visible layer
      for (const layer of currentProject.layers) {
        if (!layer.visible) continue

        if (layer.imageData) {
          await new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              ctx.save()
              ctx.globalAlpha = layer.opacity / 100

              // Apply transforms
              ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2)
              ctx.rotate((layer.rotation * Math.PI) / 180)
              ctx.translate(-layer.width / 2, -layer.height / 2)

              ctx.drawImage(img, 0, 0)
              ctx.restore()
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
  }, [currentProject, settings, onClose])

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
