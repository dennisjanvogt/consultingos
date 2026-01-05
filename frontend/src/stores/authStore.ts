import { create } from 'zustand'
import { api, ApiError } from '@/api/client'
import type { User } from '@/api/types'

interface GitHubCallbackResponse {
  user: User | null
  pending: boolean
  message: string | null
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isPending: boolean
  error: string | null
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
  getGitHubAuthUrl: () => Promise<string | null>
  handleGitHubCallback: (code: string, state: string) => Promise<{ success: boolean; pending: boolean }>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isPending: false,
  error: null,

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore logout errors
    }
    set({ user: null, isAuthenticated: false, isPending: false })
  },

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const user = await api.get<User>('/auth/me')
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),

  getGitHubAuthUrl: async () => {
    try {
      const response = await api.get<{ url: string }>('/auth/github/auth-url')
      return response.url
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to get GitHub auth URL'
      set({ error: message })
      return null
    }
  },

  handleGitHubCallback: async (code: string, state: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<GitHubCallbackResponse>('/auth/github/callback', { code, state })

      if (response.pending) {
        set({
          user: null,
          isAuthenticated: false,
          isPending: true,
          error: response.message,
          isLoading: false
        })
        return { success: false, pending: true }
      }

      if (response.user) {
        set({
          user: response.user,
          isAuthenticated: true,
          isPending: false,
          isLoading: false
        })
        return { success: true, pending: false }
      }

      set({ isLoading: false })
      return { success: false, pending: false }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'GitHub login failed'
      set({ error: message, isLoading: false })
      return { success: false, pending: false }
    }
  },
}))
