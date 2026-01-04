import { create } from 'zustand'

export type MasterDataView = 'home' | 'customers' | 'products' | 'taxrates' | 'ttprojects' | 'ttclients'

interface MasterDataState {
  activeView: MasterDataView
  showNewForm: boolean
  setActiveView: (view: MasterDataView) => void
  triggerNewForm: () => void
  clearNewFormTrigger: () => void
}

export const useMasterDataStore = create<MasterDataState>((set) => ({
  activeView: 'home',
  showNewForm: false,
  setActiveView: (view) => set({ activeView: view }),
  triggerNewForm: () => set({ showNewForm: true }),
  clearNewFormTrigger: () => set({ showNewForm: false }),
}))
