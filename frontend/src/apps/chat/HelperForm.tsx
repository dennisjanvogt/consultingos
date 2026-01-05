import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Sparkles, Loader2, Check } from 'lucide-react'
import { useAIStore } from '@/stores/aiStore'
import { getToolsByCategory } from '@/services/tools'
import type { AIHelper } from '@/api/types'

interface HelperFormProps {
  helper?: AIHelper | null
  isAIAssisted?: boolean
  onClose: () => void
  onSave: () => void
}

const ICON_OPTIONS = ['🤖', '💻', '✍️', '📊', '🎨', '📝', '🔧', '💡', '🎯', '📚', '🧠', '⚡', '🔍', '📈', '🎭']

export function HelperForm({ helper, isAIAssisted, onClose, onSave }: HelperFormProps) {
  const [name, setName] = useState(helper?.name || '')
  const [icon, setIcon] = useState(helper?.icon || '🤖')
  const [description, setDescription] = useState(helper?.description || '')
  const [systemPrompt, setSystemPrompt] = useState(helper?.system_prompt || '')
  const [enabledTools, setEnabledTools] = useState<string[]>(helper?.enabled_tools || [])
  const [allToolsEnabled, setAllToolsEnabled] = useState(helper?.enabled_tools?.length === 0)
  const [isLoading, setIsLoading] = useState(false)
  const [aiDescription, setAiDescription] = useState('')
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)

  const { createHelper, updateHelper, generatePrompt } = useAIStore()
  const toolsByCategory = getToolsByCategory()

  // ESC key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // If AI assisted, start with the prompt generation flow
  useEffect(() => {
    if (isAIAssisted && !helper) {
      // Focus will be on description input
    }
  }, [isAIAssisted, helper])

  const handleGeneratePrompt = async () => {
    if (!aiDescription.trim()) return

    setIsGeneratingPrompt(true)
    try {
      const prompt = await generatePrompt(aiDescription)
      setSystemPrompt(prompt)
      // Auto-fill name from description
      if (!name) {
        setName(aiDescription.slice(0, 50))
      }
    } catch (error) {
      console.error('Failed to generate prompt:', error)
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  const handleToolToggle = (toolName: string) => {
    setEnabledTools((prev) =>
      prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]
    )
  }

  const handleCategoryToggle = (tools: { name: string }[]) => {
    const toolNames = tools.map((t) => t.name)
    const allEnabled = toolNames.every((name) => enabledTools.includes(name))

    if (allEnabled) {
      setEnabledTools((prev) => prev.filter((t) => !toolNames.includes(t)))
    } else {
      setEnabledTools((prev) => [...new Set([...prev, ...toolNames])])
    }
  }

  const handleAllToolsToggle = () => {
    setAllToolsEnabled(!allToolsEnabled)
    if (!allToolsEnabled) {
      setEnabledTools([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !systemPrompt.trim()) return

    setIsLoading(true)
    try {
      const data = {
        name: name.trim(),
        icon,
        description: description.trim(),
        system_prompt: systemPrompt.trim(),
        enabled_tools: allToolsEnabled ? [] : enabledTools,
      }

      if (helper) {
        await updateHelper(helper.id, data)
      } else {
        await createHelper(data)
      }

      onSave()
    } catch (error) {
      console.error('Failed to save helper:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="fixed top-12 left-1/2 -translate-x-1/2 w-full max-w-5xl max-h-[calc(100vh-6rem)] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">
            {helper ? 'Helfer bearbeiten' : isAIAssisted ? 'Helfer mit AI erstellen' : 'Neuen Helfer erstellen'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* AI-assisted prompt generation */}
          {isAIAssisted && !systemPrompt && (
            <div className="shrink-0 p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Sparkles className="w-4 h-4" />
                Beschreibe deinen Helfer
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="z.B. Ein Assistent der beim Programmieren hilft..."
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  disabled={!aiDescription.trim() || isGeneratingPrompt}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {isGeneratingPrompt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generieren
                </button>
              </div>
            </div>
          )}

          {/* Two-column layout */}
          <div className="flex-1 grid grid-cols-2 min-h-0">
            {/* Left column - Basic info & System Prompt */}
            <div className="flex flex-col p-4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              {/* Name & Icon row */}
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. Code-Assistent"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Icon</label>
                  <div className="flex gap-1 p-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    {ICON_OPTIONS.slice(0, 8).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${
                          icon === emoji
                            ? 'bg-gray-200 dark:bg-gray-600'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Kurzbeschreibung (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="z.B. Hilft beim Programmieren und erklärt Code"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                />
              </div>

              {/* System Prompt */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">System-Prompt</label>
                  {systemPrompt && isAIAssisted && (
                    <button
                      type="button"
                      onClick={() => setSystemPrompt('')}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Neu generieren
                    </button>
                  )}
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Du bist ein hilfreicher Assistent der..."
                  className="flex-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono resize-none min-h-[120px]"
                  required
                />
              </div>
            </div>

            {/* Right column - Tools */}
            <div className="flex flex-col p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Erlaubte Tools</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allToolsEnabled}
                    onChange={handleAllToolsToggle}
                    className="rounded"
                  />
                  Alle Tools
                </label>
              </div>

              {!allToolsEnabled ? (
                <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {Object.entries(toolsByCategory).map(([category, tools]) => (
                    <div key={category}>
                      <button
                        type="button"
                        onClick={() => handleCategoryToggle(tools)}
                        className="flex items-center gap-2 text-sm font-medium mb-1.5 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            tools.every((t) => enabledTools.includes(t.name))
                              ? 'bg-gray-800 dark:bg-gray-200 border-gray-800 dark:border-gray-200'
                              : tools.some((t) => enabledTools.includes(t.name))
                              ? 'bg-gray-400 border-gray-400'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {tools.every((t) => enabledTools.includes(t.name)) && (
                            <Check className="w-3 h-3 text-white dark:text-gray-900" />
                          )}
                        </div>
                        {category}
                      </button>
                      <div className="grid grid-cols-2 gap-1 ml-6">
                        {tools.map((tool) => (
                          <label
                            key={tool.name}
                            className="flex items-center gap-2 text-xs cursor-pointer py-0.5"
                          >
                            <input
                              type="checkbox"
                              checked={enabledTools.includes(tool.name)}
                              onChange={() => handleToolToggle(tool.name)}
                              className="rounded text-gray-800"
                            />
                            <span className="truncate" title={tool.description}>
                              {tool.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                  Alle Tools sind aktiviert
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !systemPrompt.trim() || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                'Speichern'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
