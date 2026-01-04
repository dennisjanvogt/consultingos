import { create } from 'zustand'

export type AppType = 'dashboard' | 'masterdata' | 'transactions' | 'settings' | 'documents' | 'calendar' | 'kanban' | 'timetracking' | 'imageviewer'

export interface Window {
  id: string
  appId: AppType
  title: string
  isMinimized: boolean
  isMaximized: boolean
  isTiled: boolean
  tiledAt?: number // Timestamp wann getiled wurde (für Max-4 Limit)
  position: { x: number; y: number }
  size: { width: number; height: number }
  // Gespeicherte Position/Größe vor dem Maximieren/Tilen
  previousPosition?: { x: number; y: number }
  previousSize?: { width: number; height: number }
  zIndex: number
}

interface WindowStore {
  windows: Window[]
  activeWindowId: string | null
  nextZIndex: number
  stageManagerEnabled: boolean
  showStageThumbnails: boolean
  showDock: boolean
  openWindow: (appId: AppType) => void
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  tileWindow: (id: string) => void
  untileWindow: (id: string) => void
  tileAllWindows: () => void
  untileAllWindows: () => void
  recalculateTiledPositions: () => void
  maximizeWindow: (id: string) => void
  focusWindow: (id: string) => void
  updateWindowPosition: (id: string, position: { x: number; y: number }) => void
  updateWindowSize: (id: string, size: { width: number; height: number }) => void
  toggleStageManager: () => void
  setShowStageThumbnails: (show: boolean) => void
  setShowDock: (show: boolean) => void
  centerActiveWindow: () => void
}

const appTitles: Record<AppType, string> = {
  dashboard: 'Dashboard',
  masterdata: 'Stammdaten',
  transactions: 'Bewegungsdaten',
  settings: 'Einstellungen',
  documents: 'Dateien',
  calendar: 'Kalender',
  kanban: 'Kanban',
  timetracking: 'Zeiterfassung',
  imageviewer: 'Bildbetrachter',
}

const defaultSizes: Record<AppType, { width: number; height: number }> = {
  dashboard: { width: 900, height: 600 },
  masterdata: { width: 850, height: 600 },
  transactions: { width: 900, height: 650 },
  settings: { width: 600, height: 500 },
  documents: { width: 850, height: 600 },
  calendar: { width: 950, height: 650 },
  kanban: { width: 1100, height: 700 },
  timetracking: { width: 950, height: 700 },
  imageviewer: { width: 800, height: 600 },
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  activeWindowId: null,
  nextZIndex: 1,
  stageManagerEnabled: true,
  showStageThumbnails: false,
  showDock: false,

  openWindow: (appId) => {
    const { windows, nextZIndex } = get()

    // Check if window already exists
    const existingWindow = windows.find((w) => w.appId === appId)
    if (existingWindow) {
      // If minimized, restore it
      if (existingWindow.isMinimized) {
        set((state) => ({
          windows: state.windows.map((w) =>
            w.id === existingWindow.id
              ? { ...w, isMinimized: false, zIndex: state.nextZIndex }
              : w
          ),
          activeWindowId: existingWindow.id,
          nextZIndex: state.nextZIndex + 1,
        }))
      } else {
        // Focus the existing window
        get().focusWindow(existingWindow.id)
      }
      return
    }

    // Create new window
    const size = defaultSizes[appId]

    // Calculate center position
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    const menuBarHeight = 28 // Height of MenuBar
    const dockHeight = 70 // Approximate height of Dock area
    const availableHeight = viewportHeight - menuBarHeight - dockHeight

    // Center the window, with offset for additional windows
    const centerX = (viewportWidth - size.width) / 2
    const centerY = menuBarHeight + (availableHeight - size.height) / 2
    const offset = windows.length * 30

    // Prüfen ob andere Fenster bereits getiled sind
    const tiledWindows = windows.filter((w) => w.isTiled && !w.isMinimized)
    const shouldAutoTile = tiledWindows.length > 0 && tiledWindows.length < 4

    const newWindow: Window = {
      id: `${appId}-${Date.now()}`,
      appId,
      title: appTitles[appId],
      isMinimized: false,
      isMaximized: false,
      isTiled: shouldAutoTile,
      tiledAt: shouldAutoTile ? Date.now() : undefined,
      position: {
        x: Math.max(50, centerX + offset),
        y: Math.max(menuBarHeight + 20, centerY + offset),
      },
      size,
      zIndex: nextZIndex,
    }

    set((state) => ({
      windows: [...state.windows, newWindow],
      activeWindowId: newWindow.id,
      nextZIndex: state.nextZIndex + 1,
    }))

    // Wenn auto-getiled, Positionen neu berechnen
    if (shouldAutoTile) {
      // Kurze Verzögerung damit das Fenster erst zum State hinzugefügt wird
      setTimeout(() => get().recalculateTiledPositions(), 0)
    }
  },

  closeWindow: (id) => {
    const wasTiled = get().windows.find((w) => w.id === id)?.isTiled
    set((state) => {
      const remainingWindows = state.windows.filter((w) => w.id !== id)
      // Wenn geschlossenes Fenster aktiv war, nächstes sichtbares aktivieren
      const nextActive = state.activeWindowId === id
        ? remainingWindows.find((w) => !w.isMinimized)?.id || null
        : state.activeWindowId
      return {
        windows: remainingWindows,
        activeWindowId: nextActive,
      }
    })
    // Wenn getiltes Fenster geschlossen wurde, Positionen neu berechnen
    if (wasTiled) {
      get().recalculateTiledPositions()
    }
  },

  minimizeWindow: (id) => {
    set((state) => {
      // Erst minimieren, dann nächstes Fenster suchen
      const updatedWindows = state.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: true } : w
      )
      // Suche NACH dem Minimieren im aktualisierten Array
      const nextActive = state.activeWindowId === id
        ? updatedWindows.find((w) => !w.isMinimized)?.id || null
        : state.activeWindowId
      return {
        windows: updatedWindows,
        activeWindowId: nextActive,
      }
    })
  },

  tileWindow: (id) => {
    const { stageManagerEnabled, windows } = get()

    if (stageManagerEnabled) {
      // Im Stage Manager: Fenster wird "inaktiv" - nächstes Fenster aktivieren
      const nextWindow = windows.find((w) => w.id !== id && !w.isMinimized)
      // Nur wechseln wenn es ein anderes Fenster gibt, sonst bleibt aktuelles aktiv
      if (nextWindow) {
        set({ activeWindowId: nextWindow.id })
      }
      return  // Early return - im Stage Manager wird nicht getiled
    } else {
      // Normaler Modus: Tiling aktivieren
      const targetWindow = windows.find((w) => w.id === id)
      if (!targetWindow) return

      // Bereits getiled? Dann untilen
      if (targetWindow.isTiled) {
        get().untileWindow(id)
        return
      }

      // Max 4 getilte Fenster - ältestes entfernen wenn nötig
      const tiledWindows = windows.filter((w) => w.isTiled).sort((a, b) => (a.tiledAt || 0) - (b.tiledAt || 0))
      if (tiledWindows.length >= 4) {
        const oldestTiled = tiledWindows[0]
        get().untileWindow(oldestTiled.id)
      }

      // Fenster tilen - Position/Größe speichern
      set((state) => ({
        windows: state.windows.map((w) =>
          w.id === id
            ? {
                ...w,
                isTiled: true,
                tiledAt: Date.now(),
                previousPosition: { ...w.position },
                previousSize: { ...w.size },
              }
            : w
        ),
      }))

      get().recalculateTiledPositions()
    }
  },

  untileWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id !== id) return w
        return {
          ...w,
          isTiled: false,
          tiledAt: undefined,
          position: w.previousPosition || w.position,
          size: w.previousSize || w.size,
          previousPosition: undefined,
          previousSize: undefined,
        }
      }),
    }))
    get().recalculateTiledPositions()
  },

  tileAllWindows: () => {
    const { windows } = get()

    const visibleWindows = windows.filter((w) => !w.isMinimized && !w.isMaximized)
    const alreadyAllTiled = visibleWindows.length > 0 && visibleWindows.every((w) => w.isTiled)

    if (alreadyAllTiled) {
      // Alle bereits getiled → alle untilen
      get().untileAllWindows()
      return
    }

    // Alle sichtbaren Fenster tilen (max 4)
    const toTile = visibleWindows.slice(0, 4)
    set((state) => ({
      windows: state.windows.map((w) => {
        if (!toTile.find((t) => t.id === w.id)) return w
        return {
          ...w,
          isTiled: true,
          tiledAt: Date.now() + toTile.findIndex((t) => t.id === w.id), // Reihenfolge beibehalten
          previousPosition: w.isTiled ? w.previousPosition : { ...w.position },
          previousSize: w.isTiled ? w.previousSize : { ...w.size },
        }
      }),
    }))
    get().recalculateTiledPositions()
  },

  untileAllWindows: () => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (!w.isTiled) return w
        return {
          ...w,
          isTiled: false,
          tiledAt: undefined,
          position: w.previousPosition || w.position,
          size: w.previousSize || w.size,
          previousPosition: undefined,
          previousSize: undefined,
        }
      }),
    }))
  },

  recalculateTiledPositions: () => {
    const { windows } = get()
    const tiledWindows = windows.filter((w) => w.isTiled).sort((a, b) => (a.tiledAt || 0) - (b.tiledAt || 0))

    if (tiledWindows.length === 0) return

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    const menuBarHeight = 28
    const dockHeight = 100 // Mehr Platz für Dock
    const padding = 12
    const gap = 10

    const availableWidth = viewportWidth - padding * 2
    const availableHeight = viewportHeight - menuBarHeight - dockHeight - padding * 2
    const startX = padding
    const startY = menuBarHeight + padding

    // Berechne Positionen basierend auf Anzahl getilter Fenster
    const positions: Array<{ x: number; y: number; width: number; height: number }> = []

    if (tiledWindows.length === 1) {
      positions.push({ x: startX, y: startY, width: availableWidth, height: availableHeight })
    } else if (tiledWindows.length === 2) {
      const halfWidth = (availableWidth - gap) / 2
      positions.push({ x: startX, y: startY, width: halfWidth, height: availableHeight })
      positions.push({ x: startX + halfWidth + gap, y: startY, width: halfWidth, height: availableHeight })
    } else if (tiledWindows.length === 3) {
      const halfWidth = (availableWidth - gap) / 2
      const halfHeight = (availableHeight - gap) / 2
      positions.push({ x: startX, y: startY, width: halfWidth, height: availableHeight })
      positions.push({ x: startX + halfWidth + gap, y: startY, width: halfWidth, height: halfHeight })
      positions.push({ x: startX + halfWidth + gap, y: startY + halfHeight + gap, width: halfWidth, height: halfHeight })
    } else if (tiledWindows.length >= 4) {
      const halfWidth = (availableWidth - gap) / 2
      const halfHeight = (availableHeight - gap) / 2
      positions.push({ x: startX, y: startY, width: halfWidth, height: halfHeight })
      positions.push({ x: startX + halfWidth + gap, y: startY, width: halfWidth, height: halfHeight })
      positions.push({ x: startX, y: startY + halfHeight + gap, width: halfWidth, height: halfHeight })
      positions.push({ x: startX + halfWidth + gap, y: startY + halfHeight + gap, width: halfWidth, height: halfHeight })
    }

    // Update Fenster-Positionen
    set((state) => ({
      windows: state.windows.map((w) => {
        if (!w.isTiled) return w
        const index = tiledWindows.findIndex((tw) => tw.id === w.id)
        if (index === -1 || !positions[index]) return w
        return {
          ...w,
          position: { x: positions[index].x, y: positions[index].y },
          size: { width: positions[index].width, height: positions[index].height },
        }
      }),
    }))
  },

  maximizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id !== id) return w

        if (w.isMaximized) {
          // Verkleinern: vorherige Position/Größe wiederherstellen
          return {
            ...w,
            isMaximized: false,
            position: w.previousPosition || w.position,
            size: w.previousSize || w.size,
            previousPosition: undefined,
            previousSize: undefined,
          }
        } else {
          // Maximieren: aktuelle Position/Größe speichern
          return {
            ...w,
            isMaximized: true,
            previousPosition: { ...w.position },
            previousSize: { ...w.size },
          }
        }
      }),
    }))
  },

  focusWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, zIndex: state.nextZIndex } : w
      ),
      activeWindowId: id,
      nextZIndex: state.nextZIndex + 1,
    }))
  },

  updateWindowPosition: (id, position) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, position } : w
      ),
    }))
  },

  updateWindowSize: (id, size) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, size } : w
      ),
    }))
  },

  toggleStageManager: () => {
    set((state) => ({
      stageManagerEnabled: !state.stageManagerEnabled,
      showStageThumbnails: false,
    }))
  },

  setShowStageThumbnails: (show) => {
    set({ showStageThumbnails: show })
  },

  setShowDock: (show) => {
    set({ showDock: show })
  },

  centerActiveWindow: () => {
    const { activeWindowId, windows } = get()
    if (!activeWindowId) return

    const activeWindow = windows.find((w) => w.id === activeWindowId)
    if (!activeWindow) return

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    const menuBarHeight = 28
    const dockHeight = 70

    const centerX = (viewportWidth - activeWindow.size.width) / 2
    const centerY = menuBarHeight + (viewportHeight - menuBarHeight - dockHeight - activeWindow.size.height) / 2

    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === activeWindowId
          ? { ...w, position: { x: centerX, y: Math.max(menuBarHeight + 10, centerY) } }
          : w
      ),
    }))
  },
}))
