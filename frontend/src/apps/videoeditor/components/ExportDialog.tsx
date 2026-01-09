import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Download, Film, Settings, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react'
import type { ExportSettings, ExportJob } from '../types'
import { useVideoEditorStore } from '@/stores/videoEditorStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface BackendExportJob {
  id: number
  project_id: string
  format: string
  resolution: string
  frame_rate: number
  quality: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  error_message: string
  file_size: number | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

const RESOLUTIONS = [
  { value: '720p', label: '720p HD', width: 1280, height: 720 },
  { value: '1080p', label: '1080p Full HD', width: 1920, height: 1080 },
  { value: '4k', label: '4K Ultra HD', width: 3840, height: 2160 },
] as const

const FRAME_RATES = [
  { value: 24, label: '24 fps (Film)' },
  { value: 30, label: '30 fps (Standard)' },
  { value: 60, label: '60 fps (Flüssig)' },
] as const

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Niedrig', description: 'Kleinere Datei, schneller Export' },
  { value: 'medium', label: 'Mittel', description: 'Ausgewogene Qualität' },
  { value: 'high', label: 'Hoch', description: 'Beste Qualität, größere Datei' },
] as const

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { t } = useTranslation()
  const { currentProject, exportJob, calculateProjectDuration } = useVideoEditorStore()

  const [settings, setSettings] = useState<ExportSettings>({
    format: 'mp4',
    resolution: '1080p',
    frameRate: 30,
    quality: 'high',
  })

  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeJob, setActiveJob] = useState<BackendExportJob | null>(null)
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [])

  // Poll for job status when we have an active job
  useEffect(() => {
    if (activeJob && ['pending', 'processing'].includes(activeJob.status)) {
      pollInterval.current = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/videoeditor/export/${activeJob.id}`, {
            credentials: 'include',
          })
          if (response.ok) {
            const job: BackendExportJob = await response.json()
            setActiveJob(job)

            if (['completed', 'failed', 'cancelled'].includes(job.status)) {
              if (pollInterval.current) {
                clearInterval(pollInterval.current)
              }
              setIsExporting(false)

              if (job.status === 'failed') {
                setError(job.error_message || 'Export fehlgeschlagen')
              }
            }
          }
        } catch {
          // Ignore polling errors
        }
      }, 2000)
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [activeJob?.id, activeJob?.status])

  if (!isOpen) return null

  const projectDuration = calculateProjectDuration()
  const selectedRes = RESOLUTIONS.find(r => r.value === settings.resolution)

  const estimateFileSize = () => {
    const durationSec = projectDuration / 1000
    const bitrates: Record<string, number> = {
      'low-720p': 2,
      'medium-720p': 4,
      'high-720p': 6,
      'low-1080p': 4,
      'medium-1080p': 8,
      'high-1080p': 12,
      'low-4k': 15,
      'medium-4k': 35,
      'high-4k': 60,
    }
    const key = `${settings.quality}-${settings.resolution}`
    const bitrate = bitrates[key] || 8
    const sizeMB = (bitrate * durationSec) / 8
    return sizeMB > 1024 ? `${(sizeMB / 1024).toFixed(1)} GB` : `${sizeMB.toFixed(0)} MB`
  }

  const handleExport = async () => {
    if (!currentProject) return

    setIsExporting(true)
    setError(null)
    setActiveJob(null)

    try {
      // First, sync the project to the backend
      const projectResponse = await fetch(`${API_BASE_URL}/videoeditor/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: currentProject.id,
          name: currentProject.name,
          duration: projectDuration,
          resolution_width: currentProject.resolution.width,
          resolution_height: currentProject.resolution.height,
          frame_rate: currentProject.frameRate,
          project_data: {
            tracks: currentProject.tracks,
          },
        }),
      })

      // If project exists, update it instead
      if (!projectResponse.ok && projectResponse.status === 400) {
        await fetch(`${API_BASE_URL}/videoeditor/projects/${currentProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: currentProject.name,
            duration: projectDuration,
            project_data: {
              tracks: currentProject.tracks,
            },
          }),
        })
      }

      // Create export job
      const exportResponse = await fetch(`${API_BASE_URL}/videoeditor/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: currentProject.id,
          format: settings.format,
          resolution: settings.resolution,
          frame_rate: settings.frameRate,
          quality: settings.quality,
        }),
      })

      if (!exportResponse.ok) {
        const errorData = await exportResponse.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Export konnte nicht gestartet werden')
      }

      const job: BackendExportJob = await exportResponse.json()
      setActiveJob(job)

      // Show info that export is queued
      if (job.status === 'pending') {
        setError('Export wurde in die Warteschlange gestellt. Der Server verarbeitet den Export im Hintergrund.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
      setIsExporting(false)
    }
  }

  const handleDownload = async () => {
    if (!activeJob || activeJob.status !== 'completed') return

    window.open(`${API_BASE_URL}/videoeditor/export/${activeJob.id}/download`, '_blank')
  }

  const handleCancel = async () => {
    if (!activeJob) return

    try {
      await fetch(`${API_BASE_URL}/videoeditor/export/${activeJob.id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })
      setActiveJob(null)
      setIsExporting(false)
    } catch {
      // Ignore cancel errors
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold">Video exportieren</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Project Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg">
            <Film className="w-10 h-10 text-gray-500" />
            <div>
              <p className="font-medium">{currentProject?.name || 'Unbenannt'}</p>
              <p className="text-sm text-gray-400">
                Dauer: {Math.floor(projectDuration / 1000)}s •
                {currentProject?.tracks.reduce((sum, t) => sum + t.clips.length, 0) || 0} Clips
              </p>
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSettings(s => ({ ...s, format: 'mp4' }))}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  settings.format === 'mp4'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                MP4 (H.264)
              </button>
              <button
                onClick={() => setSettings(s => ({ ...s, format: 'webm' }))}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  settings.format === 'webm'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                WebM (VP9)
              </button>
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Auflösung</label>
            <div className="grid grid-cols-3 gap-2">
              {RESOLUTIONS.map(res => (
                <button
                  key={res.value}
                  onClick={() => setSettings(s => ({ ...s, resolution: res.value }))}
                  className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                    settings.resolution === res.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="font-medium">{res.label}</span>
                  <span className="block text-xs opacity-70">{res.width}×{res.height}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Frame Rate */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Bildrate</label>
            <div className="grid grid-cols-3 gap-2">
              {FRAME_RATES.map(fps => (
                <button
                  key={fps.value}
                  onClick={() => setSettings(s => ({ ...s, frameRate: fps.value }))}
                  className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                    settings.frameRate === fps.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {fps.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Qualität</label>
            <div className="space-y-2">
              {QUALITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSettings(s => ({ ...s, quality: opt.value }))}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-colors ${
                    settings.quality === opt.value
                      ? 'bg-violet-600/20 border-2 border-violet-500'
                      : 'bg-gray-700 border-2 border-transparent hover:bg-gray-600'
                  }`}
                >
                  <div className="text-left">
                    <span className="font-medium">{opt.label}</span>
                    <span className="block text-xs text-gray-400">{opt.description}</span>
                  </div>
                  {settings.quality === opt.value && (
                    <Check className="w-5 h-5 text-violet-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Estimated Size */}
          <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg text-sm">
            <span className="text-gray-400">Geschätzte Dateigröße</span>
            <span className="font-mono font-medium">{estimateFileSize()}</span>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Export Status */}
        {activeJob && (
          <div className="mx-4 mb-4 p-3 bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Export Status</span>
              <span className={`text-sm font-medium ${
                activeJob.status === 'completed' ? 'text-green-400' :
                activeJob.status === 'failed' ? 'text-red-400' :
                activeJob.status === 'cancelled' ? 'text-gray-400' :
                'text-violet-400'
              }`}>
                {activeJob.status === 'pending' && 'Warteschlange'}
                {activeJob.status === 'processing' && 'Verarbeite...'}
                {activeJob.status === 'completed' && 'Fertig'}
                {activeJob.status === 'failed' && 'Fehlgeschlagen'}
                {activeJob.status === 'cancelled' && 'Abgebrochen'}
              </span>
            </div>
            {['pending', 'processing'].includes(activeJob.status) && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${activeJob.progress}%` }}
                />
              </div>
            )}
            {activeJob.status === 'completed' && activeJob.file_size && (
              <p className="text-xs text-gray-400 mt-1">
                Dateigröße: {(activeJob.file_size / (1024 * 1024)).toFixed(1)} MB
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Schließen
          </button>

          {activeJob?.status === 'completed' && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Herunterladen
            </button>
          )}

          {activeJob && ['pending', 'processing'].includes(activeJob.status) && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Abbrechen
            </button>
          )}

          {(!activeJob || ['failed', 'cancelled'].includes(activeJob.status)) && (
            <button
              onClick={handleExport}
              disabled={isExporting || projectDuration === 0}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exportiere...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {activeJob?.status === 'failed' ? 'Erneut versuchen' : 'Exportieren'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
