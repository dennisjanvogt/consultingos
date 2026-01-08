import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Types
export interface VaultTag {
  id: number
  name: string
  color: string
  created_at: string
}

export interface PageBreadcrumb {
  id: number
  title: string
  icon: string
}

export interface PageLink {
  id: number
  title: string
  icon: string
}

export interface VaultPage {
  id: number
  parent_id: number | null
  title: string
  icon: string
  content: Record<string, unknown>
  is_favorited: boolean
  position: number
  created_at: string
  updated_at: string
  tags: VaultTag[]
  breadcrumbs: PageBreadcrumb[]
  backlinks: PageLink[]
  has_children: boolean
}

export interface VaultPageListItem {
  id: number
  parent_id: number | null
  title: string
  icon: string
  is_favorited: boolean
  position: number
  updated_at: string
  has_children: boolean
}

export interface GraphNode {
  id: number
  title: string
  icon: string
}

export interface GraphEdge {
  source_id: number
  target_id: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// Database Types
export interface ColumnOption {
  id: string
  value: string
  color: string
}

export interface DatabaseColumn {
  id: string
  type: 'title' | 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url'
  name: string
  options?: ColumnOption[]
}

export interface DatabaseSchema {
  columns: DatabaseColumn[]
}

export interface DatabaseRow {
  id: number
  data: Record<string, unknown>
  position: number
  created_at: string
  updated_at: string
}

export interface VaultDatabase {
  id: number
  page_id: number
  schema: DatabaseSchema
  default_view: 'table' | 'kanban' | 'calendar'
  kanban_column_id: string
  calendar_date_column_id: string
  rows: DatabaseRow[]
  created_at: string
  updated_at: string
}

export type VaultViewMode = 'pages' | 'graph'

interface VaultState {
  // Pages
  pages: VaultPageListItem[]
  currentPage: VaultPage | null
  currentPageId: number | null
  isLoading: boolean
  error: string | null

  // Tags
  tags: VaultTag[]

  // Tree state (persisted)
  expandedIds: number[]

  // View mode (persisted)
  viewMode: VaultViewMode

  // Search
  searchQuery: string
  searchResults: VaultPageListItem[]
  isSearching: boolean

  // Graph
  graphData: GraphData | null

  // Database
  currentDatabase: VaultDatabase | null

  // Actions
  fetchPages: (parentId?: number | null) => Promise<void>
  fetchPage: (id: number) => Promise<VaultPage | null>
  createPage: (parentId?: number | null) => Promise<VaultPage | null>
  updatePage: (id: number, data: Partial<VaultPage>) => Promise<VaultPage | null>
  deletePage: (id: number) => Promise<boolean>
  movePage: (id: number, newParentId: number | null) => Promise<boolean>
  toggleFavorite: (id: number) => Promise<void>

  // Tags
  fetchTags: () => Promise<void>
  createTag: (name: string, color?: string) => Promise<VaultTag | null>
  deleteTag: (id: number) => Promise<boolean>

  // Navigation
  setCurrentPageId: (id: number | null) => void
  toggleExpanded: (id: number) => void
  setViewMode: (mode: VaultViewMode) => void

  // Search
  setSearchQuery: (query: string) => void
  search: (query: string) => Promise<void>
  clearSearch: () => void

  // Graph
  fetchGraph: () => Promise<void>

  // Database
  fetchDatabase: (pageId: number) => Promise<VaultDatabase | null>
  createDatabase: (pageId: number) => Promise<VaultDatabase | null>
  updateDatabase: (pageId: number, data: Partial<VaultDatabase>) => Promise<VaultDatabase | null>
  createRow: (pageId: number, data?: Record<string, unknown>) => Promise<DatabaseRow | null>
  updateRow: (pageId: number, rowId: number, data: Record<string, unknown>) => Promise<DatabaseRow | null>
  deleteRow: (pageId: number, rowId: number) => Promise<boolean>

  // Helpers
  getRootPages: () => VaultPageListItem[]
  getChildren: (parentId: number) => VaultPageListItem[]
  getFavorites: () => VaultPageListItem[]
  isExpanded: (id: number) => boolean
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || error.detail || 'Request failed')
  }

  if (response.status === 204) return null as T
  return response.json()
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      // Initial state
      pages: [],
      currentPage: null,
      currentPageId: null,
      isLoading: false,
      error: null,
      tags: [],
      expandedIds: [],
      viewMode: 'pages',
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      graphData: null,
      currentDatabase: null,

      // Fetch pages (root or children)
      fetchPages: async (parentId = null) => {
        set({ isLoading: true, error: null })
        try {
          const url = parentId !== null
            ? `/vault/pages/?parent_id=${parentId}`
            : '/vault/pages/'
          const pages = await request<VaultPageListItem[]>(url)

          if (parentId === null) {
            // Root pages - replace all
            set({ pages, isLoading: false })
          } else {
            // Children - merge with existing
            const existingPages = get().pages.filter(p => p.parent_id !== parentId)
            set({ pages: [...existingPages, ...pages], isLoading: false })
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch pages', isLoading: false })
        }
      },

      // Fetch single page with full details
      fetchPage: async (id) => {
        set({ isLoading: true, error: null })
        try {
          const page = await request<VaultPage>(`/vault/pages/${id}/`)
          set({ currentPage: page, currentPageId: id, isLoading: false })
          return page
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch page', isLoading: false })
          return null
        }
      },

      // Create new page
      createPage: async (parentId = null) => {
        try {
          const page = await request<VaultPage>('/vault/pages/', {
            method: 'POST',
            body: JSON.stringify({ parent_id: parentId }),
          })

          // Add to pages list
          const newListItem: VaultPageListItem = {
            id: page.id,
            parent_id: page.parent_id,
            title: page.title,
            icon: page.icon,
            is_favorited: page.is_favorited,
            position: page.position,
            updated_at: page.updated_at,
            has_children: false,
          }
          set({ pages: [newListItem, ...get().pages], currentPage: page, currentPageId: page.id })

          // If parent exists, update parent's has_children
          if (parentId) {
            const pages = get().pages.map(p =>
              p.id === parentId ? { ...p, has_children: true } : p
            )
            set({ pages })
          }

          return page
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to create page' })
          return null
        }
      },

      // Update page
      updatePage: async (id, data) => {
        try {
          const page = await request<VaultPage>(`/vault/pages/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data),
          })

          // Update in pages list
          const pages = get().pages.map(p =>
            p.id === id ? {
              ...p,
              title: page.title,
              icon: page.icon,
              is_favorited: page.is_favorited,
              updated_at: page.updated_at,
            } : p
          )
          set({ pages, currentPage: page })
          return page
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to update page' })
          return null
        }
      },

      // Delete page
      deletePage: async (id) => {
        const oldPages = get().pages
        const oldCurrentPage = get().currentPage

        // Optimistic delete
        set({
          pages: oldPages.filter(p => p.id !== id),
          currentPage: get().currentPageId === id ? null : oldCurrentPage,
          currentPageId: get().currentPageId === id ? null : get().currentPageId,
        })

        try {
          await request(`/vault/pages/${id}/`, { method: 'DELETE' })
          return true
        } catch (err) {
          // Rollback
          set({ pages: oldPages, currentPage: oldCurrentPage, error: err instanceof Error ? err.message : 'Failed to delete page' })
          return false
        }
      },

      // Move page to new parent
      movePage: async (id, newParentId) => {
        try {
          await request(`/vault/pages/${id}/move/`, {
            method: 'POST',
            body: JSON.stringify({ parent_id: newParentId }),
          })

          // Update local state
          const pages = get().pages.map(p =>
            p.id === id ? { ...p, parent_id: newParentId } : p
          )
          set({ pages })
          return true
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to move page' })
          return false
        }
      },

      // Toggle favorite
      toggleFavorite: async (id) => {
        try {
          const page = await request<VaultPage>(`/vault/pages/${id}/favorite/`, {
            method: 'POST',
          })

          const pages = get().pages.map(p =>
            p.id === id ? { ...p, is_favorited: page.is_favorited } : p
          )
          set({ pages })

          if (get().currentPageId === id) {
            set({ currentPage: page })
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to toggle favorite' })
        }
      },

      // Tags
      fetchTags: async () => {
        try {
          const tags = await request<VaultTag[]>('/vault/tags/')
          set({ tags })
        } catch (err) {
          console.error('Failed to fetch tags:', err)
        }
      },

      createTag: async (name, color = 'gray') => {
        try {
          const tag = await request<VaultTag>('/vault/tags/', {
            method: 'POST',
            body: JSON.stringify({ name, color }),
          })
          set({ tags: [...get().tags, tag] })
          return tag
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to create tag' })
          return null
        }
      },

      deleteTag: async (id) => {
        try {
          await request(`/vault/tags/${id}/`, { method: 'DELETE' })
          set({ tags: get().tags.filter(t => t.id !== id) })
          return true
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to delete tag' })
          return false
        }
      },

      // Navigation
      setCurrentPageId: (id) => {
        set({ currentPageId: id })
        if (id) {
          get().fetchPage(id)
        } else {
          set({ currentPage: null })
        }
      },

      toggleExpanded: (id) => {
        const expandedIds = get().expandedIds
        if (expandedIds.includes(id)) {
          set({ expandedIds: expandedIds.filter(eid => eid !== id) })
        } else {
          set({ expandedIds: [...expandedIds, id] })
          // Fetch children if not already loaded
          const children = get().pages.filter(p => p.parent_id === id)
          if (children.length === 0) {
            get().fetchPages(id)
          }
        }
      },

      setViewMode: (mode) => set({ viewMode: mode }),

      // Search
      setSearchQuery: (query) => set({ searchQuery: query }),

      search: async (query) => {
        if (!query.trim()) {
          set({ searchResults: [], isSearching: false })
          return
        }

        set({ isSearching: true })
        try {
          const results = await request<VaultPageListItem[]>(`/vault/search/?q=${encodeURIComponent(query)}`)
          set({ searchResults: results, isSearching: false })
        } catch (err) {
          set({ searchResults: [], isSearching: false })
        }
      },

      clearSearch: () => set({ searchQuery: '', searchResults: [] }),

      // Graph
      fetchGraph: async () => {
        try {
          const data = await request<GraphData>('/vault/graph/')
          set({ graphData: data })
        } catch (err) {
          console.error('Failed to fetch graph:', err)
        }
      },

      // Database
      fetchDatabase: async (pageId) => {
        try {
          const db = await request<VaultDatabase>(`/vault/databases/${pageId}/`)
          set({ currentDatabase: db })
          return db
        } catch {
          set({ currentDatabase: null })
          return null
        }
      },

      createDatabase: async (pageId) => {
        try {
          const db = await request<VaultDatabase>('/vault/databases/', {
            method: 'POST',
            body: JSON.stringify({ page_id: pageId }),
          })
          set({ currentDatabase: db })
          return db
        } catch (err) {
          console.error('Failed to create database:', err)
          return null
        }
      },

      updateDatabase: async (pageId, data) => {
        try {
          const db = await request<VaultDatabase>(`/vault/databases/${pageId}/`, {
            method: 'PUT',
            body: JSON.stringify(data),
          })
          set({ currentDatabase: db })
          return db
        } catch (err) {
          console.error('Failed to update database:', err)
          return null
        }
      },

      createRow: async (pageId, data = {}) => {
        try {
          const row = await request<DatabaseRow>(`/vault/databases/${pageId}/rows/`, {
            method: 'POST',
            body: JSON.stringify({ data }),
          })
          // Add row to current database
          const currentDb = get().currentDatabase
          if (currentDb) {
            set({
              currentDatabase: {
                ...currentDb,
                rows: [...currentDb.rows, row],
              },
            })
          }
          return row
        } catch (err) {
          console.error('Failed to create row:', err)
          return null
        }
      },

      updateRow: async (pageId, rowId, data) => {
        try {
          const row = await request<DatabaseRow>(`/vault/databases/${pageId}/rows/${rowId}/`, {
            method: 'PUT',
            body: JSON.stringify({ data }),
          })
          // Update row in current database
          const currentDb = get().currentDatabase
          if (currentDb) {
            set({
              currentDatabase: {
                ...currentDb,
                rows: currentDb.rows.map((r) => (r.id === rowId ? row : r)),
              },
            })
          }
          return row
        } catch (err) {
          console.error('Failed to update row:', err)
          return null
        }
      },

      deleteRow: async (pageId, rowId) => {
        try {
          await request(`/vault/databases/${pageId}/rows/${rowId}/`, {
            method: 'DELETE',
          })
          // Remove row from current database
          const currentDb = get().currentDatabase
          if (currentDb) {
            set({
              currentDatabase: {
                ...currentDb,
                rows: currentDb.rows.filter((r) => r.id !== rowId),
              },
            })
          }
          return true
        } catch (err) {
          console.error('Failed to delete row:', err)
          return false
        }
      },

      // Helpers
      getRootPages: () => get().pages.filter(p => p.parent_id === null),
      getChildren: (parentId) => get().pages.filter(p => p.parent_id === parentId),
      getFavorites: () => get().pages.filter(p => p.is_favorited),
      isExpanded: (id) => get().expandedIds.includes(id),
    }),
    {
      name: 'vault-storage',
      partialize: (state) => ({
        expandedIds: state.expandedIds,
        currentPageId: state.currentPageId,
        viewMode: state.viewMode,
      }),
    }
  )
)
