import { create } from 'zustand'
import { ApiError } from '@/api/client'
import type {
  WorkflowCategory,
  WorkflowCategoryCreate,
  WorkflowCategoryUpdate,
  WorkflowTemplate,
  WorkflowTemplateList,
  WorkflowTemplateCreate,
  WorkflowTemplateUpdate,
  WorkflowTemplateStep,
  WorkflowTemplateStepCreate,
  WorkflowTemplateStepUpdate,
  WorkflowInstance,
  WorkflowInstanceList,
  WorkflowInstanceCreate,
  WorkflowInstanceUpdate,
  WorkflowInstanceStep,
  WorkflowInstanceStepUpdate,
  WorkflowStats,
} from '@/api/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

type ViewMode = 'templates' | 'active' | 'dashboard'

interface WorkflowState {
  // Data
  categories: WorkflowCategory[]
  templates: WorkflowTemplateList[]
  selectedTemplate: WorkflowTemplate | null
  instances: WorkflowInstanceList[]
  selectedInstance: WorkflowInstance | null
  stats: WorkflowStats | null

  // UI State
  viewMode: ViewMode
  selectedCategoryId: number | null
  statusFilter: string | null
  isLoading: boolean
  error: string | null

  // Category actions
  fetchCategories: () => Promise<void>
  createCategory: (data: WorkflowCategoryCreate) => Promise<WorkflowCategory | null>
  updateCategory: (id: number, data: WorkflowCategoryUpdate) => Promise<WorkflowCategory | null>
  deleteCategory: (id: number) => Promise<boolean>

  // Template actions
  fetchTemplates: (categoryId?: number) => Promise<void>
  createTemplate: (data: WorkflowTemplateCreate) => Promise<WorkflowTemplate | null>
  getTemplate: (id: number) => Promise<WorkflowTemplate | null>
  updateTemplate: (id: number, data: WorkflowTemplateUpdate) => Promise<WorkflowTemplate | null>
  deleteTemplate: (id: number) => Promise<boolean>

  // Template Step actions
  createTemplateStep: (templateId: number, data: WorkflowTemplateStepCreate) => Promise<WorkflowTemplateStep | null>
  updateTemplateStep: (templateId: number, stepId: number, data: WorkflowTemplateStepUpdate) => Promise<WorkflowTemplateStep | null>
  deleteTemplateStep: (templateId: number, stepId: number) => Promise<boolean>
  reorderTemplateSteps: (templateId: number, stepIds: number[]) => Promise<boolean>

  // Instance actions
  fetchInstances: (status?: string, categoryId?: number) => Promise<void>
  createInstance: (data: WorkflowInstanceCreate) => Promise<WorkflowInstance | null>
  getInstance: (id: number) => Promise<WorkflowInstance | null>
  updateInstance: (id: number, data: WorkflowInstanceUpdate) => Promise<WorkflowInstance | null>
  deleteInstance: (id: number) => Promise<boolean>

  // Instance Step actions
  toggleInstanceStep: (instanceId: number, stepId: number) => Promise<WorkflowInstanceStep | null>
  updateInstanceStep: (instanceId: number, stepId: number, data: WorkflowInstanceStepUpdate) => Promise<WorkflowInstanceStep | null>

  // Stats
  fetchStats: () => Promise<void>

  // UI actions
  setViewMode: (mode: ViewMode) => void
  setSelectedCategoryId: (id: number | null) => void
  setStatusFilter: (status: string | null) => void
  selectTemplate: (id: number | null) => void
  selectInstance: (id: number | null) => void

  // Helpers
  getTemplateStepsHierarchy: () => unknown[]
  getInstanceStepsHierarchy: () => unknown[]
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

// Helper to build hierarchy from flat steps
function buildStepHierarchy<T extends { id: number; parent_id: number | null }>(steps: T[]): (T & { children: T[] })[] {
  const stepMap = new Map<number, T & { children: T[] }>()
  const roots: (T & { children: T[] })[] = []

  // Initialize all steps with empty children
  steps.forEach(step => {
    stepMap.set(step.id, { ...step, children: [] })
  })

  // Build hierarchy
  steps.forEach(step => {
    const stepWithChildren = stepMap.get(step.id)!
    if (step.parent_id === null) {
      roots.push(stepWithChildren)
    } else {
      const parent = stepMap.get(step.parent_id)
      if (parent) {
        parent.children.push(stepWithChildren)
      }
    }
  })

  return roots
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  categories: [],
  templates: [],
  selectedTemplate: null,
  instances: [],
  selectedInstance: null,
  stats: null,
  viewMode: 'active',
  selectedCategoryId: null,
  statusFilter: 'active',
  isLoading: false,
  error: null,

  // Category actions
  fetchCategories: async () => {
    try {
      const categories = await request<WorkflowCategory[]>('/workflows/categories')
      set({ categories })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch categories'
      set({ error: message })
    }
  },

  createCategory: async (data) => {
    try {
      const category = await request<WorkflowCategory>('/workflows/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ categories: [...get().categories, category] })
      return category
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create category'
      set({ error: message })
      return null
    }
  },

  updateCategory: async (id, data) => {
    try {
      const category = await request<WorkflowCategory>(`/workflows/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ categories: get().categories.map(c => c.id === id ? category : c) })
      return category
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update category'
      set({ error: message })
      return null
    }
  },

  deleteCategory: async (id) => {
    try {
      await request(`/workflows/categories/${id}`, { method: 'DELETE' })
      set({ categories: get().categories.filter(c => c.id !== id) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete category'
      set({ error: message })
      return false
    }
  },

  // Template actions
  fetchTemplates: async (categoryId) => {
    set({ isLoading: true, error: null })
    try {
      const catId = categoryId ?? get().selectedCategoryId
      const url = catId ? `/workflows/templates?category_id=${catId}` : '/workflows/templates'
      const templates = await request<WorkflowTemplateList[]>(url)
      set({ templates, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch templates'
      set({ error: message, isLoading: false })
    }
  },

  createTemplate: async (data) => {
    try {
      const template = await request<WorkflowTemplate>('/workflows/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ selectedTemplate: template })
      await get().fetchTemplates()
      return template
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create template'
      set({ error: message })
      return null
    }
  },

  getTemplate: async (id) => {
    try {
      const template = await request<WorkflowTemplate>(`/workflows/templates/${id}`)
      set({ selectedTemplate: template })
      return template
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch template'
      set({ error: message })
      return null
    }
  },

  updateTemplate: async (id, data) => {
    try {
      const template = await request<WorkflowTemplate>(`/workflows/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ selectedTemplate: template })
      await get().fetchTemplates()
      return template
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update template'
      set({ error: message })
      return null
    }
  },

  deleteTemplate: async (id) => {
    try {
      await request(`/workflows/templates/${id}`, { method: 'DELETE' })
      set({
        templates: get().templates.filter(t => t.id !== id),
        selectedTemplate: get().selectedTemplate?.id === id ? null : get().selectedTemplate
      })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete template'
      set({ error: message })
      return false
    }
  },

  // Template Step actions
  createTemplateStep: async (templateId, data) => {
    try {
      const step = await request<WorkflowTemplateStep>(`/workflows/templates/${templateId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      // Refresh the template to get updated steps
      await get().getTemplate(templateId)
      return step
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create step'
      set({ error: message })
      return null
    }
  },

  updateTemplateStep: async (templateId, stepId, data) => {
    try {
      const step = await request<WorkflowTemplateStep>(`/workflows/templates/${templateId}/steps/${stepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      await get().getTemplate(templateId)
      return step
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update step'
      set({ error: message })
      return null
    }
  },

  deleteTemplateStep: async (templateId, stepId) => {
    try {
      await request(`/workflows/templates/${templateId}/steps/${stepId}`, { method: 'DELETE' })
      await get().getTemplate(templateId)
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete step'
      set({ error: message })
      return false
    }
  },

  reorderTemplateSteps: async (templateId, stepIds) => {
    try {
      await request(`/workflows/templates/${templateId}/steps/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_ids: stepIds }),
      })
      await get().getTemplate(templateId)
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to reorder steps'
      set({ error: message })
      return false
    }
  },

  // Instance actions
  fetchInstances: async (status, categoryId) => {
    set({ isLoading: true, error: null })
    try {
      const s = status ?? get().statusFilter
      const c = categoryId ?? get().selectedCategoryId
      let url = '/workflows/instances'
      const params = new URLSearchParams()
      if (s) params.append('status', s)
      if (c) params.append('category_id', c.toString())
      if (params.toString()) url += `?${params.toString()}`

      const instances = await request<WorkflowInstanceList[]>(url)
      set({ instances, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch instances'
      set({ error: message, isLoading: false })
    }
  },

  createInstance: async (data) => {
    try {
      const instance = await request<WorkflowInstance>('/workflows/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ selectedInstance: instance })
      await get().fetchInstances()
      return instance
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create instance'
      set({ error: message })
      return null
    }
  },

  getInstance: async (id) => {
    try {
      const instance = await request<WorkflowInstance>(`/workflows/instances/${id}`)
      set({ selectedInstance: instance })
      return instance
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch instance'
      set({ error: message })
      return null
    }
  },

  updateInstance: async (id, data) => {
    try {
      const instance = await request<WorkflowInstance>(`/workflows/instances/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      set({ selectedInstance: instance })
      await get().fetchInstances()
      return instance
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update instance'
      set({ error: message })
      return null
    }
  },

  deleteInstance: async (id) => {
    try {
      await request(`/workflows/instances/${id}`, { method: 'DELETE' })
      set({
        instances: get().instances.filter(i => i.id !== id),
        selectedInstance: get().selectedInstance?.id === id ? null : get().selectedInstance
      })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete instance'
      set({ error: message })
      return false
    }
  },

  // Instance Step actions
  toggleInstanceStep: async (instanceId, stepId) => {
    try {
      const step = await request<WorkflowInstanceStep>(`/workflows/instances/${instanceId}/steps/${stepId}/toggle`, {
        method: 'POST',
      })
      // Refresh instance to get updated progress
      await get().getInstance(instanceId)
      await get().fetchInstances()
      return step
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to toggle step'
      set({ error: message })
      return null
    }
  },

  updateInstanceStep: async (instanceId, stepId, data) => {
    try {
      const step = await request<WorkflowInstanceStep>(`/workflows/instances/${instanceId}/steps/${stepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      await get().getInstance(instanceId)
      return step
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update step'
      set({ error: message })
      return null
    }
  },

  // Stats
  fetchStats: async () => {
    try {
      const stats = await request<WorkflowStats>('/workflows/stats')
      set({ stats })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch stats'
      set({ error: message })
    }
  },

  // UI actions
  setViewMode: (mode) => {
    set({ viewMode: mode })
    if (mode === 'templates') {
      get().fetchTemplates()
    } else if (mode === 'active') {
      get().fetchInstances()
    } else if (mode === 'dashboard') {
      get().fetchStats()
    }
  },

  setSelectedCategoryId: (id) => {
    set({ selectedCategoryId: id })
    if (get().viewMode === 'templates') {
      get().fetchTemplates(id ?? undefined)
    } else {
      get().fetchInstances(undefined, id ?? undefined)
    }
  },

  setStatusFilter: (status) => {
    set({ statusFilter: status })
    get().fetchInstances(status ?? undefined)
  },

  selectTemplate: async (id) => {
    if (id === null) {
      set({ selectedTemplate: null })
    } else {
      await get().getTemplate(id)
    }
  },

  selectInstance: async (id) => {
    if (id === null) {
      set({ selectedInstance: null })
    } else {
      await get().getInstance(id)
    }
  },

  // Helpers
  getTemplateStepsHierarchy: () => {
    const template = get().selectedTemplate
    if (!template) return []
    return buildStepHierarchy(template.steps)
  },

  getInstanceStepsHierarchy: () => {
    const instance = get().selectedInstance
    if (!instance) return []
    return buildStepHierarchy(instance.steps)
  },
}))
