import { create } from 'zustand'
import { api } from '@/api/client'
import { useAIStore } from './aiStore'
import type {
  Expert,
  ExpertCreate,
  ExpertUpdate,
  ExpertDocument,
  ExpertConversation,
  ExpertMessage,
  SourceChunk,
} from '@/api/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface KnowledgebaseState {
  // Data
  experts: Expert[]
  selectedExpertId: number | null
  documents: ExpertDocument[]
  conversations: ExpertConversation[]
  currentConversationId: number | null
  messages: ExpertMessage[]
  lastSources: SourceChunk[]

  // Loading states
  isLoadingExperts: boolean
  isLoadingDocuments: boolean
  isLoadingConversations: boolean
  isLoadingMessages: boolean
  isSendingMessage: boolean
  isUploadingDocument: boolean

  // Tab state
  activeTab: 'documents' | 'chat'
  setActiveTab: (tab: 'documents' | 'chat') => void

  // UI state
  showExpertForm: boolean
  editingExpertId: number | null
  setShowExpertForm: (show: boolean, editId?: number | null) => void

  // Expert actions
  fetchExperts: () => Promise<void>
  createExpert: (data: ExpertCreate) => Promise<Expert | null>
  updateExpert: (id: number, data: ExpertUpdate) => Promise<Expert | null>
  deleteExpert: (id: number) => Promise<boolean>
  selectExpert: (id: number | null) => void

  // Document actions
  fetchDocuments: (expertId: number) => Promise<void>
  uploadDocument: (expertId: number, file: File) => Promise<ExpertDocument | null>
  deleteDocument: (expertId: number, docId: number) => Promise<boolean>
  pollDocumentStatus: (expertId: number, docId: number) => void

  // Conversation actions
  fetchConversations: (expertId: number) => Promise<void>
  createConversation: (expertId: number, title?: string) => Promise<ExpertConversation | null>
  loadConversation: (convId: number) => Promise<void>
  deleteConversation: (convId: number) => Promise<boolean>
  clearCurrentConversation: () => void

  // Message actions
  sendMessage: (convId: number, message: string) => Promise<void>
  quickQuery: (expertId: number, question: string) => Promise<{ answer: string; sources: SourceChunk[] } | null>
}

export const useKnowledgebaseStore = create<KnowledgebaseState>((set, get) => ({
  // Initial state
  experts: [],
  selectedExpertId: null,
  documents: [],
  conversations: [],
  currentConversationId: null,
  messages: [],
  lastSources: [],

  isLoadingExperts: false,
  isLoadingDocuments: false,
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  isUploadingDocument: false,

  activeTab: 'documents',
  setActiveTab: (tab) => set({ activeTab: tab }),

  showExpertForm: false,
  editingExpertId: null,
  setShowExpertForm: (show, editId = null) => set({ showExpertForm: show, editingExpertId: editId }),

  // Expert actions
  fetchExperts: async () => {
    set({ isLoadingExperts: true })
    try {
      const experts = await api.get<Expert[]>('/knowledgebase/experts/')
      set({ experts })
    } catch (error) {
      console.error('Failed to fetch experts:', error)
    } finally {
      set({ isLoadingExperts: false })
    }
  },

  createExpert: async (data) => {
    try {
      const expert = await api.post<Expert>('/knowledgebase/experts/', data)
      set((state) => ({ experts: [...state.experts, expert] }))
      return expert
    } catch (error) {
      console.error('Failed to create expert:', error)
      return null
    }
  },

  updateExpert: async (id, data) => {
    try {
      const expert = await api.put<Expert>(`/knowledgebase/experts/${id}`, data)
      set((state) => ({
        experts: state.experts.map((e) => (e.id === id ? expert : e)),
      }))
      return expert
    } catch (error) {
      console.error('Failed to update expert:', error)
      return null
    }
  },

  deleteExpert: async (id) => {
    try {
      await api.delete(`/knowledgebase/experts/${id}`)
      set((state) => ({
        experts: state.experts.filter((e) => e.id !== id),
        selectedExpertId: state.selectedExpertId === id ? null : state.selectedExpertId,
      }))
      return true
    } catch (error) {
      console.error('Failed to delete expert:', error)
      return false
    }
  },

  selectExpert: (id) => {
    set({
      selectedExpertId: id,
      documents: [],
      conversations: [],
      currentConversationId: null,
      messages: [],
      lastSources: [],
    })
    if (id) {
      get().fetchDocuments(id)
      get().fetchConversations(id)
    }
  },

  // Document actions
  fetchDocuments: async (expertId) => {
    set({ isLoadingDocuments: true })
    try {
      const documents = await api.get<ExpertDocument[]>(`/knowledgebase/experts/${expertId}/documents`)
      set({ documents })
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      set({ isLoadingDocuments: false })
    }
  },

  uploadDocument: async (expertId, file) => {
    set({ isUploadingDocument: true })
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/knowledgebase/experts/${expertId}/documents`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const doc = await response.json() as ExpertDocument
      set((state) => ({ documents: [doc, ...state.documents] }))

      // Start polling for status
      get().pollDocumentStatus(expertId, doc.id)

      return doc
    } catch (error) {
      console.error('Failed to upload document:', error)
      return null
    } finally {
      set({ isUploadingDocument: false })
    }
  },

  deleteDocument: async (expertId, docId) => {
    try {
      await api.delete(`/knowledgebase/experts/${expertId}/documents/${docId}`)
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== docId),
      }))
      // Refresh expert to update counts
      get().fetchExperts()
      return true
    } catch (error) {
      console.error('Failed to delete document:', error)
      return false
    }
  },

  pollDocumentStatus: (expertId, docId) => {
    const poll = async () => {
      try {
        const doc = await api.get<ExpertDocument>(`/knowledgebase/experts/${expertId}/documents/${docId}`)
        set((state) => ({
          documents: state.documents.map((d) => (d.id === docId ? doc : d)),
        }))

        if (doc.status === 'pending' || doc.status === 'processing') {
          setTimeout(poll, 2000) // Poll every 2 seconds
        } else {
          // Refresh expert to update counts
          get().fetchExperts()
        }
      } catch (error) {
        console.error('Failed to poll document status:', error)
      }
    }
    poll()
  },

  // Conversation actions
  fetchConversations: async (expertId) => {
    set({ isLoadingConversations: true })
    try {
      const conversations = await api.get<ExpertConversation[]>(`/knowledgebase/experts/${expertId}/conversations`)
      set({ conversations })
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      set({ isLoadingConversations: false })
    }
  },

  createConversation: async (expertId, title) => {
    try {
      const conv = await api.post<ExpertConversation>(`/knowledgebase/experts/${expertId}/conversations`, {
        title: title || 'Neue Konversation',
      })
      set((state) => ({
        conversations: [conv, ...state.conversations],
        currentConversationId: conv.id,
        messages: [],
        lastSources: [],
      }))
      return conv
    } catch (error) {
      console.error('Failed to create conversation:', error)
      return null
    }
  },

  loadConversation: async (convId) => {
    set({ isLoadingMessages: true, currentConversationId: convId })
    try {
      const messages = await api.get<ExpertMessage[]>(`/knowledgebase/conversations/${convId}/messages`)
      set({ messages })
    } catch (error) {
      console.error('Failed to load conversation:', error)
    } finally {
      set({ isLoadingMessages: false })
    }
  },

  deleteConversation: async (convId) => {
    try {
      await api.delete(`/knowledgebase/conversations/${convId}`)
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== convId),
        currentConversationId: state.currentConversationId === convId ? null : state.currentConversationId,
        messages: state.currentConversationId === convId ? [] : state.messages,
      }))
      return true
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      return false
    }
  },

  clearCurrentConversation: () => {
    set({
      currentConversationId: null,
      messages: [],
      lastSources: [],
    })
  },

  // Message actions
  sendMessage: async (convId, message) => {
    set({ isSendingMessage: true })
    try {
      // Add user message optimistically
      const tempUserMessage: ExpertMessage = {
        id: Date.now(),
        role: 'user',
        content: message,
        source_chunks: [],
        created_at: new Date().toISOString(),
      }
      set((state) => ({ messages: [...state.messages, tempUserMessage] }))

      // Get current chat model from AI store
      const chatModel = useAIStore.getState().chatModel

      const response = await api.post<{ message: ExpertMessage; sources: SourceChunk[] }>(
        `/knowledgebase/conversations/${convId}/chat`,
        { message, model: chatModel }
      )

      // Replace temp message and add assistant response
      set((state) => ({
        messages: [
          ...state.messages.slice(0, -1), // Remove temp message
          { ...tempUserMessage, id: response.message.id - 1 }, // Real user message ID
          response.message,
        ],
        lastSources: response.sources,
      }))

      // Update conversation title in list
      const { conversations, selectedExpertId } = get()
      if (conversations.length > 0 && selectedExpertId) {
        get().fetchConversations(selectedExpertId)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove optimistic message on error
      set((state) => ({ messages: state.messages.slice(0, -1) }))
    } finally {
      set({ isSendingMessage: false })
    }
  },

  quickQuery: async (expertId, question) => {
    try {
      // Get current chat model from AI store
      const chatModel = useAIStore.getState().chatModel

      const response = await api.post<{ answer: string; sources: SourceChunk[] }>(
        `/knowledgebase/experts/${expertId}/query`,
        { question, model: chatModel }
      )
      return response
    } catch (error) {
      console.error('Failed to query expert:', error)
      return null
    }
  },
}))
