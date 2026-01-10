import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/api/client'

type AdminTab = 'pending' | 'all'

interface AdminUser {
  id: number
  is_approved: boolean
}

interface AdminStore {
  activeTab: AdminTab
  pendingCount: number
  wsConnection: WebSocket | null
  setActiveTab: (tab: AdminTab) => void
  fetchPendingCount: () => Promise<void>
  setPendingCount: (count: number) => void
  connectWebSocket: () => void
  disconnectWebSocket: () => void
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      activeTab: 'pending',
      pendingCount: 0,
      wsConnection: null,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setPendingCount: (count) => set({ pendingCount: count }),
      fetchPendingCount: async () => {
        try {
          const users = await api.get<AdminUser[]>('/auth/admin/users')
          const pending = users.filter(u => !u.is_approved).length
          set({ pendingCount: pending })
        } catch {
          // Ignore errors (user might not be admin)
        }
      },
      connectWebSocket: () => {
        const existing = get().wsConnection
        if (existing && existing.readyState === WebSocket.OPEN) {
          return // Already connected
        }

        // Always fetch via HTTP first as fallback
        get().fetchPendingCount()

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        // Extract just the host from VITE_API_URL (remove protocol and /api path)
        const apiUrl = import.meta.env.VITE_API_URL || ''
        const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/api.*$/, '') || window.location.host
        const wsUrl = `${protocol}//${host}/ws/admin/notifications/`

        try {
          const ws = new WebSocket(wsUrl)

          ws.onopen = () => {
            console.log('Admin WebSocket connected')
          }

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data)
              if (data.type === 'pending_count' || data.type === 'new_registration') {
                set({ pendingCount: data.count })
              }
            } catch (e) {
              console.error('Failed to parse WebSocket message:', e)
            }
          }

          ws.onclose = () => {
            set({ wsConnection: null })
            // Reconnect after 5 seconds
            setTimeout(() => {
              const state = get()
              if (!state.wsConnection) {
                state.connectWebSocket()
              }
            }, 5000)
          }

          ws.onerror = (error) => {
            console.error('Admin WebSocket error:', error)
            // Fallback: fetch via HTTP if WebSocket fails
            get().fetchPendingCount()
          }

          set({ wsConnection: ws })
        } catch (e) {
          console.error('Failed to create WebSocket:', e)
        }
      },
      disconnectWebSocket: () => {
        const ws = get().wsConnection
        if (ws) {
          ws.close()
          set({ wsConnection: null })
        }
      },
    }),
    {
      name: 'admin-storage',
      partialize: (state) => ({ activeTab: state.activeTab }),
    }
  )
)
