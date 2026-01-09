// Video Editor Types

// === Track Types ===
export type TrackType = 'video' | 'audio' | 'text' | 'image'

// === Effect Types ===
export type EffectType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue-rotate'
  | 'blur'
  | 'sharpen'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'vignette'
  | 'fadeIn'
  | 'fadeOut'

// === Transition Types ===
export type TransitionType =
  | 'fade'
  | 'dissolve'
  | 'wipe'
  | 'slide'
  | 'zoom'

// === Keyframe Types ===
export type KeyframableProperty =
  | 'volume'
  | 'opacity'
  | 'x'
  | 'y'
  | 'scaleX'
  | 'scaleY'
  | 'rotation'
  | 'brightness'
  | 'contrast'
  | 'saturation'

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'

// === Core Interfaces ===

export interface Transform {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  anchorX: number
  anchorY: number
}

export interface Effect {
  id: string
  type: EffectType
  enabled: boolean
  value: number
  params: Record<string, number>
}

export interface Transition {
  id: string
  type: TransitionType
  duration: number
  params: Record<string, unknown>
}

export interface Keyframe {
  id: string
  time: number
  property: KeyframableProperty
  value: number
  easing: EasingType
}

export interface Clip {
  id: string
  trackId: string
  type: TrackType
  name: string
  startTime: number
  duration: number
  sourceId: string
  sourceStartTime: number
  sourceEndTime: number
  volume: number
  opacity: number
  transform: Transform
  effects: Effect[]
  inTransition?: Transition
  outTransition?: Transition
  keyframes: Keyframe[]
  // Text clip properties
  textContent?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  textColor?: string
  backgroundColor?: string
  textAlign?: 'left' | 'center' | 'right'
  textShadow?: boolean
}

export interface TextClip extends Clip {
  type: 'text'
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontColor: string
  backgroundColor?: string
  textAlign: 'left' | 'center' | 'right'
}

export interface Track {
  id: string
  type: TrackType
  name: string
  order: number
  muted: boolean
  locked: boolean
  visible: boolean
  clips: Clip[]
}

export interface VideoProject {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  duration: number
  resolution: { width: number; height: number }
  frameRate: number
  tracks: Track[]
  thumbnailUrl?: string
}

export interface MediaAsset {
  id: string
  name: string
  type: 'video' | 'audio' | 'image'
  mimeType: string
  size: number
  duration?: number
  resolution?: { width: number; height: number }
  frameRate?: number
  thumbnailUrl?: string
  blob?: Blob
  documentId?: number
}

// === Export Settings ===
export interface ExportSettings {
  format: 'mp4' | 'webm'
  resolution: '720p' | '1080p' | '4k'
  frameRate: 24 | 30 | 60
  quality: 'low' | 'medium' | 'high'
}

export interface ExportJob {
  id: string
  projectId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  outputUrl?: string
  errorMessage?: string
}

// === UI State ===
export type InspectorTab = 'clip' | 'effects' | 'audio' | 'keyframes'
export type PreviewScale = 'fit' | '50%' | '100%' | '200%'
export type ActiveTool = 'select' | 'cut' | 'text'

// === Helper Types ===
export interface TimelineSelection {
  clipIds: string[]
  trackId: string | null
  keyframeIds: string[]
}

export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  playbackRate: number
  loopStart: number | null
  loopEnd: number | null
}

// === Default Values ===
export const DEFAULT_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  anchorX: 0.5,
  anchorY: 0.5,
}

export const DEFAULT_PROJECT_SETTINGS = {
  resolution: { width: 1920, height: 1080 },
  frameRate: 30,
}

export function createDefaultClip(
  id: string,
  trackId: string,
  type: TrackType,
  sourceId: string,
  startTime: number,
  duration: number
): Clip {
  return {
    id,
    trackId,
    type,
    name: 'Untitled Clip',
    startTime,
    duration,
    sourceId,
    sourceStartTime: 0,
    sourceEndTime: duration,
    volume: 1,
    opacity: 1,
    transform: { ...DEFAULT_TRANSFORM },
    effects: [],
    keyframes: [],
  }
}

export function createDefaultTrack(
  id: string,
  type: TrackType,
  order: number,
  name?: string
): Track {
  const defaultNames: Record<TrackType, string> = {
    video: `Video ${order + 1}`,
    audio: `Audio ${order + 1}`,
    text: `Text ${order + 1}`,
    image: `Image ${order + 1}`,
  }

  return {
    id,
    type,
    name: name || defaultNames[type],
    order,
    muted: false,
    locked: false,
    visible: true,
    clips: [],
  }
}

export function createDefaultProject(id: string, name: string): VideoProject {
  return {
    id,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    duration: 0,
    resolution: DEFAULT_PROJECT_SETTINGS.resolution,
    frameRate: DEFAULT_PROJECT_SETTINGS.frameRate,
    tracks: [
      createDefaultTrack('track-1', 'video', 0),
      createDefaultTrack('track-2', 'audio', 1),
    ],
  }
}
