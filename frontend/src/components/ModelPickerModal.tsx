import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, Check, Eye, Sparkles } from 'lucide-react'
import { useAIStore, groupModelsByProvider, type AIModel } from '@/stores/aiStore'
import { getProviderLogo, getProviderColor, getProviderInitial } from '@/lib/providerLogos'

interface ModelPickerModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'chat' | 'image' | 'analysis'
  currentModel: string
  onSelect: (modelId: string) => void
  title?: string
}

// Established providers for filter
const establishedChatProviders = ['Google', 'Anthropic', 'OpenAI', 'xAI', 'Meta', 'Zhipu', 'Z.ai']
const establishedImageProviders = ['Google', 'OpenAI', 'FLUX', 'Stability', 'Ideogram', 'Recraft']

export function ModelPickerModal({
  isOpen,
  onClose,
  type,
  currentModel,
  onSelect,
  title,
}: ModelPickerModalProps) {
  // Select models from store
  const chatModels = useAIStore((s) => s.chatModels)
  const imageModels = useAIStore((s) => s.imageModels)
  const storeFilters = useAIStore((s) => s.modelFilters)
  const setModelFilterInStore = useAIStore((s) => s.setModelFilter)

  // Use LOCAL state for filters, initialized from store
  const [filterNewest, setFilterNewest] = useState(false)
  const [filterFree, setFilterFree] = useState(false)
  const [filterCheap, setFilterCheap] = useState(false)
  const [filterEstablished, setFilterEstablished] = useState(false)
  const [search, setSearch] = useState('')

  // Sync local state with store when modal opens or type changes
  useEffect(() => {
    if (isOpen && storeFilters?.[type]) {
      const filters = storeFilters[type]
      setFilterNewest(filters.newest ?? false)
      setFilterCheap(filters.cheap ?? false)
      setFilterEstablished(filters.established ?? false)
      if (type !== 'image' && 'free' in filters) {
        setFilterFree((filters as { free: boolean }).free ?? false)
      }
    }
  }, [isOpen, type, storeFilters])

  // Helper to update both local state and store
  const setModelFilter = (filterName: string, value: boolean) => {
    // Update local state immediately for UI feedback
    switch (filterName) {
      case 'newest': setFilterNewest(value); break
      case 'free': setFilterFree(value); break
      case 'cheap': setFilterCheap(value); break
      case 'established': setFilterEstablished(value); break
    }
    // Also persist to store
    setModelFilterInStore(type, filterName, value)
  }

  const searchInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Get vision models (filter chatModels for vision capability)
  const visionModels = useMemo(() => {
    return chatModels.filter(m => m.isVision)
  }, [chatModels])

  // Get base models based on type
  const baseModels = useMemo(() => {
    switch (type) {
      case 'chat':
        return chatModels
      case 'image':
        return imageModels
      case 'analysis':
        return visionModels
      default:
        return chatModels
    }
  }, [type, chatModels, imageModels, visionModels])

  // Get established providers based on type
  const establishedProviders = type === 'image' ? establishedImageProviders : establishedChatProviders

  // Get newest model per provider
  const getNewestModelsPerProvider = useCallback((models: AIModel[]): Set<string> => {
    const newestByProvider = new Map<string, AIModel>()
    models.forEach((model) => {
      if (!newestByProvider.has(model.provider)) {
        newestByProvider.set(model.provider, model)
      }
    })
    return new Set(Array.from(newestByProvider.values()).map(m => m.id))
  }, [])

  // Apply filters
  const filteredModels = useMemo(() => {
    const newestModelIds = filterNewest ? getNewestModelsPerProvider(baseModels) : null
    const hasActiveFilter = filterFree || filterCheap || filterEstablished || filterNewest

    let filtered = baseModels

    if (hasActiveFilter) {
      filtered = baseModels.filter((model) => {
        if (filterFree && !model.isFree) return false
        if (filterCheap && !model.isFree && (model.inputPrice > 1 || model.outputPrice > 1)) return false
        if (filterEstablished && !establishedProviders.includes(model.provider)) return false
        if (filterNewest && newestModelIds && !newestModelIds.has(model.id)) return false
        return true
      })
    }

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((model) =>
        model.name.toLowerCase().includes(searchLower) ||
        model.provider.toLowerCase().includes(searchLower) ||
        model.id.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [baseModels, filterFree, filterCheap, filterEstablished, filterNewest, search, getNewestModelsPerProvider, establishedProviders])

  // Group by provider
  const groupedModels = useMemo(() => groupModelsByProvider(filteredModels), [filteredModels])

  // Format price
  const formatPrice = (model: AIModel) => {
    if (model.isFree) return null // Will show FREE badge instead
    if (type === 'image') {
      return `$${model.inputPrice.toFixed(3)}`
    }
    return `$${model.inputPrice.toFixed(2)}/$${model.outputPrice.toFixed(2)}`
  }

  // Strip provider prefix from model name (e.g. "Google: Gemini 2.5" -> "Gemini 2.5")
  const getDisplayName = (model: AIModel) => {
    const name = model.name
    // Check for "Provider: " or "Provider " prefix
    if (name.includes(': ')) {
      return name.split(': ').slice(1).join(': ')
    }
    // Also check for provider name at start without colon
    if (name.toLowerCase().startsWith(model.provider.toLowerCase() + ' ')) {
      return name.substring(model.provider.length + 1)
    }
    return name
  }

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    } else {
      setSearch('')
    }
  }, [isOpen])

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle model selection
  const handleSelect = (modelId: string) => {
    onSelect(modelId)
    onClose()
  }

  // Get modal title
  const modalTitle = title || (type === 'chat' ? 'Chat-Modell' : type === 'image' ? 'Bild-Modell' : 'Analyse-Modell')

  if (!isOpen) return null

  const ProviderLogo = ({ provider }: { provider: string }) => {
    const logoUrl = getProviderLogo(provider)
    const color = getProviderColor(provider)
    const initial = getProviderInitial(provider)

    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt={provider}
          className="w-5 h-5 rounded"
          onError={(e) => {
            // Fallback to initial on error
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            target.nextElementSibling?.classList.remove('hidden')
          }}
        />
      )
    }

    return (
      <div
        className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: color }}
      >
        {initial}
      </div>
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ zIndex: 9999999 }}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{modalTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="px-5 py-3 space-y-3 border-b border-gray-200 dark:border-gray-800">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Suche nach Modell oder Anbieter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModelFilter('newest', !filterNewest)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                filterNewest
                  ? 'bg-gold-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Neueste
            </button>
            {type !== 'image' && (
              <button
                type="button"
                onClick={() => setModelFilter('free', !filterFree)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                  filterFree
                    ? 'bg-gold-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Gratis
              </button>
            )}
            <button
              type="button"
              onClick={() => setModelFilter('cheap', !filterCheap)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                filterCheap
                  ? 'bg-gold-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Günstig
            </button>
            <button
              type="button"
              onClick={() => setModelFilter('established', !filterEstablished)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                filterEstablished
                  ? 'bg-gold-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Etabliert
            </button>
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {Object.keys(groupedModels).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Keine Modelle gefunden
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedModels).map(([provider, models]) => (
                <div key={provider}>
                  {/* Provider Header */}
                  <div className="flex items-center gap-2 px-2 py-1.5 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-10">
                    <ProviderLogo provider={provider} />
                    <span className="text-xs text-gray-400">
                      ({models.length})
                    </span>
                  </div>

                  {/* Models */}
                  <div className="space-y-1">
                    {models.map((model) => {
                      const isSelected = model.id === currentModel
                      const price = formatPrice(model)

                      return (
                        <button
                          key={model.id}
                          onClick={() => handleSelect(model.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${
                            isSelected
                              ? 'bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Selection indicator */}
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? 'border-violet-500 bg-violet-500'
                                : 'border-gray-300 dark:border-gray-600 group-hover:border-violet-400'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>

                            {/* Model name */}
                            <span className={`text-sm truncate ${
                              isSelected
                                ? 'text-violet-700 dark:text-violet-300 font-medium'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {getDisplayName(model)}
                            </span>

                            {/* Badges */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {model.isFree && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded">
                                  FREE
                                </span>
                              )}
                              {model.isVision && type !== 'analysis' && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded flex items-center gap-0.5">
                                  <Eye className="w-2.5 h-2.5" />
                                  VISION
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Price */}
                          {price && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                              {price}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          {filteredModels.length} Modelle • Preise pro 1M Tokens
        </div>
      </div>
    </div>,
    document.body
  )
}
