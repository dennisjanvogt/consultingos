import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Loader2 } from 'lucide-react'
import { useKnowledgebaseStore } from '@/stores/knowledgebaseStore'

interface ExpertFormProps {
  expertId: number | null
  onClose: () => void
}

const EMOJI_OPTIONS = ['📚', '📖', '🎓', '💼', '🔬', '⚖️', '💻', '🏥', '🎨', '📊', '🔧', '🌍']

export function ExpertForm({ expertId, onClose }: ExpertFormProps) {
  const { t } = useTranslation()
  const { experts, createExpert, updateExpert } = useKnowledgebaseStore()

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📚')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState(
    'Du bist ein hilfreicher Experte. Beantworte Fragen basierend auf den bereitgestellten Dokumenten. Zitiere relevante Quellen.'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = expertId !== null
  const existingExpert = isEditing ? experts.find((e) => e.id === expertId) : null

  useEffect(() => {
    if (existingExpert) {
      setName(existingExpert.name)
      setIcon(existingExpert.icon)
      setDescription(existingExpert.description)
      setSystemPrompt(existingExpert.system_prompt)
    }
  }, [existingExpert])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      if (isEditing && expertId) {
        await updateExpert(expertId, { name, icon, description, system_prompt: systemPrompt })
      } else {
        await createExpert({ name, icon, description, system_prompt: systemPrompt })
      }
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing
              ? t('knowledgebase.editExpert', 'Experte bearbeiten')
              : t('knowledgebase.newExpert', 'Neuer Experte')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('knowledgebase.icon', 'Icon')}
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                    icon === emoji
                      ? 'bg-violet-100 dark:bg-violet-900/50 ring-2 ring-violet-500'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('knowledgebase.name', 'Name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('knowledgebase.namePlaceholder', 'z.B. Marketing Strategie')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('knowledgebase.description', 'Beschreibung')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('knowledgebase.descriptionPlaceholder', 'Kurze Beschreibung...')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('knowledgebase.systemPrompt', 'System-Prompt')}
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('knowledgebase.systemPromptHint', 'Definiert das Verhalten des Experten')}
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {t('common.cancel', 'Abbrechen')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:bg-violet-300 text-white rounded-lg flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? t('common.save', 'Speichern') : t('common.create', 'Erstellen')}
          </button>
        </div>
      </div>
    </div>
  )
}
