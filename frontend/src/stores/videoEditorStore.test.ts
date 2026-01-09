import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useVideoEditorStore } from './videoEditorStore'
import { act } from '@testing-library/react'

// Helper to reset store between tests
const resetStore = () => {
  useVideoEditorStore.setState({
    currentProject: null,
    projects: [],
    isDirty: false,
    isLoading: false,
    isSaving: false,
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
    history: [],
    historyIndex: -1,
  })
}

describe('Video Editor Store', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('Initial State', () => {
    it('has correct initial values', () => {
      const state = useVideoEditorStore.getState()

      expect(state.currentProject).toBeNull()
      expect(state.projects).toEqual([])
      expect(state.isPlaying).toBe(false)
      expect(state.currentTime).toBe(0)
      expect(state.selectedClipIds).toEqual([])
      expect(state.viewMode).toBe('projects')
      expect(state.timelineZoom).toBe(50)
      expect(state.snapToGrid).toBe(true)
    })
  })

  describe('Project Management', () => {
    it('creates a new project', async () => {
      const { createProject } = useVideoEditorStore.getState()

      await act(async () => {
        await createProject('My Test Project')
      })

      const state = useVideoEditorStore.getState()
      expect(state.currentProject).not.toBeNull()
      expect(state.currentProject?.name).toBe('My Test Project')
      expect(state.projects).toHaveLength(1)
      expect(state.projects[0].name).toBe('My Test Project')
      expect(state.viewMode).toBe('editor')
      expect(state.isDirty).toBe(false) // Changed: isDirty is false after save to IndexedDB
    })

    it('loads an existing project', async () => {
      const { createProject, closeProject, loadProject } = useVideoEditorStore.getState()

      await act(async () => {
        await createProject('Test Project')
      })

      const projectId = useVideoEditorStore.getState().projects[0].id

      act(() => {
        closeProject()
      })

      expect(useVideoEditorStore.getState().currentProject).toBeNull()

      await act(async () => {
        await loadProject(projectId)
      })

      // Note: loadProject may load from IndexedDB which is mocked to return null
      // The fallback creates a new project if not found
      expect(useVideoEditorStore.getState().viewMode).toBe('editor')
    })

    it('closes a project', async () => {
      const { createProject, closeProject } = useVideoEditorStore.getState()

      await act(async () => {
        await createProject('Test Project')
      })

      act(() => {
        closeProject()
      })

      const state = useVideoEditorStore.getState()
      expect(state.currentProject).toBeNull()
      expect(state.viewMode).toBe('projects')
      expect(state.selectedClipIds).toEqual([])
      expect(state.currentTime).toBe(0)
    })

    it('deletes a project', async () => {
      const { createProject, deleteProject } = useVideoEditorStore.getState()

      await act(async () => {
        await createProject('Test Project')
      })

      const projectId = useVideoEditorStore.getState().projects[0].id

      await act(async () => {
        await deleteProject(projectId)
      })

      expect(useVideoEditorStore.getState().projects).toHaveLength(0)
    })

    it('updates project name', async () => {
      const { createProject, updateProjectName } = useVideoEditorStore.getState()

      await act(async () => {
        await createProject('Old Name')
      })

      act(() => {
        updateProjectName('New Name')
      })

      expect(useVideoEditorStore.getState().currentProject?.name).toBe('New Name')
      expect(useVideoEditorStore.getState().isDirty).toBe(true)
    })

    it('saves a project', async () => {
      const { createProject, saveProject } = useVideoEditorStore.getState()

      await act(async () => {
        await createProject('Test Project')
      })

      await act(async () => {
        await saveProject()
      })

      expect(useVideoEditorStore.getState().isDirty).toBe(false)
      expect(useVideoEditorStore.getState().isSaving).toBe(false)
    })
  })

  describe('Playback Controls', () => {
    it('plays and pauses', () => {
      const { play, pause } = useVideoEditorStore.getState()

      act(() => {
        play()
      })
      expect(useVideoEditorStore.getState().isPlaying).toBe(true)

      act(() => {
        pause()
      })
      expect(useVideoEditorStore.getState().isPlaying).toBe(false)
    })

    it('stops and resets time', () => {
      const { play, seek, stop } = useVideoEditorStore.getState()

      act(() => {
        play()
        seek(5000)
      })

      act(() => {
        stop()
      })

      const state = useVideoEditorStore.getState()
      expect(state.isPlaying).toBe(false)
      expect(state.currentTime).toBe(0)
    })

    it('seeks to specific time', () => {
      const { seek } = useVideoEditorStore.getState()

      act(() => {
        seek(3000)
      })
      expect(useVideoEditorStore.getState().currentTime).toBe(3000)

      // Should not allow negative time
      act(() => {
        seek(-1000)
      })
      expect(useVideoEditorStore.getState().currentTime).toBe(0)
    })

    it('sets playback rate', () => {
      const { setPlaybackRate } = useVideoEditorStore.getState()

      act(() => {
        setPlaybackRate(2)
      })
      expect(useVideoEditorStore.getState().playbackRate).toBe(2)
    })

    it('sets loop points', () => {
      const { setLoop } = useVideoEditorStore.getState()

      act(() => {
        setLoop(1000, 5000)
      })

      const state = useVideoEditorStore.getState()
      expect(state.loopStart).toBe(1000)
      expect(state.loopEnd).toBe(5000)

      act(() => {
        setLoop(null, null)
      })

      expect(useVideoEditorStore.getState().loopStart).toBeNull()
      expect(useVideoEditorStore.getState().loopEnd).toBeNull()
    })
  })

  describe('Track Operations', () => {
    beforeEach(async () => {
      const { createProject } = useVideoEditorStore.getState()
      await act(async () => {
        await createProject('Test Project')
      })
    })

    it('adds a video track', () => {
      const { addTrack } = useVideoEditorStore.getState()
      // Default project already has 2 tracks (video + audio)
      const initialCount = useVideoEditorStore.getState().currentProject?.tracks.length || 0

      act(() => {
        addTrack('video')
      })

      const tracks = useVideoEditorStore.getState().currentProject?.tracks
      expect(tracks).toHaveLength(initialCount + 1)
      // New track is added at the end
      const newTrack = tracks?.[tracks.length - 1]
      expect(newTrack?.type).toBe('video')
    })

    it('adds multiple tracks of different types', () => {
      const { addTrack } = useVideoEditorStore.getState()
      const initialCount = useVideoEditorStore.getState().currentProject?.tracks.length || 0

      act(() => {
        addTrack('video')
        addTrack('audio')
        addTrack('text')
      })

      const tracks = useVideoEditorStore.getState().currentProject?.tracks
      expect(tracks).toHaveLength(initialCount + 3)
    })

    it('deletes a track', () => {
      const { addTrack, deleteTrack } = useVideoEditorStore.getState()
      const initialCount = useVideoEditorStore.getState().currentProject?.tracks.length || 0

      act(() => {
        addTrack('video')
        addTrack('audio')
      })

      expect(useVideoEditorStore.getState().currentProject?.tracks).toHaveLength(initialCount + 2)
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!

      act(() => {
        deleteTrack(trackId)
      })

      const tracks = useVideoEditorStore.getState().currentProject?.tracks
      expect(tracks).toHaveLength(initialCount + 1)
    })

    it('toggles track mute', () => {
      const { addTrack, toggleTrackMute } = useVideoEditorStore.getState()

      act(() => {
        addTrack('audio')
      })

      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!
      expect(useVideoEditorStore.getState().currentProject?.tracks[0].muted).toBe(false)

      act(() => {
        toggleTrackMute(trackId)
      })
      expect(useVideoEditorStore.getState().currentProject?.tracks[0].muted).toBe(true)

      act(() => {
        toggleTrackMute(trackId)
      })
      expect(useVideoEditorStore.getState().currentProject?.tracks[0].muted).toBe(false)
    })

    it('toggles track lock', () => {
      const { addTrack, toggleTrackLock } = useVideoEditorStore.getState()

      act(() => {
        addTrack('video')
      })

      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!

      act(() => {
        toggleTrackLock(trackId)
      })
      expect(useVideoEditorStore.getState().currentProject?.tracks[0].locked).toBe(true)
    })

    it('toggles track visibility', () => {
      const { addTrack, toggleTrackVisibility } = useVideoEditorStore.getState()

      act(() => {
        addTrack('video')
      })

      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!

      act(() => {
        toggleTrackVisibility(trackId)
      })
      expect(useVideoEditorStore.getState().currentProject?.tracks[0].visible).toBe(false)
    })

    it('renames a track', () => {
      const { addTrack, renameTrack } = useVideoEditorStore.getState()

      act(() => {
        addTrack('video')
      })

      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!

      act(() => {
        renameTrack(trackId, 'Main Video Track')
      })
      expect(useVideoEditorStore.getState().currentProject?.tracks[0].name).toBe('Main Video Track')
    })
  })

  describe('Clip Operations', () => {
    beforeEach(async () => {
      const store = useVideoEditorStore.getState()
      await act(async () => {
        await store.createProject('Test Project')
      })
      act(() => {
        store.addTrack('video')
      })
      // Add a media asset
      useVideoEditorStore.setState({
        mediaAssets: [
          {
            id: 'asset-1',
            name: 'test-video.mp4',
            type: 'video',
            mimeType: 'video/mp4',
            size: 1000,
            duration: 10000,
          },
        ],
      })
    })

    it('adds a clip to track', () => {
      const { addClip } = useVideoEditorStore.getState()
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!

      act(() => {
        addClip(trackId, 'asset-1', 0)
      })

      const clips = useVideoEditorStore.getState().currentProject?.tracks[0].clips
      expect(clips).toHaveLength(1)
      expect(clips?.[0].sourceId).toBe('asset-1')
      expect(clips?.[0].startTime).toBe(0)
      expect(clips?.[0].duration).toBe(10000)
    })

    it('deletes a clip', () => {
      const { addClip, deleteClip } = useVideoEditorStore.getState()
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!

      act(() => {
        addClip(trackId, 'asset-1', 0)
      })

      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        deleteClip(clipId)
      })

      expect(useVideoEditorStore.getState().currentProject?.tracks[0].clips).toHaveLength(0)
    })

    it('moves a clip to a new position', () => {
      const { addClip, addTrack, moveClip } = useVideoEditorStore.getState()
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!

      act(() => {
        addClip(trackId, 'asset-1', 0)
        addTrack('video')
      })

      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!
      const newTrackId = useVideoEditorStore.getState().currentProject?.tracks[1].id!

      act(() => {
        moveClip(clipId, newTrackId, 5000)
      })

      const state = useVideoEditorStore.getState()
      expect(state.currentProject?.tracks[0].clips).toHaveLength(0)
      expect(state.currentProject?.tracks[1].clips).toHaveLength(1)
      expect(state.currentProject?.tracks[1].clips[0].startTime).toBe(5000)
    })

    it('duplicates a clip', () => {
      const { addClip, duplicateClip } = useVideoEditorStore.getState()
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!

      act(() => {
        addClip(trackId, 'asset-1', 0)
      })

      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        duplicateClip(clipId)
      })

      const clips = useVideoEditorStore.getState().currentProject?.tracks[0].clips
      expect(clips).toHaveLength(2)
      expect(clips?.[1].startTime).toBe(10000) // After original clip
    })

    it('updates clip properties', () => {
      const { addClip, updateClipProperties } = useVideoEditorStore.getState()
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!

      act(() => {
        addClip(trackId, 'asset-1', 0)
      })

      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        updateClipProperties(clipId, { volume: 0.5, opacity: 0.8 })
      })

      const clip = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0]
      expect(clip?.volume).toBe(0.5)
      expect(clip?.opacity).toBe(0.8)
    })

    it('splits a clip', () => {
      const { addClip, splitClip } = useVideoEditorStore.getState()
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!

      act(() => {
        addClip(trackId, 'asset-1', 0)
      })

      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        splitClip(clipId, 5000) // Split at 5 seconds
      })

      const clips = useVideoEditorStore.getState().currentProject?.tracks[0].clips
      expect(clips).toHaveLength(2)
      expect(clips?.[0].duration).toBe(5000)
      expect(clips?.[1].startTime).toBe(5000)
      expect(clips?.[1].duration).toBe(5000)
    })
  })

  describe('Selection', () => {
    beforeEach(async () => {
      const store = useVideoEditorStore.getState()
      await act(async () => {
        await store.createProject('Test Project')
      })
      act(() => {
        store.addTrack('video')
      })
      useVideoEditorStore.setState({
        mediaAssets: [
          { id: 'asset-1', name: 'test.mp4', type: 'video', mimeType: 'video/mp4', size: 1000, duration: 5000 },
        ],
      })
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!
      act(() => {
        useVideoEditorStore.getState().addClip(trackId, 'asset-1', 0)
        useVideoEditorStore.getState().addClip(trackId, 'asset-1', 5000)
      })
    })

    it('selects a single clip', () => {
      const { selectClip } = useVideoEditorStore.getState()
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        selectClip(clipId)
      })

      expect(useVideoEditorStore.getState().selectedClipIds).toEqual([clipId])
    })

    it('selects multiple clips with multi flag', () => {
      const { selectClip } = useVideoEditorStore.getState()
      const clips = useVideoEditorStore.getState().currentProject?.tracks[0].clips!

      act(() => {
        selectClip(clips[0].id)
        selectClip(clips[1].id, true)
      })

      expect(useVideoEditorStore.getState().selectedClipIds).toHaveLength(2)
    })

    it('deselects a clip when clicking again with multi flag', () => {
      const { selectClip } = useVideoEditorStore.getState()
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        selectClip(clipId)
        selectClip(clipId, true)
      })

      expect(useVideoEditorStore.getState().selectedClipIds).toEqual([])
    })

    it('selects a track', () => {
      const { selectTrack } = useVideoEditorStore.getState()
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!

      act(() => {
        selectTrack(trackId)
      })

      expect(useVideoEditorStore.getState().selectedTrackId).toBe(trackId)
    })

    it('clears selection', () => {
      const { selectClip, selectTrack, clearSelection } = useVideoEditorStore.getState()
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        selectClip(clipId)
        selectTrack(trackId)
        clearSelection()
      })

      const state = useVideoEditorStore.getState()
      expect(state.selectedClipIds).toEqual([])
      expect(state.selectedTrackId).toBeNull()
    })
  })

  describe('UI State', () => {
    it('sets timeline zoom within bounds', () => {
      const { setTimelineZoom } = useVideoEditorStore.getState()

      act(() => {
        setTimelineZoom(100)
      })
      expect(useVideoEditorStore.getState().timelineZoom).toBe(100)

      // Should clamp to min
      act(() => {
        setTimelineZoom(5)
      })
      expect(useVideoEditorStore.getState().timelineZoom).toBe(10)

      // Should clamp to max
      act(() => {
        setTimelineZoom(300)
      })
      expect(useVideoEditorStore.getState().timelineZoom).toBe(200)
    })

    it('sets active tool', () => {
      const { setActiveTool } = useVideoEditorStore.getState()

      act(() => {
        setActiveTool('cut')
      })
      expect(useVideoEditorStore.getState().activeTool).toBe('cut')
    })

    it('toggles snap to grid', () => {
      const { toggleSnapToGrid } = useVideoEditorStore.getState()

      expect(useVideoEditorStore.getState().snapToGrid).toBe(true)

      act(() => {
        toggleSnapToGrid()
      })
      expect(useVideoEditorStore.getState().snapToGrid).toBe(false)
    })

    it('toggles safe zones', () => {
      const { toggleSafeZones } = useVideoEditorStore.getState()

      expect(useVideoEditorStore.getState().showSafeZones).toBe(false)

      act(() => {
        toggleSafeZones()
      })
      expect(useVideoEditorStore.getState().showSafeZones).toBe(true)
    })

    it('sets view mode', () => {
      const { setViewMode } = useVideoEditorStore.getState()

      act(() => {
        setViewMode('editor')
      })
      expect(useVideoEditorStore.getState().viewMode).toBe('editor')
    })
  })

  describe('Media Library', () => {
    it('imports media from documents', () => {
      const { importFromDocuments } = useVideoEditorStore.getState()

      act(() => {
        importFromDocuments(1, 'test-video.mp4', 'video', '/documents/1/test-video.mp4')
      })

      const assets = useVideoEditorStore.getState().mediaAssets
      expect(assets).toHaveLength(1)
      expect(assets[0].name).toBe('test-video.mp4')
      expect(assets[0].type).toBe('video')
      expect(assets[0].documentId).toBe(1)
    })

    it('deletes media asset', () => {
      const { importFromDocuments, deleteMediaAsset } = useVideoEditorStore.getState()

      act(() => {
        importFromDocuments(1, 'test.mp4', 'video', '/docs/test.mp4')
      })

      const assetId = useVideoEditorStore.getState().mediaAssets[0].id

      act(() => {
        deleteMediaAsset(assetId)
      })

      expect(useVideoEditorStore.getState().mediaAssets).toHaveLength(0)
    })

    it('sets media filter', () => {
      const { setMediaFilter } = useVideoEditorStore.getState()

      act(() => {
        setMediaFilter('video')
      })

      expect(useVideoEditorStore.getState().mediaFilter).toBe('video')
    })
  })

  describe('Effects', () => {
    beforeEach(async () => {
      const store = useVideoEditorStore.getState()
      await act(async () => {
        await store.createProject('Test Project')
      })
      act(() => {
        store.addTrack('video')
      })
      useVideoEditorStore.setState({
        mediaAssets: [
          { id: 'asset-1', name: 'test.mp4', type: 'video', mimeType: 'video/mp4', size: 1000, duration: 5000 },
        ],
      })
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!
      act(() => {
        useVideoEditorStore.getState().addClip(trackId, 'asset-1', 0)
      })
    })

    it('adds an effect to a clip', () => {
      const { addEffect } = useVideoEditorStore.getState()
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        addEffect(clipId, 'brightness')
      })

      const clip = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0]
      expect(clip?.effects).toHaveLength(1)
      expect(clip?.effects[0].type).toBe('brightness')
      expect(clip?.effects[0].enabled).toBe(true)
    })

    it('removes an effect from a clip', () => {
      const { addEffect, removeEffect } = useVideoEditorStore.getState()
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        addEffect(clipId, 'contrast')
      })

      const effectId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].effects[0].id!

      act(() => {
        removeEffect(clipId, effectId)
      })

      expect(useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].effects).toHaveLength(0)
    })

    it('toggles effect enabled state', () => {
      const { addEffect, toggleEffect } = useVideoEditorStore.getState()
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        addEffect(clipId, 'blur')
      })

      const effectId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].effects[0].id!

      act(() => {
        toggleEffect(clipId, effectId)
      })

      expect(useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].effects[0].enabled).toBe(false)
    })
  })

  describe('Keyframes', () => {
    beforeEach(async () => {
      const store = useVideoEditorStore.getState()
      await act(async () => {
        await store.createProject('Test Project')
      })
      act(() => {
        store.addTrack('video')
      })
      useVideoEditorStore.setState({
        mediaAssets: [
          { id: 'asset-1', name: 'test.mp4', type: 'video', mimeType: 'video/mp4', size: 1000, duration: 5000 },
        ],
      })
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!
      act(() => {
        useVideoEditorStore.getState().addClip(trackId, 'asset-1', 0)
      })
    })

    it('adds a keyframe to a clip', () => {
      const { addKeyframe } = useVideoEditorStore.getState()
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        addKeyframe(clipId, 'opacity', 0, 1)
        addKeyframe(clipId, 'opacity', 1000, 0.5)
      })

      const keyframes = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].keyframes
      expect(keyframes).toHaveLength(2)
      expect(keyframes?.[0].property).toBe('opacity')
      expect(keyframes?.[0].time).toBe(0)
      expect(keyframes?.[0].value).toBe(1)
    })

    it('deletes a keyframe', () => {
      const { addKeyframe, deleteKeyframe } = useVideoEditorStore.getState()
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        addKeyframe(clipId, 'opacity', 0, 1)
      })

      const keyframeId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].keyframes[0].id!

      act(() => {
        deleteKeyframe(clipId, keyframeId)
      })

      expect(useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].keyframes).toHaveLength(0)
    })
  })

  describe('Helper Functions', () => {
    beforeEach(async () => {
      const store = useVideoEditorStore.getState()
      await act(async () => {
        await store.createProject('Test Project')
      })
      act(() => {
        store.addTrack('video')
        store.addTrack('audio')
      })
      useVideoEditorStore.setState({
        mediaAssets: [
          { id: 'asset-1', name: 'test.mp4', type: 'video', mimeType: 'video/mp4', size: 1000, duration: 5000 },
        ],
      })
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!
      act(() => {
        useVideoEditorStore.getState().addClip(trackId, 'asset-1', 0)
        useVideoEditorStore.getState().addClip(trackId, 'asset-1', 5000)
      })
    })

    it('gets selected clip', () => {
      const { selectClip, getSelectedClip } = useVideoEditorStore.getState()
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!

      act(() => {
        selectClip(clipId)
      })

      const clip = useVideoEditorStore.getState().getSelectedClip()
      expect(clip).not.toBeNull()
      expect(clip?.id).toBe(clipId)
    })

    it('returns null when no clip selected', () => {
      const clip = useVideoEditorStore.getState().getSelectedClip()
      expect(clip).toBeNull()
    })

    it('gets clip by id', () => {
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!
      const clip = useVideoEditorStore.getState().getClipById(clipId)

      expect(clip).not.toBeNull()
      expect(clip?.id).toBe(clipId)
    })

    it('gets track by id', () => {
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!
      const track = useVideoEditorStore.getState().getTrackById(trackId)

      expect(track).not.toBeNull()
      expect(track?.id).toBe(trackId)
    })

    it('calculates project duration', () => {
      const duration = useVideoEditorStore.getState().calculateProjectDuration()
      // Two clips of 5000ms each, second one starts at 5000ms
      expect(duration).toBe(10000)
    })
  })

  describe('Export', () => {
    beforeEach(async () => {
      const store = useVideoEditorStore.getState()
      await act(async () => {
        await store.createProject('Test Project')
      })
    })

    it('shows and hides export dialog', () => {
      const { setShowExportDialog } = useVideoEditorStore.getState()

      act(() => {
        setShowExportDialog(true)
      })
      expect(useVideoEditorStore.getState().showExportDialog).toBe(true)

      act(() => {
        setShowExportDialog(false)
      })
      expect(useVideoEditorStore.getState().showExportDialog).toBe(false)
    })

    it('cancels export', () => {
      useVideoEditorStore.setState({
        exportJob: { id: 'job-1', projectId: 'project-1', status: 'processing', progress: 50 },
      })

      const { cancelExport } = useVideoEditorStore.getState()

      act(() => {
        cancelExport()
      })

      expect(useVideoEditorStore.getState().exportJob).toBeNull()
    })
  })
})
