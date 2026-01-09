import { useRef, useState, useCallback, useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Circle, Diamond, ChevronDown } from 'lucide-react'
import type { Clip, Keyframe, KeyframableProperty, EasingType } from '../types'
import { useVideoEditorStore } from '@/stores/videoEditorStore'

interface KeyframeEditorProps {
  clipId: string
}

const KEYFRAMABLE_PROPERTIES: {
  property: KeyframableProperty
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
}[] = [
  { property: 'opacity', label: 'Deckkraft', min: 0, max: 1, step: 0.01, defaultValue: 1 },
  { property: 'volume', label: 'Lautstärke', min: 0, max: 1, step: 0.01, defaultValue: 1 },
  { property: 'x', label: 'Position X', min: -1920, max: 1920, step: 1, defaultValue: 0 },
  { property: 'y', label: 'Position Y', min: -1080, max: 1080, step: 1, defaultValue: 0 },
  { property: 'scaleX', label: 'Skalierung X', min: 0, max: 3, step: 0.01, defaultValue: 1 },
  { property: 'scaleY', label: 'Skalierung Y', min: 0, max: 3, step: 0.01, defaultValue: 1 },
  { property: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1, defaultValue: 0 },
]

const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In Out' },
]

export const KeyframeEditor = memo(function KeyframeEditor({ clipId }: KeyframeEditorProps) {
  const { t } = useTranslation()
  const {
    getClipById,
    currentTime,
    addKeyframe,
    deleteKeyframe,
    updateKeyframe,
    seek
  } = useVideoEditorStore()

  const clip = getClipById(clipId)
  const [selectedProperty, setSelectedProperty] = useState<KeyframableProperty>('opacity')
  const [expandedProperty, setExpandedProperty] = useState<KeyframableProperty | null>('opacity')
  const timelineRef = useRef<HTMLDivElement>(null)

  if (!clip) return null

  // Get keyframes for selected property
  const getPropertyKeyframes = (property: KeyframableProperty) => {
    return clip.keyframes.filter(k => k.property === property).sort((a, b) => a.time - b.time)
  }

  // Get current value at time (interpolated)
  const getValueAtTime = (property: KeyframableProperty, time: number): number => {
    const keyframes = getPropertyKeyframes(property)
    if (keyframes.length === 0) {
      const propDef = KEYFRAMABLE_PROPERTIES.find(p => p.property === property)
      return propDef?.defaultValue ?? 0
    }

    // Before first keyframe
    if (time <= keyframes[0].time) {
      return keyframes[0].value
    }

    // After last keyframe
    if (time >= keyframes[keyframes.length - 1].time) {
      return keyframes[keyframes.length - 1].value
    }

    // Find surrounding keyframes
    for (let i = 0; i < keyframes.length - 1; i++) {
      const k1 = keyframes[i]
      const k2 = keyframes[i + 1]
      if (time >= k1.time && time <= k2.time) {
        const progress = (time - k1.time) / (k2.time - k1.time)
        return interpolate(k1.value, k2.value, progress, k2.easing)
      }
    }

    return keyframes[0].value
  }

  // Interpolation with easing
  const interpolate = (start: number, end: number, progress: number, easing: EasingType): number => {
    let t = progress
    switch (easing) {
      case 'easeIn':
        t = progress * progress
        break
      case 'easeOut':
        t = 1 - (1 - progress) * (1 - progress)
        break
      case 'easeInOut':
        t = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2
        break
    }
    return start + (end - start) * t
  }

  // Add keyframe at current time
  const handleAddKeyframe = (property: KeyframableProperty) => {
    const propDef = KEYFRAMABLE_PROPERTIES.find(p => p.property === property)
    if (!propDef) return

    const relativeTime = currentTime - clip.startTime
    if (relativeTime < 0 || relativeTime > clip.duration) return

    const currentValue = getValueAtTime(property, relativeTime)
    addKeyframe(clipId, property, relativeTime, currentValue)
  }

  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent, property: KeyframableProperty) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const relativeTime = (x / rect.width) * clip.duration
    seek(clip.startTime + relativeTime)
  }

  // Calculate relative time position
  const relativeCurrentTime = currentTime - clip.startTime
  const currentTimePercent = Math.max(0, Math.min(100, (relativeCurrentTime / clip.duration) * 100))

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-gray-400 uppercase">
        Keyframes
      </div>

      {/* Property List */}
      <div className="space-y-1">
        {KEYFRAMABLE_PROPERTIES.map(propDef => {
          const keyframes = getPropertyKeyframes(propDef.property)
          const hasKeyframes = keyframes.length > 0
          const isExpanded = expandedProperty === propDef.property
          const currentValue = getValueAtTime(propDef.property, relativeCurrentTime)

          return (
            <div key={propDef.property} className="bg-gray-800 rounded overflow-hidden">
              {/* Property Header */}
              <div
                className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-700/50 ${
                  hasKeyframes ? 'text-yellow-400' : 'text-gray-400'
                }`}
                onClick={() => setExpandedProperty(isExpanded ? null : propDef.property)}
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                <span className="flex-1 text-xs">{propDef.label}</span>
                <span className="text-xs font-mono text-gray-500">
                  {propDef.property === 'rotation'
                    ? `${currentValue.toFixed(0)}°`
                    : currentValue.toFixed(2)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddKeyframe(propDef.property)
                  }}
                  className="p-0.5 hover:bg-gray-600 rounded"
                  title="Keyframe hinzufügen"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Keyframe Timeline */}
              {isExpanded && (
                <div className="px-2 pb-2">
                  <div
                    ref={timelineRef}
                    className="relative h-6 bg-gray-900 rounded cursor-crosshair"
                    onClick={(e) => handleTimelineClick(e, propDef.property)}
                  >
                    {/* Current time indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                      style={{ left: `${currentTimePercent}%` }}
                    />

                    {/* Keyframes */}
                    {keyframes.map(keyframe => (
                      <KeyframeMarker
                        key={keyframe.id}
                        keyframe={keyframe}
                        clipDuration={clip.duration}
                        clipId={clipId}
                        propDef={propDef}
                        onDelete={() => deleteKeyframe(clipId, keyframe.id)}
                        onUpdate={(updates) => updateKeyframe(clipId, keyframe.id, updates)}
                        onSeek={(time) => seek(clip.startTime + time)}
                      />
                    ))}

                    {/* No keyframes message */}
                    {keyframes.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-500">
                        Klicke + um Keyframe hinzuzufügen
                      </div>
                    )}
                  </div>

                  {/* Value slider */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="range"
                      min={propDef.min}
                      max={propDef.max}
                      step={propDef.step}
                      value={currentValue}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value)
                        // If there's a keyframe at current time, update it
                        const existingKf = keyframes.find(k =>
                          Math.abs(k.time - relativeCurrentTime) < 50
                        )
                        if (existingKf) {
                          updateKeyframe(clipId, existingKf.id, { value })
                        } else if (keyframes.length > 0) {
                          // Add new keyframe at current time
                          addKeyframe(clipId, propDef.property, relativeCurrentTime, value)
                        }
                      }}
                      className="flex-1 accent-yellow-500"
                    />
                    <input
                      type="number"
                      min={propDef.min}
                      max={propDef.max}
                      step={propDef.step}
                      value={currentValue.toFixed(2)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value)
                        if (isNaN(value)) return
                        const existingKf = keyframes.find(k =>
                          Math.abs(k.time - relativeCurrentTime) < 50
                        )
                        if (existingKf) {
                          updateKeyframe(clipId, existingKf.id, { value })
                        }
                      }}
                      className="w-16 px-1 py-0.5 text-xs bg-gray-700 border border-gray-600 rounded text-center"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

// Keyframe Marker Component
function KeyframeMarker({
  keyframe,
  clipDuration,
  clipId,
  propDef,
  onDelete,
  onUpdate,
  onSeek,
}: {
  keyframe: Keyframe
  clipDuration: number
  clipId: string
  propDef: typeof KEYFRAMABLE_PROPERTIES[0]
  onDelete: () => void
  onUpdate: (updates: Partial<Keyframe>) => void
  onSeek: (time: number) => void
}) {
  const [showPopup, setShowPopup] = useState(false)
  const position = (keyframe.time / clipDuration) * 100

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
      style={{ left: `${position}%` }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowPopup(!showPopup)
          onSeek(keyframe.time)
        }}
        className="w-3 h-3 bg-yellow-500 hover:bg-yellow-400 rounded-sm rotate-45 border border-yellow-600"
        title={`${propDef.label}: ${keyframe.value.toFixed(2)} @ ${(keyframe.time / 1000).toFixed(2)}s`}
      />

      {/* Popup */}
      {showPopup && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 p-2 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 min-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] text-gray-400 mb-1">Zeit</div>
          <div className="text-xs font-mono mb-2">{(keyframe.time / 1000).toFixed(2)}s</div>

          <div className="text-[10px] text-gray-400 mb-1">Wert</div>
          <input
            type="number"
            value={keyframe.value}
            onChange={(e) => onUpdate({ value: parseFloat(e.target.value) || 0 })}
            className="w-full px-1 py-0.5 text-xs bg-gray-700 border border-gray-600 rounded mb-2"
            step={propDef.step}
          />

          <div className="text-[10px] text-gray-400 mb-1">Easing</div>
          <select
            value={keyframe.easing}
            onChange={(e) => onUpdate({ easing: e.target.value as EasingType })}
            className="w-full px-1 py-0.5 text-xs bg-gray-700 border border-gray-600 rounded mb-2"
          >
            {EASING_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={() => {
              onDelete()
              setShowPopup(false)
            }}
            className="w-full px-2 py-1 text-xs bg-red-600 hover:bg-red-500 rounded"
          >
            Löschen
          </button>
        </div>
      )}
    </div>
  )
}
