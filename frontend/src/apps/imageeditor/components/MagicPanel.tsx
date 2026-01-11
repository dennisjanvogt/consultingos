import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import { useAIStore } from '@/stores/aiStore'
import { DEFAULT_LAYER_EFFECTS } from '../types'
import type { LayerEffects } from '../types'
import { ModelPickerButton } from '@/components/ModelPickerButton'
import {
  Sparkles,
  Wand2,
  Palette,
  Grid3X3,
  Loader2,
  ChevronDown,
  ChevronRight,
  Image,
  Film,
  ZoomIn,
  Pipette,
  Copy,
  Layers,
  BrainCircuit,
  Expand,
} from 'lucide-react'

// Preset gradients
const PRESET_GRADIENTS = [
  { name: 'Sunset', startColor: '#ff512f', endColor: '#dd2476', type: 'linear' as const, angle: 135 },
  { name: 'Ocean', startColor: '#2193b0', endColor: '#6dd5ed', type: 'linear' as const, angle: 90 },
  { name: 'Forest', startColor: '#134e5e', endColor: '#71b280', type: 'linear' as const, angle: 180 },
  { name: 'Purple', startColor: '#7f00ff', endColor: '#e100ff', type: 'linear' as const, angle: 45 },
  { name: 'Peach', startColor: '#ffecd2', endColor: '#fcb69f', type: 'linear' as const, angle: 90 },
  { name: 'Night', startColor: '#0f0c29', endColor: '#302b63', type: 'linear' as const, angle: 180 },
  { name: 'Mint', startColor: '#00b09b', endColor: '#96c93d', type: 'linear' as const, angle: 135 },
  { name: 'Fire', startColor: '#f12711', endColor: '#f5af19', type: 'linear' as const, angle: 45 },
  { name: 'Cool', startColor: '#2980b9', endColor: '#6dd5fa', type: 'radial' as const },
  { name: 'Warm', startColor: '#f5af19', endColor: '#f12711', type: 'radial' as const },
  { name: 'Galaxy', startColor: '#0f0c29', endColor: '#24243e', type: 'radial' as const },
  { name: 'Rose', startColor: '#ee9ca7', endColor: '#ffdde1', type: 'radial' as const },
]

// Preset patterns
const PRESET_PATTERNS = [
  { name: 'Stripes', type: 'stripes', colors: ['#333333', '#666666'] },
  { name: 'Candy', type: 'stripes', colors: ['#ff6b6b', '#ffffff'] },
  { name: 'Dots', type: 'dots', colors: ['#f0f0f0', '#333333'] },
  { name: 'Polka', type: 'dots', colors: ['#ffb6c1', '#ffffff'] },
  { name: 'Check', type: 'checkerboard', colors: ['#ffffff', '#000000'] },
  { name: 'Chess', type: 'checkerboard', colors: ['#8b4513', '#f5deb3'] },
  { name: 'Waves', type: 'waves', colors: ['#e0f7fa', '#0097a7'] },
  { name: 'Ocean', type: 'waves', colors: ['#1a237e', '#4fc3f7'] },
  { name: 'Grid', type: 'grid', colors: ['#ffffff', '#e0e0e0'] },
  { name: 'Paper', type: 'grid', colors: ['#fffef0', '#b3e5fc'] },
]

// AI Filters
const AI_FILTERS = [
  { id: 'vintage', name: 'Vintage', nameDE: 'Vintage', color: '#d4a574' },
  { id: 'cinematic', name: 'Cinematic', nameDE: 'Filmisch', color: '#2d4a3e' },
  { id: 'hdr', name: 'HDR', nameDE: 'HDR', color: '#ff6b35' },
  { id: 'noir', name: 'Noir', nameDE: 'Noir', color: '#1a1a1a' },
  { id: 'dreamy', name: 'Dreamy', nameDE: 'Verträumt', color: '#e8d5e8' },
  { id: 'pop', name: 'Pop Art', nameDE: 'Pop Art', color: '#ff1493' },
  { id: 'cool', name: 'Cool', nameDE: 'Kühl', color: '#4a90d9' },
  { id: 'warm', name: 'Warm', nameDE: 'Warm', color: '#ff8c42' },
  { id: 'fade', name: 'Fade', nameDE: 'Verblasst', color: '#a8a8a8' },
  { id: 'dramatic', name: 'Dramatic', nameDE: 'Dramatisch', color: '#2c2c2c' },
]

export function MagicPanel() {
  const { i18n } = useTranslation()
  const isGerman = i18n.language === 'de'

  const {
    selectedLayerId,
    currentProject,
    isAutoEnhancing,
    isRemovingBackground,
    isGeneratingImage,
    isEditingImage,
    isEditingLayerWithContext,
    isExtendingImage,
    isApplyingFilter,
    isUpscaling,
    isExtractingColors,
    extractedColors,
    autoEnhance,
    removeBackground,
    addBackgroundGradient,
    addBackgroundPattern,
    generateAIImage,
    editImageWithAI,
    editLayerWithContext,
    extendImageToFit,
    applyAIFilter,
    upscaleImage,
    extractColorPalette,
    setBrushSettings,
    addRecentColor,
    updateLayerEffects,
  } = useImageEditorStore()

  const { fetchModels } = useAIStore()

  // Load models on mount
  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  // Allow multiple sections to be expanded, with secondary sections collapsed by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [customGradient, setCustomGradient] = useState({
    startColor: '#ff0000',
    endColor: '#0000ff',
    type: 'linear' as 'linear' | 'radial',
    angle: 90,
  })
  const [customPattern, setCustomPattern] = useState({
    type: 'stripes',
    color1: '#333333',
    color2: '#666666',
  })
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiEditPrompt, setAiEditPrompt] = useState('')
  const [contextInstruction, setContextInstruction] = useState('')

  const selectedLayer = currentProject?.layers.find((l) => l.id === selectedLayerId)
  const hasImageData = selectedLayer?.imageData
  const isImageOrShapeLayer = selectedLayer?.type === 'image' || selectedLayer?.type === 'shape'
  const layerEffects = selectedLayer?.layerEffects || DEFAULT_LAYER_EFFECTS

  // Check if layer needs extension to fit canvas
  const needsExtension = hasImageData && currentProject && selectedLayer && (
    selectedLayer.width < currentProject.width || selectedLayer.height < currentProject.height
  )

  const updateEffect = (updates: Partial<LayerEffects>) => {
    if (!selectedLayerId) return
    updateLayerEffects(selectedLayerId, {
      ...layerEffects,
      ...updates,
    })
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const isSectionExpanded = (section: string) => expandedSections.has(section)

  const handleGenerateImage = () => {
    if (aiPrompt.trim()) {
      generateAIImage(aiPrompt)
      setAiPrompt('')
    }
  }

  const handleEditImage = () => {
    if (aiEditPrompt.trim() && selectedLayerId) {
      editImageWithAI(selectedLayerId, aiEditPrompt)
      setAiEditPrompt('')
    }
  }

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color)
    setBrushSettings({ color })
    addRecentColor(color)
  }

  const handleContextEdit = () => {
    if (contextInstruction.trim() && selectedLayerId) {
      editLayerWithContext(selectedLayerId, contextInstruction)
      setContextInstruction('')
    }
  }

  return (
    <div className="p-3 space-y-4">
      {/* No layer selected warning - shown once at top */}
      {!hasImageData && (
        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
          <Layers className="h-4 w-4 shrink-0" />
          {isGerman ? 'Wähle eine Ebene mit Bild für KI-Bearbeitung' : 'Select a layer with image for AI editing'}
        </div>
      )}

      {/* Analysis Model Selection - at top */}
      <div className="space-y-1.5">
        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          <BrainCircuit className="h-3 w-3" />
          {isGerman ? 'Analyse-Modell (Vision)' : 'Analysis Model (Vision)'}
        </label>
        <ModelPickerButton
          type="analysis"
          compact
          className="w-full bg-gray-800 border border-gray-700 rounded justify-start"
        />
      </div>

      {/* One-Click Magic - right after model selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-violet-400" />
          {isGerman ? 'Ein-Klick Magie' : 'One-Click Magic'}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => selectedLayerId && autoEnhance(selectedLayerId)}
            disabled={!hasImageData || isAutoEnhancing}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              hasImageData && !isAutoEnhancing
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isAutoEnhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isGerman ? 'Verbessern' : 'Enhance'}
          </button>
          <button
            onClick={() => selectedLayerId && removeBackground(selectedLayerId)}
            disabled={!hasImageData || isRemovingBackground}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              hasImageData && !isRemovingBackground
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isRemovingBackground ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {isGerman ? 'Freistellen' : 'Remove BG'}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* AI Image Generation */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Image className="h-4 w-4 text-emerald-400" />
          {isGerman ? 'KI Bildgenerierung' : 'AI Image Generation'}
        </div>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleGenerateImage()
            }
          }}
          placeholder={isGerman ? 'Beschreibe das Bild...' : 'Describe the image...'}
          className="w-full h-16 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <button
          onClick={handleGenerateImage}
          disabled={!aiPrompt.trim() || isGeneratingImage}
          className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            aiPrompt.trim() && !isGeneratingImage
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isGeneratingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Image className="h-3.5 w-3.5" />}
          {isGerman ? 'Generieren' : 'Generate'}
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* AI Image Edit */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Wand2 className="h-4 w-4 text-amber-400" />
          {isGerman ? 'KI Bildbearbeitung' : 'AI Image Edit'}
        </div>
        <textarea
          value={aiEditPrompt}
          onChange={(e) => setAiEditPrompt(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleEditImage()
            }
          }}
          placeholder={isGerman ? 'z.B. "Ändere den Himmel zu Sonnenuntergang"' : 'e.g. "Change sky to sunset"'}
          className="w-full h-14 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <button
          onClick={handleEditImage}
          disabled={!aiEditPrompt.trim() || !hasImageData || isEditingImage}
          className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            aiEditPrompt.trim() && hasImageData && !isEditingImage
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isEditingImage ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isGerman ? 'Bearbeite...' : 'Editing...'}
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5" />
              {isGerman ? 'Bild bearbeiten' : 'Edit Image'}
            </>
          )}
        </button>
      </div>

      {/* Extend Image - visible when needed */}
      {needsExtension && (
        <>
          <div className="border-t border-gray-800" />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <div className="flex items-center gap-2">
                <Expand className="h-4 w-4 text-sky-400" />
                {isGerman ? 'Auf Canvas erweitern' : 'Extend to Canvas'}
              </div>
              <span className="text-[10px] text-gray-500">
                {selectedLayer?.width}x{selectedLayer?.height} → {currentProject?.width}x{currentProject?.height}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => selectedLayerId && extendImageToFit(selectedLayerId, false)}
                disabled={isExtendingImage}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !isExtendingImage ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isExtendingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Expand className="h-3.5 w-3.5" />}
                {isGerman ? 'Schnell' : 'Quick'}
              </button>
              <button
                onClick={() => selectedLayerId && extendImageToFit(selectedLayerId, true)}
                disabled={isExtendingImage || isGeneratingImage}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !isExtendingImage && !isGeneratingImage
                    ? 'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isExtendingImage || isGeneratingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />}
                {isGerman ? 'KI' : 'AI'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Context-Aware Layer Editing */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BrainCircuit className="h-4 w-4 text-purple-400" />
          {isGerman ? 'Kontextbasierte Bearbeitung' : 'Context-Aware Edit'}
        </div>
        <textarea
          value={contextInstruction}
          onChange={(e) => setContextInstruction(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleContextEdit()
            }
          }}
          placeholder={isGerman ? 'z.B. "Passe Hintergrund an die Person an"' : 'e.g. "Match background to person"'}
          className="w-full h-14 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <button
          onClick={handleContextEdit}
          disabled={!contextInstruction.trim() || !hasImageData || isEditingLayerWithContext || isGeneratingImage}
          className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            contextInstruction.trim() && hasImageData && !isEditingLayerWithContext && !isGeneratingImage
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isEditingLayerWithContext || isGeneratingImage ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isEditingLayerWithContext ? (isGerman ? 'Analysiere...' : 'Analyzing...') : (isGerman ? 'Generiere...' : 'Generating...')}
            </>
          ) : (
            <>
              <BrainCircuit className="h-3.5 w-3.5" />
              {isGerman ? 'Neue Ebene generieren' : 'Generate New Layer'}
            </>
          )}
        </button>
      </div>

      {/* ===== COLLAPSIBLE SECTIONS ===== */}

      {/* Layer Effects Section */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('layer-effects')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium"
        >
          {isSectionExpanded('layer-effects') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Layers className="h-4 w-4 text-orange-400" />
          {isGerman ? 'Layer-Effekte' : 'Layer Effects'}
        </button>

        {isSectionExpanded('layer-effects') && (
          <div className="pl-6 space-y-3">
            {!isImageOrShapeLayer ? (
              <p className="text-xs text-gray-500 text-center">
                {isGerman ? 'Wähle ein Bild-Layer aus' : 'Select an image layer'}
              </p>
            ) : (
              <>
                {/* Drop Shadow */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layerEffects.dropShadow.enabled}
                      onChange={(e) =>
                        updateEffect({
                          dropShadow: { ...layerEffects.dropShadow, enabled: e.target.checked },
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-violet-500"
                    />
                    <span className="text-xs font-medium">{isGerman ? 'Schlagschatten' : 'Drop Shadow'}</span>
                  </label>
                  {layerEffects.dropShadow.enabled && (
                    <div className="pl-5 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-[10px] text-gray-500">X</label>
                          <input
                            type="number"
                            value={layerEffects.dropShadow.offsetX}
                            onChange={(e) =>
                              updateEffect({
                                dropShadow: { ...layerEffects.dropShadow, offsetX: Number(e.target.value) },
                              })
                            }
                            className="w-full px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500">Y</label>
                          <input
                            type="number"
                            value={layerEffects.dropShadow.offsetY}
                            onChange={(e) =>
                              updateEffect({
                                dropShadow: { ...layerEffects.dropShadow, offsetY: Number(e.target.value) },
                              })
                            }
                            className="w-full px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-500 w-10">{isGerman ? 'Blur' : 'Blur'}</label>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={layerEffects.dropShadow.blur}
                          onChange={(e) =>
                            updateEffect({
                              dropShadow: { ...layerEffects.dropShadow, blur: Number(e.target.value) },
                            })
                          }
                          className="flex-1 accent-violet-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={layerEffects.dropShadow.color}
                          onChange={(e) =>
                            updateEffect({
                              dropShadow: { ...layerEffects.dropShadow, color: e.target.value },
                            })
                          }
                          className="w-6 h-6 rounded cursor-pointer border-none"
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={layerEffects.dropShadow.opacity}
                          onChange={(e) =>
                            updateEffect({
                              dropShadow: { ...layerEffects.dropShadow, opacity: Number(e.target.value) },
                            })
                          }
                          className="flex-1 accent-violet-500"
                        />
                        <span className="text-[10px] text-gray-500 w-8">{layerEffects.dropShadow.opacity}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Outer Glow */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layerEffects.outerGlow.enabled}
                      onChange={(e) =>
                        updateEffect({
                          outerGlow: { ...layerEffects.outerGlow, enabled: e.target.checked },
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-violet-500"
                    />
                    <span className="text-xs font-medium">{isGerman ? 'Äußeres Leuchten' : 'Outer Glow'}</span>
                  </label>
                  {layerEffects.outerGlow.enabled && (
                    <div className="pl-5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-500 w-10">{isGerman ? 'Blur' : 'Blur'}</label>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={layerEffects.outerGlow.blur}
                          onChange={(e) =>
                            updateEffect({
                              outerGlow: { ...layerEffects.outerGlow, blur: Number(e.target.value) },
                            })
                          }
                          className="flex-1 accent-violet-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={layerEffects.outerGlow.color}
                          onChange={(e) =>
                            updateEffect({
                              outerGlow: { ...layerEffects.outerGlow, color: e.target.value },
                            })
                          }
                          className="w-6 h-6 rounded cursor-pointer border-none"
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={layerEffects.outerGlow.opacity}
                          onChange={(e) =>
                            updateEffect({
                              outerGlow: { ...layerEffects.outerGlow, opacity: Number(e.target.value) },
                            })
                          }
                          className="flex-1 accent-violet-500"
                        />
                        <span className="text-[10px] text-gray-500 w-8">{layerEffects.outerGlow.opacity}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Inner Shadow */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layerEffects.innerShadow.enabled}
                      onChange={(e) =>
                        updateEffect({
                          innerShadow: { ...layerEffects.innerShadow, enabled: e.target.checked },
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-violet-500"
                    />
                    <span className="text-xs font-medium">{isGerman ? 'Innerer Schatten' : 'Inner Shadow'}</span>
                  </label>
                  {layerEffects.innerShadow.enabled && (
                    <div className="pl-5 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-[10px] text-gray-500">X</label>
                          <input
                            type="number"
                            value={layerEffects.innerShadow.offsetX}
                            onChange={(e) =>
                              updateEffect({
                                innerShadow: { ...layerEffects.innerShadow, offsetX: Number(e.target.value) },
                              })
                            }
                            className="w-full px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500">Y</label>
                          <input
                            type="number"
                            value={layerEffects.innerShadow.offsetY}
                            onChange={(e) =>
                              updateEffect({
                                innerShadow: { ...layerEffects.innerShadow, offsetY: Number(e.target.value) },
                              })
                            }
                            className="w-full px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={layerEffects.innerShadow.color}
                          onChange={(e) =>
                            updateEffect({
                              innerShadow: { ...layerEffects.innerShadow, color: e.target.value },
                            })
                          }
                          className="w-6 h-6 rounded cursor-pointer border-none"
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={layerEffects.innerShadow.opacity}
                          onChange={(e) =>
                            updateEffect({
                              innerShadow: { ...layerEffects.innerShadow, opacity: Number(e.target.value) },
                            })
                          }
                          className="flex-1 accent-violet-500"
                        />
                        <span className="text-[10px] text-gray-500 w-8">{layerEffects.innerShadow.opacity}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Inner Glow */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layerEffects.innerGlow.enabled}
                      onChange={(e) =>
                        updateEffect({
                          innerGlow: { ...layerEffects.innerGlow, enabled: e.target.checked },
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-violet-500"
                    />
                    <span className="text-xs font-medium">{isGerman ? 'Inneres Leuchten' : 'Inner Glow'}</span>
                  </label>
                  {layerEffects.innerGlow.enabled && (
                    <div className="pl-5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={layerEffects.innerGlow.color}
                          onChange={(e) =>
                            updateEffect({
                              innerGlow: { ...layerEffects.innerGlow, color: e.target.value },
                            })
                          }
                          className="w-6 h-6 rounded cursor-pointer border-none"
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={layerEffects.innerGlow.opacity}
                          onChange={(e) =>
                            updateEffect({
                              innerGlow: { ...layerEffects.innerGlow, opacity: Number(e.target.value) },
                            })
                          }
                          className="flex-1 accent-violet-500"
                        />
                        <span className="text-[10px] text-gray-500 w-8">{layerEffects.innerGlow.opacity}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Filters Section */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('ai-filters')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium"
        >
          {isSectionExpanded('ai-filters') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Film className="h-4 w-4 text-amber-400" />
          {isGerman ? 'KI Filter' : 'AI Filters'}
        </button>

        {isSectionExpanded('ai-filters') && (
          <div className="pl-6 space-y-2">
            <div className="grid grid-cols-5 gap-1.5">
              {AI_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => selectedLayerId && applyAIFilter(selectedLayerId, filter.id)}
                  disabled={!hasImageData || isApplyingFilter}
                  className="flex flex-col items-center gap-1 p-1.5 rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                  title={isGerman ? filter.nameDE : filter.name}
                >
                  <div
                    className="w-8 h-8 rounded-md border border-gray-700"
                    style={{ backgroundColor: filter.color }}
                  />
                  <span className="text-[10px] text-gray-400 truncate w-full text-center">
                    {isGerman ? filter.nameDE : filter.name}
                  </span>
                </button>
              ))}
            </div>
            {isApplyingFilter && (
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                {isGerman ? 'Anwenden...' : 'Applying...'}
              </div>
            )}
            {!hasImageData && (
              <p className="text-xs text-gray-500 text-center">
                {isGerman ? 'Wähle eine Ebene mit Bild' : 'Select a layer with image'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* AI Upscaling Section */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('upscale')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium"
        >
          {isSectionExpanded('upscale') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <ZoomIn className="h-4 w-4 text-blue-400" />
          {isGerman ? 'Bild vergrößern' : 'Upscale Image'}
        </button>

        {isSectionExpanded('upscale') && (
          <div className="pl-6 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {[1.5, 2, 4].map((scale) => (
                <button
                  key={scale}
                  onClick={() => selectedLayerId && upscaleImage(selectedLayerId, scale)}
                  disabled={!hasImageData || isUpscaling}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    hasImageData && !isUpscaling
                      ? 'bg-gray-800 hover:bg-gray-700 text-white'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isUpscaling ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `${scale}x`}
                </button>
              ))}
            </div>
            {selectedLayer && hasImageData && (
              <p className="text-xs text-gray-500 text-center">
                {isGerman ? 'Aktuell' : 'Current'}: {selectedLayer.width}x{selectedLayer.height}px
              </p>
            )}
            {!hasImageData && (
              <p className="text-xs text-gray-500 text-center">
                {isGerman ? 'Wähle eine Ebene mit Bild' : 'Select a layer with image'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Color Palette Extraction Section */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('colors')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium"
        >
          {isSectionExpanded('colors') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Pipette className="h-4 w-4 text-rose-400" />
          {isGerman ? 'Farbpalette extrahieren' : 'Extract Colors'}
        </button>

        {isSectionExpanded('colors') && (
          <div className="pl-6 space-y-2">
            <button
              onClick={() => selectedLayerId && extractColorPalette(selectedLayerId)}
              disabled={!hasImageData || isExtractingColors}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasImageData && !isExtractingColors
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isExtractingColors ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pipette className="h-4 w-4" />
              )}
              {isGerman ? 'Farben analysieren' : 'Analyze Colors'}
            </button>

            {extractedColors.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs text-gray-500">{isGerman ? 'Extrahierte Farben' : 'Extracted Colors'}</span>
                <div className="grid grid-cols-6 gap-1">
                  {extractedColors.map((color, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleCopyColor(color)}
                      className="group relative w-full aspect-square rounded-md border border-gray-700 hover:ring-2 hover:ring-violet-500 transition-all"
                      style={{ backgroundColor: color }}
                      title={color}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 rounded-md transition-opacity">
                        <Copy className="h-3 w-3 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 text-center">
                  {isGerman ? 'Klicken zum Kopieren & als Pinselfarbe setzen' : 'Click to copy & set as brush color'}
                </p>
              </div>
            )}

            {!hasImageData && (
              <p className="text-xs text-gray-500 text-center">
                {isGerman ? 'Wähle eine Ebene mit Bild' : 'Select a layer with image'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Gradient Backgrounds Section */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('gradients')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium"
        >
          {isSectionExpanded('gradients') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Palette className="h-4 w-4 text-pink-400" />
          {isGerman ? 'Verlauf-Hintergründe' : 'Gradient Backgrounds'}
        </button>

        {isSectionExpanded('gradients') && (
          <div className="pl-6 space-y-3">
            {/* Preset Gradients */}
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_GRADIENTS.map((gradient) => (
                <button
                  key={gradient.name}
                  onClick={() => addBackgroundGradient(gradient)}
                  className="w-full aspect-square rounded-md hover:ring-2 hover:ring-violet-500 transition-all"
                  style={{
                    background: gradient.type === 'linear'
                      ? `linear-gradient(${gradient.angle}deg, ${gradient.startColor}, ${gradient.endColor})`
                      : `radial-gradient(circle, ${gradient.startColor}, ${gradient.endColor})`,
                  }}
                  title={gradient.name}
                />
              ))}
            </div>

            {/* Custom Gradient */}
            <div className="space-y-2 pt-2 border-t border-gray-800">
              <span className="text-xs text-gray-500">{isGerman ? 'Eigener Verlauf' : 'Custom Gradient'}</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customGradient.startColor}
                  onChange={(e) => setCustomGradient({ ...customGradient, startColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-none"
                />
                <input
                  type="color"
                  value={customGradient.endColor}
                  onChange={(e) => setCustomGradient({ ...customGradient, endColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-none"
                />
                <select
                  value={customGradient.type}
                  onChange={(e) => setCustomGradient({ ...customGradient, type: e.target.value as 'linear' | 'radial' })}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 text-xs"
                >
                  <option value="linear">Linear</option>
                  <option value="radial">Radial</option>
                </select>
              </div>
              {customGradient.type === 'linear' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{isGerman ? 'Winkel' : 'Angle'}</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={customGradient.angle}
                    onChange={(e) => setCustomGradient({ ...customGradient, angle: Number(e.target.value) })}
                    className="flex-1 accent-violet-500"
                  />
                  <span className="text-xs text-gray-400 w-8">{customGradient.angle}°</span>
                </div>
              )}
              <button
                onClick={() => addBackgroundGradient(customGradient)}
                className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs font-medium"
              >
                {isGerman ? 'Hinzufügen' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pattern Backgrounds Section */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('patterns')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium"
        >
          {isSectionExpanded('patterns') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Grid3X3 className="h-4 w-4 text-cyan-400" />
          {isGerman ? 'Muster-Hintergründe' : 'Pattern Backgrounds'}
        </button>

        {isSectionExpanded('patterns') && (
          <div className="pl-6 space-y-3">
            {/* Preset Patterns */}
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_PATTERNS.map((pattern, idx) => {
                // Create small preview canvas
                const previewStyle: React.CSSProperties = {}
                switch (pattern.type) {
                  case 'stripes':
                    previewStyle.background = `repeating-linear-gradient(45deg, ${pattern.colors[0]}, ${pattern.colors[0]} 3px, ${pattern.colors[1]} 3px, ${pattern.colors[1]} 6px)`
                    break
                  case 'dots':
                    previewStyle.background = `radial-gradient(circle, ${pattern.colors[1]} 2px, ${pattern.colors[0]} 2px)`
                    previewStyle.backgroundSize = '8px 8px'
                    break
                  case 'checkerboard':
                    previewStyle.background = `
                      linear-gradient(45deg, ${pattern.colors[0]} 25%, transparent 25%),
                      linear-gradient(-45deg, ${pattern.colors[0]} 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, ${pattern.colors[0]} 75%),
                      linear-gradient(-45deg, transparent 75%, ${pattern.colors[0]} 75%)
                    `
                    previewStyle.backgroundColor = pattern.colors[1]
                    previewStyle.backgroundSize = '10px 10px'
                    previewStyle.backgroundPosition = '0 0, 0 5px, 5px -5px, -5px 0px'
                    break
                  case 'waves':
                    previewStyle.background = `linear-gradient(180deg, ${pattern.colors[0]}, ${pattern.colors[1]})`
                    break
                  case 'grid':
                    previewStyle.background = `
                      linear-gradient(${pattern.colors[1]} 1px, transparent 1px),
                      linear-gradient(90deg, ${pattern.colors[1]} 1px, transparent 1px)
                    `
                    previewStyle.backgroundColor = pattern.colors[0]
                    previewStyle.backgroundSize = '8px 8px'
                    break
                }

                return (
                  <button
                    key={`${pattern.name}-${idx}`}
                    onClick={() => addBackgroundPattern(pattern.type, pattern.colors)}
                    className="w-full aspect-square rounded-md border border-gray-700 hover:ring-2 hover:ring-violet-500 transition-all"
                    style={previewStyle}
                    title={pattern.name}
                  />
                )
              })}
            </div>

            {/* Custom Pattern */}
            <div className="space-y-2 pt-2 border-t border-gray-800">
              <span className="text-xs text-gray-500">{isGerman ? 'Eigenes Muster' : 'Custom Pattern'}</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customPattern.color1}
                  onChange={(e) => setCustomPattern({ ...customPattern, color1: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-none"
                />
                <input
                  type="color"
                  value={customPattern.color2}
                  onChange={(e) => setCustomPattern({ ...customPattern, color2: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-none"
                />
                <select
                  value={customPattern.type}
                  onChange={(e) => setCustomPattern({ ...customPattern, type: e.target.value })}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 text-xs"
                >
                  <option value="stripes">{isGerman ? 'Streifen' : 'Stripes'}</option>
                  <option value="dots">{isGerman ? 'Punkte' : 'Dots'}</option>
                  <option value="checkerboard">{isGerman ? 'Schachbrett' : 'Checkerboard'}</option>
                  <option value="waves">{isGerman ? 'Wellen' : 'Waves'}</option>
                  <option value="grid">{isGerman ? 'Gitter' : 'Grid'}</option>
                </select>
              </div>
              <button
                onClick={() => addBackgroundPattern(customPattern.type, [customPattern.color1, customPattern.color2])}
                className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs font-medium"
              >
                {isGerman ? 'Hinzufügen' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
