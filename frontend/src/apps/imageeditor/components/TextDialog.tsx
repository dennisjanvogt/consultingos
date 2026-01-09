import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Type } from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import { generateId, type Layer } from '../types'

interface TextDialogProps {
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number }
}

const FONTS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Comic Sans MS', label: 'Comic Sans' },
]

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96, 128]

export function TextDialog({ isOpen, onClose, position }: TextDialogProps) {
  const { t } = useTranslation()
  const { currentProject, addLayer, pushHistory } = useImageEditorStore()

  const [text, setText] = useState('')
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fontSize, setFontSize] = useState(32)
  const [fontColor, setFontColor] = useState('#000000')
  const [fontWeight, setFontWeight] = useState(400)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')

  const handleAddText = () => {
    if (!text.trim() || !currentProject) return

    // Create text layer with canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Measure text
    ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`
    const lines = text.split('\n')
    const lineHeight = fontSize * 1.2

    let maxWidth = 0
    for (const line of lines) {
      const metrics = ctx.measureText(line)
      maxWidth = Math.max(maxWidth, metrics.width)
    }

    const width = Math.ceil(maxWidth) + 20
    const height = Math.ceil(lineHeight * lines.length) + 20

    canvas.width = width
    canvas.height = height

    // Draw text
    ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`
    ctx.fillStyle = fontColor
    ctx.textBaseline = 'top'
    ctx.textAlign = textAlign

    const xOffset = textAlign === 'center' ? width / 2 : textAlign === 'right' ? width - 10 : 10

    lines.forEach((line, i) => {
      ctx.fillText(line, xOffset, 10 + i * lineHeight)
    })

    const imageData = canvas.toDataURL('image/png')

    pushHistory('Add Text')

    const newLayer: Layer = {
      id: generateId(),
      name: `Text: ${text.slice(0, 20)}${text.length > 20 ? '...' : ''}`,
      type: 'text',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      x: position.x,
      y: position.y,
      width,
      height,
      rotation: 0,
      imageData,
      text,
      fontFamily,
      fontSize,
      fontColor,
      fontWeight,
      textAlign,
    }

    addLayer(newLayer)

    // Reset and close
    setText('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold">{t('imageeditor.addText')}</h2>
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
          {/* Text Input */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">{t('imageeditor.text')}</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('imageeditor.enterText')}
              className="w-full h-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
              autoFocus
            />
          </div>

          {/* Font Family */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">{t('imageeditor.font')}</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
            >
              {FONTS.map((font) => (
                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-2">{t('imageeditor.fontSize')}</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
              >
                {FONT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">{t('imageeditor.fontWeight')}</label>
              <select
                value={fontWeight}
                onChange={(e) => setFontWeight(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
              >
                <option value={300}>Light</option>
                <option value={400}>Normal</option>
                <option value={500}>Medium</option>
                <option value={600}>Semi Bold</option>
                <option value={700}>Bold</option>
              </select>
            </div>
          </div>

          {/* Color & Alignment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-2">{t('imageeditor.color')}</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">{t('imageeditor.alignment')}</label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => setTextAlign(align)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${
                      textAlign === align
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {align === 'left' ? '←' : align === 'center' ? '↔' : '→'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-900 rounded-lg min-h-[60px] flex items-center justify-center">
            <span
              style={{
                fontFamily,
                fontSize: `${Math.min(fontSize, 48)}px`,
                fontWeight,
                color: fontColor,
                textAlign,
                whiteSpace: 'pre-wrap',
              }}
            >
              {text || t('imageeditor.previewText')}
            </span>
          </div>
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
            onClick={handleAddText}
            disabled={!text.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Type className="w-4 h-4" />
            {t('imageeditor.addText')}
          </button>
        </div>
      </div>
    </div>
  )
}
