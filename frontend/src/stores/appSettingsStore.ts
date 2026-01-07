import { create } from 'zustand'
import { api, ApiError } from '@/api/client'
import type { AppSettings } from '@/api/types'

// Defaults hier definiert um zirkuläre Abhängigkeit zu vermeiden
const DEFAULT_DOCK_ORDER = [
  'dashboard',
  'masterdata',
  'transactions',
  'documents',
  'calendar',
  'kanban',
  'timetracking',
  'settings',
]

const DEFAULT_ENABLED_APPS = [
  'dashboard',
  'masterdata',
  'transactions',
  'documents',
  'calendar',
  'kanban',
  'timetracking',
  'settings',
]

interface AppSettingsState {
  settings: AppSettings
  isLoading: boolean
  error: string | null
  fetchSettings: () => Promise<void>
  updateSettings: (data: Partial<AppSettings>) => Promise<AppSettings | null>
  toggleApp: (appId: string) => Promise<void>
  reorderDock: (newOrder: string[]) => Promise<void>
  isAppEnabled: (appId: string) => boolean
  enableAllApps: (allAppIds: string[]) => Promise<void>
  disableAllApps: (requiredAppIds: string[]) => Promise<void>
}

export const useAppSettingsStore = create<AppSettingsState>((set, get) => ({
  settings: {
    enabled_apps: DEFAULT_ENABLED_APPS,
    dock_order: DEFAULT_DOCK_ORDER,
  },
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null })
    try {
      const settings = await api.get<AppSettings>('/settings/apps')
      set({ settings, isLoading: false })
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // No settings yet, use defaults
        set({
          settings: {
            enabled_apps: DEFAULT_ENABLED_APPS,
            dock_order: DEFAULT_DOCK_ORDER,
          },
          isLoading: false,
        })
      } else {
        const message = err instanceof ApiError ? err.message : 'Failed to fetch app settings'
        set({ error: message, isLoading: false })
      }
    }
  },

  updateSettings: async (data) => {
    try {
      const settings = await api.put<AppSettings>('/settings/apps', data)
      set({ settings })
      return settings
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update app settings'
      set({ error: message })
      return null
    }
  },

  toggleApp: async (appId: string) => {
    const { settings, updateSettings } = get()
    const isEnabled = settings.enabled_apps.includes(appId)

    const newEnabledApps = isEnabled
      ? settings.enabled_apps.filter(id => id !== appId)
      : [...settings.enabled_apps, appId]

    // Wenn App aktiviert wird und nicht im Dock ist, ans Ende hinzufügen
    let newDockOrder = settings.dock_order
    if (!isEnabled && !settings.dock_order.includes(appId)) {
      newDockOrder = [...settings.dock_order, appId]
    }

    // Optimistic update
    set({
      settings: {
        ...settings,
        enabled_apps: newEnabledApps,
        dock_order: newDockOrder,
      },
    })

    // Sync with backend
    await updateSettings({ enabled_apps: newEnabledApps, dock_order: newDockOrder })
  },

  reorderDock: async (newOrder: string[]) => {
    const { settings, updateSettings } = get()

    // Optimistic update
    set({
      settings: {
        ...settings,
        dock_order: newOrder,
      },
    })

    // Sync with backend
    await updateSettings({ dock_order: newOrder })
  },

  isAppEnabled: (appId: string) => {
    return get().settings.enabled_apps.includes(appId)
  },

  enableAllApps: async (allAppIds: string[]) => {
    const { settings, updateSettings } = get()

    // Add all apps that aren't already in dock_order
    const newDockOrder = [...settings.dock_order]
    allAppIds.forEach(appId => {
      if (!newDockOrder.includes(appId)) {
        newDockOrder.push(appId)
      }
    })

    // Optimistic update
    set({
      settings: {
        ...settings,
        enabled_apps: allAppIds,
        dock_order: newDockOrder,
      },
    })

    // Sync with backend
    await updateSettings({ enabled_apps: allAppIds, dock_order: newDockOrder })
  },

  disableAllApps: async (requiredAppIds: string[]) => {
    const { settings, updateSettings } = get()

    // Keep only required apps (canDisable: false)
    const newDockOrder = settings.dock_order.filter(id => requiredAppIds.includes(id))

    // Optimistic update
    set({
      settings: {
        ...settings,
        enabled_apps: requiredAppIds,
        dock_order: newDockOrder,
      },
    })

    // Sync with backend
    await updateSettings({ enabled_apps: requiredAppIds, dock_order: newDockOrder })
  },
}))
