import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
}

interface AIState {
  chatModel: string
  imageModel: string
  chatModels: AIModel[]
  imageModels: AIModel[]
  isLoadingModels: boolean
  setChatModel: (model: string) => void
  setImageModel: (model: string) => void
  getChatModelInfo: () => AIModel | undefined
  getImageModelInfo: () => AIModel | undefined
  fetchModels: () => Promise<void>
}

// OpenRouter models API response type
interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length: number
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

  const isImageGen = model.architecture?.output_modalities?.includes('image') ||
                     model.id.includes('image-generation') ||
                     model.id.includes('dall-e') ||
                     model.id.includes('flux') ||
                     model.id.includes('stable-diffusion') ||
                     model.id.includes('ideogram') ||
                     model.id.includes('recraft') ||
                     model.id.includes('nova-canvas') ||
                     model.id.includes('mystic') ||
                     model.id.includes('playground-v')

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
  }
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      chatModel: 'google/gemini-2.5-flash-preview',
      imageModel: 'google/gemini-2.5-flash-preview:image-generation',
      chatModels: [],
      imageModels: [],
      isLoadingModels: false,

      setChatModel: (model) => set({ chatModel: model }),
      setImageModel: (model) => set({ imageModel: model }),

      getChatModelInfo: () => get().chatModels.find((m) => m.id === get().chatModel),
      getImageModelInfo: () => get().imageModels.find((m) => m.id === get().imageModel),

      fetchModels: async () => {
        if (get().chatModels.length > 0) return // Already loaded

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
              // Sort by provider, then by name
              if (a.provider !== b.provider) return a.provider.localeCompare(b.provider)
              return a.name.localeCompare(b.name)
            })

          // Filter image models
          const imageModels = allModels
            .filter(m => m.isImageGen)
            .sort((a, b) => {
              if (a.provider !== b.provider) return a.provider.localeCompare(b.provider)
              return a.name.localeCompare(b.name)
            })

          set({ chatModels, imageModels, isLoadingModels: false })
        } catch (error) {
          console.error('Failed to fetch models from OpenRouter:', error)
          set({ isLoadingModels: false })
        }
      },
    }),
    {
      name: 'ai-settings',
      partialize: (state) => ({
        chatModel: state.chatModel,
        imageModel: state.imageModel,
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
