import { describe, it, expect } from 'vitest'
import {
  createDefaultClip,
  createDefaultTrack,
  createDefaultProject,
  type Clip,
  type Track,
  type VideoProject,
} from './types'

describe('Video Editor Types', () => {
  describe('createDefaultClip', () => {
    it('creates a clip with correct default values', () => {
      const clip = createDefaultClip('clip-1', 'track-1', 'video', 'asset-1', 0, 5000)

      expect(clip.id).toBe('clip-1')
      expect(clip.trackId).toBe('track-1')
      expect(clip.type).toBe('video')
      expect(clip.sourceId).toBe('asset-1')
      expect(clip.startTime).toBe(0)
      expect(clip.duration).toBe(5000)
      expect(clip.sourceStartTime).toBe(0)
      expect(clip.sourceEndTime).toBe(5000)
      expect(clip.volume).toBe(1)
      expect(clip.opacity).toBe(1)
      expect(clip.effects).toEqual([])
      expect(clip.keyframes).toEqual([])
    })

    it('creates a clip with specified start time', () => {
      const clip = createDefaultClip('clip-2', 'track-1', 'audio', 'asset-2', 3000, 10000)

      expect(clip.startTime).toBe(3000)
      expect(clip.duration).toBe(10000)
      expect(clip.sourceEndTime).toBe(10000)
    })

    it('creates a clip with default transform values', () => {
      const clip = createDefaultClip('clip-3', 'track-1', 'video', 'asset-3', 0, 5000)

      expect(clip.transform).toEqual({
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        anchorX: 0.5,
        anchorY: 0.5,
      })
    })

    it('creates clips of different types', () => {
      const videoClip = createDefaultClip('v1', 't1', 'video', 'a1', 0, 1000)
      const audioClip = createDefaultClip('a1', 't2', 'audio', 'a2', 0, 1000)
      const textClip = createDefaultClip('t1', 't3', 'text', 'a3', 0, 1000)
      const imageClip = createDefaultClip('i1', 't4', 'image', 'a4', 0, 1000)

      expect(videoClip.type).toBe('video')
      expect(audioClip.type).toBe('audio')
      expect(textClip.type).toBe('text')
      expect(imageClip.type).toBe('image')
    })
  })

  describe('createDefaultTrack', () => {
    it('creates a video track with correct defaults', () => {
      const track = createDefaultTrack('track-1', 'video', 0)

      expect(track.id).toBe('track-1')
      expect(track.type).toBe('video')
      expect(track.name).toBe('Video 1')
      expect(track.order).toBe(0)
      expect(track.muted).toBe(false)
      expect(track.locked).toBe(false)
      expect(track.visible).toBe(true)
      expect(track.clips).toEqual([])
    })

    it('creates an audio track with correct name', () => {
      const track = createDefaultTrack('track-2', 'audio', 1)

      expect(track.type).toBe('audio')
      expect(track.name).toBe('Audio 2') // order + 1
      expect(track.order).toBe(1)
    })

    it('creates a text track with correct name', () => {
      const track = createDefaultTrack('track-3', 'text', 2)

      expect(track.type).toBe('text')
      expect(track.name).toBe('Text 3') // order + 1
      expect(track.order).toBe(2)
    })

    it('creates an image track with correct name', () => {
      const track = createDefaultTrack('track-4', 'image', 3)

      expect(track.type).toBe('image')
      expect(track.name).toBe('Image 4') // order + 1
      expect(track.order).toBe(3)
    })

    it('increments track number based on order', () => {
      const track1 = createDefaultTrack('t1', 'video', 0)
      const track2 = createDefaultTrack('t2', 'video', 4)
      const track3 = createDefaultTrack('t3', 'audio', 9)

      expect(track1.name).toBe('Video 1')
      expect(track2.name).toBe('Video 5')
      expect(track3.name).toBe('Audio 10')
    })
  })

  describe('createDefaultProject', () => {
    it('creates a project with correct default values', () => {
      const project = createDefaultProject('project-1', 'My Video')

      expect(project.id).toBe('project-1')
      expect(project.name).toBe('My Video')
      expect(project.duration).toBe(0)
      expect(project.resolution).toEqual({ width: 1920, height: 1080 })
      expect(project.frameRate).toBe(30)
      // Default project has a video and audio track
      expect(project.tracks).toHaveLength(2)
      expect(project.tracks[0].type).toBe('video')
      expect(project.tracks[1].type).toBe('audio')
      expect(project.createdAt).toBeDefined()
      expect(project.updatedAt).toBeDefined()
    })

    it('creates a project with timestamps', () => {
      const before = Date.now()
      const project = createDefaultProject('project-2', 'Test Project')
      const after = Date.now()

      expect(project.createdAt).toBeGreaterThanOrEqual(before)
      expect(project.createdAt).toBeLessThanOrEqual(after)
      expect(project.updatedAt).toBeGreaterThanOrEqual(before)
      expect(project.updatedAt).toBeLessThanOrEqual(after)
    })

    it('creates multiple projects with unique ids', () => {
      const project1 = createDefaultProject('id-1', 'Project 1')
      const project2 = createDefaultProject('id-2', 'Project 2')

      expect(project1.id).not.toBe(project2.id)
      expect(project1.name).not.toBe(project2.name)
    })
  })

  describe('Type Safety', () => {
    it('clip has required properties', () => {
      const clip: Clip = {
        id: 'test',
        trackId: 'track',
        type: 'video',
        name: 'Test Clip',
        sourceId: 'source',
        startTime: 0,
        duration: 1000,
        sourceStartTime: 0,
        sourceEndTime: 1000,
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
      }

      expect(clip).toBeDefined()
    })

    it('track has required properties', () => {
      const track: Track = {
        id: 'test',
        type: 'video',
        name: 'Test Track',
        order: 0,
        muted: false,
        locked: false,
        visible: true,
        clips: [],
      }

      expect(track).toBeDefined()
    })

    it('project has required properties', () => {
      const project: VideoProject = {
        id: 'test',
        name: 'Test Project',
        duration: 0,
        resolution: { width: 1920, height: 1080 },
        frameRate: 30,
        tracks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(project).toBeDefined()
    })
  })
})
