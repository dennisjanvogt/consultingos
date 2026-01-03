import { create } from 'zustand'
import { api, ApiError } from '@/api/client'
import type { CompanySettings } from '@/api/types'

interface SettingsState {
  settings: CompanySettings | null
  isLoading: boolean
  error: string | null
  fetchSettings: () => Promise<void>
  updateSettings: (data: Partial<CompanySettings>) => Promise<CompanySettings | null>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null })
    try {
      const settings = await api.get<CompanySettings>('/settings/')
      set({ settings, isLoading: false })
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // No settings yet, that's okay
        set({ settings: null, isLoading: false })
      } else {
        const message = err instanceof ApiError ? err.message : 'Failed to fetch settings'
        set({ error: message, isLoading: false })
      }
    }
  },

  updateSettings: async (data) => {
    try {
      const settings = await api.put<CompanySettings>('/settings/', data)
      set({ settings })
      return settings
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update settings'
      set({ error: message })
      return null
    }
  },
}))
