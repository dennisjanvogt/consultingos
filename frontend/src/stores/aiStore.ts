import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/api/client'
import type { AIConversation, AIConversationDetail, AIMessage, AIMessageCreate, AIHelper, AIHelperCreate, AIHelperUpdate } from '@/api/types'

export interface AIModel {
  id: string
  name: string
  provider: string
  description: string
  contextLength: number
  inputPrice: number  // $ per 1M tokens
  outputPrice: number // $ per 1M tokens
  isVision?: boolean
  isImageGen?: boolean
  isFree?: boolean
  created?: number  // Unix timestamp
}

interface APIKeyStatus {
  hasUserKey: boolean
  hasServerKey: boolean
  keyPreview?: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface AIState {
  // User's decrypted API key (kept in memory only, not persisted)
  userApiKey: string | null
  fetchUserApiKey: () => Promise<string | null>
  clearUserApiKey: () => void
  // Model selection
  chatModel: string
  imageModel: string
  chatModels: AIModel[]
  imageModels: AIModel[]
  isLoadingModels: boolean
  setChatModel: (model: string) => void
  setImageModel: (model: string) => void
  getChatModelInfo: () => AIModel | undefined
  getImageModelInfo: () => AIModel | undefined
  fetchModels: (forceRefresh?: boolean) => Promise<void>

  // API Key status
  apiKeyStatus: APIKeyStatus | null
  isCheckingApiKey: boolean
  checkApiKeyStatus: () => Promise<APIKeyStatus | null>
  hasValidApiKey: () => boolean

  // Analysis Mode (for inline visualizations in chat)
  analysisMode: boolean
  setAnalysisMode: (enabled: boolean) => void

  // Helper management
  helpers: AIHelper[]
  currentHelperId: number | null
  isLoadingHelpers: boolean
  showHelperDialog: boolean
  setShowHelperDialog: (show: boolean) => void
  fetchHelpers: () => Promise<void>
  createHelper: (data: AIHelperCreate) => Promise<AIHelper>
  updateHelper: (id: number, data: AIHelperUpdate) => Promise<AIHelper>
  deleteHelper: (id: number) => Promise<void>
  setCurrentHelper: (id: number | null) => void
  getCurrentHelper: () => AIHelper | undefined
  generatePrompt: (description: string) => Promise<string>

  // Conversation management
  conversations: AIConversation[]
  currentConversationId: number | null
  currentMessages: AIMessage[]
  isLoadingConversations: boolean
  fetchConversations: () => Promise<void>
  createConversation: (title?: string) => Promise<number>
  loadConversation: (id: number) => Promise<void>
  deleteConversation: (id: number) => Promise<void>
  addMessage: (data: AIMessageCreate) => Promise<AIMessage | null>
  clearCurrentConversation: () => void
}

// OpenRouter models API response type
interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length: number
  created?: number  // Unix timestamp
  pricing: {
    prompt: string  // Price per token as string
    completion: string
    image?: string
  }
  architecture?: {
    modality?: string
    input_modalities?: string[]
    output_modalities?: string[]
  }
}

// Extract provider from model ID (e.g., "google/gemini-flash" -> "Google")
const getProvider = (id: string): string => {
  const prefix = id.split('/')[0]
  const providers: Record<string, string> = {
    'google': 'Google',
    'anthropic': 'Anthropic',
    'openai': 'OpenAI',
    'meta-llama': 'Meta',
    'mistralai': 'Mistral',
    'deepseek': 'DeepSeek',
    'qwen': 'Qwen',
    'cohere': 'Cohere',
    'x-ai': 'xAI',
    'perplexity': 'Perplexity',
    'nvidia': 'Nvidia',
    'microsoft': 'Microsoft',
    'amazon': 'Amazon',
    'ai21': 'AI21',
    'nousresearch': 'Nous',
    'z-ai': 'Z.ai',
    'black-forest-labs': 'FLUX',
    'stability-ai': 'Stability',
    'ideogram': 'Ideogram',
    'recraft': 'Recraft',
    'freepik': 'Freepik',
    'playgroundai': 'Playground',
    'together': 'Together',
  }
  return providers[prefix] || prefix.charAt(0).toUpperCase() + prefix.slice(1)
}

// Convert OpenRouter model to our format
const convertModel = (model: OpenRouterModel): AIModel => {
  const inputPrice = parseFloat(model.pricing.prompt) * 1_000_000 // Convert to $ per 1M tokens
  const outputPrice = parseFloat(model.pricing.completion) * 1_000_000

  const hasVision = model.architecture?.input_modalities?.includes('image') ||
                    model.architecture?.modality?.includes('multimodal') ||
                    model.name.toLowerCase().includes('vision')

  // Detect image generation models - check API response first, then fallback to model ID patterns
  const isImageGen = model.architecture?.output_modalities?.includes('image') ||
                     model.id.includes('image-generation') ||
                     model.id.includes('dall-e') ||
                     model.id.includes('flux') ||
                     model.id.includes('stable-diffusion') ||
                     model.id.includes('ideogram') ||
                     model.id.includes('recraft') ||
                     model.id.includes('nova-canvas') ||
                     model.id.includes('mystic') ||
                     model.id.includes('playground-v') ||
                     model.id.includes('imagen') ||
                     model.id.includes('midjourney') ||
                     model.id.includes('sdxl') ||
                     model.id.includes('kandinsky') ||
                     model.id.includes('dreamshaper') ||
                     model.id.includes('leonardo') ||
                     model.id.includes('pixart') ||
                     model.id.includes('freepik') ||
                     model.name.toLowerCase().includes('image generation')

  return {
    id: model.id,
    name: model.name,
    provider: getProvider(model.id),
    description: model.description || '',
    contextLength: model.context_length || 0,
    inputPrice,
    outputPrice,
    isVision: hasVision,
    isImageGen,
    isFree: inputPrice === 0 && outputPrice === 0,
    created: model.created,
  }
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      // User API Key (in memory only, not persisted)
      userApiKey: null,

      fetchUserApiKey: async () => {
        try {
          const response = await fetch(`${API_URL}/auth/api-key/decrypt`, {
            credentials: 'include',
          })
          if (!response.ok) {
            set({ userApiKey: null })
            return null
          }
          const data = await response.json()
          set({ userApiKey: data.key })
          return data.key
        } catch {
          set({ userApiKey: null })
          return null
        }
      },

      clearUserApiKey: () => set({ userApiKey: null }),

      // Model selection state
      chatModel: 'google/gemini-2.0-flash-001',
      imageModel: 'google/gemini-2.0-flash-001:image-generation',
      chatModels: [],
      imageModels: [],
      isLoadingModels: false,

      setChatModel: (model) => set({ chatModel: model }),
      setImageModel: (model) => set({ imageModel: model }),

      // API Key status
      apiKeyStatus: null,
      isCheckingApiKey: false,

      checkApiKeyStatus: async () => {
        set({ isCheckingApiKey: true })
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/api-keys`, {
            credentials: 'include',
          })
          if (!response.ok) {
            set({ apiKeyStatus: null, isCheckingApiKey: false })
            return null
          }
          const data = await response.json()
          const status: APIKeyStatus = {
            hasUserKey: data.has_openrouter_key,
            hasServerKey: data.has_server_fallback,
            keyPreview: data.key_preview,
          }
          set({ apiKeyStatus: status, isCheckingApiKey: false })
          return status
        } catch {
          set({ apiKeyStatus: null, isCheckingApiKey: false })
          return null
        }
      },

      hasValidApiKey: () => {
        // Only user's own key is valid (no server fallback)
        return get().userApiKey !== null
      },

      // Analysis Mode state
      analysisMode: false,
      setAnalysisMode: (enabled) => set({ analysisMode: enabled }),

      getChatModelInfo: () => get().chatModels.find((m) => m.id === get().chatModel),
      getImageModelInfo: () => get().imageModels.find((m) => m.id === get().imageModel),

      fetchModels: async (forceRefresh = false) => {
        if (get().chatModels.length > 0 && !forceRefresh) return // Already loaded

        set({ isLoadingModels: true })

        try {
          const response = await fetch('https://openrouter.ai/api/v1/models')
          const data = await response.json()

          const models: OpenRouterModel[] = data.data || []

          // Convert and categorize models
          const allModels = models.map(convertModel)

          // Filter chat models (exclude pure image generators)
          const chatModels = allModels
            .filter(m => !m.isImageGen && m.contextLength > 0)
            .sort((a, b) => {
              // Sort by provider, then by created date (newest first)
              if (a.provider !== b.provider) return a.provider.localeCompare(b.provider)
              // Newest first within provider
              return (b.created || 0) - (a.created || 0)
            })

          // Filter image models
          const imageModels = allModels
            .filter(m => m.isImageGen)
            .sort((a, b) => {
              if (a.provider !== b.provider) return a.provider.localeCompare(b.provider)
              return (b.created || 0) - (a.created || 0)
            })

          set({ chatModels, imageModels, isLoadingModels: false })
        } catch (error) {
          console.error('Failed to fetch models from OpenRouter:', error)
          set({ isLoadingModels: false })
        }
      },

      // Helper management state
      helpers: [],
      currentHelperId: null,
      isLoadingHelpers: false,
      showHelperDialog: false,
      setShowHelperDialog: (show: boolean) => set({ showHelperDialog: show }),

      fetchHelpers: async () => {
        set({ isLoadingHelpers: true })
        try {
          const helpers = await api.get<AIHelper[]>('/ai/helpers')
          set({ helpers, isLoadingHelpers: false })

          // Set default helper if none selected
          if (!get().currentHelperId && helpers.length > 0) {
            const defaultHelper = helpers.find(h => h.is_default) || helpers[0]
            set({ currentHelperId: defaultHelper.id })
          }
        } catch (error) {
          console.error('Failed to fetch helpers:', error)
          set({ isLoadingHelpers: false })
        }
      },

      createHelper: async (data: AIHelperCreate) => {
        const helper = await api.post<AIHelper>('/ai/helpers', data)
        set((state) => ({ helpers: [...state.helpers, helper] }))
        return helper
      },

      updateHelper: async (id: number, data: AIHelperUpdate) => {
        const helper = await api.put<AIHelper>(`/ai/helpers/${id}`, data)
        set((state) => ({
          helpers: state.helpers.map((h) => (h.id === id ? helper : h)),
        }))
        return helper
      },

      deleteHelper: async (id: number) => {
        await api.delete(`/ai/helpers/${id}`)
        set((state) => ({
          helpers: state.helpers.filter((h) => h.id !== id),
          currentHelperId: state.currentHelperId === id ? null : state.currentHelperId,
        }))
      },

      setCurrentHelper: (id: number | null) => {
        set({ currentHelperId: id })
      },

      getCurrentHelper: () => {
        const { helpers, currentHelperId } = get()
        return helpers.find((h) => h.id === currentHelperId)
      },

      generatePrompt: async (description: string) => {
        const { chatModel } = get()
        const response = await api.post<{ prompt: string }>('/ai/helpers/generate-prompt', { description, model: chatModel })
        return response.prompt
      },

      // Conversation management state
      conversations: [],
      currentConversationId: null,
      currentMessages: [],
      isLoadingConversations: false,

      fetchConversations: async () => {
        set({ isLoadingConversations: true })
        try {
          const conversations = await api.get<AIConversation[]>('/ai/conversations')
          set({ conversations, isLoadingConversations: false })
        } catch (error) {
          console.error('Failed to fetch conversations:', error)
          set({ isLoadingConversations: false })
        }
      },

      createConversation: async (title?: string) => {
        try {
          const conv = await api.post<AIConversation>('/ai/conversations', { title })
          set((state) => ({
            conversations: [conv, ...state.conversations],
            currentConversationId: conv.id,
            currentMessages: [],
          }))
          return conv.id
        } catch (error) {
          console.error('Failed to create conversation:', error)
          throw error
        }
      },

      loadConversation: async (id: number) => {
        try {
          const conv = await api.get<AIConversationDetail>(`/ai/conversations/${id}`)
          set({
            currentConversationId: conv.id,
            currentMessages: conv.messages,
          })
        } catch (error) {
          console.error('Failed to load conversation:', error)
        }
      },

      deleteConversation: async (id: number) => {
        try {
          await api.delete(`/ai/conversations/${id}`)
          set((state) => ({
            conversations: state.conversations.filter((c) => c.id !== id),
            currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
            currentMessages: state.currentConversationId === id ? [] : state.currentMessages,
          }))
        } catch (error) {
          console.error('Failed to delete conversation:', error)
        }
      },

      addMessage: async (data: AIMessageCreate) => {
        const { currentConversationId, createConversation } = get()

        // Create conversation if none exists
        let convId = currentConversationId
        if (!convId) {
          convId = await createConversation()
        }

        try {
          const msg = await api.post<AIMessage>(`/ai/conversations/${convId}/messages`, data)

          set((state) => {
            // Update conversation title if this is the first user message
            const updatedConversations = state.conversations.map((c) => {
              if (c.id === convId && c.title === 'Neues Gespräch' && data.role === 'user') {
                return { ...c, title: data.content.slice(0, 100), updated_at: new Date().toISOString() }
              }
              if (c.id === convId) {
                return { ...c, updated_at: new Date().toISOString() }
              }
              return c
            })

            return {
              currentMessages: [...state.currentMessages, msg],
              conversations: updatedConversations,
            }
          })

          return msg
        } catch (error) {
          console.error('Failed to add message:', error)
          return null
        }
      },

      clearCurrentConversation: () => {
        set({
          currentConversationId: null,
          currentMessages: [],
        })
      },
    }),
    {
      name: 'ai-settings',
      partialize: (state) => ({
        chatModel: state.chatModel,
        imageModel: state.imageModel,
        currentHelperId: state.currentHelperId,
        analysisMode: state.analysisMode,
      }),
    }
  )
)

// Helper to group models by provider (for UI)
export const groupModelsByProvider = (models: AIModel[]): Record<string, AIModel[]> => {
  return models.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = []
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, AIModel[]>)
}
