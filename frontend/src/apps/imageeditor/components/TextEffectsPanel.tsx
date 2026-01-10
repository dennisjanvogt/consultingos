import { useTranslation } from 'react-i18next'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import { DEFAULT_TEXT_EFFECTS } from '../types'
import type { TextEffects } from '../types'

export function TextEffectsPanel() {
  const { t, i18n } = useTranslation()
  const { currentProject, selectedLayerId, updateLayerTextEffects } = useImageEditorStore()

  const isGerman = i18n.language === 'de'

  const selectedLayer = currentProject?.layers.find((l) => l.id === selectedLayerId)
  const isTextLayer = selectedLayer?.type === 'text'

  if (!isTextLayer || !selectedLayer) {
    return (
      <div className="p-3 text-center text-gray-500 text-sm">
        {isGerman ? 'Wähle eine Text-Ebene aus' : 'Select a text layer'}
      </div>
    )
  }

  const effects = selectedLayer.textEffects || DEFAULT_TEXT_EFFECTS

  const updateEffect = (updates: Partial<TextEffects>) => {
    updateLayerTextEffects(selectedLayerId!, {
      ...effects,
      ...updates,
    })
  }

  return (
    <div className="p-3 space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase">
        {isGerman ? 'Text-Effekte' : 'Text Effects'}
      </h3>

      {/* Shadow */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={effects.shadow.enabled}
            onChange={(e) =>
              updateEffect({
                shadow: { ...effects.shadow, enabled: e.target.checked },
              })
            }
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500"
          />
          <span className="text-sm font-medium">{isGerman ? 'Schatten' : 'Shadow'}</span>
        </label>

        {effects.shadow.enabled && (
          <div className="pl-6 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">X</label>
                <input
                  type="number"
                  value={effects.shadow.offsetX}
                  onChange={(e) =>
                    updateEffect({
                      shadow: { ...effects.shadow, offsetX: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  value={effects.shadow.offsetY}
                  onChange={(e) =>
                    updateEffect({
                      shadow: { ...effects.shadow, offsetY: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">{isGerman ? 'Unschärfe' : 'Blur'}</label>
              <input
                type="range"
                min="0"
                max="50"
                value={effects.shadow.blur}
                onChange={(e) =>
                  updateEffect({
                    shadow: { ...effects.shadow, blur: Number(e.target.value) },
                  })
                }
                className="w-full accent-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">{isGerman ? 'Farbe' : 'Color'}</label>
              <input
                type="color"
                value={effects.shadow.color}
                onChange={(e) =>
                  updateEffect({
                    shadow: { ...effects.shadow, color: e.target.value },
                  })
                }
                className="w-full h-8 rounded cursor-pointer border-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Outline */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={effects.outline.enabled}
            onChange={(e) =>
              updateEffect({
                outline: { ...effects.outline, enabled: e.target.checked },
              })
            }
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500"
          />
          <span className="text-sm font-medium">Outline</span>
        </label>

        {effects.outline.enabled && (
          <div className="pl-6 space-y-2">
            <div>
              <label className="text-xs text-gray-500">{isGerman ? 'Breite' : 'Width'}</label>
              <input
                type="range"
                min="1"
                max="20"
                value={effects.outline.width}
                onChange={(e) =>
                  updateEffect({
                    outline: { ...effects.outline, width: Number(e.target.value) },
                  })
                }
                className="w-full accent-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">{isGerman ? 'Farbe' : 'Color'}</label>
              <input
                type="color"
                value={effects.outline.color}
                onChange={(e) =>
                  updateEffect({
                    outline: { ...effects.outline, color: e.target.value },
                  })
                }
                className="w-full h-8 rounded cursor-pointer border-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Glow */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={effects.glow.enabled}
            onChange={(e) =>
              updateEffect({
                glow: { ...effects.glow, enabled: e.target.checked },
              })
            }
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500"
          />
          <span className="text-sm font-medium">{isGerman ? 'Neon-Glow' : 'Neon Glow'}</span>
        </label>

        {effects.glow.enabled && (
          <div className="pl-6 space-y-2">
            <div>
              <label className="text-xs text-gray-500">{isGerman ? 'Farbe' : 'Color'}</label>
              <input
                type="color"
                value={effects.glow.color}
                onChange={(e) =>
                  updateEffect({
                    glow: { ...effects.glow, color: e.target.value },
                  })
                }
                className="w-full h-8 rounded cursor-pointer border-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">{isGerman ? 'Intensität' : 'Intensity'}</label>
              <input
                type="range"
                min="5"
                max="50"
                value={effects.glow.intensity}
                onChange={(e) =>
                  updateEffect({
                    glow: { ...effects.glow, intensity: Number(e.target.value) },
                  })
                }
                className="w-full accent-violet-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Curve */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{isGerman ? 'Biegung' : 'Curve'}</span>
          <span className="text-xs text-gray-500">{effects.curve}°</span>
        </div>
        <input
          type="range"
          min="-100"
          max="100"
          value={effects.curve}
          onChange={(e) => updateEffect({ curve: Number(e.target.value) })}
          className="w-full accent-violet-500"
        />
        <div className="flex justify-between text-xs text-gray-600">
          <span>↙</span>
          <span>—</span>
          <span>↗</span>
        </div>
      </div>
    </div>
  )
}
