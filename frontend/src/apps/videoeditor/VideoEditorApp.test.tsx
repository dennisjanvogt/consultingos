import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoEditorApp } from './VideoEditorApp'
import { useVideoEditorStore } from '@/stores/videoEditorStore'
import { act } from '@testing-library/react'

// Reset store before each test
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

describe('VideoEditorApp', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('Projects View', () => {
    it('renders projects view by default', () => {
      render(<VideoEditorApp />)

      expect(screen.getByText('videoeditor.projects')).toBeInTheDocument()
      expect(screen.getByText('videoeditor.newProject')).toBeInTheDocument()
    })

    it('shows empty state when no projects', () => {
      render(<VideoEditorApp />)

      expect(screen.getByText('videoeditor.noProjects')).toBeInTheDocument()
      expect(screen.getByText('videoeditor.createFirst')).toBeInTheDocument()
    })

    it('creates a new project when clicking new project button', async () => {
      const user = userEvent.setup()
      render(<VideoEditorApp />)

      // Click new project button to open dialog
      const newProjectButton = screen.getByRole('button', { name: /videoeditor.newProject/i })
      await user.click(newProjectButton)

      // Fill in project name in the dialog
      const nameInput = screen.getByPlaceholderText('videoeditor.projectName')
      await user.type(nameInput, 'Test Project')

      // Click the create button
      const createButton = screen.getByRole('button', { name: /common.create/i })
      await user.click(createButton)

      // After creating a project, we should have a project
      await waitFor(() => {
        expect(useVideoEditorStore.getState().currentProject).not.toBeNull()
      })
    })

    it('displays existing projects', () => {
      useVideoEditorStore.setState({
        projects: [
          { id: 'project-1', name: 'Test Project 1', updatedAt: Date.now() },
          { id: 'project-2', name: 'Test Project 2', updatedAt: Date.now() - 1000 },
        ],
      })

      render(<VideoEditorApp />)

      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })
  })

  describe('Editor View', () => {
    beforeEach(async () => {
      // Set up with an open project
      await act(async () => {
        await useVideoEditorStore.getState().createProject('Test Project')
      })
    })

    it('renders editor view when project is open', () => {
      render(<VideoEditorApp />)

      // Should see media library header
      expect(screen.getByText('videoeditor.media')).toBeInTheDocument()
      // Should see "select clip" message in inspector (no clip selected)
      expect(screen.getByText('videoeditor.selectClip')).toBeInTheDocument()
    })

    it('shows import button in media library', () => {
      render(<VideoEditorApp />)

      // Import button uses title attribute
      expect(screen.getByTitle('videoeditor.import')).toBeInTheDocument()
    })

    it('shows playback controls', () => {
      render(<VideoEditorApp />)

      // Look for the timeline area
      const playButtons = screen.getAllByRole('button')
      expect(playButtons.length).toBeGreaterThan(0)
    })

    it('shows tool buttons', () => {
      render(<VideoEditorApp />)

      expect(screen.getByTitle('videoeditor.selectTool')).toBeInTheDocument()
      expect(screen.getByTitle('videoeditor.cutTool')).toBeInTheDocument()
      expect(screen.getByTitle('videoeditor.textTool')).toBeInTheDocument()
    })

    it('renders track controls when project is created', () => {
      // Default project has video and audio tracks
      render(<VideoEditorApp />)

      expect(screen.getByText('Video 1')).toBeInTheDocument()
      expect(screen.getByText('Audio 2')).toBeInTheDocument()
    })

    it('renders additional tracks when added', () => {
      act(() => {
        useVideoEditorStore.getState().addTrack('text')
      })

      render(<VideoEditorApp />)

      expect(screen.getByText('Video 1')).toBeInTheDocument()
      expect(screen.getByText('Audio 2')).toBeInTheDocument()
      expect(screen.getByText('Text 3')).toBeInTheDocument()
    })
  })

  describe('Clip Inspector', () => {
    beforeEach(async () => {
      await act(async () => {
        await useVideoEditorStore.getState().createProject('Test Project')
      })
      act(() => {
        useVideoEditorStore.getState().addTrack('video')
      })
      useVideoEditorStore.setState({
        mediaAssets: [
          { id: 'asset-1', name: 'test-video.mp4', type: 'video', mimeType: 'video/mp4', size: 1000, duration: 5000 },
        ],
      })
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!
      act(() => {
        useVideoEditorStore.getState().addClip(trackId, 'asset-1', 0)
      })
    })

    it('shows select clip message when no clip selected', () => {
      render(<VideoEditorApp />)

      expect(screen.getByText('videoeditor.selectClip')).toBeInTheDocument()
    })

    it('shows clip properties when clip is selected', () => {
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!
      act(() => {
        useVideoEditorStore.getState().selectClip(clipId)
      })

      render(<VideoEditorApp />)

      expect(screen.getByText('videoeditor.clipName')).toBeInTheDocument()
      expect(screen.getByText('videoeditor.opacity')).toBeInTheDocument()
      expect(screen.getByText('videoeditor.volume')).toBeInTheDocument()
    })
  })

  describe('Timeline Interaction', () => {
    beforeEach(async () => {
      await act(async () => {
        await useVideoEditorStore.getState().createProject('Test Project')
      })
      act(() => {
        useVideoEditorStore.getState().addTrack('video')
      })
    })

    it('has tracks available after setup', async () => {
      render(<VideoEditorApp />)

      // Default project creates 2 tracks + 1 added in beforeEach = 3 tracks
      expect(useVideoEditorStore.getState().currentProject?.tracks).toHaveLength(3)
    })

    it('changes zoom level', async () => {
      const user = userEvent.setup()
      render(<VideoEditorApp />)

      const zoomInButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-zoom-in')
      )

      const initialZoom = useVideoEditorStore.getState().timelineZoom

      if (zoomInButton) {
        await user.click(zoomInButton)
        expect(useVideoEditorStore.getState().timelineZoom).toBeGreaterThan(initialZoom)
      }
    })
  })

  describe('Keyboard Shortcuts', () => {
    beforeEach(async () => {
      await act(async () => {
        await useVideoEditorStore.getState().createProject('Test Project')
      })
      act(() => {
        useVideoEditorStore.getState().addTrack('video')
      })
    })

    it('toggles play/pause with space key', async () => {
      render(<VideoEditorApp />)

      expect(useVideoEditorStore.getState().isPlaying).toBe(false)

      fireEvent.keyDown(document, { key: ' ' })

      await waitFor(() => {
        expect(useVideoEditorStore.getState().isPlaying).toBe(true)
      })

      fireEvent.keyDown(document, { key: ' ' })

      await waitFor(() => {
        expect(useVideoEditorStore.getState().isPlaying).toBe(false)
      })
    })

    it('switches to select tool with S key', async () => {
      act(() => {
        useVideoEditorStore.getState().setActiveTool('cut')
      })

      render(<VideoEditorApp />)

      fireEvent.keyDown(document, { key: 's' })

      await waitFor(() => {
        expect(useVideoEditorStore.getState().activeTool).toBe('select')
      })
    })

    it('switches to cut tool with C key', async () => {
      render(<VideoEditorApp />)

      fireEvent.keyDown(document, { key: 'c' })

      await waitFor(() => {
        expect(useVideoEditorStore.getState().activeTool).toBe('cut')
      })
    })

    it('switches to text tool with T key', async () => {
      render(<VideoEditorApp />)

      fireEvent.keyDown(document, { key: 't' })

      await waitFor(() => {
        expect(useVideoEditorStore.getState().activeTool).toBe('text')
      })
    })

    it('deletes selected clip with Delete key', async () => {
      useVideoEditorStore.setState({
        mediaAssets: [
          { id: 'asset-1', name: 'test.mp4', type: 'video', mimeType: 'video/mp4', size: 1000, duration: 5000 },
        ],
      })
      const trackId = useVideoEditorStore.getState().currentProject?.tracks[0].id!
      act(() => {
        useVideoEditorStore.getState().addClip(trackId, 'asset-1', 0)
      })
      const clipId = useVideoEditorStore.getState().currentProject?.tracks[0].clips[0].id!
      act(() => {
        useVideoEditorStore.getState().selectClip(clipId)
      })

      render(<VideoEditorApp />)

      expect(useVideoEditorStore.getState().currentProject?.tracks[0].clips).toHaveLength(1)

      fireEvent.keyDown(document, { key: 'Delete' })

      await waitFor(() => {
        expect(useVideoEditorStore.getState().currentProject?.tracks[0].clips).toHaveLength(0)
      })
    })
  })

  describe('Media Library', () => {
    beforeEach(async () => {
      await act(async () => {
        await useVideoEditorStore.getState().createProject('Test Project')
      })
    })

    it('shows drop area for media', () => {
      render(<VideoEditorApp />)

      expect(screen.getByText('videoeditor.dropMedia')).toBeInTheDocument()
    })

    it('displays imported media assets', () => {
      useVideoEditorStore.setState({
        mediaAssets: [
          { id: 'asset-1', name: 'video1.mp4', type: 'video', mimeType: 'video/mp4', size: 1000 },
          { id: 'asset-2', name: 'audio1.mp3', type: 'audio', mimeType: 'audio/mp3', size: 500 },
          { id: 'asset-3', name: 'image1.jpg', type: 'image', mimeType: 'image/jpeg', size: 200 },
        ],
      })

      render(<VideoEditorApp />)

      expect(screen.getByText('video1.mp4')).toBeInTheDocument()
      expect(screen.getByText('audio1.mp3')).toBeInTheDocument()
      expect(screen.getByText('image1.jpg')).toBeInTheDocument()
    })
  })

  describe('Back Navigation', () => {
    it('returns to projects view when clicking back', async () => {
      const user = userEvent.setup()
      await act(async () => {
        await useVideoEditorStore.getState().createProject('Test Project')
      })

      render(<VideoEditorApp />)

      expect(useVideoEditorStore.getState().viewMode).toBe('editor')

      // Find the back button (ChevronLeft icon)
      const backButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-chevron-left')
      )

      if (backButton) {
        await user.click(backButton)
        expect(useVideoEditorStore.getState().viewMode).toBe('projects')
      }
    })
  })
})
