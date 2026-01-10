import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type {
  ImageProject,
  Layer,
  Tool,
  BrushSettings,
  EraserSettings,
  ShapeSettings,
  GradientSettings,
  BucketSettings,
  CloneSettings,
  RetouchSettings,
  Filters,
  Selection,
  CropArea,
  HistoryEntry,
  ViewMode,
  BlendMode,
  LayerType,
  TextEffects,
  LayerEffects,
} from '@/apps/imageeditor/types'
import {
  DEFAULT_BRUSH_SETTINGS,
  DEFAULT_ERASER_SETTINGS,
  DEFAULT_SHAPE_SETTINGS,
  DEFAULT_GRADIENT_SETTINGS,
  DEFAULT_BUCKET_SETTINGS,
  DEFAULT_CLONE_SETTINGS,
  DEFAULT_RETOUCH_SETTINGS,
  DEFAULT_FILTERS,
  DEFAULT_SELECTION,
  DEFAULT_CROP,
  createLayer,
  createProject,
  generateId,
} from '@/apps/imageeditor/types'

// Debounced auto-save timer
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
const AUTO_SAVE_DELAY = 2000 // 2 seconds after last change

// Generate thumbnail from project layers
const generateThumbnail = async (project: ImageProject): Promise<string> => {
  const THUMB_WIDTH = 320
  const THUMB_HEIGHT = 180

  const canvas = document.createElement('canvas')
  canvas.width = THUMB_WIDTH
  canvas.height = THUMB_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // Calculate scale to fit
  const scale = Math.min(THUMB_WIDTH / project.width, THUMB_HEIGHT / project.height)
  const offsetX = (THUMB_WIDTH - project.width * scale) / 2
  const offsetY = (THUMB_HEIGHT - project.height * scale) / 2

  // Fill background
  ctx.fillStyle = project.backgroundColor || '#ffffff'
  ctx.fillRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT)

  // Draw each visible layer
  for (const layer of project.layers) {
    if (!layer.visible) continue

    if (layer.imageData) {
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image()
          image.onload = () => resolve(image)
          image.onerror = reject
          image.src = layer.imageData!
        })

        ctx.save()
        ctx.globalAlpha = layer.opacity / 100
        ctx.translate(
          offsetX + (layer.x + layer.width / 2) * scale,
          offsetY + (layer.y + layer.height / 2) * scale
        )
        ctx.rotate((layer.rotation * Math.PI) / 180)
        ctx.drawImage(
          img,
          (-layer.width / 2) * scale,
          (-layer.height / 2) * scale,
          layer.width * scale,
          layer.height * scale
        )
        ctx.restore()
      } catch {
        // Skip failed images
      }
    } else if (layer.type === 'text' && layer.text) {
      ctx.save()
      ctx.globalAlpha = layer.opacity / 100
      ctx.font = `${(layer.fontSize || 24) * scale}px ${layer.fontFamily || 'Arial'}`
      ctx.fillStyle = layer.fontColor || '#000000'
      ctx.textAlign = (layer.textAlign as CanvasTextAlign) || 'left'
      ctx.fillText(
        layer.text,
        offsetX + layer.x * scale,
        offsetY + (layer.y + (layer.fontSize || 24)) * scale
      )
      ctx.restore()
    }
  }

  return canvas.toDataURL('image/jpeg', 0.7)
}

interface ImageEditorState {
  // View mode
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Project state
  currentProject: ImageProject | null
  projects: { id: string; name: string; updatedAt: number; thumbnailUrl?: string }[]
  savedProjects: Record<string, ImageProject>
  isDirty: boolean
  isLoading: boolean

  // Layers
  selectedLayerId: string | null

  // History
  history: HistoryEntry[]
  historyIndex: number
  redoStack: string[]
  maxHistorySize: number

  // Active tool
  activeTool: Tool
  setActiveTool: (tool: Tool) => void
  disabledTools: Tool[]
  toggleToolEnabled: (tool: Tool) => void

  // Right panel tab
  rightPanelTab: 'layers' | 'elements' | 'text' | 'magic' | 'filters' | 'history'
  setRightPanelTab: (tab: 'layers' | 'elements' | 'text' | 'magic' | 'filters' | 'history') => void

  // Tool settings
  brushSettings: BrushSettings
  setBrushSettings: (settings: Partial<BrushSettings>) => void
  eraserSettings: EraserSettings
  setEraserSettings: (settings: Partial<EraserSettings>) => void
  shapeSettings: ShapeSettings
  setShapeSettings: (settings: Partial<ShapeSettings>) => void
  gradientSettings: GradientSettings
  setGradientSettings: (settings: Partial<GradientSettings>) => void
  bucketSettings: BucketSettings
  setBucketSettings: (settings: Partial<BucketSettings>) => void
  cloneSettings: CloneSettings
  setCloneSettings: (settings: Partial<CloneSettings>) => void
  retouchSettings: RetouchSettings
  setRetouchSettings: (settings: Partial<RetouchSettings>) => void
  recentColors: string[]
  addRecentColor: (color: string) => void

  // Grid settings
  showGrid: boolean
  setShowGrid: (show: boolean) => void
  gridSize: number
  setGridSize: (size: number) => void
  snapToGrid: boolean
  setSnapToGrid: (snap: boolean) => void

  // Filters (applied to selected layer or global)
  filters: Filters
  filterMode: 'layer' | 'global'
  setFilterMode: (mode: 'layer' | 'global') => void
  livePreview: boolean
  setLivePreview: (preview: boolean) => void
  setFilters: (filters: Partial<Filters>) => void
  setLayerFilters: (layerId: string, filters: Partial<Filters>) => void
  applyFilters: () => void
  resetFilters: () => void
  loadLayerFilters: (layerId: string) => void

  // Selection
  selection: Selection
  setSelection: (selection: Partial<Selection>) => void
  clearSelection: () => void

  // Crop
  crop: CropArea
  setCrop: (crop: Partial<CropArea>) => void
  applyCrop: () => void
  cancelCrop: () => void

  // Canvas state
  zoom: number
  projectZoomLevels: Record<string, number>
  setZoom: (zoom: number) => void
  fitToViewTrigger: number
  triggerFitToView: () => void
  panX: number
  panY: number
  setPan: (x: number, y: number) => void

  // Export
  showExportDialog: boolean
  setShowExportDialog: (show: boolean) => void

  // Toast notifications
  toasts: { id: string; message: string; type: 'success' | 'info' | 'error' }[]
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void
  dismissToast: (id: string) => void

  // Project operations
  newProject: (name: string, width: number, height: number) => void
  openProject: (projectId: string) => Promise<void>
  saveProject: () => Promise<void>
  saveProjectToBackend: () => Promise<void>
  loadProjectsFromBackend: () => Promise<void>
  closeProject: () => void
  deleteProject: (projectId: string) => Promise<void>
  updateProjectName: (name: string) => void

  // Layer operations
  addLayer: (layer: Layer | LayerType, name?: string) => void
  deleteLayer: (layerId: string) => void
  duplicateLayer: (layerId: string) => void
  selectLayer: (layerId: string | null) => void
  reorderLayer: (layerId: string, newIndex: number) => void
  toggleLayerVisibility: (layerId: string) => void
  toggleLayerLock: (layerId: string) => void
  setLayerOpacity: (layerId: string, opacity: number) => void
  setLayerBlendMode: (layerId: string, blendMode: BlendMode) => void
  updateLayerImage: (layerId: string, imageData: string) => void
  updateLayerText: (layerId: string, text: string) => void
  updateLayerTextProperties: (
    layerId: string,
    props: {
      fontFamily?: string
      fontSize?: number
      fontColor?: string
      fontWeight?: number
      textAlign?: 'left' | 'center' | 'right'
    }
  ) => void
  updateLayerTextEffects: (layerId: string, effects: TextEffects) => void
  updateLayerEffects: (layerId: string, effects: LayerEffects) => void
  setLayerPosition: (layerId: string, x: number, y: number) => void
  resizeLayer: (layerId: string, width: number, height: number) => void
  setLayerTransform: (layerId: string, x: number, y: number, width: number, height: number) => void
  renameLayer: (layerId: string, name: string) => void
  rotateLayer: (layerId: string, degrees: number) => void
  flipLayerHorizontal: (layerId: string) => void
  flipLayerVertical: (layerId: string) => void
  mergeLayerDown: (layerId: string) => void
  flattenLayers: () => void

  // Image import
  importImage: (file: File) => Promise<void>
  importImageToLayer: (file: File, layerId: string) => Promise<void>
  addImageAsLayer: (file: File) => Promise<void>
  addShapeAsLayer: (name: string, imageData: string, width: number, height: number) => void

  // Layer trimming
  trimLayer: (layerId: string, effectPadding?: number) => void

  // Background removal
  isRemovingBackground: boolean
  removeBackground: (layerId: string) => Promise<void>

  // Magic features
  isAutoEnhancing: boolean
  autoEnhance: (layerId: string) => Promise<void>
  addBackgroundGradient: (gradient: { startColor: string; endColor: string; type: 'linear' | 'radial'; angle?: number }) => void
  addBackgroundPattern: (patternType: string, colors: string[]) => void

  // AI Features
  isGeneratingImage: boolean
  isEditingImage: boolean
  isApplyingFilter: boolean
  isUpscaling: boolean
  isExtractingColors: boolean
  extractedColors: string[]
  generateAIImage: (prompt: string) => Promise<void>
  editImageWithAI: (layerId: string, prompt: string) => Promise<void>
  editLayerWithContext: (layerId: string, instruction: string) => Promise<void>
  isEditingLayerWithContext: boolean
  applyAIFilter: (layerId: string, filterType: string) => Promise<void>
  upscaleImage: (layerId: string, scale: number) => Promise<void>
  extractColorPalette: (layerId: string) => Promise<void>

  // History
  pushHistory: (name: string) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Helpers
  getSelectedLayer: () => Layer | null
  getLayerById: (layerId: string) => Layer | null
}

export const useImageEditorStore = create<ImageEditorState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
      // Initial state
      viewMode: 'projects',
      currentProject: null,
      projects: [],
      savedProjects: {},
      isDirty: false,
      isLoading: false,
      selectedLayerId: null,
      history: [],
      historyIndex: -1,
      redoStack: [],
      maxHistorySize: 50,
      activeTool: 'move',
      disabledTools: ['select', 'rectSelect', 'ellipseSelect', 'lassoSelect', 'magicWand', 'brush', 'highlighter', 'dodge', 'clone', 'heal', 'text', 'eyedropper'],
      rightPanelTab: 'layers',
      brushSettings: { ...DEFAULT_BRUSH_SETTINGS },
      eraserSettings: { ...DEFAULT_ERASER_SETTINGS },
      shapeSettings: { ...DEFAULT_SHAPE_SETTINGS },
      gradientSettings: { ...DEFAULT_GRADIENT_SETTINGS },
      bucketSettings: { ...DEFAULT_BUCKET_SETTINGS },
      cloneSettings: { ...DEFAULT_CLONE_SETTINGS },
      retouchSettings: { ...DEFAULT_RETOUCH_SETTINGS },
      recentColors: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'],
      showGrid: false,
      gridSize: 20,
      snapToGrid: false,
      filters: { ...DEFAULT_FILTERS },
      filterMode: 'layer',
      livePreview: true,
      selection: { ...DEFAULT_SELECTION },
      crop: { ...DEFAULT_CROP },
      zoom: 100,
      projectZoomLevels: {},
      fitToViewTrigger: 0,
      panX: 0,
      panY: 0,
      showExportDialog: false,
      toasts: [],
      isRemovingBackground: false,
      isAutoEnhancing: false,
      isGeneratingImage: false,
      isEditingImage: false,
      isEditingLayerWithContext: false,
      isApplyingFilter: false,
      isUpscaling: false,
      isExtractingColors: false,
      extractedColors: [],

      // View mode
      setViewMode: (mode) => set({ viewMode: mode }),

      // Tool
      setActiveTool: (tool) => set({ activeTool: tool }),
      toggleToolEnabled: (tool) => set((state) => ({
        disabledTools: state.disabledTools.includes(tool)
          ? state.disabledTools.filter(t => t !== tool)
          : [...state.disabledTools, tool]
      })),

      // Right panel tab
      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

      // Brush settings
      setBrushSettings: (settings) =>
        set((state) => ({
          brushSettings: { ...state.brushSettings, ...settings },
        })),

      addRecentColor: (color) =>
        set((state) => {
          const normalizedColor = color.toLowerCase()
          const filtered = state.recentColors.filter((c) => c.toLowerCase() !== normalizedColor)
          return {
            recentColors: [normalizedColor, ...filtered].slice(0, 10),
          }
        }),

      // Eraser settings
      setEraserSettings: (settings) =>
        set((state) => ({
          eraserSettings: { ...state.eraserSettings, ...settings },
        })),

      // Shape settings
      setShapeSettings: (settings) =>
        set((state) => ({
          shapeSettings: { ...state.shapeSettings, ...settings },
        })),

      // Gradient settings
      setGradientSettings: (settings) =>
        set((state) => ({
          gradientSettings: { ...state.gradientSettings, ...settings },
        })),

      // Bucket settings
      setBucketSettings: (settings) =>
        set((state) => ({
          bucketSettings: { ...state.bucketSettings, ...settings },
        })),

      // Clone settings
      setCloneSettings: (settings) =>
        set((state) => ({
          cloneSettings: { ...state.cloneSettings, ...settings },
        })),

      // Retouch settings
      setRetouchSettings: (settings) =>
        set((state) => ({
          retouchSettings: { ...state.retouchSettings, ...settings },
        })),

      // Grid settings
      setShowGrid: (show) => set({ showGrid: show }),
      setGridSize: (size) => set({ gridSize: size }),
      setSnapToGrid: (snap) => set({ snapToGrid: snap }),

      // Filters
      setLivePreview: (preview) => set({ livePreview: preview }),
      setFilterMode: (mode) => set({ filterMode: mode }),
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      setLayerFilters: (layerId, filters) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedLayers = currentProject.layers.map((layer) =>
          layer.id === layerId
            ? { ...layer, filters: { ...(layer.filters || DEFAULT_FILTERS), ...filters } }
            : layer
        )

        set({
          currentProject: { ...currentProject, layers: updatedLayers },
        })
      },

      loadLayerFilters: (layerId) => {
        const { currentProject } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (layer?.filters) {
          set({ filters: { ...layer.filters } })
        } else {
          set({ filters: { ...DEFAULT_FILTERS } })
        }
      },

      applyFilters: () => {
        const { currentProject, selectedLayerId, filters, filterMode, pushHistory } = get()
        if (!currentProject) return

        pushHistory('Apply Filters')

        if (filterMode === 'layer' && selectedLayerId) {
          // Apply filters to selected layer
          const updatedLayers = currentProject.layers.map((layer) =>
            layer.id === selectedLayerId
              ? { ...layer, filters: { ...filters } }
              : layer
          )
          set({
            currentProject: { ...currentProject, layers: updatedLayers },
            filters: { ...DEFAULT_FILTERS },
          })
        } else {
          // Global mode: apply filters to all layers
          const updatedLayers = currentProject.layers.map((layer) => ({
            ...layer,
            filters: { ...(layer.filters || DEFAULT_FILTERS), ...filters },
          }))
          set({
            currentProject: { ...currentProject, layers: updatedLayers },
            filters: { ...DEFAULT_FILTERS },
          })
        }
      },

      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      // Selection
      setSelection: (selection) =>
        set((state) => ({
          selection: { ...state.selection, ...selection },
        })),

      clearSelection: () => set({ selection: { ...DEFAULT_SELECTION } }),

      // Crop
      setCrop: (crop) =>
        set((state) => ({
          crop: { ...state.crop, ...crop },
        })),

      applyCrop: () => {
        const { currentProject, crop, pushHistory } = get()
        if (!currentProject || !crop.active) return

        pushHistory('Crop')

        // Crop all layers
        const croppedLayers = currentProject.layers.map((layer) => {
          if (!layer.imageData) return { ...layer, width: crop.width, height: crop.height }

          // Create a new canvas with cropped dimensions
          const canvas = document.createElement('canvas')
          canvas.width = crop.width
          canvas.height = crop.height
          const ctx = canvas.getContext('2d')
          if (!ctx) return layer

          // Load and crop the image
          const img = new Image()
          img.src = layer.imageData

          // Draw cropped portion
          ctx.drawImage(
            img,
            crop.x - layer.x,
            crop.y - layer.y,
            crop.width,
            crop.height,
            0,
            0,
            crop.width,
            crop.height
          )

          return {
            ...layer,
            x: 0,
            y: 0,
            width: crop.width,
            height: crop.height,
            imageData: canvas.toDataURL('image/png'),
          }
        })

        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                width: crop.width,
                height: crop.height,
                layers: croppedLayers,
                updatedAt: Date.now(),
              }
            : null,
          crop: { ...DEFAULT_CROP },
          isDirty: true,
        }))
      },

      cancelCrop: () => set({ crop: { ...DEFAULT_CROP } }),

      // Canvas state
      setZoom: (zoom) => {
        const clampedZoom = Math.max(10, Math.min(400, zoom))
        const { currentProject, projectZoomLevels } = get()
        if (currentProject) {
          set({
            zoom: clampedZoom,
            projectZoomLevels: { ...projectZoomLevels, [currentProject.id]: clampedZoom },
          })
        } else {
          set({ zoom: clampedZoom })
        }
      },
      triggerFitToView: () => set((state) => ({ fitToViewTrigger: state.fitToViewTrigger + 1 })),
      setPan: (x, y) => set({ panX: x, panY: y }),

      // Export
      setShowExportDialog: (show) => set({ showExportDialog: show }),

      // Toast notifications
      showToast: (message, type = 'info') => {
        const id = generateId()
        set((state) => ({
          toasts: [...state.toasts, { id, message, type }],
        }))
        // Auto dismiss after 3 seconds
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }))
        }, 3000)
      },
      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      // Project operations
      newProject: (name, width, height) => {
        const project = createProject(generateId(), name, width, height)

        set((state) => ({
          currentProject: project,
          projects: [
            { id: project.id, name: project.name, updatedAt: project.updatedAt },
            ...state.projects,
          ],
          savedProjects: {
            ...state.savedProjects,
            [project.id]: project,
          },
          viewMode: 'editor',
          selectedLayerId: project.layers[0]?.id || null,
          history: [],
          historyIndex: -1,
          redoStack: [],
          isDirty: false,
          zoom: 100,
          panX: 0,
          panY: 0,
        }))

        // Save to backend immediately
        setTimeout(() => {
          get().saveProjectToBackend()
        }, 100)
      },

      openProject: async (projectId) => {
        set({ isLoading: true })
        try {
          // Try to fetch from backend first
          const response = await fetch(`/api/imageeditor/projects/${projectId}`, {
            credentials: 'include',
          })

          if (response.ok) {
            const data = await response.json()
            const project: ImageProject = {
              id: data.project_id,
              name: data.name,
              width: data.width,
              height: data.height,
              layers: data.project_data.layers || [],
              backgroundColor: data.project_data.backgroundColor || '#ffffff',
              createdAt: new Date(data.created_at).getTime(),
              updatedAt: new Date(data.updated_at).getTime(),
            }

            const { projectZoomLevels } = get()
            const savedZoom = projectZoomLevels[project.id] || 100

            set({
              currentProject: project,
              viewMode: 'editor',
              selectedLayerId: project.layers[0]?.id || null,
              history: [],
              historyIndex: -1,
              redoStack: [],
              isDirty: false,
              isLoading: false,
              panX: 0,
              panY: 0,
              zoom: savedZoom,
            })
          } else {
            // Fallback to local storage
            const { savedProjects, projectZoomLevels } = get()
            const project = savedProjects[projectId]
            if (project) {
              const savedZoom = projectZoomLevels[project.id] || 100

              set({
                currentProject: project,
                viewMode: 'editor',
                selectedLayerId: project.layers[0]?.id || null,
                history: [],
                historyIndex: -1,
                redoStack: [],
                isDirty: false,
                isLoading: false,
                panX: 0,
                panY: 0,
                zoom: savedZoom,
              })
            } else {
              set({ isLoading: false })
            }
          }
        } catch (error) {
          console.error('Failed to open project:', error)
          set({ isLoading: false })
        }
      },

      saveProject: async () => {
        const { currentProject, saveProjectToBackend } = get()
        if (!currentProject) return

        // Update locally first
        const updatedProject = {
          ...currentProject,
          updatedAt: Date.now(),
        }

        set((state) => ({
          currentProject: updatedProject,
          projects: state.projects.map((p) =>
            p.id === currentProject.id
              ? { ...p, updatedAt: Date.now() }
              : p
          ),
          savedProjects: {
            ...state.savedProjects,
            [currentProject.id]: updatedProject,
          },
          isDirty: false,
        }))

        // Save to backend
        await saveProjectToBackend()
      },

      saveProjectToBackend: async () => {
        const { currentProject, showToast } = get()
        if (!currentProject) return

        try {
          // Generate thumbnail
          const thumbnail = await generateThumbnail(currentProject)

          const response = await fetch('/api/imageeditor/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              project_id: currentProject.id,
              name: currentProject.name,
              width: currentProject.width,
              height: currentProject.height,
              project_data: {
                layers: currentProject.layers,
                backgroundColor: currentProject.backgroundColor,
              },
              thumbnail,
            }),
          })

          if (response.ok) {
            // Update project list with new thumbnail
            set((state) => ({
              projects: state.projects.map((p) =>
                p.id === currentProject.id
                  ? { ...p, thumbnailUrl: thumbnail, updatedAt: Date.now() }
                  : p
              ),
            }))
            showToast('Projekt gespeichert', 'success')
          } else {
            showToast('Fehler beim Speichern', 'error')
          }
        } catch (error) {
          console.error('Failed to save project to backend:', error)
          showToast('Fehler beim Speichern', 'error')
        }
      },

      loadProjectsFromBackend: async () => {
        set({ isLoading: true })
        try {
          const response = await fetch('/api/imageeditor/projects', {
            credentials: 'include',
          })

          if (response.ok) {
            const data = await response.json()
            const projects = data.map((p: { project_id: string; name: string; width: number; height: number; thumbnail: string; updated_at: string }) => ({
              id: p.project_id,
              name: p.name,
              updatedAt: new Date(p.updated_at).getTime(),
              thumbnailUrl: p.thumbnail || undefined,
            }))

            set({ projects, isLoading: false })
          } else {
            set({ isLoading: false })
          }
        } catch (error) {
          console.error('Failed to load projects from backend:', error)
          set({ isLoading: false })
        }
      },

      closeProject: () => {
        const { currentProject, saveProjectToBackend } = get()

        // Save current project to backend before closing
        if (currentProject) {
          saveProjectToBackend()
        }

        set({
          currentProject: null,
          viewMode: 'projects',
          selectedLayerId: null,
          history: [],
          historyIndex: -1,
          redoStack: [],
          filters: { ...DEFAULT_FILTERS },
          selection: { ...DEFAULT_SELECTION },
          crop: { ...DEFAULT_CROP },
        })
      },

      deleteProject: async (projectId) => {
        try {
          await fetch(`/api/imageeditor/projects/${projectId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        } catch (error) {
          console.error('Failed to delete project from backend:', error)
        }

        set((state) => {
          const { [projectId]: _, ...remainingSavedProjects } = state.savedProjects
          return {
            projects: state.projects.filter((p) => p.id !== projectId),
            savedProjects: remainingSavedProjects,
          }
        })
      },

      updateProjectName: (name) =>
        set((state) => ({
          currentProject: state.currentProject
            ? { ...state.currentProject, name, updatedAt: Date.now() }
            : null,
          projects: state.projects.map((p) =>
            p.id === state.currentProject?.id ? { ...p, name } : p
          ),
          isDirty: true,
        })),

      // Layer operations
      addLayer: (layerOrType, name) => {
        const { currentProject } = get()
        if (!currentProject) return

        // Check if first arg is a full Layer object or just a LayerType
        let newLayer: Layer
        if (typeof layerOrType === 'string') {
          // It's a LayerType
          const layerCount = currentProject.layers.length
          newLayer = createLayer(
            generateId(),
            name || `Layer ${layerCount + 1}`,
            layerOrType as LayerType,
            currentProject.width,
            currentProject.height
          )
        } else {
          // It's a full Layer object
          newLayer = layerOrType as Layer
        }

        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: [...state.currentProject.layers, newLayer],
                updatedAt: Date.now(),
              }
            : null,
          selectedLayerId: newLayer.id,
          isDirty: true,
        }))
      },

      deleteLayer: (layerId) => {
        const { currentProject, pushHistory, selectedLayerId } = get()
        if (!currentProject || currentProject.layers.length <= 1) return

        pushHistory('Delete Layer')

        const layerIndex = currentProject.layers.findIndex((l) => l.id === layerId)
        const newLayers = currentProject.layers.filter((l) => l.id !== layerId)
        const newSelectedId =
          selectedLayerId === layerId
            ? newLayers[Math.max(0, layerIndex - 1)]?.id || null
            : selectedLayerId

        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: newLayers,
                updatedAt: Date.now(),
              }
            : null,
          selectedLayerId: newSelectedId,
          isDirty: true,
        }))
      },

      duplicateLayer: (layerId) => {
        const { currentProject, pushHistory, showToast } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer) return

        pushHistory('Duplicate Layer')

        const newLayer: Layer = {
          ...layer,
          id: generateId(),
          name: `${layer.name} Copy`,
        }

        const layerIndex = currentProject.layers.findIndex((l) => l.id === layerId)

        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: [
                  ...state.currentProject.layers.slice(0, layerIndex + 1),
                  newLayer,
                  ...state.currentProject.layers.slice(layerIndex + 1),
                ],
                updatedAt: Date.now(),
              }
            : null,
          selectedLayerId: newLayer.id,
          isDirty: true,
        }))

        showToast('Layer duplicated', 'success')
      },

      selectLayer: (layerId) => set({ selectedLayerId: layerId }),

      reorderLayer: (layerId, newIndex) => {
        const { currentProject, pushHistory } = get()
        if (!currentProject) return

        const layers = [...currentProject.layers]
        const currentIndex = layers.findIndex((l) => l.id === layerId)
        if (currentIndex === -1 || newIndex === currentIndex) return

        pushHistory('Reorder Layer')

        const [layer] = layers.splice(currentIndex, 1)
        layers.splice(newIndex, 0, layer)

        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers,
                updatedAt: Date.now(),
              }
            : null,
          isDirty: true,
        }))
      },

      toggleLayerVisibility: (layerId) =>
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: state.currentProject.layers.map((l) =>
                  l.id === layerId ? { ...l, visible: !l.visible } : l
                ),
                updatedAt: Date.now(),
              }
            : null,
        })),

      toggleLayerLock: (layerId) =>
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: state.currentProject.layers.map((l) =>
                  l.id === layerId ? { ...l, locked: !l.locked } : l
                ),
                updatedAt: Date.now(),
              }
            : null,
        })),

      setLayerOpacity: (layerId, opacity) =>
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: state.currentProject.layers.map((l) =>
                  l.id === layerId ? { ...l, opacity: Math.max(0, Math.min(100, opacity)) } : l
                ),
                updatedAt: Date.now(),
              }
            : null,
          isDirty: true,
        })),

      setLayerBlendMode: (layerId, blendMode) =>
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: state.currentProject.layers.map((l) =>
                  l.id === layerId ? { ...l, blendMode } : l
                ),
                updatedAt: Date.now(),
              }
            : null,
          isDirty: true,
        })),

      updateLayerImage: (layerId, imageData) =>
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: state.currentProject.layers.map((l) =>
                  l.id === layerId ? { ...l, imageData } : l
                ),
                updatedAt: Date.now(),
              }
            : null,
          isDirty: true,
        })),

      updateLayerText: (layerId, text) =>
        set((state) => {
          if (!state.currentProject) return { currentProject: null, isDirty: true }

          const layer = state.currentProject.layers.find((l) => l.id === layerId)
          if (!layer) return state

          // Measure text to calculate new dimensions
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) return state

          const fontSize = layer.fontSize || 48
          const fontFamily = layer.fontFamily || 'Arial'
          const fontWeight = layer.fontWeight || 400

          ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`

          const lines = text.split('\n')
          let maxWidth = 0
          for (const line of lines) {
            const metrics = ctx.measureText(line)
            maxWidth = Math.max(maxWidth, metrics.width)
          }

          // Extra padding for effects (shadow, glow, outline)
          const effectPadding = 40
          const newWidth = Math.max(100, Math.ceil(maxWidth) + effectPadding)
          const newHeight = Math.max(50, Math.ceil(fontSize * 1.3 * lines.length) + effectPadding)

          return {
            currentProject: {
              ...state.currentProject,
              layers: state.currentProject.layers.map((l) =>
                l.id === layerId
                  ? {
                      ...l,
                      text,
                      width: newWidth,
                      height: newHeight,
                      name: `Text: ${text.slice(0, 15)}${text.length > 15 ? '...' : ''}`,
                    }
                  : l
              ),
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        }),

      updateLayerTextProperties: (layerId, props) =>
        set((state) => {
          if (!state.currentProject) return { currentProject: null, isDirty: true }

          const layer = state.currentProject.layers.find((l) => l.id === layerId)
          if (!layer || layer.type !== 'text') return state

          // Only recalculate dimensions if fontSize or fontFamily changed
          const needsResize = props.fontSize !== undefined || props.fontFamily !== undefined

          let newWidth = layer.width
          let newHeight = layer.height

          if (needsResize) {
            const fontSize = props.fontSize ?? layer.fontSize ?? 48
            const fontFamily = props.fontFamily ?? layer.fontFamily ?? 'Arial'
            const fontWeight = props.fontWeight ?? layer.fontWeight ?? 400
            const text = layer.text || ''

            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`

              const lines = text.split('\n')
              let maxWidth = 0
              for (const line of lines) {
                const metrics = ctx.measureText(line)
                maxWidth = Math.max(maxWidth, metrics.width)
              }

              const effectPadding = 40
              newWidth = Math.max(100, Math.ceil(maxWidth) + effectPadding)
              newHeight = Math.max(50, Math.ceil(fontSize * 1.3 * lines.length) + effectPadding)
            }
          }

          return {
            currentProject: {
              ...state.currentProject,
              layers: state.currentProject.layers.map((l) =>
                l.id === layerId
                  ? {
                      ...l,
                      ...props,
                      width: newWidth,
                      height: newHeight,
                    }
                  : l
              ),
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        }),

      updateLayerTextEffects: (layerId, textEffects) =>
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: state.currentProject.layers.map((l) =>
                  l.id === layerId ? { ...l, textEffects } : l
                ),
                updatedAt: Date.now(),
              }
            : null,
          isDirty: true,
        })),

      updateLayerEffects: (layerId, layerEffects) =>
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: state.currentProject.layers.map((l) =>
                  l.id === layerId ? { ...l, layerEffects } : l
                ),
                updatedAt: Date.now(),
              }
            : null,
          isDirty: true,
        })),

      setLayerPosition: (layerId, x, y) =>
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: state.currentProject.layers.map((l) =>
                  l.id === layerId ? { ...l, x, y } : l
                ),
                updatedAt: Date.now(),
              }
            : null,
          isDirty: true,
        })),

      resizeLayer: (layerId, width, height) =>
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: state.currentProject.layers.map((l) =>
                  l.id === layerId ? { ...l, width: Math.max(1, width), height: Math.max(1, height) } : l
                ),
                updatedAt: Date.now(),
              }
            : null,
          isDirty: true,
        })),

      setLayerTransform: (layerId, x, y, width, height) =>
        set((state) => {
          if (!state.currentProject) return { currentProject: null }

          const layer = state.currentProject.layers.find((l) => l.id === layerId)
          if (!layer) return {}

          // For text layers, scale fontSize proportionally
          let newFontSize = layer.fontSize
          if (layer.type === 'text' && layer.fontSize && layer.height > 0) {
            const scaleFactor = height / layer.height
            newFontSize = Math.max(8, Math.round(layer.fontSize * scaleFactor))
          }

          return {
            currentProject: {
              ...state.currentProject,
              layers: state.currentProject.layers.map((l) =>
                l.id === layerId
                  ? {
                      ...l,
                      x,
                      y,
                      width: Math.max(1, width),
                      height: Math.max(1, height),
                      ...(l.type === 'text' ? { fontSize: newFontSize } : {}),
                    }
                  : l
              ),
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        }),

      renameLayer: (layerId, name) =>
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: state.currentProject.layers.map((l) =>
                  l.id === layerId ? { ...l, name } : l
                ),
                updatedAt: Date.now(),
              }
            : null,
          isDirty: true,
        })),

      rotateLayer: (layerId, degrees) => {
        const { currentProject, pushHistory } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer || layer.locked) return

        pushHistory('Rotate')

        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: state.currentProject.layers.map((l) =>
                  l.id === layerId ? { ...l, rotation: (l.rotation + degrees) % 360 } : l
                ),
                updatedAt: Date.now(),
              }
            : null,
          isDirty: true,
        }))
      },

      flipLayerHorizontal: (layerId) => {
        const { currentProject, pushHistory } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer || layer.locked || !layer.imageData) return

        pushHistory('Flip Horizontal')

        // Create flipped image
        const canvas = document.createElement('canvas')
        canvas.width = layer.width
        canvas.height = layer.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const img = new Image()
        img.onload = () => {
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(img, 0, 0)

          set((state) => ({
            currentProject: state.currentProject
              ? {
                  ...state.currentProject,
                  layers: state.currentProject.layers.map((l) =>
                    l.id === layerId ? { ...l, imageData: canvas.toDataURL('image/png') } : l
                  ),
                  updatedAt: Date.now(),
                }
              : null,
            isDirty: true,
          }))
        }
        img.src = layer.imageData
      },

      flipLayerVertical: (layerId) => {
        const { currentProject, pushHistory } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer || layer.locked || !layer.imageData) return

        pushHistory('Flip Vertical')

        // Create flipped image
        const canvas = document.createElement('canvas')
        canvas.width = layer.width
        canvas.height = layer.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const img = new Image()
        img.onload = () => {
          ctx.translate(0, canvas.height)
          ctx.scale(1, -1)
          ctx.drawImage(img, 0, 0)

          set((state) => ({
            currentProject: state.currentProject
              ? {
                  ...state.currentProject,
                  layers: state.currentProject.layers.map((l) =>
                    l.id === layerId ? { ...l, imageData: canvas.toDataURL('image/png') } : l
                  ),
                  updatedAt: Date.now(),
                }
              : null,
            isDirty: true,
          }))
        }
        img.src = layer.imageData
      },

      mergeLayerDown: (layerId) => {
        const { currentProject, pushHistory, selectedLayerId, showToast } = get()
        if (!currentProject) return

        const layerIndex = currentProject.layers.findIndex((l) => l.id === layerId)
        if (layerIndex <= 0) return // Can't merge first layer

        const topLayer = currentProject.layers[layerIndex]
        const bottomLayer = currentProject.layers[layerIndex - 1]

        if (bottomLayer.locked) return // Can't merge into locked layer

        pushHistory('Merge Down')

        // Create a canvas to composite the layers
        const canvas = document.createElement('canvas')
        canvas.width = currentProject.width
        canvas.height = currentProject.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Draw bottom layer first
        if (bottomLayer.imageData) {
          const bottomImg = new Image()
          bottomImg.src = bottomLayer.imageData
          ctx.save()
          ctx.globalAlpha = bottomLayer.opacity / 100
          ctx.globalCompositeOperation = bottomLayer.blendMode as GlobalCompositeOperation
          ctx.translate(bottomLayer.x + bottomLayer.width / 2, bottomLayer.y + bottomLayer.height / 2)
          ctx.rotate((bottomLayer.rotation * Math.PI) / 180)
          ctx.drawImage(bottomImg, -bottomLayer.width / 2, -bottomLayer.height / 2)
          ctx.restore()
        }

        // Draw top layer on top
        if (topLayer.imageData) {
          const topImg = new Image()
          topImg.src = topLayer.imageData
          ctx.save()
          ctx.globalAlpha = topLayer.opacity / 100
          ctx.globalCompositeOperation = topLayer.blendMode as GlobalCompositeOperation
          ctx.translate(topLayer.x + topLayer.width / 2, topLayer.y + topLayer.height / 2)
          ctx.rotate((topLayer.rotation * Math.PI) / 180)
          ctx.drawImage(topImg, -topLayer.width / 2, -topLayer.height / 2)
          ctx.restore()
        }

        const mergedImageData = canvas.toDataURL('image/png')

        // Update the bottom layer with merged content and remove top layer
        const newLayers = currentProject.layers.filter((l) => l.id !== layerId)
        const bottomLayerIndex = newLayers.findIndex((l) => l.id === bottomLayer.id)
        newLayers[bottomLayerIndex] = {
          ...bottomLayer,
          imageData: mergedImageData,
          opacity: 100,
          blendMode: 'normal',
          x: 0,
          y: 0,
          width: currentProject.width,
          height: currentProject.height,
          rotation: 0,
        }

        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: newLayers,
                updatedAt: Date.now(),
              }
            : null,
          selectedLayerId: selectedLayerId === layerId ? bottomLayer.id : selectedLayerId,
          isDirty: true,
        }))

        showToast('Layers merged', 'success')
      },

      flattenLayers: () => {
        const { currentProject, pushHistory, showToast } = get()
        if (!currentProject) return
        if (currentProject.layers.length <= 1) return // Nothing to flatten

        pushHistory('Flatten')

        // Create a canvas to composite all layers
        const canvas = document.createElement('canvas')
        canvas.width = currentProject.width
        canvas.height = currentProject.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Fill with background color
        ctx.fillStyle = currentProject.backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw all visible layers in order
        currentProject.layers.forEach((layer) => {
          if (!layer.visible || !layer.imageData) return

          const img = new Image()
          img.src = layer.imageData

          ctx.save()
          ctx.globalAlpha = layer.opacity / 100
          ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation
          ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2)
          ctx.rotate((layer.rotation * Math.PI) / 180)
          ctx.drawImage(img, -layer.width / 2, -layer.height / 2)
          ctx.restore()
        })

        const flattenedImageData = canvas.toDataURL('image/png')

        // Create a single flattened layer
        const flattenedLayer: Layer = {
          id: generateId(),
          name: 'Flattened',
          type: 'image',
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'normal',
          x: 0,
          y: 0,
          width: currentProject.width,
          height: currentProject.height,
          rotation: 0,
          imageData: flattenedImageData,
        }

        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: [flattenedLayer],
                updatedAt: Date.now(),
              }
            : null,
          selectedLayerId: flattenedLayer.id,
          isDirty: true,
        }))

        showToast('All layers flattened', 'success')
      },

      // Image import
      importImage: async (file) => {
        const { newProject, pushHistory } = get()

        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
              // Create new project with image dimensions
              newProject(file.name.replace(/\.[^/.]+$/, ''), img.width, img.height)

              // Update the background layer with the image
              const canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(img, 0, 0)
                const imageData = canvas.toDataURL('image/png')

                set((state) => ({
                  currentProject: state.currentProject
                    ? {
                        ...state.currentProject,
                        layers: state.currentProject.layers.map((l, i) =>
                          i === 0 ? { ...l, imageData, name: file.name } : l
                        ),
                      }
                    : null,
                }))

                // Auto-save to backend after import
                setTimeout(() => {
                  get().saveProjectToBackend()
                }, 100)
              }
              resolve()
            }
            img.onerror = reject
            img.src = e.target?.result as string
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      },

      importImageToLayer: async (file, layerId) => {
        const { currentProject, pushHistory } = get()
        if (!currentProject) return

        pushHistory('Import Image')

        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
              const canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(img, 0, 0)
                const imageData = canvas.toDataURL('image/png')

                set((state) => ({
                  currentProject: state.currentProject
                    ? {
                        ...state.currentProject,
                        layers: state.currentProject.layers.map((l) =>
                          l.id === layerId
                            ? { ...l, imageData, width: img.width, height: img.height }
                            : l
                        ),
                        updatedAt: Date.now(),
                      }
                    : null,
                  isDirty: true,
                }))

                // Auto-save to backend after import
                setTimeout(() => {
                  get().saveProjectToBackend()
                }, 100)
              }
              resolve()
            }
            img.onerror = reject
            img.src = e.target?.result as string
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      },

      addImageAsLayer: async (file) => {
        const { currentProject, pushHistory } = get()
        if (!currentProject) return

        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
              pushHistory('Add Image Layer')

              const canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(img, 0, 0)
                const imageData = canvas.toDataURL('image/png')

                const newLayer: Layer = {
                  id: generateId(),
                  name: file.name.replace(/\.[^/.]+$/, ''),
                  type: 'image',
                  visible: true,
                  locked: false,
                  opacity: 100,
                  blendMode: 'normal',
                  x: 0,
                  y: 0,
                  width: img.width,
                  height: img.height,
                  rotation: 0,
                  imageData,
                }

                set((state) => ({
                  currentProject: state.currentProject
                    ? {
                        ...state.currentProject,
                        layers: [...state.currentProject.layers, newLayer],
                        updatedAt: Date.now(),
                      }
                    : null,
                  selectedLayerId: newLayer.id,
                  isDirty: true,
                }))

                // Auto-save to backend after adding image layer
                setTimeout(() => {
                  get().saveProjectToBackend()
                }, 100)
              }
              resolve()
            }
            img.onerror = reject
            img.src = e.target?.result as string
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      },

      addShapeAsLayer: (name, imageData, width, height) => {
        const { currentProject, pushHistory } = get()
        if (!currentProject) return

        pushHistory('Add Shape')

        const newLayer: Layer = {
          id: generateId(),
          name,
          type: 'shape',
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'normal',
          x: Math.floor((currentProject.width - width) / 2),
          y: Math.floor((currentProject.height - height) / 2),
          width,
          height,
          rotation: 0,
          imageData,
        }

        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: [...state.currentProject.layers, newLayer],
                updatedAt: Date.now(),
              }
            : null,
          selectedLayerId: newLayer.id,
          isDirty: true,
        }))
      },

      // Trim layer - remove transparent areas with padding for effects
      trimLayer: (layerId, effectPadding = 30) => {
        const { currentProject, pushHistory } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer || !layer.imageData) return

        // Load the image and analyze pixel data
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // Find bounding box of non-transparent pixels
          let minX = canvas.width
          let minY = canvas.height
          let maxX = 0
          let maxY = 0
          let hasContent = false

          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const alpha = data[(y * canvas.width + x) * 4 + 3]
              if (alpha > 10) { // Threshold for "not transparent"
                hasContent = true
                minX = Math.min(minX, x)
                minY = Math.min(minY, y)
                maxX = Math.max(maxX, x)
                maxY = Math.max(maxY, y)
              }
            }
          }

          if (!hasContent) return // Layer is fully transparent

          // Add padding for effects (blur, shadow, glow)
          minX = Math.max(0, minX - effectPadding)
          minY = Math.max(0, minY - effectPadding)
          maxX = Math.min(canvas.width - 1, maxX + effectPadding)
          maxY = Math.min(canvas.height - 1, maxY + effectPadding)

          const newWidth = maxX - minX + 1
          const newHeight = maxY - minY + 1

          // Skip if trimming wouldn't save much space
          if (newWidth >= canvas.width * 0.9 && newHeight >= canvas.height * 0.9) {
            return
          }

          // Create new cropped canvas
          const croppedCanvas = document.createElement('canvas')
          croppedCanvas.width = newWidth
          croppedCanvas.height = newHeight
          const croppedCtx = croppedCanvas.getContext('2d')
          if (!croppedCtx) return

          croppedCtx.drawImage(
            canvas,
            minX, minY, newWidth, newHeight,
            0, 0, newWidth, newHeight
          )

          pushHistory('Trim Layer')

          // Update layer with new position, size, and image data
          set((state) => ({
            currentProject: state.currentProject
              ? {
                  ...state.currentProject,
                  layers: state.currentProject.layers.map((l) =>
                    l.id === layerId
                      ? {
                          ...l,
                          x: l.x + minX,
                          y: l.y + minY,
                          width: newWidth,
                          height: newHeight,
                          imageData: croppedCanvas.toDataURL('image/png'),
                        }
                      : l
                  ),
                  updatedAt: Date.now(),
                }
              : null,
            isDirty: true,
          }))
        }
        img.src = layer.imageData
      },

      // Background removal
      removeBackground: async (layerId) => {
        const { currentProject, pushHistory, showToast } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer || !layer.imageData) {
          showToast('No image data to process', 'error')
          return
        }

        set({ isRemovingBackground: true })
        showToast('Removing background... This may take a moment', 'info')

        try {
          // Dynamic import to avoid loading the large library until needed
          const { removeBackground: removeBg } = await import('@imgly/background-removal')

          // Convert data URL to blob
          const response = await fetch(layer.imageData)
          const blob = await response.blob()

          // Remove background with proper configuration
          const resultBlob = await removeBg(blob, {
            output: {
              format: 'image/png',
              quality: 1,
            },
            progress: (key, current, total) => {
              console.log(`Background removal: ${key} ${Math.round((current / total) * 100)}%`)
            },
          })

          // Convert result back to data URL
          const reader = new FileReader()
          const resultDataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(resultBlob)
          })

          pushHistory('Remove Background')

          // Update the layer with the new image
          set((state) => ({
            currentProject: state.currentProject
              ? {
                  ...state.currentProject,
                  layers: state.currentProject.layers.map((l) =>
                    l.id === layerId
                      ? { ...l, imageData: resultDataUrl }
                      : l
                  ),
                  updatedAt: Date.now(),
                }
              : null,
            isRemovingBackground: false,
            isDirty: true,
          }))

          showToast('Background removed successfully', 'success')
        } catch (error) {
          console.error('Background removal failed:', error)
          set({ isRemovingBackground: false })
          showToast('Failed to remove background', 'error')
        }
      },

      // Auto-enhance image
      autoEnhance: async (layerId) => {
        const { currentProject, pushHistory, showToast } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer || !layer.imageData) {
          showToast('No image data to enhance', 'error')
          return
        }

        set({ isAutoEnhancing: true })
        showToast('Enhancing image...', 'info')

        try {
          // Load the image
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = reject
            img.src = layer.imageData!
          })

          // Create canvas for processing
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Failed to get canvas context')

          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // Analyze image statistics
          let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0
          let totalBrightness = 0
          let totalSaturation = 0
          let pixelCount = data.length / 4

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]

            minR = Math.min(minR, r)
            maxR = Math.max(maxR, r)
            minG = Math.min(minG, g)
            maxG = Math.max(maxG, g)
            minB = Math.min(minB, b)
            maxB = Math.max(maxB, b)

            // Calculate brightness (luminance)
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255
            totalBrightness += brightness

            // Calculate saturation
            const max = Math.max(r, g, b)
            const min = Math.min(r, g, b)
            const saturation = max === 0 ? 0 : (max - min) / max
            totalSaturation += saturation
          }

          const avgBrightness = totalBrightness / pixelCount
          const avgSaturation = totalSaturation / pixelCount

          // Calculate auto-levels stretch factors
          const rangeR = maxR - minR || 1
          const rangeG = maxG - minG || 1
          const rangeB = maxB - minB || 1

          // Apply enhancements
          for (let i = 0; i < data.length; i += 4) {
            let r = data[i]
            let g = data[i + 1]
            let b = data[i + 2]

            // 1. Auto-levels (stretch histogram)
            r = Math.round(((r - minR) / rangeR) * 255)
            g = Math.round(((g - minG) / rangeG) * 255)
            b = Math.round(((b - minB) / rangeB) * 255)

            // 2. Brightness adjustment (if image is too dark or bright)
            const brightnessAdjust = avgBrightness < 0.4 ? 20 : avgBrightness > 0.6 ? -10 : 0
            r = Math.min(255, Math.max(0, r + brightnessAdjust))
            g = Math.min(255, Math.max(0, g + brightnessAdjust))
            b = Math.min(255, Math.max(0, b + brightnessAdjust))

            // 3. Contrast enhancement
            const contrastFactor = 1.1
            r = Math.min(255, Math.max(0, Math.round((r - 128) * contrastFactor + 128)))
            g = Math.min(255, Math.max(0, Math.round((g - 128) * contrastFactor + 128)))
            b = Math.min(255, Math.max(0, Math.round((b - 128) * contrastFactor + 128)))

            // 4. Saturation boost (if undersaturated)
            if (avgSaturation < 0.3) {
              const gray = 0.299 * r + 0.587 * g + 0.114 * b
              const satBoost = 1.15
              r = Math.min(255, Math.max(0, Math.round(gray + (r - gray) * satBoost)))
              g = Math.min(255, Math.max(0, Math.round(gray + (g - gray) * satBoost)))
              b = Math.min(255, Math.max(0, Math.round(gray + (b - gray) * satBoost)))
            }

            data[i] = r
            data[i + 1] = g
            data[i + 2] = b
          }

          ctx.putImageData(imageData, 0, 0)

          // Apply subtle sharpening using convolution
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = canvas.width
          tempCanvas.height = canvas.height
          const tempCtx = tempCanvas.getContext('2d')
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0)
            // Simple sharpening by drawing slightly smaller and larger
            ctx.globalAlpha = 0.15
            ctx.drawImage(tempCanvas, -1, -1, canvas.width + 2, canvas.height + 2)
            ctx.globalAlpha = 1
          }

          pushHistory('Auto Enhance')

          const enhancedImageData = canvas.toDataURL('image/png')

          set((state) => ({
            currentProject: state.currentProject
              ? {
                  ...state.currentProject,
                  layers: state.currentProject.layers.map((l) =>
                    l.id === layerId ? { ...l, imageData: enhancedImageData } : l
                  ),
                  updatedAt: Date.now(),
                }
              : null,
            isAutoEnhancing: false,
            isDirty: true,
          }))

          showToast('Image enhanced successfully', 'success')
        } catch (error) {
          console.error('Auto-enhance failed:', error)
          set({ isAutoEnhancing: false })
          showToast('Failed to enhance image', 'error')
        }
      },

      // Add gradient background layer
      addBackgroundGradient: (gradient) => {
        const { currentProject, pushHistory, showToast } = get()
        if (!currentProject) return

        pushHistory('Add Gradient Background')

        const canvas = document.createElement('canvas')
        canvas.width = currentProject.width
        canvas.height = currentProject.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let grad: CanvasGradient
        const angle = gradient.angle || 0
        const angleRad = (angle * Math.PI) / 180

        if (gradient.type === 'linear') {
          // Calculate gradient start/end points based on angle
          const centerX = canvas.width / 2
          const centerY = canvas.height / 2
          const length = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) / 2

          const x1 = centerX - Math.cos(angleRad) * length
          const y1 = centerY - Math.sin(angleRad) * length
          const x2 = centerX + Math.cos(angleRad) * length
          const y2 = centerY + Math.sin(angleRad) * length

          grad = ctx.createLinearGradient(x1, y1, x2, y2)
        } else {
          grad = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            0,
            canvas.width / 2,
            canvas.height / 2,
            Math.max(canvas.width, canvas.height) / 2
          )
        }

        grad.addColorStop(0, gradient.startColor)
        grad.addColorStop(1, gradient.endColor)

        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const imageData = canvas.toDataURL('image/png')

        const newLayer: Layer = {
          id: generateId(),
          name: `Gradient ${gradient.type}`,
          type: 'image',
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'normal',
          x: 0,
          y: 0,
          width: currentProject.width,
          height: currentProject.height,
          rotation: 0,
          imageData,
        }

        // Insert at the bottom (index 0) so it's behind other layers
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: [newLayer, ...state.currentProject.layers],
                updatedAt: Date.now(),
              }
            : null,
          selectedLayerId: newLayer.id,
          isDirty: true,
        }))

        showToast('Gradient background added', 'success')
      },

      // Add pattern background layer
      addBackgroundPattern: (patternType, colors) => {
        const { currentProject, pushHistory, showToast } = get()
        if (!currentProject) return

        pushHistory('Add Pattern Background')

        const canvas = document.createElement('canvas')
        canvas.width = currentProject.width
        canvas.height = currentProject.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const [color1, color2] = colors

        switch (patternType) {
          case 'stripes': {
            const stripeWidth = 20
            for (let x = 0; x < canvas.width + canvas.height; x += stripeWidth * 2) {
              ctx.fillStyle = color1
              ctx.beginPath()
              ctx.moveTo(x, 0)
              ctx.lineTo(x + stripeWidth, 0)
              ctx.lineTo(x + stripeWidth - canvas.height, canvas.height)
              ctx.lineTo(x - canvas.height, canvas.height)
              ctx.closePath()
              ctx.fill()

              ctx.fillStyle = color2
              ctx.beginPath()
              ctx.moveTo(x + stripeWidth, 0)
              ctx.lineTo(x + stripeWidth * 2, 0)
              ctx.lineTo(x + stripeWidth * 2 - canvas.height, canvas.height)
              ctx.lineTo(x + stripeWidth - canvas.height, canvas.height)
              ctx.closePath()
              ctx.fill()
            }
            break
          }
          case 'dots': {
            ctx.fillStyle = color1
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = color2
            const dotRadius = 8
            const spacing = 30
            for (let y = 0; y < canvas.height + spacing; y += spacing) {
              for (let x = 0; x < canvas.width + spacing; x += spacing) {
                ctx.beginPath()
                ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
                ctx.fill()
              }
            }
            break
          }
          case 'checkerboard': {
            const size = 40
            for (let y = 0; y < canvas.height; y += size) {
              for (let x = 0; x < canvas.width; x += size) {
                ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? color1 : color2
                ctx.fillRect(x, y, size, size)
              }
            }
            break
          }
          case 'waves': {
            ctx.fillStyle = color1
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.strokeStyle = color2
            ctx.lineWidth = 3
            const amplitude = 20
            const frequency = 0.02
            for (let y = -amplitude; y < canvas.height + amplitude * 2; y += 30) {
              ctx.beginPath()
              for (let x = 0; x <= canvas.width; x += 5) {
                const waveY = y + Math.sin(x * frequency) * amplitude
                if (x === 0) ctx.moveTo(x, waveY)
                else ctx.lineTo(x, waveY)
              }
              ctx.stroke()
            }
            break
          }
          case 'grid': {
            ctx.fillStyle = color1
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.strokeStyle = color2
            ctx.lineWidth = 1
            const gridSize = 30
            for (let x = 0; x < canvas.width; x += gridSize) {
              ctx.beginPath()
              ctx.moveTo(x, 0)
              ctx.lineTo(x, canvas.height)
              ctx.stroke()
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
              ctx.beginPath()
              ctx.moveTo(0, y)
              ctx.lineTo(canvas.width, y)
              ctx.stroke()
            }
            break
          }
          default:
            ctx.fillStyle = color1
            ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        const imageData = canvas.toDataURL('image/png')

        const newLayer: Layer = {
          id: generateId(),
          name: `Pattern ${patternType}`,
          type: 'image',
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'normal',
          x: 0,
          y: 0,
          width: currentProject.width,
          height: currentProject.height,
          rotation: 0,
          imageData,
        }

        // Insert at the bottom
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                layers: [newLayer, ...state.currentProject.layers],
                updatedAt: Date.now(),
              }
            : null,
          selectedLayerId: newLayer.id,
          isDirty: true,
        }))

        showToast('Pattern background added', 'success')
      },

      // AI Image Generation
      generateAIImage: async (prompt) => {
        const { currentProject, pushHistory, showToast } = get()
        if (!currentProject) return

        set({ isGeneratingImage: true })
        showToast('Generating AI image...', 'info')

        try {
          // Import AI store to get API key and model
          const { useAIStore } = await import('@/stores/aiStore')
          const aiState = useAIStore.getState()

          // Fetch user API key if not already loaded
          let apiKey = aiState.userApiKey
          if (!apiKey) {
            apiKey = await aiState.fetchUserApiKey()
          }

          if (!apiKey) {
            throw new Error('No API key configured')
          }

          const imageModel = aiState.imageModel || 'google/gemini-2.0-flash-001:image-generation'

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'Canwa Image Editor'
            },
            body: JSON.stringify({
              model: imageModel,
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ]
            })
          })

          if (!response.ok) {
            const error = await response.text()
            throw new Error(`API error: ${error}`)
          }

          const data = await response.json()
          console.log('AI Image Generation Response:', JSON.stringify(data, null, 2))

          // Extract image from response - handle various formats
          let imageData: string | null = null
          const message = data.choices?.[0]?.message
          const content = message?.content

          // Format 1: Images array in message (Gemini via OpenRouter)
          if (message?.images && Array.isArray(message.images)) {
            for (const img of message.images) {
              if (img.type === 'image_url' && img.image_url?.url) {
                imageData = img.image_url.url
                break
              }
              if (img.url) {
                imageData = img.url
                break
              }
            }
          }

          // Format 2: Content is array with image parts (OpenAI/Gemini style)
          if (!imageData && Array.isArray(content)) {
            for (const part of content) {
              // image_url format
              if (part.type === 'image_url' && part.image_url?.url) {
                imageData = part.image_url.url
                break
              }
              // inline_data format (Gemini)
              if (part.type === 'image' && part.source?.data) {
                const mimeType = part.source.media_type || 'image/png'
                imageData = `data:${mimeType};base64,${part.source.data}`
                break
              }
              // Another inline format
              if (part.inline_data?.data) {
                const mimeType = part.inline_data.mime_type || 'image/png'
                imageData = `data:${mimeType};base64,${part.inline_data.data}`
                break
              }
            }
          }

          // Format 2: Content is string with base64 data URL
          if (!imageData && content && typeof content === 'string') {
            const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/)
            if (base64Match) {
              imageData = base64Match[0]
            }
            // Check for markdown image with URL
            const mdImageMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)
            if (!imageData && mdImageMatch) {
              imageData = mdImageMatch[1]
            }
          }

          // Format 3: Direct URL in data field (some providers)
          if (!imageData && data.data?.[0]?.url) {
            imageData = data.data[0].url
          }
          if (!imageData && data.data?.[0]?.b64_json) {
            imageData = `data:image/png;base64,${data.data[0].b64_json}`
          }

          // Format 4: Image URL in message (DALL-E style via OpenRouter)
          if (!imageData && message?.image_url) {
            imageData = message.image_url
          }

          // Format 5: Tool call with image result
          if (!imageData && message?.tool_calls) {
            for (const toolCall of message.tool_calls) {
              if (toolCall.function?.name === 'generate_image') {
                const args = JSON.parse(toolCall.function.arguments || '{}')
                if (args.url) imageData = args.url
                if (args.image) imageData = args.image
              }
            }
          }

          if (!imageData) {
            console.error('Could not extract image from response. Full response:', data)
            throw new Error('No image generated in response. Check console for details.')
          }

          // If it's a URL (not base64), fetch and convert to base64
          if (imageData.startsWith('http')) {
            showToast('Downloading generated image...', 'info')
            const imgResponse = await fetch(imageData)
            const blob = await imgResponse.blob()
            imageData = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
          }

          pushHistory('AI Generate Image')

          // Create a new layer with the generated image
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = reject
            img.src = imageData!
          })

          const newLayer: Layer = {
            id: generateId(),
            name: `AI: ${prompt.slice(0, 20)}...`,
            type: 'image',
            visible: true,
            locked: false,
            opacity: 100,
            blendMode: 'normal',
            x: Math.floor((currentProject.width - img.width) / 2),
            y: Math.floor((currentProject.height - img.height) / 2),
            width: img.width,
            height: img.height,
            rotation: 0,
            imageData,
          }

          set((state) => ({
            currentProject: state.currentProject
              ? {
                  ...state.currentProject,
                  layers: [...state.currentProject.layers, newLayer],
                  updatedAt: Date.now(),
                }
              : null,
            selectedLayerId: newLayer.id,
            isGeneratingImage: false,
            isDirty: true,
          }))

          // Immediately save to backend after AI generation (costs money!)
          await get().saveProjectToBackend()

          showToast('AI image generated and saved', 'success')
        } catch (error) {
          console.error('AI image generation failed:', error)
          set({ isGeneratingImage: false })
          showToast('Failed to generate image', 'error')
        }
      },

      // AI Image Editing - modify existing image with AI
      editImageWithAI: async (layerId, prompt) => {
        const { currentProject, pushHistory, showToast } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer || !layer.imageData) {
          showToast('Kein Bild zum Bearbeiten gefunden', 'error')
          return
        }

        set({ isEditingImage: true })
        showToast('Bild wird mit KI bearbeitet...', 'info')

        try {
          // Import AI store to get API key and model
          const { useAIStore } = await import('@/stores/aiStore')
          const aiState = useAIStore.getState()

          // Fetch user API key if not already loaded
          let apiKey = aiState.userApiKey
          if (!apiKey) {
            apiKey = await aiState.fetchUserApiKey()
          }

          if (!apiKey) {
            throw new Error('Kein API-Schlüssel konfiguriert')
          }

          // Use a model that supports image input/output (Gemini 2.0 Flash for image editing)
          const imageModel = aiState.imageModel || 'google/gemini-2.0-flash-001:image-generation'

          // Send the current image with the edit prompt
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'Canwa Image Editor'
            },
            body: JSON.stringify({
              model: imageModel,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image_url',
                      image_url: {
                        url: layer.imageData
                      }
                    },
                    {
                      type: 'text',
                      text: `Edit this image: ${prompt}. Return only the edited image.`
                    }
                  ]
                }
              ]
            })
          })

          if (!response.ok) {
            const error = await response.text()
            throw new Error(`API error: ${error}`)
          }

          const data = await response.json()
          console.log('AI Image Edit Response:', JSON.stringify(data, null, 2))

          // Extract image from response - handle various formats (same as generateAIImage)
          let imageData: string | null = null
          const message = data.choices?.[0]?.message
          const content = message?.content

          // Format 1: Images array in message (Gemini via OpenRouter)
          if (message?.images && Array.isArray(message.images)) {
            for (const img of message.images) {
              if (img.type === 'image_url' && img.image_url?.url) {
                imageData = img.image_url.url
                break
              }
              if (img.url) {
                imageData = img.url
                break
              }
            }
          }

          // Format 2: Content is array with image parts
          if (!imageData && Array.isArray(content)) {
            for (const part of content) {
              if (part.type === 'image_url' && part.image_url?.url) {
                imageData = part.image_url.url
                break
              }
              if (part.type === 'image' && part.source?.data) {
                const mimeType = part.source.media_type || 'image/png'
                imageData = `data:${mimeType};base64,${part.source.data}`
                break
              }
              if (part.inline_data?.data) {
                const mimeType = part.inline_data.mime_type || 'image/png'
                imageData = `data:${mimeType};base64,${part.inline_data.data}`
                break
              }
            }
          }

          // Format 3: Content is string with base64 data URL
          if (!imageData && content && typeof content === 'string') {
            const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/)
            if (base64Match) {
              imageData = base64Match[0]
            }
            const mdImageMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)
            if (!imageData && mdImageMatch) {
              imageData = mdImageMatch[1]
            }
          }

          // Format 4: Direct URL in data field
          if (!imageData && data.data?.[0]?.url) {
            imageData = data.data[0].url
          }
          if (!imageData && data.data?.[0]?.b64_json) {
            imageData = `data:image/png;base64,${data.data[0].b64_json}`
          }

          // Format 5: Image URL in message
          if (!imageData && message?.image_url) {
            imageData = message.image_url
          }

          if (!imageData) {
            console.error('Could not extract edited image from response. Full response:', data)
            throw new Error('Kein bearbeitetes Bild in der Antwort. Prüfe die Konsole für Details.')
          }

          // If it's a URL (not base64), fetch and convert to base64
          if (imageData.startsWith('http')) {
            showToast('Bearbeitetes Bild wird heruntergeladen...', 'info')
            const imgResponse = await fetch(imageData)
            const blob = await imgResponse.blob()
            imageData = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
          }

          pushHistory('AI Edit Image')

          // Load the new image to get dimensions
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = reject
            img.src = imageData!
          })

          // Create a new layer with the edited image (don't replace original)
          const newLayer: Layer = {
            id: generateId(),
            name: `AI Edit: ${prompt.slice(0, 15)}...`,
            type: 'image',
            visible: true,
            locked: false,
            opacity: 100,
            blendMode: 'normal',
            x: layer.x,
            y: layer.y,
            width: img.width,
            height: img.height,
            rotation: 0,
            imageData,
          }

          set((state) => ({
            currentProject: state.currentProject
              ? {
                  ...state.currentProject,
                  layers: [...state.currentProject.layers, newLayer],
                  updatedAt: Date.now(),
                }
              : null,
            selectedLayerId: newLayer.id,
            isEditingImage: false,
            isDirty: true,
          }))

          // Immediately save to backend after AI edit (costs money!)
          await get().saveProjectToBackend()

          showToast('Bild mit KI bearbeitet und gespeichert', 'success')
        } catch (error) {
          console.error('AI image edit failed:', error)
          set({ isEditingImage: false })
          showToast('Bearbeitung fehlgeschlagen', 'error')
        }
      },

      // AI Context-Aware Layer Editing - Two-step process:
      // 1. Analysis LLM analyzes composite + layer to generate detailed prompt
      // 2. Image generation model creates new layer based on that prompt
      editLayerWithContext: async (layerId, instruction) => {
        const { currentProject, pushHistory, showToast, generateAIImage } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer || !layer.imageData) {
          showToast('Keine Ebene mit Bilddaten ausgewählt', 'error')
          return
        }

        set({ isEditingLayerWithContext: true })
        showToast('Analysiere Bild und Ebene...', 'info')

        try {
          // Import AI store to get API key and models
          const { useAIStore } = await import('@/stores/aiStore')
          const aiState = useAIStore.getState()

          // Fetch user API key if not already loaded
          let apiKey = aiState.userApiKey
          if (!apiKey) {
            apiKey = await aiState.fetchUserApiKey()
          }

          if (!apiKey) {
            throw new Error('Kein API-Schlüssel konfiguriert')
          }

          const analysisModel = aiState.analysisModel || 'google/gemini-2.0-flash-001'

          // Step 1: Render composite image of all layers
          const compositeCanvas = document.createElement('canvas')
          compositeCanvas.width = currentProject.width
          compositeCanvas.height = currentProject.height
          const compositeCtx = compositeCanvas.getContext('2d')
          if (!compositeCtx) throw new Error('Failed to get canvas context')

          // Fill background
          compositeCtx.fillStyle = currentProject.backgroundColor || '#ffffff'
          compositeCtx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height)

          // Draw each visible layer
          for (const l of currentProject.layers) {
            if (!l.visible) continue

            if (l.imageData) {
              try {
                const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                  const image = new Image()
                  image.onload = () => resolve(image)
                  image.onerror = reject
                  image.src = l.imageData!
                })

                compositeCtx.save()
                compositeCtx.globalAlpha = l.opacity / 100
                compositeCtx.translate(l.x + l.width / 2, l.y + l.height / 2)
                compositeCtx.rotate((l.rotation * Math.PI) / 180)
                compositeCtx.drawImage(img, -l.width / 2, -l.height / 2, l.width, l.height)
                compositeCtx.restore()
              } catch {
                // Skip failed images
              }
            } else if (l.type === 'text' && l.text) {
              compositeCtx.save()
              compositeCtx.globalAlpha = l.opacity / 100
              compositeCtx.font = `${l.fontSize || 24}px ${l.fontFamily || 'Arial'}`
              compositeCtx.fillStyle = l.fontColor || '#000000'
              compositeCtx.textAlign = (l.textAlign as CanvasTextAlign) || 'left'
              compositeCtx.fillText(l.text, l.x, l.y + (l.fontSize || 24))
              compositeCtx.restore()
            }
          }

          const compositeImage = compositeCanvas.toDataURL('image/png')

          // Step 2: Call analysis LLM with composite + layer images
          showToast('KI erstellt detaillierten Prompt...', 'info')

          const analysisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'Canwa Image Editor'
            },
            body: JSON.stringify({
              model: analysisModel,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image_url',
                      image_url: { url: compositeImage }
                    },
                    {
                      type: 'image_url',
                      image_url: { url: layer.imageData }
                    },
                    {
                      type: 'text',
                      text: `Du bist ein Experte für Bildgenerierung. Analysiere diese zwei Bilder:

Bild 1: Das Gesamtbild (Komposition aller Ebenen)
Bild 2: Eine einzelne Ebene aus diesem Bild

Der Benutzer möchte eine NEUE Version von Bild 2 erstellen mit dieser Anweisung: "${instruction}"

Erstelle einen detaillierten, präzisen Prompt für ein Bildgenerierungsmodell (wie DALL-E oder Flux).
Der Prompt soll beschreiben, wie das neue Bild aussehen soll, damit es:
1. Zur Gesamtkomposition passt (Stil, Farben, Perspektive)
2. Die Anweisung des Benutzers umsetzt

Antworte NUR mit dem Prompt für das Bildgenerierungsmodell, ohne weitere Erklärungen.
Der Prompt sollte auf Englisch sein und maximal 200 Wörter haben.`
                    }
                  ]
                }
              ]
            })
          })

          if (!analysisResponse.ok) {
            const error = await analysisResponse.text()
            throw new Error(`Analysis API error: ${error}`)
          }

          const analysisData = await analysisResponse.json()
          const generatedPrompt = analysisData.choices?.[0]?.message?.content

          if (!generatedPrompt || typeof generatedPrompt !== 'string') {
            throw new Error('Kein Prompt vom Analyse-LLM generiert')
          }

          console.log('Generated prompt from analysis:', generatedPrompt)

          // Step 3: Generate new image using the detailed prompt
          showToast('Generiere neue Ebene...', 'info')
          set({ isEditingLayerWithContext: false })

          // Use the existing generateAIImage function with the generated prompt
          await generateAIImage(generatedPrompt.trim())

          pushHistory('AI Context Edit')
          showToast('Neue Ebene basierend auf Analyse erstellt', 'success')
        } catch (error) {
          console.error('AI context-aware edit failed:', error)
          set({ isEditingLayerWithContext: false })
          showToast(`Kontextbasierte Bearbeitung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error')
        }
      },

      // AI Filters
      applyAIFilter: async (layerId, filterType) => {
        const { currentProject, pushHistory, showToast } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer || !layer.imageData) {
          showToast('No image data to filter', 'error')
          return
        }

        set({ isApplyingFilter: true })
        showToast(`Applying ${filterType} filter...`, 'info')

        try {
          // Load the image
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = reject
            img.src = layer.imageData!
          })

          // Create canvas for processing
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Failed to get canvas context')

          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // Apply filter based on type
          switch (filterType) {
            case 'vintage': {
              // Sepia tone + vignette + grain
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2]
                // Sepia
                data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
                data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
                data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
                // Add subtle grain
                const noise = (Math.random() - 0.5) * 20
                data[i] = Math.min(255, Math.max(0, data[i] + noise))
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
              }
              break
            }
            case 'cinematic': {
              // Teal and orange color grading + contrast
              for (let i = 0; i < data.length; i += 4) {
                let r = data[i], g = data[i + 1], b = data[i + 2]
                // Increase contrast
                r = Math.min(255, Math.max(0, (r - 128) * 1.2 + 128))
                g = Math.min(255, Math.max(0, (g - 128) * 1.2 + 128))
                b = Math.min(255, Math.max(0, (b - 128) * 1.2 + 128))
                // Teal shadows, orange highlights
                const luminance = (r + g + b) / 3
                if (luminance < 128) {
                  // Shadows - add teal
                  b = Math.min(255, b + 20)
                  g = Math.min(255, g + 10)
                } else {
                  // Highlights - add orange
                  r = Math.min(255, r + 20)
                  g = Math.min(255, g + 5)
                }
                data[i] = r
                data[i + 1] = g
                data[i + 2] = b
              }
              break
            }
            case 'hdr': {
              // High dynamic range effect
              for (let i = 0; i < data.length; i += 4) {
                let r = data[i], g = data[i + 1], b = data[i + 2]
                // Boost saturation
                const gray = 0.299 * r + 0.587 * g + 0.114 * b
                const satBoost = 1.4
                r = Math.min(255, Math.max(0, gray + (r - gray) * satBoost))
                g = Math.min(255, Math.max(0, gray + (g - gray) * satBoost))
                b = Math.min(255, Math.max(0, gray + (b - gray) * satBoost))
                // Boost contrast
                r = Math.min(255, Math.max(0, (r - 128) * 1.3 + 128))
                g = Math.min(255, Math.max(0, (g - 128) * 1.3 + 128))
                b = Math.min(255, Math.max(0, (b - 128) * 1.3 + 128))
                // Boost clarity (local contrast)
                data[i] = r
                data[i + 1] = g
                data[i + 2] = b
              }
              break
            }
            case 'noir': {
              // Black and white with high contrast
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2]
                // Weighted grayscale
                let gray = 0.299 * r + 0.587 * g + 0.114 * b
                // High contrast
                gray = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128))
                data[i] = gray
                data[i + 1] = gray
                data[i + 2] = gray
              }
              break
            }
            case 'dreamy': {
              // Soft, ethereal look with slight blur and glow
              for (let i = 0; i < data.length; i += 4) {
                let r = data[i], g = data[i + 1], b = data[i + 2]
                // Lighten
                r = Math.min(255, r + 20)
                g = Math.min(255, g + 20)
                b = Math.min(255, b + 25)
                // Reduce contrast
                r = Math.min(255, Math.max(0, (r - 128) * 0.85 + 128 + 15))
                g = Math.min(255, Math.max(0, (g - 128) * 0.85 + 128 + 15))
                b = Math.min(255, Math.max(0, (b - 128) * 0.85 + 128 + 20))
                // Slight pink tint
                r = Math.min(255, r + 5)
                b = Math.min(255, b + 10)
                data[i] = r
                data[i + 1] = g
                data[i + 2] = b
              }
              break
            }
            case 'pop': {
              // Vibrant pop art style
              for (let i = 0; i < data.length; i += 4) {
                let r = data[i], g = data[i + 1], b = data[i + 2]
                // Posterize
                r = Math.round(r / 64) * 64
                g = Math.round(g / 64) * 64
                b = Math.round(b / 64) * 64
                // Boost saturation
                const gray = 0.299 * r + 0.587 * g + 0.114 * b
                r = Math.min(255, Math.max(0, gray + (r - gray) * 2))
                g = Math.min(255, Math.max(0, gray + (g - gray) * 2))
                b = Math.min(255, Math.max(0, gray + (b - gray) * 2))
                data[i] = r
                data[i + 1] = g
                data[i + 2] = b
              }
              break
            }
            case 'cool': {
              // Cool blue tones
              for (let i = 0; i < data.length; i += 4) {
                let r = data[i], g = data[i + 1], b = data[i + 2]
                // Shift towards blue
                r = Math.max(0, r - 15)
                b = Math.min(255, b + 25)
                g = Math.min(255, g + 5)
                data[i] = r
                data[i + 1] = g
                data[i + 2] = b
              }
              break
            }
            case 'warm': {
              // Warm orange/yellow tones
              for (let i = 0; i < data.length; i += 4) {
                let r = data[i], g = data[i + 1], b = data[i + 2]
                // Shift towards warm
                r = Math.min(255, r + 25)
                g = Math.min(255, g + 10)
                b = Math.max(0, b - 15)
                data[i] = r
                data[i + 1] = g
                data[i + 2] = b
              }
              break
            }
            case 'fade': {
              // Faded film look
              for (let i = 0; i < data.length; i += 4) {
                let r = data[i], g = data[i + 1], b = data[i + 2]
                // Lift blacks
                r = Math.min(255, r * 0.9 + 25)
                g = Math.min(255, g * 0.9 + 25)
                b = Math.min(255, b * 0.9 + 30)
                // Reduce saturation
                const gray = 0.299 * r + 0.587 * g + 0.114 * b
                r = Math.min(255, Math.max(0, gray + (r - gray) * 0.7))
                g = Math.min(255, Math.max(0, gray + (g - gray) * 0.7))
                b = Math.min(255, Math.max(0, gray + (b - gray) * 0.7))
                data[i] = r
                data[i + 1] = g
                data[i + 2] = b
              }
              break
            }
            case 'dramatic': {
              // High contrast dramatic look
              for (let i = 0; i < data.length; i += 4) {
                let r = data[i], g = data[i + 1], b = data[i + 2]
                // Strong contrast
                r = Math.min(255, Math.max(0, (r - 128) * 1.5 + 128))
                g = Math.min(255, Math.max(0, (g - 128) * 1.5 + 128))
                b = Math.min(255, Math.max(0, (b - 128) * 1.5 + 128))
                // Slight desaturation
                const gray = 0.299 * r + 0.587 * g + 0.114 * b
                r = Math.min(255, Math.max(0, gray + (r - gray) * 0.85))
                g = Math.min(255, Math.max(0, gray + (g - gray) * 0.85))
                b = Math.min(255, Math.max(0, gray + (b - gray) * 0.85))
                data[i] = r
                data[i + 1] = g
                data[i + 2] = b
              }
              break
            }
          }

          ctx.putImageData(imageData, 0, 0)
          pushHistory(`Apply ${filterType} Filter`)

          const filteredImageData = canvas.toDataURL('image/png')

          set((state) => ({
            currentProject: state.currentProject
              ? {
                  ...state.currentProject,
                  layers: state.currentProject.layers.map((l) =>
                    l.id === layerId ? { ...l, imageData: filteredImageData } : l
                  ),
                  updatedAt: Date.now(),
                }
              : null,
            isApplyingFilter: false,
            isDirty: true,
          }))

          showToast(`${filterType} filter applied`, 'success')
        } catch (error) {
          console.error('Filter application failed:', error)
          set({ isApplyingFilter: false })
          showToast('Failed to apply filter', 'error')
        }
      },

      // AI Upscaling (simple bicubic for now, could integrate Real-ESRGAN later)
      upscaleImage: async (layerId, scale) => {
        const { currentProject, pushHistory, showToast } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer || !layer.imageData) {
          showToast('No image data to upscale', 'error')
          return
        }

        set({ isUpscaling: true })
        showToast(`Upscaling image ${scale}x...`, 'info')

        try {
          // Load the image
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = reject
            img.src = layer.imageData!
          })

          const newWidth = Math.round(img.width * scale)
          const newHeight = Math.round(img.height * scale)

          // Create high-quality upscaled canvas
          const canvas = document.createElement('canvas')
          canvas.width = newWidth
          canvas.height = newHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Failed to get canvas context')

          // Use high-quality image smoothing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          ctx.drawImage(img, 0, 0, newWidth, newHeight)

          // Apply subtle sharpening after upscale
          const imageData = ctx.getImageData(0, 0, newWidth, newHeight)
          const data = imageData.data

          // Simple unsharp mask
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = newWidth
          tempCanvas.height = newHeight
          const tempCtx = tempCanvas.getContext('2d')
          if (tempCtx) {
            tempCtx.filter = 'blur(1px)'
            tempCtx.drawImage(canvas, 0, 0)
            const blurredData = tempCtx.getImageData(0, 0, newWidth, newHeight).data

            const sharpAmount = 0.3
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.min(255, Math.max(0, data[i] + (data[i] - blurredData[i]) * sharpAmount))
              data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + (data[i + 1] - blurredData[i + 1]) * sharpAmount))
              data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + (data[i + 2] - blurredData[i + 2]) * sharpAmount))
            }
            ctx.putImageData(imageData, 0, 0)
          }

          pushHistory(`Upscale ${scale}x`)

          const upscaledImageData = canvas.toDataURL('image/png')

          set((state) => ({
            currentProject: state.currentProject
              ? {
                  ...state.currentProject,
                  layers: state.currentProject.layers.map((l) =>
                    l.id === layerId
                      ? { ...l, imageData: upscaledImageData, width: newWidth, height: newHeight }
                      : l
                  ),
                  updatedAt: Date.now(),
                }
              : null,
            isUpscaling: false,
            isDirty: true,
          }))

          showToast(`Image upscaled to ${newWidth}x${newHeight}`, 'success')
        } catch (error) {
          console.error('Upscaling failed:', error)
          set({ isUpscaling: false })
          showToast('Failed to upscale image', 'error')
        }
      },

      // Extract dominant colors from image
      extractColorPalette: async (layerId) => {
        const { currentProject, showToast } = get()
        if (!currentProject) return

        const layer = currentProject.layers.find((l) => l.id === layerId)
        if (!layer || !layer.imageData) {
          showToast('No image data to analyze', 'error')
          return
        }

        set({ isExtractingColors: true })

        try {
          // Load the image
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = reject
            img.src = layer.imageData!
          })

          // Create small canvas for sampling
          const sampleSize = 100
          const canvas = document.createElement('canvas')
          canvas.width = sampleSize
          canvas.height = sampleSize
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Failed to get canvas context')

          ctx.drawImage(img, 0, 0, sampleSize, sampleSize)
          const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
          const data = imageData.data

          // Simple k-means clustering for color extraction
          const colors: [number, number, number][] = []
          for (let i = 0; i < data.length; i += 4) {
            colors.push([data[i], data[i + 1], data[i + 2]])
          }

          // Quantize colors into buckets
          const bucketSize = 32
          const colorBuckets: Map<string, { count: number; r: number; g: number; b: number }> = new Map()

          for (const [r, g, b] of colors) {
            const qr = Math.round(r / bucketSize) * bucketSize
            const qg = Math.round(g / bucketSize) * bucketSize
            const qb = Math.round(b / bucketSize) * bucketSize
            const key = `${qr}-${qg}-${qb}`

            const existing = colorBuckets.get(key)
            if (existing) {
              existing.count++
              existing.r += r
              existing.g += g
              existing.b += b
            } else {
              colorBuckets.set(key, { count: 1, r, g, b })
            }
          }

          // Get top 6 colors
          const sortedBuckets = Array.from(colorBuckets.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)

          const extractedColors = sortedBuckets.map((bucket) => {
            const avgR = Math.round(bucket.r / bucket.count)
            const avgG = Math.round(bucket.g / bucket.count)
            const avgB = Math.round(bucket.b / bucket.count)
            return `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`
          })

          set({
            extractedColors,
            isExtractingColors: false,
          })

          showToast('Colors extracted', 'success')
        } catch (error) {
          console.error('Color extraction failed:', error)
          set({ isExtractingColors: false })
          showToast('Failed to extract colors', 'error')
        }
      },

      // History
      pushHistory: (name) => {
        const { currentProject, history, historyIndex, maxHistorySize } = get()
        if (!currentProject) return

        const entry: HistoryEntry = {
          id: generateId(),
          name,
          timestamp: Date.now(),
          snapshot: JSON.stringify(currentProject.layers),
        }

        // Remove any redo history
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push(entry)

        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift()
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
          redoStack: [], // Clear redo stack when new action is performed
        })
      },

      undo: () => {
        const { history, historyIndex, currentProject, redoStack } = get()
        if (historyIndex < 0 || !currentProject || history.length === 0) return

        // Save current state to redo stack before undoing
        const currentSnapshot = JSON.stringify(currentProject.layers)
        const newRedoStack = [...redoStack, currentSnapshot]

        // Restore from the current history entry (which is the pre-action state)
        const currentEntry = history[historyIndex]
        if (currentEntry) {
          const layers = JSON.parse(currentEntry.snapshot)
          set({
            currentProject: { ...currentProject, layers },
            historyIndex: historyIndex - 1,
            redoStack: newRedoStack,
          })
        }
      },

      redo: () => {
        const { redoStack, currentProject, historyIndex } = get()
        if (redoStack.length === 0 || !currentProject) return

        // Pop the last state from redo stack
        const newRedoStack = [...redoStack]
        const snapshot = newRedoStack.pop()
        if (!snapshot) return

        const layers = JSON.parse(snapshot)

        set({
          currentProject: { ...currentProject, layers },
          historyIndex: historyIndex + 1,
          redoStack: newRedoStack,
        })
      },

      canUndo: () => {
        const { historyIndex } = get()
        return historyIndex >= 0
      },

      canRedo: () => {
        const { redoStack } = get()
        return redoStack.length > 0
      },

      // Helpers
      getSelectedLayer: () => {
        const { currentProject, selectedLayerId } = get()
        if (!currentProject || !selectedLayerId) return null
        return currentProject.layers.find((l) => l.id === selectedLayerId) || null
      },

      getLayerById: (layerId) => {
        const { currentProject } = get()
        if (!currentProject) return null
        return currentProject.layers.find((l) => l.id === layerId) || null
      },
    }),
    {
      name: 'imageEditorStore',
      partialize: (state) => ({
        viewMode: state.viewMode,
        // Store only the current project ID, not the full project data
        currentProjectId: state.currentProject?.id || null,
        projects: state.projects.map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, thumbnailUrl: p.thumbnailUrl })),
        selectedLayerId: state.selectedLayerId,
        activeTool: state.activeTool,
        disabledTools: state.disabledTools,
        rightPanelTab: state.rightPanelTab,
        // History is NOT persisted - too large with image data
        zoom: state.zoom,
        projectZoomLevels: state.projectZoomLevels,
        brushSettings: state.brushSettings,
        eraserSettings: state.eraserSettings,
        shapeSettings: state.shapeSettings,
        gradientSettings: state.gradientSettings,
        bucketSettings: state.bucketSettings,
        cloneSettings: state.cloneSettings,
        retouchSettings: state.retouchSettings,
        recentColors: state.recentColors,
        showGrid: state.showGrid,
        gridSize: state.gridSize,
        snapToGrid: state.snapToGrid,
        filterMode: state.filterMode,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, restore the current project from backend if there was one open
        if (state) {
          const persistedState = state as unknown as { currentProjectId?: string }
          if (persistedState.currentProjectId && state.viewMode === 'editor') {
            // Restore the project from backend
            state.openProject(persistedState.currentProjectId)
          }
        }
      },
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name)
            return str ? JSON.parse(str) : null
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch (e) {
            // Quota exceeded - clear storage and try again
            console.warn('localStorage quota exceeded, clearing imageEditorStore')
            localStorage.removeItem(name)
            try {
              localStorage.setItem(name, JSON.stringify(value))
            } catch {
              console.error('Failed to save to localStorage even after clearing')
            }
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
    )
  )
)

// Auto-save subscription: save to backend when project changes
useImageEditorStore.subscribe(
  (state) => state.currentProject,
  (currentProject, previousProject) => {
    // Only auto-save if we have a project and it actually changed
    if (!currentProject) return
    if (!previousProject) return
    if (currentProject.id !== previousProject.id) return // Don't save on project switch

    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    // Set new timer for debounced save
    autoSaveTimer = setTimeout(() => {
      const state = useImageEditorStore.getState()
      if (state.currentProject && state.isDirty) {
        console.log('Auto-saving project...')
        state.saveProjectToBackend()
        useImageEditorStore.setState({ isDirty: false })
      }
    }, AUTO_SAVE_DELAY)
  },
  { equalityFn: (a, b) => a?.updatedAt === b?.updatedAt }
)
