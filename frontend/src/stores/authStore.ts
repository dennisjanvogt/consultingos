import { create } from 'zustand'
import { api, ApiError } from '@/api/client'
import type { User, LoginCredentials, RegisterData } from '@/api/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<boolean>
  register: (data: RegisterData) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null })
    try {
      const user = await api.post<User>('/auth/login', credentials)
      set({ user, isAuthenticated: true, isLoading: false })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed'
      set({ error: message, isLoading: false })
      return false
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const user = await api.post<User>('/auth/register', data)
      set({ user, isAuthenticated: true, isLoading: false })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registration failed'
      set({ error: message, isLoading: false })
      return false
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore logout errors
    }
    set({ user: null, isAuthenticated: false })
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
}))
