import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import DOMPurify from 'dompurify'
import { useImageEditorStore } from '@/stores/imageEditorStore'

interface CanwaElement {
  id: string
  name: string
  category: 'shapes' | 'arrows' | 'icons' | 'frames' | 'stickers'
  svg: string
  keywords: string[]
}

// Element library with SVG definitions (with xmlns for proper rendering)
const ELEMENTS: CanwaElement[] = [
  // Basic Shapes
  { id: 'circle', name: 'Circle', category: 'shapes', keywords: ['circle', 'round', 'kreis'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="currentColor"/></svg>' },
  { id: 'square', name: 'Square', category: 'shapes', keywords: ['square', 'quadrat'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" fill="currentColor"/></svg>' },
  { id: 'rounded-square', name: 'Rounded Square', category: 'shapes', keywords: ['rounded', 'square'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" rx="15" fill="currentColor"/></svg>' },
  { id: 'triangle', name: 'Triangle', category: 'shapes', keywords: ['triangle', 'dreieck'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 95,95 5,95" fill="currentColor"/></svg>' },
  { id: 'pentagon', name: 'Pentagon', category: 'shapes', keywords: ['pentagon', 'fünfeck'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 97,38 79,95 21,95 3,38" fill="currentColor"/></svg>' },
  { id: 'hexagon', name: 'Hexagon', category: 'shapes', keywords: ['hexagon', 'sechseck'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 93,27 93,73 50,95 7,73 7,27" fill="currentColor"/></svg>' },
  { id: 'star-5', name: '5-Point Star', category: 'shapes', keywords: ['star', 'stern'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40" fill="currentColor"/></svg>' },
  { id: 'star-6', name: '6-Point Star', category: 'shapes', keywords: ['star', 'david'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,55 79,90 50,70 21,90 32,55 5,35 39,35" fill="currentColor"/></svg>' },
  { id: 'heart', name: 'Heart', category: 'shapes', keywords: ['heart', 'herz', 'love'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,88 C20,60 5,40 5,25 C5,10 20,5 35,5 C45,5 50,15 50,15 C50,15 55,5 65,5 C80,5 95,10 95,25 C95,40 80,60 50,88Z" fill="currentColor"/></svg>' },
  { id: 'diamond', name: 'Diamond', category: 'shapes', keywords: ['diamond', 'raute'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill="currentColor"/></svg>' },
  { id: 'oval', name: 'Oval', category: 'shapes', keywords: ['oval', 'ellipse'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="45" ry="30" fill="currentColor"/></svg>' },
  { id: 'cross', name: 'Cross', category: 'shapes', keywords: ['cross', 'kreuz', 'plus'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M35,5 H65 V35 H95 V65 H65 V95 H35 V65 H5 V35 H35 Z" fill="currentColor"/></svg>' },

  // Arrows
  { id: 'arrow-right', name: 'Arrow Right', category: 'arrows', keywords: ['arrow', 'right', 'pfeil'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M5,40 H60 V20 L95,50 L60,80 V60 H5 Z" fill="currentColor"/></svg>' },
  { id: 'arrow-left', name: 'Arrow Left', category: 'arrows', keywords: ['arrow', 'left', 'pfeil'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M95,40 H40 V20 L5,50 L40,80 V60 H95 Z" fill="currentColor"/></svg>' },
  { id: 'arrow-up', name: 'Arrow Up', category: 'arrows', keywords: ['arrow', 'up', 'pfeil'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M40,95 V40 H20 L50,5 L80,40 H60 V95 Z" fill="currentColor"/></svg>' },
  { id: 'arrow-down', name: 'Arrow Down', category: 'arrows', keywords: ['arrow', 'down', 'pfeil'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M40,5 V60 H20 L50,95 L80,60 H60 V5 Z" fill="currentColor"/></svg>' },
  { id: 'arrow-curved', name: 'Curved Arrow', category: 'arrows', keywords: ['arrow', 'curved'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M20,80 Q20,20 80,20 L80,5 L98,25 L80,45 V30 Q35,30 35,80 Z" fill="currentColor"/></svg>' },
  { id: 'arrow-double', name: 'Double Arrow', category: 'arrows', keywords: ['arrow', 'double', 'both'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M5,50 L25,30 V42 H75 V30 L95,50 L75,70 V58 H25 V70 Z" fill="currentColor"/></svg>' },

  // Icons
  { id: 'check', name: 'Checkmark', category: 'icons', keywords: ['check', 'done', 'ok'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M15,55 L35,75 L85,25" stroke="currentColor" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'x-mark', name: 'X Mark', category: 'icons', keywords: ['x', 'close', 'cancel'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M20,20 L80,80 M80,20 L20,80" stroke="currentColor" stroke-width="12" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'question', name: 'Question', category: 'icons', keywords: ['question', 'frage'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M35,35 Q35,15 50,15 Q70,15 70,35 Q70,50 50,55 V65" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="50" cy="80" r="5" fill="currentColor"/></svg>' },
  { id: 'exclamation', name: 'Exclamation', category: 'icons', keywords: ['exclamation', 'alert'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><line x1="50" y1="15" x2="50" y2="65" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><circle cx="50" cy="82" r="6" fill="currentColor"/></svg>' },
  { id: 'lightbulb', name: 'Lightbulb', category: 'icons', keywords: ['idea', 'light', 'bulb'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,10 Q75,10 75,40 Q75,55 60,65 V75 H40 V65 Q25,55 25,40 Q25,10 50,10Z" fill="currentColor"/><rect x="40" y="78" width="20" height="5" fill="currentColor"/><rect x="40" y="86" width="20" height="5" fill="currentColor"/></svg>' },
  { id: 'speech-bubble', name: 'Speech Bubble', category: 'icons', keywords: ['speech', 'chat', 'bubble'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10,15 H90 Q95,15 95,20 V60 Q95,65 90,65 H35 L20,85 V65 H10 Q5,65 5,60 V20 Q5,15 10,15Z" fill="currentColor"/></svg>' },
  { id: 'cloud', name: 'Cloud', category: 'icons', keywords: ['cloud', 'wolke'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M25,70 Q5,70 5,55 Q5,40 25,40 Q25,25 45,25 Q65,25 70,40 Q90,35 95,50 Q100,70 80,70Z" fill="currentColor"/></svg>' },

  // Frames & Borders
  { id: 'frame-simple', name: 'Simple Frame', category: 'frames', keywords: ['frame', 'border', 'rahmen'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" fill="none" stroke="currentColor" stroke-width="4"/></svg>' },
  { id: 'frame-rounded', name: 'Rounded Frame', category: 'frames', keywords: ['frame', 'rounded'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" rx="10" fill="none" stroke="currentColor" stroke-width="4"/></svg>' },
  { id: 'frame-double', name: 'Double Frame', category: 'frames', keywords: ['frame', 'double'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" fill="none" stroke="currentColor" stroke-width="2"/><rect x="12" y="12" width="76" height="76" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
  { id: 'frame-circle', name: 'Circle Frame', category: 'frames', keywords: ['frame', 'circle'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="4"/></svg>' },
  { id: 'frame-ornate', name: 'Ornate Frame', category: 'frames', keywords: ['frame', 'ornate', 'fancy'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="5" fill="currentColor"/><circle cx="90" cy="10" r="5" fill="currentColor"/><circle cx="10" cy="90" r="5" fill="currentColor"/><circle cx="90" cy="90" r="5" fill="currentColor"/></svg>' },

  // Stickers / Decorative
  { id: 'sticker-star', name: 'Star Burst', category: 'stickers', keywords: ['star', 'burst', 'sale'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 58,35 90,35 65,55 75,90 50,70 25,90 35,55 10,35 42,35" fill="currentColor"/></svg>' },
  { id: 'ribbon', name: 'Ribbon', category: 'stickers', keywords: ['ribbon', 'banner', 'band'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M5,30 H95 L85,45 L95,60 H5 L15,45 Z" fill="currentColor"/></svg>' },
  { id: 'badge', name: 'Badge', category: 'stickers', keywords: ['badge', 'seal', 'emblem'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="45" r="35" fill="currentColor"/><polygon points="35,75 50,95 65,75 50,80" fill="currentColor"/></svg>' },
  { id: 'explosion', name: 'Explosion', category: 'stickers', keywords: ['explosion', 'boom', 'pow'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 55,30 75,10 65,35 95,30 70,50 95,70 65,65 75,90 55,70 50,95 45,70 25,90 35,65 5,70 30,50 5,30 35,35 25,10 45,30" fill="currentColor"/></svg>' },
  { id: 'tag', name: 'Tag', category: 'stickers', keywords: ['tag', 'label', 'price'], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10,50 L50,10 H90 V50 L50,90 Z" fill="currentColor"/><circle cx="75" cy="25" r="8" fill="white"/></svg>' },
]

const CATEGORIES = [
  { id: 'shapes', label: 'Shapes', labelDe: 'Formen' },
  { id: 'arrows', label: 'Arrows', labelDe: 'Pfeile' },
  { id: 'icons', label: 'Icons', labelDe: 'Icons' },
  { id: 'frames', label: 'Frames', labelDe: 'Rahmen' },
  { id: 'stickers', label: 'Stickers', labelDe: 'Sticker' },
]

export function ElementsPanel() {
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['shapes']))
  const { currentProject, addShapeAsLayer } = useImageEditorStore()

  const isGerman = i18n.language === 'de'

  const filteredElements = search
    ? ELEMENTS.filter((el) =>
        el.name.toLowerCase().includes(search.toLowerCase()) ||
        el.keywords.some((kw) => kw.toLowerCase().includes(search.toLowerCase()))
      )
    : ELEMENTS

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleAddElement = (element: CanwaElement) => {
    console.log('handleAddElement called', element.name, 'currentProject:', !!currentProject)
    if (!currentProject) {
      console.log('No currentProject!')
      return
    }

    const size = 200
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Replace currentColor with white
    const svgStr = element.svg.replace(/currentColor/g, '#ffffff')
    const encodedSvg = btoa(unescape(encodeURIComponent(svgStr)))
    const dataUrl = `data:image/svg+xml;base64,${encodedSvg}`

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size)
      const imageData = canvas.toDataURL('image/png')
      addShapeAsLayer(element.name, imageData, size, size)
    }
    img.onerror = () => {
      console.error('Failed to load SVG for:', element.name)
    }
    img.src = dataUrl
  }

  if (!currentProject) return null

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-2 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={isGerman ? 'Suche...' : 'Search...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Elements Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {search ? (
          // Search results
          <div className="grid grid-cols-4 gap-1">
            {filteredElements.map((element) => (
              <button
                key={element.id}
                onClick={() => handleAddElement(element)}
                className="aspect-square p-2 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center transition-colors group"
                title={element.name}
              >
                <div
                  className="w-full h-full text-gray-300 group-hover:text-white transition-colors pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(element.svg) }}
                />
              </button>
            ))}
          </div>
        ) : (
          // Categories
          <div className="space-y-1">
            {CATEGORIES.map((category) => {
              const categoryElements = ELEMENTS.filter((el) => el.category === category.id)
              const isExpanded = expandedCategories.has(category.id)

              return (
                <div key={category.id}>
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded text-sm font-medium transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <span>{isGerman ? category.labelDe : category.label}</span>
                    <span className="text-gray-500 text-xs ml-auto">{categoryElements.length}</span>
                  </button>

                  {isExpanded && (
                    <div className="grid grid-cols-4 gap-1 mt-1 mb-2">
                      {categoryElements.map((element) => (
                        <button
                          key={element.id}
                          onClick={() => handleAddElement(element)}
                          className="aspect-square p-2 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center transition-colors group"
                          title={element.name}
                        >
                          <div
                            className="w-full h-full text-gray-300 group-hover:text-white transition-colors pointer-events-none"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(element.svg) }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
