// Image Editor Types

// === Tool Types ===
export type Tool =
  | 'select'
  | 'move'
  | 'brush'
  | 'pencil'
  | 'eraser'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'bucket'
  | 'gradient'
  | 'text'
  | 'crop'
  | 'eyedropper'
  | 'blur'
  | 'sharpen'
  | 'smudge'
  | 'dodge'
  | 'burn'
  | 'clone'
  | 'rectSelect'
  | 'ellipseSelect'
  | 'lassoSelect'
  | 'magicWand'

// === Blend Modes ===
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'

// === Layer Types ===
export type LayerType = 'image' | 'text' | 'shape' | 'adjustment'

// === Core Interfaces ===

export interface Layer {
  id: string
  name: string
  type: LayerType
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  x: number
  y: number
  width: number
  height: number
  rotation: number
  // Image data as base64 data URL
  imageData?: string
  // For caching the canvas
  canvas?: HTMLCanvasElement
  // Text-specific
  text?: string
  fontFamily?: string
  fontSize?: number
  fontColor?: string
  fontWeight?: number
  textAlign?: 'left' | 'center' | 'right'
}

export interface ImageProject {
  id: string
  name: string
  width: number
  height: number
  backgroundColor: string
  layers: Layer[]
  createdAt: number
  updatedAt: number
}

export interface BrushSettings {
  size: number       // 1-500
  hardness: number   // 0-100 (0 = soft, 100 = hard)
  opacity: number    // 0-100
  color: string      // hex color
  flow: number       // 0-100 (paint flow rate)
}

export interface EraserSettings {
  size: number
  hardness: number
  opacity: number
}

export interface ShapeSettings {
  fillColor: string
  strokeColor: string
  strokeWidth: number
  filled: boolean
  stroked: boolean
}

export interface GradientSettings {
  type: 'linear' | 'radial'
  startColor: string
  endColor: string
}

export interface BucketSettings {
  tolerance: number  // 0-255 color similarity threshold
}

export interface CloneSettings {
  size: number
  hardness: number
  opacity: number
  sourceX: number | null
  sourceY: number | null
  offsetX: number
  offsetY: number
}

export interface RetouchSettings {
  size: number
  strength: number  // 0-100
}

export interface Filters {
  brightness: number    // -100 to 100
  contrast: number      // -100 to 100
  saturation: number    // -100 to 100
  hue: number           // -180 to 180
  blur: number          // 0-20
  sharpen: number       // 0-100
  grayscale: boolean
  sepia: boolean
  invert: boolean
  // Extended filters
  noise: number         // 0-100
  pixelate: number      // 0-50 (block size)
  posterize: number     // 2-32 (levels)
  vignette: number      // 0-100
  emboss: boolean
  edgeDetect: boolean
  tintColor: string     // hex color for tint
  tintAmount: number    // 0-100
}

export interface Selection {
  type: 'rectangle' | 'ellipse' | 'freehand' | 'none'
  x: number
  y: number
  width: number
  height: number
  path?: { x: number; y: number }[]  // For freehand selection
  active: boolean
}

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
  active: boolean
}

// === History ===
export interface HistoryEntry {
  id: string
  name: string
  timestamp: number
  // Snapshot of layers (serialized)
  snapshot: string
}

// === Export Settings ===
export interface ExportSettings {
  format: 'png' | 'jpeg' | 'webp'
  quality: number  // 0-100 (for jpeg/webp)
  scale: number    // 0.5, 1, 2
  backgroundColor: string | 'transparent'
}

// === UI State ===
export type ViewMode = 'projects' | 'editor'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// === Default Values ===
export const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  size: 20,
  hardness: 80,
  opacity: 100,
  color: '#000000',
  flow: 100,
}

export const DEFAULT_ERASER_SETTINGS: EraserSettings = {
  size: 20,
  hardness: 80,
  opacity: 100,
}

export const DEFAULT_SHAPE_SETTINGS: ShapeSettings = {
  fillColor: '#000000',
  strokeColor: '#000000',
  strokeWidth: 2,
  filled: true,
  stroked: false,
}

export const DEFAULT_GRADIENT_SETTINGS: GradientSettings = {
  type: 'linear',
  startColor: '#000000',
  endColor: '#ffffff',
}

export const DEFAULT_BUCKET_SETTINGS: BucketSettings = {
  tolerance: 32,
}

export const DEFAULT_CLONE_SETTINGS: CloneSettings = {
  size: 30,
  hardness: 80,
  opacity: 100,
  sourceX: null,
  sourceY: null,
  offsetX: 0,
  offsetY: 0,
}

export const DEFAULT_RETOUCH_SETTINGS: RetouchSettings = {
  size: 20,
  strength: 50,
}

export const DEFAULT_FILTERS: Filters = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  sharpen: 0,
  grayscale: false,
  sepia: false,
  invert: false,
  noise: 0,
  pixelate: 0,
  posterize: 0,
  vignette: 0,
  emboss: false,
  edgeDetect: false,
  tintColor: '#ff0000',
  tintAmount: 0,
}

export const DEFAULT_SELECTION: Selection = {
  type: 'none',
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  active: false,
}

export const DEFAULT_CROP: CropArea = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  active: false,
}

// === Helper Functions ===
export function createLayer(
  id: string,
  name: string,
  type: LayerType,
  width: number,
  height: number
): Layer {
  return {
    id,
    name,
    type,
    visible: true,
    locked: false,
    opacity: 100,
    blendMode: 'normal',
    x: 0,
    y: 0,
    width,
    height,
    rotation: 0,
  }
}

export function createProject(id: string, name: string, width: number, height: number): ImageProject {
  return {
    id,
    name,
    width,
    height,
    backgroundColor: '#ffffff',
    layers: [
      {
        ...createLayer('layer-bg', 'Background', 'image', width, height),
        locked: true,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
