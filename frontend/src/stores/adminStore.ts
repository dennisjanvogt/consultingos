import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AdminTab = 'pending' | 'all'

interface AdminStore {
  activeTab: AdminTab
  setActiveTab: (tab: AdminTab) => void
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      activeTab: 'pending',
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'admin-storage',
    }
  )
)
