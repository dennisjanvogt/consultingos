import { useTranslation } from 'react-i18next'
import { RotateCcw, Eye, EyeOff, Layers, Globe } from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import { useEffect } from 'react'

export function FilterPanel() {
  const { t } = useTranslation()

  const {
    filters,
    filterMode,
    setFilterMode,
    livePreview,
    setLivePreview,
    setFilters,
    applyFilters,
    resetFilters,
    loadLayerFilters,
    getSelectedLayer,
    selectedLayerId,
  } = useImageEditorStore()

  const selectedLayer = getSelectedLayer()
  const isDisabled = filterMode === 'layer' && (!selectedLayer || selectedLayer.locked)

  // Load layer filters when switching to layer mode or selecting a different layer
  useEffect(() => {
    if (filterMode === 'layer' && selectedLayerId) {
      loadLayerFilters(selectedLayerId)
    }
  }, [filterMode, selectedLayerId, loadLayerFilters])

  return (
    <div className="p-3 space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-1 p-1 bg-gray-800 rounded">
        <button
          onClick={() => setFilterMode('layer')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
            filterMode === 'layer'
              ? 'bg-violet-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          {t('imageeditor.layer')}
        </button>
        <button
          onClick={() => setFilterMode('global')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
            filterMode === 'global'
              ? 'bg-violet-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          {t('imageeditor.global')}
        </button>
      </div>

      {/* Selected Layer Info (only in layer mode) */}
      {filterMode === 'layer' && selectedLayer && (
        <div className="text-xs text-gray-400 px-2 py-1 bg-gray-800/50 rounded">
          {t('imageeditor.editingLayer')}: <span className="text-white">{selectedLayer.name}</span>
        </div>
      )}

      {/* Live Preview Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-800">
        <span className="text-xs text-gray-400">{t('imageeditor.livePreview')}</span>
        <button
          onClick={() => setLivePreview(!livePreview)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
            livePreview
              ? 'bg-violet-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {livePreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {livePreview ? 'On' : 'Off'}
        </button>
      </div>

      {/* Brightness */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{t('imageeditor.brightness')}</span>
          <span>{filters.brightness}</span>
        </div>
        <input
          type="range"
          min="-100"
          max="100"
          value={filters.brightness}
          onChange={(e) => setFilters({ brightness: Number(e.target.value) })}
          disabled={isDisabled}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Contrast */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{t('imageeditor.contrast')}</span>
          <span>{filters.contrast}</span>
        </div>
        <input
          type="range"
          min="-100"
          max="100"
          value={filters.contrast}
          onChange={(e) => setFilters({ contrast: Number(e.target.value) })}
          disabled={isDisabled}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Saturation */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{t('imageeditor.saturation')}</span>
          <span>{filters.saturation}</span>
        </div>
        <input
          type="range"
          min="-100"
          max="100"
          value={filters.saturation}
          onChange={(e) => setFilters({ saturation: Number(e.target.value) })}
          disabled={isDisabled}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Hue */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{t('imageeditor.hue')}</span>
          <span>{filters.hue}°</span>
        </div>
        <input
          type="range"
          min="-180"
          max="180"
          value={filters.hue}
          onChange={(e) => setFilters({ hue: Number(e.target.value) })}
          disabled={isDisabled}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Blur */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{t('imageeditor.blur')}</span>
          <span>{filters.blur}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="20"
          value={filters.blur}
          onChange={(e) => setFilters({ blur: Number(e.target.value) })}
          disabled={isDisabled}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Sharpen */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{t('imageeditor.sharpen')}</span>
          <span>{filters.sharpen}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.sharpen}
          onChange={(e) => setFilters({ sharpen: Number(e.target.value) })}
          disabled={isDisabled}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Noise */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{t('imageeditor.noise')}</span>
          <span>{filters.noise}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.noise}
          onChange={(e) => setFilters({ noise: Number(e.target.value) })}
          disabled={isDisabled}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Pixelate */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{t('imageeditor.pixelate')}</span>
          <span>{filters.pixelate}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="50"
          value={filters.pixelate}
          onChange={(e) => setFilters({ pixelate: Number(e.target.value) })}
          disabled={isDisabled}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Posterize */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{t('imageeditor.posterize')}</span>
          <span>{filters.posterize || 'Off'}</span>
        </div>
        <input
          type="range"
          min="0"
          max="32"
          value={filters.posterize}
          onChange={(e) => setFilters({ posterize: Number(e.target.value) })}
          disabled={isDisabled}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Vignette */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{t('imageeditor.vignette')}</span>
          <span>{filters.vignette}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.vignette}
          onChange={(e) => setFilters({ vignette: Number(e.target.value) })}
          disabled={isDisabled}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Tint */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{t('imageeditor.tint')}</span>
          <span>{filters.tintAmount}%</span>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={filters.tintColor}
            onChange={(e) => setFilters({ tintColor: e.target.value })}
            disabled={isDisabled}
            className="w-8 h-6 rounded cursor-pointer border-none"
          />
          <input
            type="range"
            min="0"
            max="100"
            value={filters.tintAmount}
            onChange={(e) => setFilters({ tintAmount: Number(e.target.value) })}
            disabled={isDisabled}
            className="flex-1 accent-violet-500"
          />
        </div>
      </div>

      {/* Toggle Filters */}
      <div className="space-y-2 pt-2 border-t border-gray-800">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.grayscale}
            onChange={(e) => setFilters({ grayscale: e.target.checked })}
            disabled={isDisabled}
            className="rounded bg-gray-800 border-gray-600 text-violet-600 focus:ring-violet-500"
          />
          <span className="text-gray-300">{t('imageeditor.grayscale')}</span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.sepia}
            onChange={(e) => setFilters({ sepia: e.target.checked })}
            disabled={isDisabled}
            className="rounded bg-gray-800 border-gray-600 text-violet-600 focus:ring-violet-500"
          />
          <span className="text-gray-300">{t('imageeditor.sepia')}</span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.invert}
            onChange={(e) => setFilters({ invert: e.target.checked })}
            disabled={isDisabled}
            className="rounded bg-gray-800 border-gray-600 text-violet-600 focus:ring-violet-500"
          />
          <span className="text-gray-300">{t('imageeditor.invert')}</span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.emboss}
            onChange={(e) => setFilters({ emboss: e.target.checked })}
            disabled={isDisabled}
            className="rounded bg-gray-800 border-gray-600 text-violet-600 focus:ring-violet-500"
          />
          <span className="text-gray-300">{t('imageeditor.emboss')}</span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.edgeDetect}
            onChange={(e) => setFilters({ edgeDetect: e.target.checked })}
            disabled={isDisabled}
            className="rounded bg-gray-800 border-gray-600 text-violet-600 focus:ring-violet-500"
          />
          <span className="text-gray-300">{t('imageeditor.edgeDetect')}</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-800">
        <button
          onClick={resetFilters}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t('imageeditor.reset')}
        </button>
        <button
          onClick={applyFilters}
          disabled={isDisabled}
          className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded text-sm font-medium transition-colors"
        >
          {t('imageeditor.apply')}
        </button>
      </div>

      {/* Help Text */}
      {filterMode === 'layer' && isDisabled && (
        <p className="text-xs text-gray-500 text-center">
          {t('imageeditor.selectLayerToEdit')}
        </p>
      )}
      {filterMode === 'global' && (
        <p className="text-xs text-gray-500 text-center">
          {t('imageeditor.globalFilterInfo')}
        </p>
      )}
    </div>
  )
}
