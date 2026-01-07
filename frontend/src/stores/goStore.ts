import { create } from 'zustand'

interface GoStore {
  showNewGameModal: boolean
  setShowNewGameModal: (show: boolean) => void
}

export const useGoStore = create<GoStore>((set) => ({
  showNewGameModal: false,
  setShowNewGameModal: (show) => set({ showNewGameModal: show }),
}))
