import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAIStore } from '@/stores/aiStore'
import { getProviderLogo, getProviderColor, getProviderInitial } from '@/lib/providerLogos'
import { ModelPickerModal } from './ModelPickerModal'

interface ModelPickerButtonProps {
  type: 'chat' | 'image' | 'analysis'
  className?: string
  compact?: boolean
  showIcon?: boolean
}

export function ModelPickerButton({
  type,
  className = '',
  compact = false,
  showIcon = true,
}: ModelPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const {
    chatModel,
    imageModel,
    analysisModel,
    setChatModel,
    setImageModel,
    setAnalysisModel,
    getChatModelInfo,
    getImageModelInfo,
    getAnalysisModelInfo,
  } = useAIStore()

  // Get current model based on type
  const getCurrentModel = () => {
    switch (type) {
      case 'chat':
        return chatModel
      case 'image':
        return imageModel
      case 'analysis':
        return analysisModel
    }
  }

  const getCurrentModelInfo = () => {
    switch (type) {
      case 'chat':
        return getChatModelInfo()
      case 'image':
        return getImageModelInfo()
      case 'analysis':
        return getAnalysisModelInfo()
    }
  }

  const handleSelect = (modelId: string) => {
    switch (type) {
      case 'chat':
        setChatModel(modelId)
        break
      case 'image':
        setImageModel(modelId)
        break
      case 'analysis':
        setAnalysisModel(modelId)
        break
    }
  }

  const currentModelInfo = getCurrentModelInfo()
  const provider = currentModelInfo?.provider || ''
  const modelName = currentModelInfo?.name || 'Modell wählen...'
  const logoUrl = getProviderLogo(provider)
  const color = getProviderColor(provider)
  const initial = getProviderInitial(provider)

  // Strip provider prefix from model name (e.g. "Google: Gemini 2.5" -> "Gemini 2.5")
  const stripProviderPrefix = (name: string) => {
    if (name.includes(': ')) {
      return name.split(': ').slice(1).join(': ')
    }
    if (provider && name.toLowerCase().startsWith(provider.toLowerCase() + ' ')) {
      return name.substring(provider.length + 1)
    }
    return name
  }

  // Get short model name for compact mode
  const getShortName = (name: string) => {
    const stripped = stripProviderPrefix(name)
    const parts = stripped.split(' ')
    if (parts.length > 2) {
      return parts.slice(0, 2).join(' ')
    }
    return stripped
  }

  const displayName = compact ? getShortName(modelName) : stripProviderPrefix(modelName)

  const ProviderIcon = () => {
    if (!provider) return null

    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt={provider}
          className={compact ? 'w-4 h-4 rounded' : 'w-[18px] h-[18px] rounded'}
        />
      )
    }

    return (
      <div
        className={`rounded flex items-center justify-center text-white font-bold ${
          compact ? 'w-4 h-4 text-[9px]' : 'w-[18px] h-[18px] text-[9px]'
        }`}
        style={{ backgroundColor: color }}
      >
        {initial}
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/5 ${className}`}
      >
        {showIcon && <ProviderIcon />}
        <span className={`truncate ${compact ? 'text-xs max-w-[100px]' : 'text-sm max-w-[150px]'} text-gray-700 dark:text-gray-300`}>
          {displayName}
        </span>
        <ChevronDown className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-gray-400 flex-shrink-0`} />
      </button>

      <ModelPickerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        type={type}
        currentModel={getCurrentModel()}
        onSelect={handleSelect}
      />
    </>
  )
}
