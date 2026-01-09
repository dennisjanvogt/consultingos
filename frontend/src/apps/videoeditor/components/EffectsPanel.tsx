import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Eye, EyeOff, Sun, Contrast, Droplets, Wind, Palette } from 'lucide-react'
import type { Clip, Effect, EffectType } from '../types'
import { useVideoEditorStore } from '@/stores/videoEditorStore'

interface EffectsPanelProps {
  clipId: string
}

interface EffectDefinition {
  type: EffectType
  name: string
  icon: React.ReactNode
  min: number
  max: number
  step: number
  default: number
  unit?: string
}

const AVAILABLE_EFFECTS: EffectDefinition[] = [
  { type: 'brightness', name: 'Helligkeit', icon: <Sun className="w-4 h-4" />, min: 0, max: 2, step: 0.1, default: 1 },
  { type: 'contrast', name: 'Kontrast', icon: <Contrast className="w-4 h-4" />, min: 0, max: 2, step: 0.1, default: 1 },
  { type: 'saturation', name: 'Sättigung', icon: <Droplets className="w-4 h-4" />, min: 0, max: 2, step: 0.1, default: 1 },
  { type: 'blur', name: 'Weichzeichner', icon: <Wind className="w-4 h-4" />, min: 0, max: 20, step: 0.5, default: 0, unit: 'px' },
  { type: 'grayscale', name: 'Graustufen', icon: <Palette className="w-4 h-4" />, min: 0, max: 1, step: 0.1, default: 0 },
  { type: 'sepia', name: 'Sepia', icon: <Palette className="w-4 h-4" />, min: 0, max: 1, step: 0.1, default: 0 },
  { type: 'hue-rotate', name: 'Farbton', icon: <Palette className="w-4 h-4" />, min: 0, max: 360, step: 10, default: 0, unit: '°' },
  { type: 'invert', name: 'Invertieren', icon: <Palette className="w-4 h-4" />, min: 0, max: 1, step: 0.1, default: 0 },
]

export function EffectsPanel({ clipId }: EffectsPanelProps) {
  const { t } = useTranslation()
  const { getClipById, addEffect, removeEffect, updateEffect } = useVideoEditorStore()
  const clip = getClipById(clipId)

  if (!clip) return null

  const addedEffectTypes = new Set(clip.effects.map(e => e.type))
  const availableToAdd = AVAILABLE_EFFECTS.filter(e => !addedEffectTypes.has(e.type))

  const getEffectDefinition = (type: EffectType) =>
    AVAILABLE_EFFECTS.find(e => e.type === type)

  const formatValue = (def: EffectDefinition, value: number) => {
    if (def.unit) return `${value.toFixed(1)}${def.unit}`
    return `${Math.round(value * 100)}%`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase">
          Effekte
        </span>

        {availableToAdd.length > 0 && (
          <div className="relative group">
            <button className="p-1 hover:bg-gray-700 rounded transition-colors">
              <Plus className="w-4 h-4" />
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {availableToAdd.map(effect => (
                <button
                  key={effect.type}
                  onClick={() => addEffect(clipId, effect.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  {effect.icon}
                  {effect.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {clip.effects.length === 0 ? (
        <div className="text-center text-gray-500 py-4 text-xs">
          Keine Effekte
        </div>
      ) : (
        <div className="space-y-2">
          {clip.effects.map(effect => {
            const def = getEffectDefinition(effect.type)
            if (!def) return null

            return (
              <div
                key={effect.id}
                className={`p-2 rounded-lg transition-colors ${
                  effect.enabled ? 'bg-gray-700/50' : 'bg-gray-800/50 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {def.icon}
                  <span className="flex-1 text-sm font-medium">{def.name}</span>

                  <button
                    onClick={() => updateEffect(clipId, effect.id, { enabled: !effect.enabled })}
                    className="p-1 hover:bg-gray-600 rounded transition-colors"
                    title={effect.enabled ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {effect.enabled ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                    )}
                  </button>

                  <button
                    onClick={() => removeEffect(clipId, effect.id)}
                    className="p-1 hover:bg-red-600 rounded transition-colors"
                    title="Entfernen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={def.min}
                    max={def.max}
                    step={def.step}
                    value={effect.value}
                    onChange={(e) => updateEffect(clipId, effect.id, { value: parseFloat(e.target.value) })}
                    disabled={!effect.enabled}
                    className="flex-1 accent-violet-500"
                  />
                  <span className="text-xs text-gray-400 w-12 text-right tabular-nums">
                    {formatValue(def, effect.value)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
