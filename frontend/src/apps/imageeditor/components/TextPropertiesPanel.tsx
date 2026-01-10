import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import { AlignLeft, AlignCenter, AlignRight, ChevronDown } from 'lucide-react'

// Organized font categories
const FONT_CATEGORIES = [
  {
    name: 'Apple System',
    fonts: [
      'SF Pro Display',
      'SF Pro Text',
      'SF Pro Rounded',
      'SF Mono',
      'New York',
      'SF Compact',
      '-apple-system',
      'BlinkMacSystemFont',
    ]
  },
  {
    name: 'Sans-Serif',
    fonts: [
      'Helvetica Neue',
      'Helvetica',
      'Arial',
      'Avenir',
      'Avenir Next',
      'Futura',
      'Gill Sans',
      'Optima',
      'Verdana',
      'Trebuchet MS',
      'Tahoma',
      'Segoe UI',
      'Roboto',
      'Open Sans',
      'Lato',
      'Montserrat',
      'Raleway',
      'Poppins',
      'Inter',
    ]
  },
  {
    name: 'Serif',
    fonts: [
      'Times New Roman',
      'Georgia',
      'Palatino',
      'Book Antiqua',
      'Baskerville',
      'Didot',
      'Garamond',
      'Hoefler Text',
      'Bodoni 72',
      'Big Caslon',
      'Cochin',
      'Cambria',
      'Playfair Display',
      'Merriweather',
      'Libre Baskerville',
    ]
  },
  {
    name: 'Monospace',
    fonts: [
      'SF Mono',
      'Menlo',
      'Monaco',
      'Courier New',
      'Consolas',
      'Andale Mono',
      'Source Code Pro',
      'Fira Code',
      'JetBrains Mono',
    ]
  },
  {
    name: 'Display & Decorative',
    fonts: [
      'Impact',
      'Copperplate',
      'Papyrus',
      'Brush Script MT',
      'Marker Felt',
      'Chalkboard',
      'Chalkduster',
      'Comic Sans MS',
      'Snell Roundhand',
      'Zapfino',
      'American Typewriter',
      'Rockwell',
      'Phosphate',
      'SignPainter',
    ]
  },
  {
    name: 'Handwriting',
    fonts: [
      'Bradley Hand',
      'Noteworthy',
      'Lucida Handwriting',
      'Savoye LET',
      'Party LET',
      'Krungthep',
      'Satisfy',
      'Dancing Script',
      'Pacifico',
      'Great Vibes',
    ]
  },
]

// Flatten for easy lookup
const ALL_FONTS = FONT_CATEGORIES.flatMap(cat => cat.fonts)

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 128]

const FONT_WEIGHTS = [
  { label: 'Light', value: 300 },
  { label: 'Normal', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Semi Bold', value: 600 },
  { label: 'Bold', value: 700 },
]

// Custom Font Picker Component
function FontPicker({ value, onChange }: { value: string; onChange: (font: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const filteredCategories = FONT_CATEGORIES.map(cat => ({
    ...cat,
    fonts: cat.fonts.filter(font =>
      font.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.fonts.length > 0)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm flex items-center justify-between hover:border-gray-600 transition-colors"
      >
        <span style={{ fontFamily: value }} className="truncate">
          {value}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-72 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm focus:outline-none focus:border-violet-500"
              autoFocus
            />
          </div>

          {/* Font List */}
          <div className="overflow-y-auto max-h-56">
            {filteredCategories.map((category) => (
              <div key={category.name}>
                <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase bg-gray-850 sticky top-0">
                  {category.name}
                </div>
                {category.fonts.map((font) => (
                  <button
                    key={font}
                    onClick={() => {
                      onChange(font)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700 transition-colors flex items-center justify-between ${
                      value === font ? 'bg-violet-600/30 text-violet-300' : ''
                    }`}
                  >
                    <span style={{ fontFamily: font }} className="truncate">
                      {font}
                    </span>
                    <span className="text-[10px] text-gray-500 ml-2" style={{ fontFamily: font }}>
                      Aa
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function TextPropertiesPanel() {
  const { i18n } = useTranslation()
  const { currentProject, selectedLayerId, updateLayerTextProperties } = useImageEditorStore()

  const isGerman = i18n.language === 'de'

  const selectedLayer = currentProject?.layers.find((l) => l.id === selectedLayerId)
  const isTextLayer = selectedLayer?.type === 'text'

  if (!isTextLayer || !selectedLayer || !selectedLayerId) {
    return null
  }

  const fontFamily = selectedLayer.fontFamily || 'SF Pro Display'
  const fontSize = selectedLayer.fontSize || 48
  const fontColor = selectedLayer.fontColor || '#ffffff'
  const fontWeight = selectedLayer.fontWeight || 400
  const textAlign = selectedLayer.textAlign || 'center'

  return (
    <div className="p-3 space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase">
        {isGerman ? 'Text-Eigenschaften' : 'Text Properties'}
      </h3>

      {/* Font Family */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500">
          {isGerman ? 'Schriftart' : 'Font'}
        </label>
        <FontPicker
          value={fontFamily}
          onChange={(font) => updateLayerTextProperties(selectedLayerId, { fontFamily: font })}
        />
      </div>

      {/* Font Size */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500">
          {isGerman ? 'Größe' : 'Size'}
        </label>
        <div className="flex gap-2">
          <select
            value={fontSize}
            onChange={(e) => updateLayerTextProperties(selectedLayerId, { fontSize: Number(e.target.value) })}
            className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
          <input
            type="number"
            value={fontSize}
            onChange={(e) => updateLayerTextProperties(selectedLayerId, { fontSize: Number(e.target.value) })}
            min={8}
            max={200}
            className="w-20 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm"
          />
        </div>
      </div>

      {/* Font Weight */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500">
          {isGerman ? 'Gewicht' : 'Weight'}
        </label>
        <select
          value={fontWeight}
          onChange={(e) => updateLayerTextProperties(selectedLayerId, { fontWeight: Number(e.target.value) })}
          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm"
        >
          {FONT_WEIGHTS.map((weight) => (
            <option key={weight.value} value={weight.value}>
              {isGerman && weight.label === 'Light' ? 'Leicht' :
               isGerman && weight.label === 'Normal' ? 'Normal' :
               isGerman && weight.label === 'Medium' ? 'Mittel' :
               isGerman && weight.label === 'Semi Bold' ? 'Halbfett' :
               isGerman && weight.label === 'Bold' ? 'Fett' :
               weight.label}
            </option>
          ))}
        </select>
      </div>

      {/* Text Alignment */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500">
          {isGerman ? 'Ausrichtung' : 'Alignment'}
        </label>
        <div className="flex gap-1">
          <button
            onClick={() => updateLayerTextProperties(selectedLayerId, { textAlign: 'left' })}
            className={`flex-1 flex items-center justify-center p-2 rounded transition-colors ${
              textAlign === 'left'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => updateLayerTextProperties(selectedLayerId, { textAlign: 'center' })}
            className={`flex-1 flex items-center justify-center p-2 rounded transition-colors ${
              textAlign === 'center'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            onClick={() => updateLayerTextProperties(selectedLayerId, { textAlign: 'right' })}
            className={`flex-1 flex items-center justify-center p-2 rounded transition-colors ${
              textAlign === 'right'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Font Color */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500">
          {isGerman ? 'Farbe' : 'Color'}
        </label>
        <input
          type="color"
          value={fontColor}
          onChange={(e) => updateLayerTextProperties(selectedLayerId, { fontColor: e.target.value })}
          className="w-full h-9 rounded cursor-pointer border border-gray-700"
        />
      </div>
    </div>
  )
}
