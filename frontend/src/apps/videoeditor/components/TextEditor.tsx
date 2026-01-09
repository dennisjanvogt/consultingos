import { useTranslation } from 'react-i18next'
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Type } from 'lucide-react'
import type { Clip } from '../types'
import { useVideoEditorStore } from '@/stores/videoEditorStore'

interface TextEditorProps {
  clipId: string
}

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Impact',
  'Comic Sans MS',
]

const FONT_SIZES = [12, 16, 20, 24, 32, 48, 64, 72, 96, 128]

const PRESET_COLORS = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#6600ff',
]

export function TextEditor({ clipId }: TextEditorProps) {
  const { t } = useTranslation()
  const { getClipById, updateClipProperties } = useVideoEditorStore()
  const clip = getClipById(clipId)

  if (!clip || clip.type !== 'text') return null

  const textContent = clip.textContent || clip.name
  const fontFamily = clip.fontFamily || 'Arial'
  const fontSize = clip.fontSize || 48
  const fontWeight = clip.fontWeight || 400
  const textColor = clip.textColor || '#ffffff'
  const backgroundColor = clip.backgroundColor || ''
  const textAlign = clip.textAlign || 'center'
  const textShadow = clip.textShadow ?? false

  const updateText = (updates: Partial<Clip>) => {
    updateClipProperties(clipId, updates)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase">
        <Type className="w-4 h-4" />
        Text bearbeiten
      </div>

      {/* Text Content */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Text</label>
        <textarea
          value={textContent}
          onChange={(e) => updateText({ textContent: e.target.value, name: e.target.value.slice(0, 20) })}
          className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded focus:ring-1 focus:ring-violet-500 outline-none resize-none"
          rows={2}
          placeholder="Text eingeben..."
        />
      </div>

      {/* Font Family & Size */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Schriftart</label>
          <select
            value={fontFamily}
            onChange={(e) => updateText({ fontFamily: e.target.value })}
            className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded focus:ring-1 focus:ring-violet-500 outline-none"
          >
            {FONT_FAMILIES.map(font => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Größe</label>
          <select
            value={fontSize}
            onChange={(e) => updateText({ fontSize: parseInt(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded focus:ring-1 focus:ring-violet-500 outline-none"
          >
            {FONT_SIZES.map(size => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Font Style & Align */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateText({ fontWeight: fontWeight === 700 ? 400 : 700 })}
          className={`p-2 rounded transition-colors ${
            fontWeight === 700 ? 'bg-violet-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="Fett"
        >
          <Bold className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-600" />

        <button
          onClick={() => updateText({ textAlign: 'left' })}
          className={`p-2 rounded transition-colors ${
            textAlign === 'left' ? 'bg-violet-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="Links"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => updateText({ textAlign: 'center' })}
          className={`p-2 rounded transition-colors ${
            textAlign === 'center' ? 'bg-violet-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="Zentriert"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => updateText({ textAlign: 'right' })}
          className={`p-2 rounded transition-colors ${
            textAlign === 'right' ? 'bg-violet-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="Rechts"
        >
          <AlignRight className="w-4 h-4" />
        </button>
      </div>

      {/* Text Color */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Textfarbe</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={textColor}
            onChange={(e) => updateText({ textColor: e.target.value })}
            className="w-8 h-8 rounded border border-gray-600 cursor-pointer"
          />
          <div className="flex gap-1">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => updateText({ textColor: color })}
                className={`w-5 h-5 rounded border-2 transition-all ${
                  textColor === color ? 'border-violet-500 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Background Color */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Hintergrund</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={backgroundColor || '#000000'}
            onChange={(e) => updateText({ backgroundColor: e.target.value })}
            className="w-8 h-8 rounded border border-gray-600 cursor-pointer"
          />
          <button
            onClick={() => updateText({ backgroundColor: undefined })}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              !backgroundColor ? 'bg-violet-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Transparent
          </button>
          <span className="text-xs text-gray-500">
            {backgroundColor || 'Kein Hintergrund'}
          </span>
        </div>
      </div>

      {/* Text Shadow */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400">Schatten</label>
        <button
          onClick={() => updateText({ textShadow: !textShadow })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            textShadow ? 'bg-violet-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              textShadow ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <label className="text-xs text-gray-400 block mb-2">Vorschau</label>
        <div
          className="text-center p-2 rounded min-h-[60px] flex items-center justify-center"
          style={{
            backgroundColor: backgroundColor || 'transparent',
          }}
        >
          <span
            style={{
              fontFamily,
              fontSize: Math.min(fontSize, 32),
              fontWeight,
              color: textColor,
              textAlign,
              textShadow: textShadow ? '2px 2px 4px rgba(0,0,0,0.7)' : 'none',
            }}
          >
            {textContent || 'Vorschau'}
          </span>
        </div>
      </div>
    </div>
  )
}
