import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  maxHistorySize: number

  // Active tool
  activeTool: Tool
  setActiveTool: (tool: Tool) => void

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

  // Filters (applied to selected layer)
  filters: Filters
  livePreview: boolean
  setLivePreview: (preview: boolean) => void
  setFilters: (filters: Partial<Filters>) => void
  applyFilters: () => void
  resetFilters: () => void

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
  setZoom: (zoom: number) => void
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
  openProject: (projectId: string) => void
  saveProject: () => void
  closeProject: () => void
  deleteProject: (projectId: string) => void
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
  setLayerPosition: (layerId: string, x: number, y: number) => void
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

  // Background removal
  isRemovingBackground: boolean
  removeBackground: (layerId: string) => Promise<void>

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
      maxHistorySize: 50,
      activeTool: 'brush',
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
      livePreview: true,
      selection: { ...DEFAULT_SELECTION },
      crop: { ...DEFAULT_CROP },
      zoom: 100,
      panX: 0,
      panY: 0,
      showExportDialog: false,
      toasts: [],
      isRemovingBackground: false,

      // View mode
      setViewMode: (mode) => set({ viewMode: mode }),

      // Tool
      setActiveTool: (tool) => set({ activeTool: tool }),

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
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      applyFilters: () => {
        const { currentProject, selectedLayerId, filters, pushHistory } = get()
        if (!currentProject || !selectedLayerId) return

        pushHistory('Apply Filters')
        // Filter application will be done in the Canvas component
        set({ filters: { ...DEFAULT_FILTERS } })
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
      setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(400, zoom)) }),
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
          isDirty: false,
          zoom: 100,
          panX: 0,
          panY: 0,
        }))
      },

      openProject: (projectId) => {
        const { savedProjects } = get()
        const project = savedProjects[projectId]
        if (project) {
          set({
            currentProject: project,
            viewMode: 'editor',
            selectedLayerId: project.layers[0]?.id || null,
            history: [],
            historyIndex: -1,
            isDirty: false,
            zoom: 100,
            panX: 0,
            panY: 0,
          })
        }
      },

      saveProject: () => {
        const { currentProject } = get()
        if (!currentProject) return

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
      },

      closeProject: () => {
        const { currentProject } = get()

        // Save current project before closing
        if (currentProject) {
          set((state) => ({
            savedProjects: {
              ...state.savedProjects,
              [currentProject.id]: currentProject,
            },
            projects: state.projects.map((p) =>
              p.id === currentProject.id
                ? { ...p, updatedAt: currentProject.updatedAt }
                : p
            ),
          }))
        }

        set({
          currentProject: null,
          viewMode: 'projects',
          selectedLayerId: null,
          history: [],
          historyIndex: -1,
          filters: { ...DEFAULT_FILTERS },
          selection: { ...DEFAULT_SELECTION },
          crop: { ...DEFAULT_CROP },
        })
      },

      deleteProject: (projectId) =>
        set((state) => {
          const { [projectId]: _, ...remainingSavedProjects } = state.savedProjects
          return {
            projects: state.projects.filter((p) => p.id !== projectId),
            savedProjects: remainingSavedProjects,
          }
        }),

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

          // Remove background
          const resultBlob = await removeBg(blob, {
            progress: (key, current, total) => {
              // Progress callback - could be used for a progress bar
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
        })
      },

      undo: () => {
        const { history, historyIndex, currentProject } = get()
        if (historyIndex < 0 || !currentProject) return

        const prevEntry = history[historyIndex - 1]
        if (!prevEntry) {
          // Go to initial state
          return
        }

        const layers = JSON.parse(prevEntry.snapshot)

        set((state) => ({
          currentProject: state.currentProject
            ? { ...state.currentProject, layers }
            : null,
          historyIndex: historyIndex - 1,
        }))
      },

      redo: () => {
        const { history, historyIndex, currentProject } = get()
        if (historyIndex >= history.length - 1 || !currentProject) return

        const nextEntry = history[historyIndex + 1]
        if (!nextEntry) return

        const layers = JSON.parse(nextEntry.snapshot)

        set((state) => ({
          currentProject: state.currentProject
            ? { ...state.currentProject, layers }
            : null,
          historyIndex: historyIndex + 1,
        }))
      },

      canUndo: () => {
        const { historyIndex } = get()
        return historyIndex >= 0
      },

      canRedo: () => {
        const { history, historyIndex } = get()
        return historyIndex < history.length - 1
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
        currentProject: state.currentProject,
        projects: state.projects,
        savedProjects: state.savedProjects,
        selectedLayerId: state.selectedLayerId,
        zoom: state.zoom,
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
      }),
    }
  )
)
