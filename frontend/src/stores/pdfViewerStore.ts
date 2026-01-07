import { create } from 'zustand'

export interface PDFDocument {
  id: number
  name: string
  file_url: string
  file_type: string
  file_size: number
  description?: string
}

interface PDFViewerState {
  currentPDF: PDFDocument | null
  currentPage: number
  totalPages: number
  zoom: number
  setCurrentPDF: (pdf: PDFDocument | null) => void
  setPage: (page: number) => void
  setTotalPages: (total: number) => void
  setZoom: (zoom: number) => void
  nextPage: () => void
  prevPage: () => void
  zoomIn: () => void
  zoomOut: () => void
}

export const usePDFViewerStore = create<PDFViewerState>((set, get) => ({
  currentPDF: null,
  currentPage: 1,
  totalPages: 0,
  zoom: 1,

  setCurrentPDF: (pdf) => set({ currentPDF: pdf, currentPage: 1, totalPages: 0 }),
  setPage: (page) => {
    const { totalPages } = get()
    if (page >= 1 && page <= totalPages) {
      set({ currentPage: page })
    }
  },
  setTotalPages: (total) => set({ totalPages: total }),
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(3, zoom)) }),

  nextPage: () => {
    const { currentPage, totalPages } = get()
    if (currentPage < totalPages) {
      set({ currentPage: currentPage + 1 })
    }
  },

  prevPage: () => {
    const { currentPage } = get()
    if (currentPage > 1) {
      set({ currentPage: currentPage - 1 })
    }
  },

  zoomIn: () => {
    const { zoom } = get()
    set({ zoom: Math.min(zoom + 0.25, 3) })
  },

  zoomOut: () => {
    const { zoom } = get()
    set({ zoom: Math.max(zoom - 0.25, 0.5) })
  },
}))
