import { useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, RotateCw } from 'lucide-react'
import { usePDFViewerStore } from '@/stores/pdfViewerStore'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const MEDIA_BASE_URL = 'http://localhost:8000'

export function PDFViewerApp() {
  const {
    currentPDF,
    currentPage,
    totalPages,
    zoom,
    setTotalPages,
    setPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    setZoom,
  } = usePDFViewerStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          prevPage()
          break
        case 'ArrowRight':
          e.preventDefault()
          nextPage()
          break
        case '+':
        case '=':
          e.preventDefault()
          zoomIn()
          break
        case '-':
          e.preventDefault()
          zoomOut()
          break
        case '0':
          e.preventDefault()
          setZoom(1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextPage, prevPage, zoomIn, zoomOut, setZoom])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setTotalPages(numPages)
  }, [setTotalPages])

  const handleDownload = () => {
    if (!currentPDF) return
    const pdfUrl = currentPDF.file_url.startsWith('http')
      ? currentPDF.file_url
      : `${MEDIA_BASE_URL}${currentPDF.file_url}`
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = currentPDF.name
    link.click()
  }

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value)
    if (!isNaN(page)) {
      setPage(page)
    }
  }

  if (!currentPDF) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-gray-100 dark:bg-gray-900">
        Kein PDF ausgewählt
      </div>
    )
  }

  const pdfUrl = currentPDF.file_url.startsWith('http')
    ? currentPDF.file_url
    : `${MEDIA_BASE_URL}${currentPDF.file_url}`

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Vorherige Seite (←)"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex items-center gap-1 text-sm">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={handlePageInput}
              className="w-12 px-2 py-1 text-center border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-lavender-500"
            />
            <span className="text-gray-500 dark:text-gray-400">/ {totalPages}</span>
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Nächste Seite (→)"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={zoom <= 0.5}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40"
            title="Verkleinern (-)"
          >
            <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors min-w-[50px]"
            title="Zurücksetzen (0)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={zoom >= 3}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40"
            title="Vergrößern (+)"
          >
            <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Download */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Herunterladen"
          >
            <Download className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 overflow-auto flex justify-center p-4">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-lavender-500 border-t-transparent" />
            </div>
          }
          error={
            <div className="flex items-center justify-center h-64 text-red-500">
              Fehler beim Laden des PDFs
            </div>
          }
          className="shadow-xl"
        >
          <Page
            pageNumber={currentPage}
            scale={zoom}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="bg-white"
          />
        </Document>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-1.5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <span className="truncate max-w-[300px]">{currentPDF.name}</span>
        <span>← → Seiten • +/- Zoom • 0 Reset</span>
      </div>
    </div>
  )
}
