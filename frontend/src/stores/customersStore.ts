import { create } from 'zustand'
import { api, ApiError } from '@/api/client'
import type { Customer, CustomerCreate } from '@/api/types'

interface CustomersState {
  customers: Customer[]
  isLoading: boolean
  error: string | null
  fetchCustomers: (search?: string) => Promise<void>
  createCustomer: (data: CustomerCreate) => Promise<Customer | null>
  updateCustomer: (id: number, data: Partial<CustomerCreate>) => Promise<Customer | null>
  deleteCustomer: (id: number) => Promise<boolean>
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  isLoading: false,
  error: null,

  fetchCustomers: async (search = '') => {
    set({ isLoading: true, error: null })
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const customers = await api.get<Customer[]>(`/customers/${params}`)
      set({ customers, isLoading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch customers'
      set({ error: message, isLoading: false })
    }
  },

  createCustomer: async (data) => {
    try {
      const customer = await api.post<Customer>('/customers/', data)
      set({ customers: [...get().customers, customer] })
      return customer
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create customer'
      set({ error: message })
      return null
    }
  },

  updateCustomer: async (id, data) => {
    try {
      const customer = await api.put<Customer>(`/customers/${id}`, data)
      set({
        customers: get().customers.map((c) => (c.id === id ? customer : c)),
      })
      return customer
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update customer'
      set({ error: message })
      return null
    }
  },

  deleteCustomer: async (id) => {
    try {
      await api.delete(`/customers/${id}`)
      set({ customers: get().customers.filter((c) => c.id !== id) })
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete customer'
      set({ error: message })
      return false
    }
  },
}))
