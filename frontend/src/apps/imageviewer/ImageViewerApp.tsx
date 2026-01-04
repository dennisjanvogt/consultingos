import { useState, useEffect } from 'react'
import { ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react'
import { useImageViewerStore } from '@/stores/imageViewerStore'

const MEDIA_BASE_URL = 'http://localhost:8000' // Ohne /api - für Media Files

export function ImageViewerApp() {
  const { currentImage } = useImageViewerStore()
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  // Reset zoom and rotation when image changes
  useEffect(() => {
    setZoom(1)
    setRotation(0)
  }, [currentImage?.id])

  if (!currentImage) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Kein Bild ausgewählt
      </div>
    )
  }

  const imageUrl = currentImage.file_url.startsWith('http')
    ? currentImage.file_url
    : `${API_BASE_URL}${currentImage.file_url}`

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 5))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25))
  const handleRotate = () => setRotation(r => (r + 90) % 360)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = currentImage.name
    link.click()
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      if (e.deltaY < 0) {
        handleZoomIn()
      } else {
        handleZoomOut()
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="text-sm text-gray-300 truncate max-w-[200px]">
          {currentImage.name}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Verkleinern"
          >
            <ZoomOut className="w-4 h-4 text-gray-300" />
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Vergrößern"
          >
            <ZoomIn className="w-4 h-4 text-gray-300" />
          </button>
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <button
            onClick={handleRotate}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Drehen"
          >
            <RotateCw className="w-4 h-4 text-gray-300" />
          </button>
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Herunterladen"
          >
            <Download className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        onWheel={handleWheel}
      >
        <img
          src={imageUrl}
          alt={currentImage.name}
          className="max-w-none transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            maxHeight: zoom === 1 ? '100%' : 'none',
            maxWidth: zoom === 1 ? '100%' : 'none',
          }}
          draggable={false}
        />
      </div>

      {/* Status Bar */}
      <div className="px-4 py-1.5 bg-gray-800 border-t border-gray-700 text-xs text-gray-500">
        {currentImage.file_type.toUpperCase()} • Scroll + Cmd/Ctrl zum Zoomen
      </div>
    </div>
  )
}
