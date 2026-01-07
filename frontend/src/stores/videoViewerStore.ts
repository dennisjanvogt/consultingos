import { create } from 'zustand'

export interface VideoDocument {
  id: number
  name: string
  file_url: string
  file_type: string
  file_size: number
  description?: string
}

interface VideoViewerState {
  currentVideo: VideoDocument | null
  setCurrentVideo: (video: VideoDocument | null) => void
}

export const useVideoViewerStore = create<VideoViewerState>((set) => ({
  currentVideo: null,
  setCurrentVideo: (video) => set({ currentVideo: video }),
}))
