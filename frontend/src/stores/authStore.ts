import { create } from 'zustand'
import { api, ApiError } from '@/api/client'
import type { User } from '@/api/types'
import { useAIStore } from '@/stores/aiStore'

interface GitHubCallbackResponse {
  user: User | null
  pending: boolean
  message: string | null
}

interface UpdateProfileData {
  first_name?: string
  last_name?: string
  email?: string
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
  updateProfile: (data: UpdateProfileData) => Promise<boolean>
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
    // Clear API key on logout
    useAIStore.getState().clearUserApiKey()
    set({ user: null, isAuthenticated: false, isPending: false })
  },

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const user = await api.get<User>('/auth/me')
      set({ user, isAuthenticated: true, isLoading: false })
      // Fetch user's API key after successful auth
      useAIStore.getState().fetchUserApiKey()
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
      // Clear API key when not authenticated
      useAIStore.getState().clearUserApiKey()
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
        // Fetch user's API key after successful login
        useAIStore.getState().fetchUserApiKey()
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

  updateProfile: async (data: UpdateProfileData) => {
    try {
      const user = await api.put<User>('/auth/me', data)
      set({ user })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update profile'
      set({ error: message })
      return false
    }
  },
}))
