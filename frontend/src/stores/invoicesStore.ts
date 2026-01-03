import { create } from 'zustand'
import { api, ApiError } from '@/api/client'
import type { Invoice, InvoiceCreate } from '@/api/types'

interface InvoicesState {
  invoices: Invoice[]
  isLoading: boolean
  error: string | null
  fetchInvoices: (status?: string, search?: string) => Promise<void>
  createInvoice: (data: InvoiceCreate) => Promise<Invoice | null>
  updateInvoice: (id: number, data: Partial<InvoiceCreate>) => Promise<Invoice | null>
  deleteInvoice: (id: number) => Promise<boolean>
  markAsPaid: (id: number) => Promise<Invoice | null>
  markAsSent: (id: number) => Promise<Invoice | null>
}

export const useInvoicesStore = create<InvoicesState>((set, get) => ({
  invoices: [],
  isLoading: false,
  error: null,

  fetchInvoices: async (status = '', search = '') => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      if (search) params.append('search', search)
      const queryString = params.toString() ? `?${params.toString()}` : ''
      const invoices = await api.get<Invoice[]>(`/invoices/${queryString}`)
      set({ invoices, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch invoices'
      set({ error: message, isLoading: false })
    }
  },

  createInvoice: async (data) => {
    try {
      const invoice = await api.post<Invoice>('/invoices/', data)
      set({ invoices: [...get().invoices, invoice] })
      return invoice
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create invoice'
      set({ error: message })
      return null
    }
  },

  updateInvoice: async (id, data) => {
    try {
      const invoice = await api.put<Invoice>(`/invoices/${id}`, data)
      set({
        invoices: get().invoices.map((i) => (i.id === id ? invoice : i)),
      })
      return invoice
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update invoice'
      set({ error: message })
      return null
    }
  },

  deleteInvoice: async (id) => {
    try {
      await api.delete(`/invoices/${id}`)
      set({ invoices: get().invoices.filter((i) => i.id !== id) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete invoice'
      set({ error: message })
      return false
    }
  },

  markAsPaid: async (id) => {
    try {
      const invoice = await api.post<Invoice>(`/invoices/${id}/mark-paid`)
      set({
        invoices: get().invoices.map((i) => (i.id === id ? invoice : i)),
      })
      return invoice
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to mark invoice as paid'
      set({ error: message })
      return null
    }
  },

  markAsSent: async (id) => {
    try {
      const invoice = await api.post<Invoice>(`/invoices/${id}/mark-sent`)
      set({
        invoices: get().invoices.map((i) => (i.id === id ? invoice : i)),
      })
      return invoice
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to mark invoice as sent'
      set({ error: message })
      return null
    }
  },
}))
