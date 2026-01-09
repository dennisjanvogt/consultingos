import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Upload,
  Trash2,
  Film,
  Music,
  Type,
  Image,
  ChevronLeft,
  Scissors,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MoreHorizontal,
  Settings,
  Download,
  FolderOpen,
  Save,
  Clock,
  Layers,
  Sliders,
  GripVertical,
  Sparkles,
  Undo2,
  Redo2,
} from 'lucide-react'
import { useVideoEditorStore } from '@/stores/videoEditorStore'
import type { Track, Clip, TrackType, MediaAsset } from './types'
import { PreviewPanel } from './components/PreviewPanel'
import { EffectsPanel } from './components/EffectsPanel'
import { TextEditor } from './components/TextEditor'
import { ExportDialog } from './components/ExportDialog'
import { InlineWaveform } from './components/Waveform'
import { KeyframeEditor } from './components/KeyframeEditor'
import { useAudioMixer } from './hooks/useAudioMixer'

// Format time in mm:ss.ms
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const milliseconds = Math.floor((ms % 1000) / 10)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
}

export function VideoEditorApp() {
  const { t } = useTranslation()
  const {
    currentProject,
    projects,
    viewMode,
    isPlaying,
    currentTime,
    mediaAssets,
    selectedClipIds,
    selectedTrackId,
    timelineZoom,
    activeTool,
    isDirty,
    isSaving,
    createProject,
    loadProject,
    saveProject,
    closeProject,
    deleteProject,
    setViewMode,
    play,
    pause,
    stop,
    seek,
    addTrack,
    deleteTrack,
    toggleTrackMute,
    toggleTrackVisibility,
    addClip,
    deleteClip,
    moveClip,
    trimClip,
    splitClip,
    selectClip,
    selectTrack,
    clearSelection,
    importMedia,
    setTimelineZoom,
    setActiveTool,
    showExportDialog,
    setShowExportDialog,
    calculateProjectDuration,
    getClipById,
    addTextClip,
    inspectorTab,
    setInspectorTab,
    undo,
    redo,
    canUndo,
    canRedo,
    loadProjectsFromDB,
    snapToGrid,
  } = useVideoEditorStore()

  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [mediaUrls, setMediaUrls] = useState<Map<string, string>>(new Map())

  // Load projects from IndexedDB on mount
  useEffect(() => {
    loadProjectsFromDB()
  }, [loadProjectsFromDB])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const playbackTimerRef = useRef<number | null>(null)

  // Audio mixer for synchronized audio playback
  useAudioMixer({
    tracks: currentProject?.tracks || [],
    currentTime,
    isPlaying,
    mediaAssets,
    mediaUrls,
  })

  // Create object URLs for media assets
  useEffect(() => {
    const newUrls = new Map<string, string>()
    mediaAssets.forEach(asset => {
      if (asset.blob && !mediaUrls.has(asset.id)) {
        const url = URL.createObjectURL(asset.blob)
        newUrls.set(asset.id, url)
      } else if (mediaUrls.has(asset.id)) {
        newUrls.set(asset.id, mediaUrls.get(asset.id)!)
      }
    })
    setMediaUrls(newUrls)

    // Cleanup old URLs
    return () => {
      mediaUrls.forEach((url, id) => {
        if (!mediaAssets.find(a => a.id === id)) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [mediaAssets])

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      const startTime = Date.now()
      const startPlaybackTime = currentTime

      playbackTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime
        const newTime = startPlaybackTime + elapsed
        const duration = calculateProjectDuration()

        if (newTime >= duration) {
          pause()
          seek(duration)
        } else {
          seek(newTime)
        }
      }, 16) // ~60fps
    } else if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
      playbackTimerRef.current = null
    }

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
      }
    }
  }, [isPlaying])

  // Sync video preview with current time
  useEffect(() => {
    if (videoPreviewRef.current && selectedClipIds.length > 0) {
      const clip = getClipById(selectedClipIds[0])
      if (clip && clip.type === 'video') {
        const clipLocalTime = (currentTime - clip.startTime) / 1000
        if (clipLocalTime >= 0 && clipLocalTime * 1000 < clip.duration) {
          const videoTime = (clip.sourceStartTime / 1000) + clipLocalTime
          if (Math.abs(videoPreviewRef.current.currentTime - videoTime) > 0.1) {
            videoPreviewRef.current.currentTime = videoTime
          }
        }
      }
    }
  }, [currentTime, selectedClipIds])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          isPlaying ? pause() : play()
          break
        case 'Delete':
        case 'Backspace':
          if (selectedClipIds.length > 0) {
            selectedClipIds.forEach(id => deleteClip(id))
          }
          break
        case 'Escape':
          clearSelection()
          break
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            saveProject()
          } else {
            setActiveTool('select')
          }
          break
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
          }
          break
        case 'y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            redo()
          }
          break
        case 'c':
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool('cut')
          }
          break
        case 't':
          setActiveTool('text')
          break
        case 'ArrowLeft':
          e.preventDefault()
          seek(Math.max(0, currentTime - (e.shiftKey ? 1000 : 100)))
          break
        case 'ArrowRight':
          e.preventDefault()
          seek(currentTime + (e.shiftKey ? 1000 : 100))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, currentTime, selectedClipIds, play, pause, deleteClip, clearSelection, saveProject, setActiveTool, seek, undo, redo])

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim())
      setNewProjectName('')
      setShowNewProjectDialog(false)
    }
  }

  const handleImportMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      for (const file of Array.from(files)) {
        await importMedia(file)
      }
    }
    e.target.value = ''
  }

  // Get currently visible video clip for preview
  const getActiveVideoClip = useCallback(() => {
    if (!currentProject) return null
    for (const track of currentProject.tracks) {
      if (track.type === 'video' && track.visible && !track.muted) {
        for (const clip of track.clips) {
          if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) {
            return clip
          }
        }
      }
    }
    return null
  }, [currentProject, currentTime])

  const activeVideoClip = getActiveVideoClip()
  const activeVideoUrl = activeVideoClip ? mediaUrls.get(activeVideoClip.sourceId) : null

  // Projects Gallery View
  if (viewMode === 'projects') {
    return (
      <div className="h-full flex flex-col bg-gray-900">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">
            {t('videoeditor.projects', 'Projekte')}
          </h1>
          <button
            onClick={() => setShowNewProjectDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('videoeditor.newProject', 'Neues Projekt')}
          </button>
        </div>

        {/* Projects Grid */}
        <div className="flex-1 overflow-auto p-4">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Film className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">{t('videoeditor.noProjects', 'Keine Projekte vorhanden')}</p>
              <p className="text-sm mt-2">{t('videoeditor.createFirst', 'Erstelle dein erstes Projekt')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="group relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all"
                  onClick={() => loadProject(project.id)}
                >
                  <div className="aspect-video bg-gray-700 flex items-center justify-center">
                    {project.thumbnailUrl ? (
                      <img src={project.thumbnailUrl} alt={project.name} className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-12 h-12 text-gray-500" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-white truncate">{project.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteProject(project.id)
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Project Dialog */}
        {showNewProjectDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl p-6 w-96 shadow-xl">
              <h2 className="text-lg font-semibold text-white mb-4">
                {t('videoeditor.newProject', 'Neues Projekt')}
              </h2>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t('videoeditor.projectName', 'Projektname')}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowNewProjectDialog(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  {t('common.cancel', 'Abbrechen')}
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {t('common.create', 'Erstellen')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Editor View
  const projectDuration = calculateProjectDuration() || 60000 // Default 1 minute if empty

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Toolbar */}
      <div className="h-10 px-3 border-b border-gray-700 flex items-center justify-between bg-gray-800/50">
        {/* Left: Back + Project Name + Undo/Redo */}
        <div className="flex items-center gap-3">
          <button
            onClick={closeProject}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title={t('common.back', 'Zurück')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium text-sm">{currentProject?.name}</span>
          {isDirty && <span className="text-xs text-yellow-500">*</span>}

          {/* Undo/Redo Buttons */}
          <div className="flex items-center gap-0.5 ml-2 border-l border-gray-700 pl-3">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-1.5 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
              title={t('videoeditor.undo', 'Rückgängig (Cmd+Z)')}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-1.5 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
              title={t('videoeditor.redo', 'Wiederholen (Cmd+Shift+Z)')}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Tools */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'select' ? 'bg-violet-600' : 'hover:bg-gray-700'}`}
            title={t('videoeditor.selectTool', 'Auswahl (S)')}
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('cut')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'cut' ? 'bg-violet-600' : 'hover:bg-gray-700'}`}
            title={t('videoeditor.cutTool', 'Schneiden (C)')}
          >
            <Scissors className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('text')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'text' ? 'bg-violet-600' : 'hover:bg-gray-700'}`}
            title={t('videoeditor.textTool', 'Text (T)')}
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={saveProject}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? t('common.saving', 'Speichert...') : t('common.save', 'Speichern')}
          </button>
          <button
            onClick={() => setShowExportDialog(true)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-violet-600 hover:bg-violet-700 rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {t('videoeditor.export', 'Export')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Media Library */}
        <div className="w-56 border-r border-gray-700 flex flex-col bg-gray-800/30">
          <div className="p-2 border-b border-gray-700 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase">
              {t('videoeditor.media', 'Medien')}
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title={t('videoeditor.import', 'Importieren')}
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,audio/*,image/*"
              onChange={handleImportMedia}
              className="hidden"
            />
          </div>

          <div className="flex-1 overflow-auto p-2 space-y-1">
            {mediaAssets.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{t('videoeditor.dropMedia', 'Medien hierher ziehen')}</p>
              </div>
            ) : (
              mediaAssets.map(asset => (
                <MediaAssetItem
                  key={asset.id}
                  asset={asset}
                  thumbnailUrl={mediaUrls.get(asset.id)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('assetId', asset.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Center: Preview + Timeline */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview Panel with Canvas Compositor */}
          <PreviewPanel
            tracks={currentProject?.tracks || []}
            currentTime={currentTime}
            projectDuration={projectDuration}
            isPlaying={isPlaying}
            resolution={currentProject?.resolution || { width: 1920, height: 1080 }}
            mediaAssets={mediaAssets}
            mediaUrls={mediaUrls}
            onPlay={play}
            onPause={pause}
            onStop={stop}
            onSeek={seek}
          />

          {/* Timeline */}
          <div className="h-64 border-t border-gray-700 flex flex-col bg-gray-800/50">
            {/* Timeline Header */}
            <div className="h-8 px-2 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => addTrack('video')}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  title="Video Track hinzufügen"
                >
                  <Plus className="w-3 h-3" />
                  <Film className="w-3 h-3" />
                </button>
                <button
                  onClick={() => addTrack('audio')}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  title="Audio Track hinzufügen"
                >
                  <Plus className="w-3 h-3" />
                  <Music className="w-3 h-3" />
                </button>
                <button
                  onClick={() => addTrack('text')}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  title="Text Track hinzufügen"
                >
                  <Plus className="w-3 h-3" />
                  <Type className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimelineZoom(Math.max(10, timelineZoom - 10))}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-400 w-12 text-center">{timelineZoom}%</span>
                <button
                  onClick={() => setTimelineZoom(Math.min(200, timelineZoom + 10))}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Time Ruler */}
            <TimeRuler
              duration={projectDuration}
              zoom={timelineZoom}
              currentTime={currentTime}
              onSeek={seek}
            />

            {/* Tracks */}
            <div className="flex-1 overflow-auto">
              {currentProject?.tracks.map(track => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isSelected={selectedTrackId === track.id}
                  selectedClipIds={selectedClipIds}
                  currentTime={currentTime}
                  timelineZoom={timelineZoom}
                  projectDuration={projectDuration}
                  activeTool={activeTool}
                  mediaUrls={mediaUrls}
                  snapToGrid={snapToGrid}
                  allTracks={currentProject?.tracks || []}
                  onSelectTrack={() => selectTrack(track.id)}
                  onSelectClip={selectClip}
                  onDeleteTrack={() => deleteTrack(track.id)}
                  onToggleMute={() => toggleTrackMute(track.id)}
                  onToggleVisibility={() => toggleTrackVisibility(track.id)}
                  onSeek={seek}
                  onAddClip={(assetId, startTime) => addClip(track.id, assetId, startTime)}
                  onAddTextClip={(startTime) => addTextClip(track.id, startTime)}
                  onMoveClip={moveClip}
                  onTrimClip={trimClip}
                  onSplitClip={splitClip}
                />
              ))}

              {(!currentProject || currentProject.tracks.length === 0) && (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  {t('videoeditor.addTracks', 'Füge Tracks hinzu um loszulegen')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Inspector */}
        <div className="w-72 border-l border-gray-700 bg-gray-800/30 flex flex-col">
          {/* Inspector Tabs */}
          {selectedClipIds.length > 0 && (
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setInspectorTab('clip')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  inspectorTab === 'clip' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4 mx-auto mb-1" />
                Clip
              </button>
              <button
                onClick={() => setInspectorTab('effects')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  inspectorTab === 'effects' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 mx-auto mb-1" />
                Effekte
              </button>
              <button
                onClick={() => setInspectorTab('keyframes')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  inspectorTab === 'keyframes' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4 mx-auto mb-1" />
                Keyframes
              </button>
            </div>
          )}

          {/* Inspector Content */}
          <div className="flex-1 overflow-auto p-3">
            {selectedClipIds.length > 0 ? (
              <>
                {inspectorTab === 'clip' && (
                  <>
                    {getClipById(selectedClipIds[0])?.type === 'text' ? (
                      <TextEditor clipId={selectedClipIds[0]} />
                    ) : (
                      <ClipInspector clipId={selectedClipIds[0]} />
                    )}
                  </>
                )}
                {inspectorTab === 'effects' && (
                  <EffectsPanel clipId={selectedClipIds[0]} />
                )}
                {inspectorTab === 'keyframes' && (
                  <KeyframeEditor clipId={selectedClipIds[0]} />
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 py-8 text-sm">
                <Sliders className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{t('videoeditor.selectClip', 'Wähle einen Clip')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </div>
  )
}

// Time Ruler Component
function TimeRuler({
  duration,
  zoom,
  currentTime,
  onSeek,
}: {
  duration: number
  zoom: number
  currentTime: number
  onSeek: (time: number) => void
}) {
  const rulerRef = useRef<HTMLDivElement>(null)
  const pixelsPerMs = zoom / 1000

  // Calculate tick interval based on zoom
  const getTickInterval = () => {
    if (zoom >= 100) return 1000 // 1 second
    if (zoom >= 50) return 2000 // 2 seconds
    if (zoom >= 25) return 5000 // 5 seconds
    return 10000 // 10 seconds
  }

  const tickInterval = getTickInterval()
  const ticks: number[] = []
  for (let t = 0; t <= duration; t += tickInterval) {
    ticks.push(t)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (rulerRef.current) {
      const rect = rulerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left + rulerRef.current.scrollLeft - 128 // Subtract track header width
      const time = Math.max(0, x / pixelsPerMs)
      onSeek(time)
    }
  }

  return (
    <div
      ref={rulerRef}
      className="h-6 border-b border-gray-700 flex bg-gray-800/80 overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      <div className="w-32 flex-shrink-0 border-r border-gray-700" />
      <div className="flex-1 relative" style={{ minWidth: duration * pixelsPerMs }}>
        {ticks.map(tick => (
          <div
            key={tick}
            className="absolute top-0 h-full flex flex-col items-center"
            style={{ left: tick * pixelsPerMs }}
          >
            <div className="w-px h-2 bg-gray-600" />
            <span className="text-[10px] text-gray-500 mt-0.5">
              {Math.floor(tick / 1000)}s
            </span>
          </div>
        ))}
        {/* Playhead indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
          style={{ left: currentTime * pixelsPerMs }}
        >
          <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1" />
        </div>
      </div>
    </div>
  )
}

// Media Asset Item
function MediaAssetItem({
  asset,
  thumbnailUrl,
  onDragStart,
}: {
  asset: MediaAsset
  thumbnailUrl?: string
  onDragStart: (e: React.DragEvent) => void
}) {
  const Icon = asset.type === 'video' ? Film : asset.type === 'audio' ? Music : Image
  const [thumbnail, setThumbnail] = useState<string | null>(null)

  // Generate thumbnail for videos
  useEffect(() => {
    if (asset.type === 'video' && asset.blob && !thumbnail) {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(asset.blob)
      video.currentTime = 1
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 80
        canvas.height = 45
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          setThumbnail(canvas.toDataURL())
        }
        URL.revokeObjectURL(video.src)
      }
    }
  }, [asset])

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 p-2 bg-gray-700/50 hover:bg-gray-700 rounded cursor-grab active:cursor-grabbing transition-colors"
    >
      <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
        {thumbnail || asset.thumbnailUrl ? (
          <img src={thumbnail || asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <Icon className="w-5 h-5 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{asset.name}</p>
        {asset.duration && (
          <p className="text-xs text-gray-400">{formatTime(asset.duration)}</p>
        )}
      </div>
    </div>
  )
}

// Snap threshold in milliseconds
const SNAP_THRESHOLD = 100

// Calculate snap points from all clips
function getSnapPoints(allTracks: Track[], currentTime: number, excludeClipId?: string): number[] {
  const snapPoints: number[] = [0, currentTime] // Always snap to start and playhead

  for (const track of allTracks) {
    for (const clip of track.clips) {
      if (clip.id === excludeClipId) continue
      snapPoints.push(clip.startTime) // Clip start
      snapPoints.push(clip.startTime + clip.duration) // Clip end
    }
  }

  return [...new Set(snapPoints)].sort((a, b) => a - b)
}

// Find nearest snap point
function findSnapPoint(time: number, snapPoints: number[], threshold: number): number | null {
  for (const snapPoint of snapPoints) {
    if (Math.abs(time - snapPoint) <= threshold) {
      return snapPoint
    }
  }
  return null
}

// Apply snapping to a time value
function applySnapping(
  time: number,
  allTracks: Track[],
  currentTime: number,
  snapEnabled: boolean,
  excludeClipId?: string
): number {
  if (!snapEnabled) {
    // Still snap to 100ms grid if snapping disabled
    return Math.round(time / 100) * 100
  }

  const snapPoints = getSnapPoints(allTracks, currentTime, excludeClipId)
  const snappedTime = findSnapPoint(time, snapPoints, SNAP_THRESHOLD)

  return snappedTime !== null ? snappedTime : Math.round(time / 100) * 100
}

// Track Row
function TrackRow({
  track,
  isSelected,
  selectedClipIds,
  currentTime,
  timelineZoom,
  projectDuration,
  activeTool,
  mediaUrls,
  snapToGrid,
  allTracks,
  onSelectTrack,
  onSelectClip,
  onDeleteTrack,
  onToggleMute,
  onToggleVisibility,
  onSeek,
  onAddClip,
  onAddTextClip,
  onMoveClip,
  onTrimClip,
  onSplitClip,
}: {
  track: Track
  isSelected: boolean
  selectedClipIds: string[]
  currentTime: number
  timelineZoom: number
  projectDuration: number
  activeTool: string
  mediaUrls: Map<string, string>
  snapToGrid: boolean
  allTracks: Track[]
  onSelectTrack: () => void
  onSelectClip: (clipId: string, multi?: boolean) => void
  onDeleteTrack: () => void
  onToggleMute: () => void
  onToggleVisibility: () => void
  onSeek: (time: number) => void
  onAddClip: (assetId: string, startTime: number) => void
  onAddTextClip: (startTime: number) => void
  onMoveClip: (clipId: string, trackId: string, newStartTime: number) => void
  onTrimClip: (clipId: string, side: 'start' | 'end', newTime: number) => void
  onSplitClip: (clipId: string, splitTime: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const pixelsPerMs = timelineZoom / 1000
  const Icon = track.type === 'video' ? Film : track.type === 'audio' ? Music : track.type === 'text' ? Type : Image

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const assetId = e.dataTransfer.getData('assetId')
    const clipId = e.dataTransfer.getData('clipId')

    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const rawTime = x / pixelsPerMs
      const startTime = Math.max(0, applySnapping(rawTime, allTracks, currentTime, snapToGrid, clipId || undefined))

      if (assetId) {
        onAddClip(assetId, startTime)
      } else if (clipId) {
        onMoveClip(clipId, track.id, startTime)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (e.target === trackRef.current && trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const rawTime = x / pixelsPerMs
      const time = Math.max(0, applySnapping(rawTime, allTracks, currentTime, snapToGrid))

      if (activeTool === 'cut') {
        // Find clip at this position and split it
        for (const clip of track.clips) {
          if (time > clip.startTime && time < clip.startTime + clip.duration) {
            onSplitClip(clip.id, time)
            return
          }
        }
      } else if (activeTool === 'text' && track.type === 'text') {
        // Add text clip on text track
        onAddTextClip(time)
        return
      }

      onSeek(time)
    }
  }

  return (
    <div
      className={`flex border-b border-gray-700 ${isSelected ? 'bg-gray-700/30' : ''} ${!track.visible ? 'opacity-50' : ''}`}
      onClick={onSelectTrack}
    >
      {/* Track Header */}
      <div className="w-32 flex-shrink-0 p-2 border-r border-gray-700 flex items-center gap-1 bg-gray-800/50">
        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-xs truncate flex-1">{track.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMute() }}
          className="p-0.5 hover:bg-gray-600 rounded"
          title={track.muted ? 'Unmute' : 'Mute'}
        >
          {track.muted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility() }}
          className="p-0.5 hover:bg-gray-600 rounded"
          title={track.visible ? 'Hide' : 'Show'}
        >
          {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-gray-500" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteTrack() }}
          className="p-0.5 hover:bg-red-600 rounded"
          title="Track löschen"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Track Content */}
      <div
        ref={trackRef}
        className={`flex-1 relative h-14 bg-gray-800/50 ${activeTool === 'cut' ? 'cursor-crosshair' : ''}`}
        style={{ minWidth: projectDuration * pixelsPerMs }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleTimelineClick}
      >
        {/* Clips */}
        {track.clips.map(clip => (
          <ClipBlock
            key={clip.id}
            clip={clip}
            isSelected={selectedClipIds.includes(clip.id)}
            pixelsPerMs={pixelsPerMs}
            trackType={track.type}
            thumbnailUrl={mediaUrls.get(clip.sourceId)}
            onClick={(e) => {
              e.stopPropagation()
              onSelectClip(clip.id, e.shiftKey)
            }}
            onDragStart={(e) => {
              e.dataTransfer.setData('clipId', clip.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onTrimStart={(newTime) => onTrimClip(clip.id, 'start', newTime)}
            onTrimEnd={(newTime) => onTrimClip(clip.id, 'end', newTime)}
          />
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
          style={{ left: currentTime * pixelsPerMs }}
        />
      </div>
    </div>
  )
}

// Clip Block with trim handles
function ClipBlock({
  clip,
  isSelected,
  pixelsPerMs,
  trackType,
  thumbnailUrl,
  onClick,
  onDragStart,
  onTrimStart,
  onTrimEnd,
}: {
  clip: Clip
  isSelected: boolean
  pixelsPerMs: number
  trackType: TrackType
  thumbnailUrl?: string
  onClick: (e: React.MouseEvent) => void
  onDragStart: (e: React.DragEvent) => void
  onTrimStart: (newTime: number) => void
  onTrimEnd: (newTime: number) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [trimSide, setTrimSide] = useState<'start' | 'end' | null>(null)
  const clipRef = useRef<HTMLDivElement>(null)

  const colors: Record<TrackType, string> = {
    video: 'bg-blue-600',
    audio: 'bg-green-600',
    text: 'bg-yellow-600',
    image: 'bg-purple-600',
  }

  const handleTrimMouseDown = (e: React.MouseEvent, side: 'start' | 'end') => {
    e.stopPropagation()
    setTrimSide(side)

    const startX = e.clientX
    const startTime = side === 'start' ? clip.startTime : clip.startTime + clip.duration

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaTime = deltaX / pixelsPerMs
      const newTime = Math.max(0, startTime + deltaTime)

      if (side === 'start') {
        // Minimum clip duration of 100ms
        if (clip.startTime + clip.duration - newTime > 100) {
          onTrimStart(newTime)
        }
      } else {
        if (newTime - clip.startTime > 100) {
          onTrimEnd(newTime)
        }
      }
    }

    const handleMouseUp = () => {
      setTrimSide(null)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      ref={clipRef}
      draggable
      onDragStart={(e) => {
        setIsDragging(true)
        onDragStart(e)
      }}
      onDragEnd={() => setIsDragging(false)}
      className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all group ${colors[trackType]} ${
        isSelected ? 'ring-2 ring-white shadow-lg' : 'hover:brightness-110'
      } ${isDragging ? 'opacity-50' : ''}`}
      style={{
        left: clip.startTime * pixelsPerMs,
        width: Math.max(20, clip.duration * pixelsPerMs),
      }}
      onClick={onClick}
    >
      {/* Trim handle left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/30 opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-opacity rounded-l flex items-center justify-center"
        onMouseDown={(e) => handleTrimMouseDown(e, 'start')}
      >
        <GripVertical className="w-3 h-3 text-white/70" />
      </div>

      {/* Clip content */}
      <div className="absolute inset-0 overflow-hidden rounded">
        {trackType === 'video' && thumbnailUrl && (
          <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        {trackType === 'audio' && thumbnailUrl && (
          <InlineWaveform audioUrl={thumbnailUrl} className="absolute inset-0 px-1 py-2" />
        )}
        <div className="relative px-2 py-0.5 text-[10px] text-white truncate font-medium drop-shadow-md">
          {clip.name}
        </div>
        <div className="absolute bottom-0.5 right-1 text-[9px] text-white/70 drop-shadow-md">
          {formatTime(clip.duration)}
        </div>
      </div>

      {/* Trim handle right */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/30 opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-opacity rounded-r flex items-center justify-center"
        onMouseDown={(e) => handleTrimMouseDown(e, 'end')}
      >
        <GripVertical className="w-3 h-3 text-white/70" />
      </div>
    </div>
  )
}

// Clip Inspector
function ClipInspector({ clipId }: { clipId: string }) {
  const { t } = useTranslation()
  const { getClipById, updateClipProperties, deleteClip, duplicateClip } = useVideoEditorStore()
  const clip = getClipById(clipId)

  if (!clip) return null

  return (
    <div className="space-y-4">
      {/* Clip Name */}
      <div>
        <label className="text-xs text-gray-400">{t('videoeditor.clipName', 'Name')}</label>
        <input
          type="text"
          value={clip.name}
          onChange={(e) => updateClipProperties(clipId, { name: e.target.value })}
          className="w-full mt-1 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded focus:ring-1 focus:ring-violet-500 outline-none"
        />
      </div>

      {/* Timing Info */}
      <div className="p-2 bg-gray-800 rounded text-xs">
        <div className="flex justify-between mb-1">
          <span className="text-gray-400">Start:</span>
          <span>{formatTime(clip.startTime)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-gray-400">Dauer:</span>
          <span>{formatTime(clip.duration)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Ende:</span>
          <span>{formatTime(clip.startTime + clip.duration)}</span>
        </div>
      </div>

      {/* Opacity & Volume */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400">{t('videoeditor.opacity', 'Deckkraft')}</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={clip.opacity}
              onChange={(e) => updateClipProperties(clipId, { opacity: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="text-xs w-8 text-right">{Math.round(clip.opacity * 100)}%</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400">{t('videoeditor.volume', 'Lautstärke')}</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={clip.volume}
              onChange={(e) => updateClipProperties(clipId, { volume: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="text-xs w-8 text-right">{Math.round(clip.volume * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Transform */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">{t('videoeditor.position', 'Position')}</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 w-3">X</span>
            <input
              type="number"
              value={clip.transform.x}
              onChange={(e) => updateClipProperties(clipId, {
                transform: { ...clip.transform, x: parseInt(e.target.value) || 0 }
              })}
              className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded focus:ring-1 focus:ring-violet-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 w-3">Y</span>
            <input
              type="number"
              value={clip.transform.y}
              onChange={(e) => updateClipProperties(clipId, {
                transform: { ...clip.transform, y: parseInt(e.target.value) || 0 }
              })}
              className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded focus:ring-1 focus:ring-violet-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">{t('videoeditor.scale', 'Skalierung')}</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 w-3">W</span>
            <input
              type="number"
              value={Math.round(clip.transform.scaleX * 100)}
              onChange={(e) => updateClipProperties(clipId, {
                transform: { ...clip.transform, scaleX: (parseInt(e.target.value) || 100) / 100 }
              })}
              className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded focus:ring-1 focus:ring-violet-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 w-3">H</span>
            <input
              type="number"
              value={Math.round(clip.transform.scaleY * 100)}
              onChange={(e) => updateClipProperties(clipId, {
                transform: { ...clip.transform, scaleY: (parseInt(e.target.value) || 100) / 100 }
              })}
              className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded focus:ring-1 focus:ring-violet-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400">{t('videoeditor.rotation', 'Rotation')}</label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min={-180}
            max={180}
            value={clip.transform.rotation}
            onChange={(e) => updateClipProperties(clipId, {
              transform: { ...clip.transform, rotation: parseInt(e.target.value) || 0 }
            })}
            className="flex-1"
          />
          <input
            type="number"
            value={clip.transform.rotation}
            onChange={(e) => updateClipProperties(clipId, {
              transform: { ...clip.transform, rotation: parseInt(e.target.value) || 0 }
            })}
            className="w-16 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded focus:ring-1 focus:ring-violet-500 outline-none"
          />
          <span className="text-xs text-gray-500">°</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-700">
        <button
          onClick={() => duplicateClip(clipId)}
          className="flex-1 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Duplizieren
        </button>
        <button
          onClick={() => deleteClip(clipId)}
          className="flex-1 px-3 py-1.5 text-xs bg-red-600/80 hover:bg-red-600 rounded transition-colors"
        >
          Löschen
        </button>
      </div>
    </div>
  )
}
