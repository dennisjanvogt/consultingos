import { create } from 'zustand'
import { ApiError } from '@/api/client'
import type { Folder, FolderCreate, Document, DocumentUpdate } from '@/api/types'
import { type FileCategory, filterDocumentsByCategory } from '@/apps/documents/utils/fileCategories'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

type ViewMode = 'grid' | 'list'

interface DocumentsState {
  folders: Folder[]
  allFolders: Folder[] // Alle Root-Ordner
  documents: Document[]
  currentFolderId: number | null
  folderPath: Folder[]
  activeFilters: FileCategory[]
  isLoading: boolean
  error: string | null
  viewMode: ViewMode
  showFolderForm: boolean
  fileInputRef: HTMLInputElement | null

  // Filter Actions
  toggleFilter: (category: FileCategory) => void
  clearFilters: () => void

  // Folder Actions
  fetchAllFolders: () => Promise<void>
  fetchFolders: (parentId?: number | null) => Promise<void>
  fetchDocuments: (folderId?: number | null, search?: string) => Promise<void>
  createFolder: (data: FolderCreate) => Promise<Folder | null>
  updateFolder: (id: number, data: Partial<FolderCreate>) => Promise<Folder | null>
  deleteFolder: (id: number) => Promise<boolean>
  toggleSidebarVisibility: (folderId: number) => Promise<void>

  // Document Actions
  uploadDocument: (file: File, folderId?: number | null, description?: string) => Promise<Document | null>
  updateDocument: (id: number, data: DocumentUpdate) => Promise<Document | null>
  deleteDocument: (id: number) => Promise<boolean>
  moveDocument: (documentId: number, targetFolderId: number | null) => Promise<boolean>
  moveFolder: (folderId: number, targetParentId: number | null) => Promise<boolean>

  // Navigation
  navigateToFolder: (folderId: number | null, folder?: Folder) => void
  navigateUp: () => void

  // Computed
  getSidebarFolders: () => Folder[]
  getFilteredDocuments: () => Document[]

  // UI State
  setViewMode: (mode: ViewMode) => void
  setShowFolderForm: (show: boolean) => void
  setFileInputRef: (ref: HTMLInputElement | null) => void
  triggerFileUpload: () => void
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new ApiError(response.status, error.detail || error.error || 'Request failed')
  }
  if (response.status === 204) {
    return null as T
  }
  return response.json()
}

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  folders: [],
  allFolders: [],
  documents: [],
  currentFolderId: null,
  folderPath: [],
  activeFilters: [],
  isLoading: false,
  error: null,
  viewMode: 'grid',
  showFolderForm: false,
  fileInputRef: null,

  // Filter Actions
  toggleFilter: (category) => {
    const { activeFilters } = get()
    if (activeFilters.includes(category)) {
      set({ activeFilters: activeFilters.filter(f => f !== category) })
    } else {
      set({ activeFilters: [...activeFilters, category] })
    }
  },

  clearFilters: () => {
    set({ activeFilters: [] })
  },

  // Folder Actions
  fetchAllFolders: async () => {
    try {
      let folders = await request<Folder[]>('/documents/folders/')
      // Initialize default folders if none exist
      if (folders.length === 0) {
        folders = await request<Folder[]>('/documents/folders/init-defaults', {
          method: 'POST',
        })
      }
      set({ allFolders: folders })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch folders'
      set({ error: message })
    }
  },

  fetchFolders: async (parentId = null) => {
    set({ isLoading: true, error: null })
    try {
      const params = parentId !== null ? `?parent_id=${parentId}` : ''
      const folders = await request<Folder[]>(`/documents/folders/${params}`)
      set({ folders, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch folders'
      set({ error: message, isLoading: false })
    }
  },

  fetchDocuments: async (folderId = null, search = '') => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (folderId !== null) params.append('folder_id', String(folderId))
      if (search) params.append('search', search)
      const queryString = params.toString() ? `?${params.toString()}` : ''
      const documents = await request<Document[]>(`/documents/${queryString}`)
      set({ documents, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch documents'
      set({ error: message, isLoading: false })
    }
  },

  createFolder: async (data) => {
    try {
      const folder = await request<Folder>('/documents/folders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ folders: [...get().folders, folder] })
      // Update allFolders too if it's a root folder
      if (!data.parent_id) {
        set({ allFolders: [...get().allFolders, folder] })
      }
      return folder
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create folder'
      set({ error: message })
      return null
    }
  },

  updateFolder: async (id, data) => {
    try {
      const folder = await request<Folder>(`/documents/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ folders: get().folders.map((f) => (f.id === id ? folder : f)) })
      set({ allFolders: get().allFolders.map((f) => (f.id === id ? folder : f)) })
      return folder
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update folder'
      set({ error: message })
      return null
    }
  },

  deleteFolder: async (id) => {
    try {
      await request(`/documents/folders/${id}`, { method: 'DELETE' })
      set({ folders: get().folders.filter((f) => f.id !== id) })
      set({ allFolders: get().allFolders.filter((f) => f.id !== id) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete folder'
      set({ error: message })
      return false
    }
  },

  toggleSidebarVisibility: async (folderId) => {
    const folder = get().allFolders.find(f => f.id === folderId) || get().folders.find(f => f.id === folderId)
    if (!folder) return

    await get().updateFolder(folderId, {
      name: folder.name,
      show_in_sidebar: !folder.show_in_sidebar
    })
  },

  // Document Actions
  uploadDocument: async (file, folderId = null, description = '') => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (folderId !== null) formData.append('folder_id', String(folderId))
      if (description) formData.append('description', description)

      const doc = await request<Document>('/documents/', {
        method: 'POST',
        body: formData,
      })
      set({ documents: [...get().documents, doc] })
      return doc
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to upload document'
      set({ error: message })
      return null
    }
  },

  updateDocument: async (id, data) => {
    try {
      const doc = await request<Document>(`/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ documents: get().documents.map((d) => (d.id === id ? doc : d)) })
      return doc
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update document'
      set({ error: message })
      return null
    }
  },

  deleteDocument: async (id) => {
    try {
      await request(`/documents/${id}`, { method: 'DELETE' })
      set({ documents: get().documents.filter((d) => d.id !== id) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete document'
      set({ error: message })
      return false
    }
  },

  moveDocument: async (documentId, targetFolderId) => {
    try {
      await request<Document>(`/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: targetFolderId }),
      })
      // Remove from current view
      set({ documents: get().documents.filter((d) => d.id !== documentId) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to move document'
      set({ error: message })
      return false
    }
  },

  moveFolder: async (folderId, targetParentId) => {
    try {
      const folder = get().folders.find(f => f.id === folderId)
      if (!folder) return false

      await request<Folder>(`/documents/folders/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folder.name, parent_id: targetParentId }),
      })
      // Remove from current view
      set({ folders: get().folders.filter((f) => f.id !== folderId) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to move folder'
      set({ error: message })
      return false
    }
  },

  // Navigation
  navigateToFolder: (folderId, folder) => {
    const { folderPath } = get()

    if (folderId === null) {
      // Navigate to root
      set({ currentFolderId: null, folderPath: [] })
    } else if (folder) {
      // Navigate into a subfolder
      set({
        currentFolderId: folderId,
        folderPath: [...folderPath, folder],
      })
    }
  },

  navigateUp: () => {
    const { folderPath } = get()
    if (folderPath.length === 0) return

    const newPath = folderPath.slice(0, -1)
    const parentId = newPath.length > 0 ? newPath[newPath.length - 1].id : null

    set({
      currentFolderId: parentId,
      folderPath: newPath,
    })
  },

  // Computed
  getSidebarFolders: () => {
    const { allFolders } = get()
    const standardFolderNames = ['Bilder', 'Videos', 'Musik', 'Dokumente']
    // Always show standard folders + any folders with show_in_sidebar
    return allFolders.filter(f =>
      f.parent_id === null && (standardFolderNames.includes(f.name) || f.show_in_sidebar)
    )
  },

  getFilteredDocuments: () => {
    const { activeFilters, documents } = get()
    if (activeFilters.length === 0) {
      return documents
    }
    // Filter by any of the active categories
    return documents.filter(doc => {
      for (const filter of activeFilters) {
        const filtered = filterDocumentsByCategory([doc], filter)
        if (filtered.length > 0) return true
      }
      return false
    })
  },

  // UI State
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowFolderForm: (show) => set({ showFolderForm: show }),
  setFileInputRef: (ref) => set({ fileInputRef: ref }),
  triggerFileUpload: () => {
    const { fileInputRef } = get()
    fileInputRef?.click()
  },
}))
