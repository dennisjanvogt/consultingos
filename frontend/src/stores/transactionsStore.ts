import { create } from 'zustand'

export type TransactionsView = 'home' | 'invoices' | 'quotes' | 'creditnotes' | 'timeentries'

interface TransactionsState {
  activeView: TransactionsView
  showNewForm: boolean
  setActiveView: (view: TransactionsView) => void
  triggerNewForm: () => void
  clearNewFormTrigger: () => void
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  activeView: 'home',
  showNewForm: false,
  setActiveView: (view) => set({ activeView: view }),
  triggerNewForm: () => set({ showNewForm: true }),
  clearNewFormTrigger: () => set({ showNewForm: false }),
}))
