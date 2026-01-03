import { create } from 'zustand'
import type { Document } from '@/api/types'

interface ImageViewerState {
  currentImage: Document | null
  setCurrentImage: (image: Document | null) => void
}

export const useImageViewerStore = create<ImageViewerState>((set) => ({
  currentImage: null,
  setCurrentImage: (image) => set({ currentImage: image }),
}))
