import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  VideoProject,
  Track,
  Clip,
  MediaAsset,
  Effect,
  Keyframe,
  TrackType,
  EffectType,
  KeyframableProperty,
  InspectorTab,
  PreviewScale,
  ActiveTool,
  ExportSettings,
  ExportJob,
} from '@/apps/videoeditor/types'
import {
  createDefaultProject,
  createDefaultTrack,
  createDefaultClip,
} from '@/apps/videoeditor/types'
import {
  saveProjectToDB,
  loadProjectFromDB,
  getAllProjectSummaries,
  deleteProjectFromDB,
  saveMediaAssetToDB,
  loadMediaAssetsFromDB,
  deleteMediaAssetFromDB,
  initDB,
} from '@/apps/videoeditor/services/projectStorage'

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

// History entry for undo/redo
interface HistoryEntry {
  project: VideoProject
  timestamp: number
}

interface VideoEditorState {
  // Project state
  currentProject: VideoProject | null
  projects: { id: string; name: string; updatedAt: number; thumbnailUrl?: string }[]
  isDirty: boolean
  isLoading: boolean
  isSaving: boolean

  // Undo/Redo history
  history: HistoryEntry[]
  historyIndex: number
  maxHistorySize: number

  // Playback state
  isPlaying: boolean
  currentTime: number
  playbackRate: number
  loopStart: number | null
  loopEnd: number | null

  // Selection state
  selectedClipIds: string[]
  selectedTrackId: string | null
  selectedKeyframeIds: string[]

  // UI state
  timelineZoom: number
  timelineScrollX: number
  inspectorTab: InspectorTab
  previewScale: PreviewScale
  showSafeZones: boolean
  snapToGrid: boolean
  activeTool: ActiveTool

  // Media library
  mediaAssets: MediaAsset[]
  mediaFilter: string

  // Export state
  exportJob: ExportJob | null
  showExportDialog: boolean

  // View mode
  viewMode: 'projects' | 'editor'

  // Actions - Project management
  createProject: (name: string) => Promise<void>
  loadProject: (projectId: string) => Promise<void>
  saveProject: () => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  closeProject: () => void
  updateProjectName: (name: string) => void
  loadProjectsFromDB: () => Promise<void>

  // Actions - Playback controls
  play: () => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  setPlaybackRate: (rate: number) => void
  setLoop: (start: number | null, end: number | null) => void

  // Actions - Track operations
  addTrack: (type: TrackType) => void
  deleteTrack: (trackId: string) => void
  reorderTrack: (trackId: string, newOrder: number) => void
  toggleTrackMute: (trackId: string) => void
  toggleTrackLock: (trackId: string) => void
  toggleTrackVisibility: (trackId: string) => void
  renameTrack: (trackId: string, name: string) => void

  // Actions - Clip operations
  addClip: (trackId: string, assetId: string, startTime: number) => void
  addTextClip: (trackId: string, startTime: number, text?: string) => void
  deleteClip: (clipId: string) => void
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void
  trimClip: (clipId: string, side: 'start' | 'end', newTime: number) => void
  splitClip: (clipId: string, splitTime: number) => void
  duplicateClip: (clipId: string) => void
  updateClipProperties: (clipId: string, updates: Partial<Clip>) => void

  // Actions - Effects
  addEffect: (clipId: string, effectType: EffectType) => void
  removeEffect: (clipId: string, effectId: string) => void
  updateEffect: (clipId: string, effectId: string, updates: Partial<Effect>) => void
  toggleEffect: (clipId: string, effectId: string) => void

  // Actions - Keyframes
  addKeyframe: (clipId: string, property: KeyframableProperty, time: number, value: number) => void
  deleteKeyframe: (clipId: string, keyframeId: string) => void
  updateKeyframe: (clipId: string, keyframeId: string, updates: Partial<Keyframe>) => void

  // Actions - Selection
  selectClip: (clipId: string, multi?: boolean) => void
  selectTrack: (trackId: string) => void
  selectKeyframe: (keyframeId: string, multi?: boolean) => void
  clearSelection: () => void

  // Actions - Media library
  importMedia: (file: File) => Promise<void>
  importFromDocuments: (documentId: number, name: string, type: 'video' | 'audio' | 'image', url: string) => void
  deleteMediaAsset: (assetId: string) => void
  setMediaFilter: (filter: string) => void

  // Actions - UI state
  setTimelineZoom: (zoom: number) => void
  setTimelineScrollX: (scrollX: number) => void
  setInspectorTab: (tab: InspectorTab) => void
  setPreviewScale: (scale: PreviewScale) => void
  setActiveTool: (tool: ActiveTool) => void
  toggleSafeZones: () => void
  toggleSnapToGrid: () => void
  setViewMode: (mode: 'projects' | 'editor') => void

  // Actions - Export
  startExport: (settings: ExportSettings) => Promise<void>
  cancelExport: () => void
  setShowExportDialog: (show: boolean) => void

  // Actions - Undo/Redo
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  pushHistory: () => void

  // Helpers
  getSelectedClip: () => Clip | null
  getSelectedTrack: () => Track | null
  getClipById: (clipId: string) => Clip | null
  getTrackById: (trackId: string) => Track | null
  calculateProjectDuration: () => number
}

export const useVideoEditorStore = create<VideoEditorState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      projects: [],
      isDirty: false,
      isLoading: false,
      isSaving: false,

      // Undo/Redo history
      history: [],
      historyIndex: -1,
      maxHistorySize: 50,

      isPlaying: false,
      currentTime: 0,
      playbackRate: 1,
      loopStart: null,
      loopEnd: null,

      selectedClipIds: [],
      selectedTrackId: null,
      selectedKeyframeIds: [],

      timelineZoom: 50,
      timelineScrollX: 0,
      inspectorTab: 'clip',
      previewScale: 'fit',
      showSafeZones: false,
      snapToGrid: true,
      activeTool: 'select',

      mediaAssets: [],
      mediaFilter: '',

      exportJob: null,
      showExportDialog: false,

      viewMode: 'projects',

      // Project management
      createProject: async (name) => {
        const id = generateId()
        const project = createDefaultProject(id, name)
        const projectSummary = {
          id,
          name,
          updatedAt: Date.now(),
        }

        // Save to IndexedDB
        try {
          await saveProjectToDB(project)
        } catch (error) {
          console.error('Failed to save new project to IndexedDB:', error)
        }

        set({
          currentProject: project,
          projects: [projectSummary, ...get().projects],
          viewMode: 'editor',
          isDirty: false,
          history: [],
          historyIndex: -1,
        })
      },

      loadProject: async (projectId) => {
        set({ isLoading: true })

        try {
          // Load project from IndexedDB
          const project = await loadProjectFromDB(projectId)
          if (project) {
            // Load associated media assets
            const mediaAssets = await loadMediaAssetsFromDB(projectId)

            set({
              currentProject: project,
              mediaAssets,
              viewMode: 'editor',
              isDirty: false,
              isLoading: false,
              history: [],
              historyIndex: -1,
            })
          } else {
            // Fallback: create new project if not found in IndexedDB
            const existingProject = get().projects.find(p => p.id === projectId)
            if (existingProject) {
              const newProject = createDefaultProject(projectId, existingProject.name)
              await saveProjectToDB(newProject)
              set({
                currentProject: newProject,
                viewMode: 'editor',
                isDirty: false,
                isLoading: false,
                history: [],
                historyIndex: -1,
              })
            }
          }
        } catch (error) {
          console.error('Failed to load project:', error)
          set({ isLoading: false })
        }
      },

      saveProject: async () => {
        const project = get().currentProject
        if (!project) return

        set({ isSaving: true })

        try {
          // Save project to IndexedDB
          await saveProjectToDB(project)

          // Save media assets to IndexedDB
          for (const asset of get().mediaAssets) {
            await saveMediaAssetToDB(project.id, asset)
          }

          const updatedProjects = get().projects.map(p =>
            p.id === project.id
              ? { ...p, name: project.name, updatedAt: Date.now() }
              : p
          )

          set({
            projects: updatedProjects,
            isDirty: false,
            isSaving: false,
          })
        } catch (error) {
          console.error('Failed to save project:', error)
          set({ isSaving: false })
        }
      },

      deleteProject: async (projectId) => {
        try {
          // Delete from IndexedDB
          await deleteProjectFromDB(projectId)
        } catch (error) {
          console.error('Failed to delete project from IndexedDB:', error)
        }

        set({
          projects: get().projects.filter(p => p.id !== projectId),
          currentProject: get().currentProject?.id === projectId ? null : get().currentProject,
        })
      },

      closeProject: () => {
        set({
          currentProject: null,
          viewMode: 'projects',
          selectedClipIds: [],
          selectedTrackId: null,
          selectedKeyframeIds: [],
          currentTime: 0,
          isPlaying: false,
          history: [],
          historyIndex: -1,
        })
      },

      loadProjectsFromDB: async () => {
        try {
          await initDB()
          const projectSummaries = await getAllProjectSummaries()
          set({ projects: projectSummaries })
        } catch (error) {
          console.error('Failed to load projects from IndexedDB:', error)
        }
      },

      updateProjectName: (name) => {
        const project = get().currentProject
        if (!project) return
        set({
          currentProject: { ...project, name, updatedAt: Date.now() },
          isDirty: true,
        })
      },

      // Playback controls
      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      stop: () => set({ isPlaying: false, currentTime: 0 }),
      seek: (time) => set({ currentTime: Math.max(0, time) }),
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      setLoop: (start, end) => set({ loopStart: start, loopEnd: end }),

      // Track operations
      addTrack: (type) => {
        get().pushHistory()
        const project = get().currentProject
        if (!project) return

        const maxOrder = Math.max(-1, ...project.tracks.map(t => t.order))
        const track = createDefaultTrack(generateId(), type, maxOrder + 1)

        set({
          currentProject: {
            ...project,
            tracks: [...project.tracks, track],
            updatedAt: Date.now(),
          },
          isDirty: true,
        })
      },

      deleteTrack: (trackId) => {
        get().pushHistory()
        const project = get().currentProject
        if (!project) return

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.filter(t => t.id !== trackId),
            updatedAt: Date.now(),
          },
          selectedTrackId: get().selectedTrackId === trackId ? null : get().selectedTrackId,
          isDirty: true,
        })
      },

      reorderTrack: (trackId, newOrder) => {
        const project = get().currentProject
        if (!project) return

        const tracks = [...project.tracks]
        const trackIndex = tracks.findIndex(t => t.id === trackId)
        if (trackIndex === -1) return

        const track = tracks[trackIndex]
        tracks.splice(trackIndex, 1)

        // Update orders
        tracks.forEach((t, i) => {
          if (i >= newOrder) t.order = i + 1
        })
        track.order = newOrder
        tracks.splice(newOrder, 0, track)

        set({
          currentProject: { ...project, tracks, updatedAt: Date.now() },
          isDirty: true,
        })
      },

      toggleTrackMute: (trackId) => {
        const project = get().currentProject
        if (!project) return

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.map(t =>
              t.id === trackId ? { ...t, muted: !t.muted } : t
            ),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })
      },

      toggleTrackLock: (trackId) => {
        const project = get().currentProject
        if (!project) return

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.map(t =>
              t.id === trackId ? { ...t, locked: !t.locked } : t
            ),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })
      },

      toggleTrackVisibility: (trackId) => {
        const project = get().currentProject
        if (!project) return

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.map(t =>
              t.id === trackId ? { ...t, visible: !t.visible } : t
            ),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })
      },

      renameTrack: (trackId, name) => {
        const project = get().currentProject
        if (!project) return

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.map(t =>
              t.id === trackId ? { ...t, name } : t
            ),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })
      },

      // Clip operations
      addClip: (trackId, assetId, startTime) => {
        get().pushHistory()
        const project = get().currentProject
        if (!project) return

        const asset = get().mediaAssets.find(a => a.id === assetId)
        if (!asset) return

        const track = project.tracks.find(t => t.id === trackId)
        if (!track) return

        const duration = asset.duration || 5000 // Default 5 seconds
        const clip = createDefaultClip(
          generateId(),
          trackId,
          track.type,
          assetId,
          startTime,
          duration
        )
        clip.name = asset.name

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.map(t =>
              t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
            ),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })
      },

      addTextClip: (trackId, startTime, text = 'Text') => {
        const project = get().currentProject
        if (!project) return

        const track = project.tracks.find(t => t.id === trackId)
        if (!track || track.type !== 'text') return

        const clip: Clip = {
          id: generateId(),
          trackId,
          type: 'text',
          name: text.slice(0, 20),
          startTime,
          duration: 3000, // Default 3 seconds
          sourceId: '',
          sourceStartTime: 0,
          sourceEndTime: 3000,
          volume: 1,
          opacity: 1,
          transform: {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            anchorX: 0.5,
            anchorY: 0.5,
          },
          effects: [],
          keyframes: [],
          textContent: text,
          fontFamily: 'Arial',
          fontSize: 48,
          fontWeight: 400,
          textColor: '#ffffff',
          textAlign: 'center',
          textShadow: true,
        }

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.map(t =>
              t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
            ),
            updatedAt: Date.now(),
          },
          isDirty: true,
          selectedClipIds: [clip.id],
        })
      },

      deleteClip: (clipId) => {
        get().pushHistory()
        const project = get().currentProject
        if (!project) return

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.map(t => ({
              ...t,
              clips: t.clips.filter(c => c.id !== clipId),
            })),
            updatedAt: Date.now(),
          },
          selectedClipIds: get().selectedClipIds.filter(id => id !== clipId),
          isDirty: true,
        })
      },

      moveClip: (clipId, newTrackId, newStartTime) => {
        get().pushHistory()
        const project = get().currentProject
        if (!project) return

        let movedClip: Clip | null = null

        // Remove from current track
        const tracksAfterRemove = project.tracks.map(t => {
          const clip = t.clips.find(c => c.id === clipId)
          if (clip) {
            movedClip = { ...clip, trackId: newTrackId, startTime: newStartTime }
          }
          return {
            ...t,
            clips: t.clips.filter(c => c.id !== clipId),
          }
        })

        if (!movedClip) return

        // Add to new track
        const tracks = tracksAfterRemove.map(t =>
          t.id === newTrackId
            ? { ...t, clips: [...t.clips, movedClip!] }
            : t
        )

        set({
          currentProject: { ...project, tracks, updatedAt: Date.now() },
          isDirty: true,
        })
      },

      trimClip: (clipId, side, newTime) => {
        get().pushHistory()
        const project = get().currentProject
        if (!project) return

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.map(t => ({
              ...t,
              clips: t.clips.map(c => {
                if (c.id !== clipId) return c
                if (side === 'start') {
                  const delta = newTime - c.startTime
                  return {
                    ...c,
                    startTime: newTime,
                    duration: c.duration - delta,
                    sourceStartTime: c.sourceStartTime + delta,
                  }
                } else {
                  return {
                    ...c,
                    duration: newTime - c.startTime,
                    sourceEndTime: c.sourceStartTime + (newTime - c.startTime),
                  }
                }
              }),
            })),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })
      },

      splitClip: (clipId, splitTime) => {
        get().pushHistory()
        const project = get().currentProject
        if (!project) return

        const clip = get().getClipById(clipId)
        if (!clip) return

        const relativeTime = splitTime - clip.startTime
        if (relativeTime <= 0 || relativeTime >= clip.duration) return

        const clip1: Clip = {
          ...clip,
          duration: relativeTime,
          sourceEndTime: clip.sourceStartTime + relativeTime,
        }

        const clip2: Clip = {
          ...clip,
          id: generateId(),
          startTime: splitTime,
          duration: clip.duration - relativeTime,
          sourceStartTime: clip.sourceStartTime + relativeTime,
        }

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.map(t => ({
              ...t,
              clips: t.clips.flatMap(c =>
                c.id === clipId ? [clip1, clip2] : [c]
              ),
            })),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })
      },

      duplicateClip: (clipId) => {
        get().pushHistory()
        const project = get().currentProject
        if (!project) return

        const clip = get().getClipById(clipId)
        if (!clip) return

        const newClip: Clip = {
          ...clip,
          id: generateId(),
          startTime: clip.startTime + clip.duration,
        }

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.map(t =>
              t.id === clip.trackId
                ? { ...t, clips: [...t.clips, newClip] }
                : t
            ),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })
      },

      updateClipProperties: (clipId, updates) => {
        const project = get().currentProject
        if (!project) return

        set({
          currentProject: {
            ...project,
            tracks: project.tracks.map(t => ({
              ...t,
              clips: t.clips.map(c =>
                c.id === clipId ? { ...c, ...updates } : c
              ),
            })),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })
      },

      // Effects
      addEffect: (clipId, effectType) => {
        // Default values for different effect types
        const defaultValues: Record<EffectType, number> = {
          'brightness': 1,
          'contrast': 1,
          'saturation': 1,
          'hue-rotate': 0,
          'blur': 0,
          'sharpen': 0,
          'grayscale': 0,
          'sepia': 0,
          'invert': 0,
          'vignette': 0,
          'fadeIn': 0,
          'fadeOut': 0,
        }
        const effect: Effect = {
          id: generateId(),
          type: effectType,
          enabled: true,
          value: defaultValues[effectType] ?? 1,
          params: {},
        }
        get().updateClipProperties(clipId, {
          effects: [...(get().getClipById(clipId)?.effects || []), effect],
        })
      },

      removeEffect: (clipId, effectId) => {
        const clip = get().getClipById(clipId)
        if (!clip) return
        get().updateClipProperties(clipId, {
          effects: clip.effects.filter(e => e.id !== effectId),
        })
      },

      updateEffect: (clipId, effectId, updates) => {
        const clip = get().getClipById(clipId)
        if (!clip) return
        get().updateClipProperties(clipId, {
          effects: clip.effects.map(e =>
            e.id === effectId ? { ...e, ...updates } : e
          ),
        })
      },

      toggleEffect: (clipId, effectId) => {
        const clip = get().getClipById(clipId)
        if (!clip) return
        get().updateClipProperties(clipId, {
          effects: clip.effects.map(e =>
            e.id === effectId ? { ...e, enabled: !e.enabled } : e
          ),
        })
      },

      // Keyframes
      addKeyframe: (clipId, property, time, value) => {
        const keyframe: Keyframe = {
          id: generateId(),
          time,
          property,
          value,
          easing: 'linear',
        }
        const clip = get().getClipById(clipId)
        if (!clip) return
        get().updateClipProperties(clipId, {
          keyframes: [...clip.keyframes, keyframe],
        })
      },

      deleteKeyframe: (clipId, keyframeId) => {
        const clip = get().getClipById(clipId)
        if (!clip) return
        get().updateClipProperties(clipId, {
          keyframes: clip.keyframes.filter(k => k.id !== keyframeId),
        })
      },

      updateKeyframe: (clipId, keyframeId, updates) => {
        const clip = get().getClipById(clipId)
        if (!clip) return
        get().updateClipProperties(clipId, {
          keyframes: clip.keyframes.map(k =>
            k.id === keyframeId ? { ...k, ...updates } : k
          ),
        })
      },

      // Selection
      selectClip: (clipId, multi = false) => {
        if (multi) {
          const current = get().selectedClipIds
          if (current.includes(clipId)) {
            set({ selectedClipIds: current.filter(id => id !== clipId) })
          } else {
            set({ selectedClipIds: [...current, clipId] })
          }
        } else {
          set({ selectedClipIds: [clipId] })
        }
      },

      selectTrack: (trackId) => {
        set({ selectedTrackId: trackId })
      },

      selectKeyframe: (keyframeId, multi = false) => {
        if (multi) {
          const current = get().selectedKeyframeIds
          if (current.includes(keyframeId)) {
            set({ selectedKeyframeIds: current.filter(id => id !== keyframeId) })
          } else {
            set({ selectedKeyframeIds: [...current, keyframeId] })
          }
        } else {
          set({ selectedKeyframeIds: [keyframeId] })
        }
      },

      clearSelection: () => {
        set({
          selectedClipIds: [],
          selectedTrackId: null,
          selectedKeyframeIds: [],
        })
      },

      // Media library
      importMedia: async (file) => {
        const id = generateId()
        const type = file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/')
          ? 'audio'
          : 'image'

        const asset: MediaAsset = {
          id,
          name: file.name,
          type,
          mimeType: file.type,
          size: file.size,
          blob: file,
        }

        // Get duration for video/audio
        if (type === 'video' || type === 'audio') {
          const url = URL.createObjectURL(file)
          const media = type === 'video' ? document.createElement('video') : document.createElement('audio')
          media.src = url
          await new Promise<void>((resolve) => {
            media.onloadedmetadata = () => {
              asset.duration = media.duration * 1000
              if (type === 'video') {
                asset.resolution = {
                  width: (media as HTMLVideoElement).videoWidth,
                  height: (media as HTMLVideoElement).videoHeight,
                }
              }
              URL.revokeObjectURL(url)
              resolve()
            }
          })
        }

        set({ mediaAssets: [...get().mediaAssets, asset] })
      },

      importFromDocuments: (documentId, name, type, url) => {
        const asset: MediaAsset = {
          id: generateId(),
          name,
          type,
          mimeType: type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/mp3' : 'image/jpeg',
          size: 0,
          documentId,
          thumbnailUrl: type === 'image' ? url : undefined,
        }
        set({ mediaAssets: [...get().mediaAssets, asset] })
      },

      deleteMediaAsset: (assetId) => {
        set({ mediaAssets: get().mediaAssets.filter(a => a.id !== assetId) })
      },

      setMediaFilter: (filter) => {
        set({ mediaFilter: filter })
      },

      // UI state
      setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(10, Math.min(200, zoom)) }),
      setTimelineScrollX: (scrollX) => set({ timelineScrollX: scrollX }),
      setInspectorTab: (tab) => set({ inspectorTab: tab }),
      setPreviewScale: (scale) => set({ previewScale: scale }),
      setActiveTool: (tool) => set({ activeTool: tool }),
      toggleSafeZones: () => set({ showSafeZones: !get().showSafeZones }),
      toggleSnapToGrid: () => set({ snapToGrid: !get().snapToGrid }),
      setViewMode: (mode) => set({ viewMode: mode }),

      // Export
      startExport: async (settings) => {
        const project = get().currentProject
        if (!project) return

        const job: ExportJob = {
          id: generateId(),
          projectId: project.id,
          status: 'pending',
          progress: 0,
        }

        set({ exportJob: job, showExportDialog: false })

        // Simulate export progress
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 500))
          set({
            exportJob: { ...get().exportJob!, status: 'processing', progress: i },
          })
        }

        set({
          exportJob: { ...get().exportJob!, status: 'completed', progress: 100 },
        })
      },

      cancelExport: () => {
        set({ exportJob: null })
      },

      setShowExportDialog: (show) => set({ showExportDialog: show }),

      // Undo/Redo implementation
      pushHistory: () => {
        const { currentProject, history, historyIndex, maxHistorySize } = get()
        if (!currentProject) return

        // Remove any future history if we're not at the end
        const newHistory = history.slice(0, historyIndex + 1)

        // Add current state
        newHistory.push({
          project: JSON.parse(JSON.stringify(currentProject)),
          timestamp: Date.now(),
        })

        // Trim history if exceeds max size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift()
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        })
      },

      undo: () => {
        const { history, historyIndex, currentProject } = get()
        if (historyIndex < 0 || !currentProject) return

        // If we're at the most recent state, save current state first
        if (historyIndex === history.length - 1) {
          get().pushHistory()
        }

        const newIndex = historyIndex > 0 ? historyIndex - 1 : 0
        const previousState = history[newIndex]

        if (previousState) {
          set({
            currentProject: JSON.parse(JSON.stringify(previousState.project)),
            historyIndex: newIndex,
            isDirty: true,
          })
        }
      },

      redo: () => {
        const { history, historyIndex } = get()
        if (historyIndex >= history.length - 1) return

        const newIndex = historyIndex + 1
        const nextState = history[newIndex]

        if (nextState) {
          set({
            currentProject: JSON.parse(JSON.stringify(nextState.project)),
            historyIndex: newIndex,
            isDirty: true,
          })
        }
      },

      canUndo: () => {
        const { history, historyIndex } = get()
        return historyIndex > 0 || history.length > 0
      },

      canRedo: () => {
        const { history, historyIndex } = get()
        return historyIndex < history.length - 1
      },

      // Helpers
      getSelectedClip: () => {
        const clipId = get().selectedClipIds[0]
        if (!clipId) return null
        return get().getClipById(clipId)
      },

      getSelectedTrack: () => {
        const trackId = get().selectedTrackId
        if (!trackId) return null
        return get().getTrackById(trackId)
      },

      getClipById: (clipId) => {
        const project = get().currentProject
        if (!project) return null
        for (const track of project.tracks) {
          const clip = track.clips.find(c => c.id === clipId)
          if (clip) return clip
        }
        return null
      },

      getTrackById: (trackId) => {
        const project = get().currentProject
        if (!project) return null
        return project.tracks.find(t => t.id === trackId) || null
      },

      calculateProjectDuration: () => {
        const project = get().currentProject
        if (!project) return 0
        let maxEnd = 0
        for (const track of project.tracks) {
          for (const clip of track.clips) {
            const end = clip.startTime + clip.duration
            if (end > maxEnd) maxEnd = end
          }
        }
        return maxEnd
      },
    }),
    {
      name: 'video-editor-storage',
      partialize: (state) => ({
        projects: state.projects,
        timelineZoom: state.timelineZoom,
        snapToGrid: state.snapToGrid,
        showSafeZones: state.showSafeZones,
      }),
    }
  )
)
