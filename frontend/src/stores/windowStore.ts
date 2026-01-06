import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { appRegistry, type AppType } from '@/config/apps'

export type { AppType } from '@/config/apps'

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
  isSpotlightOpen: boolean
  isOrbOpen: boolean
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
  minimizeByAppId: (appId: AppType) => void
  closeWindowByAppId: (appId: AppType) => void
  setSpotlightOpen: (open: boolean) => void
  setOrbOpen: (open: boolean) => void
}

// App titles und sizes kommen jetzt aus der zentralen Registry (src/config/apps.tsx)
const getAppTitle = (appId: AppType): string => {
  const app = appRegistry[appId]
  // Fallback auf ID wenn nicht in Registry
  return app?.titleKey || appId
}

const getAppDefaultSize = (appId: AppType): { width: number; height: number } => {
  const app = appRegistry[appId]
  return app?.defaultSize || { width: 800, height: 600 }
}

// Typ für persistierte Window-Daten (ohne Runtime-Felder)
interface PersistedWindow {
  appId: AppType
  isMinimized: boolean
  isMaximized: boolean
  isTiled: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  previousPosition?: { x: number; y: number }
  previousSize?: { width: number; height: number }
}

export const useWindowStore = create<WindowStore>()(
  persist(
    (set, get) => ({
  windows: [],
  activeWindowId: null,
  nextZIndex: 1,
  stageManagerEnabled: true,
  showStageThumbnails: false,
  showDock: false,
  isSpotlightOpen: false,
  isOrbOpen: false,

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
    const size = getAppDefaultSize(appId)

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
    const shouldAutoTile = tiledWindows.length > 0 && tiledWindows.length < 8

    const newWindow: Window = {
      id: `${appId}-${Date.now()}`,
      appId,
      title: getAppTitle(appId),
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

      // Max 8 getilte Fenster - ältestes entfernen wenn nötig
      const tiledWindows = windows.filter((w) => w.isTiled).sort((a, b) => (a.tiledAt || 0) - (b.tiledAt || 0))
      if (tiledWindows.length >= 8) {
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

    // Alle nicht-minimierten Fenster (inkl. maximierte)
    const visibleWindows = windows.filter((w) => !w.isMinimized)
    const alreadyAllTiled = visibleWindows.length > 0 && visibleWindows.every((w) => w.isTiled && !w.isMaximized)

    if (alreadyAllTiled) {
      // Alle bereits getiled → alle untilen
      get().untileAllWindows()
      return
    }

    // Alle sichtbaren Fenster tilen (max 8) - kombiniert de-maximize und tiling in einem set()
    const toTile = visibleWindows.slice(0, 8)
    // Map für O(1) lookup statt O(n) find/findIndex
    const toTileMap = new Map(toTile.map((w, i) => [w.id, i]))
    const baseTimestamp = Date.now()

    set((state) => ({
      windows: state.windows.map((w) => {
        const tileIndex = toTileMap.get(w.id)
        if (tileIndex === undefined) return w

        // De-maximize und tile in einem Schritt
        return {
          ...w,
          isMaximized: false,
          isTiled: true,
          tiledAt: baseTimestamp + tileIndex, // Reihenfolge beibehalten
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
    } else if (tiledWindows.length === 4) {
      // 2x2 Grid
      const halfWidth = (availableWidth - gap) / 2
      const halfHeight = (availableHeight - gap) / 2
      positions.push({ x: startX, y: startY, width: halfWidth, height: halfHeight })
      positions.push({ x: startX + halfWidth + gap, y: startY, width: halfWidth, height: halfHeight })
      positions.push({ x: startX, y: startY + halfHeight + gap, width: halfWidth, height: halfHeight })
      positions.push({ x: startX + halfWidth + gap, y: startY + halfHeight + gap, width: halfWidth, height: halfHeight })
    } else if (tiledWindows.length === 5) {
      // 3 oben, 2 unten zentriert
      const thirdWidth = (availableWidth - gap * 2) / 3
      const halfHeight = (availableHeight - gap) / 2
      const halfWidth = (availableWidth - gap) / 2
      // Top row: 3 windows
      positions.push({ x: startX, y: startY, width: thirdWidth, height: halfHeight })
      positions.push({ x: startX + thirdWidth + gap, y: startY, width: thirdWidth, height: halfHeight })
      positions.push({ x: startX + thirdWidth * 2 + gap * 2, y: startY, width: thirdWidth, height: halfHeight })
      // Bottom row: 2 windows zentriert
      const bottomOffset = (availableWidth - (halfWidth * 2 + gap)) / 2
      positions.push({ x: startX + bottomOffset, y: startY + halfHeight + gap, width: halfWidth, height: halfHeight })
      positions.push({ x: startX + bottomOffset + halfWidth + gap, y: startY + halfHeight + gap, width: halfWidth, height: halfHeight })
    } else if (tiledWindows.length === 6) {
      // 3x2 Grid
      const thirdWidth = (availableWidth - gap * 2) / 3
      const halfHeight = (availableHeight - gap) / 2
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          positions.push({
            x: startX + col * (thirdWidth + gap),
            y: startY + row * (halfHeight + gap),
            width: thirdWidth,
            height: halfHeight
          })
        }
      }
    } else if (tiledWindows.length === 7) {
      // 4 oben, 3 unten zentriert
      const quarterWidth = (availableWidth - gap * 3) / 4
      const halfHeight = (availableHeight - gap) / 2
      const thirdWidth = (availableWidth - gap * 2) / 3
      // Top row: 4 windows
      for (let i = 0; i < 4; i++) {
        positions.push({
          x: startX + i * (quarterWidth + gap),
          y: startY,
          width: quarterWidth,
          height: halfHeight
        })
      }
      // Bottom row: 3 windows zentriert
      const bottomOffset = (availableWidth - (thirdWidth * 3 + gap * 2)) / 2
      for (let i = 0; i < 3; i++) {
        positions.push({
          x: startX + bottomOffset + i * (thirdWidth + gap),
          y: startY + halfHeight + gap,
          width: thirdWidth,
          height: halfHeight
        })
      }
    } else if (tiledWindows.length >= 8) {
      // 4x2 Grid
      const quarterWidth = (availableWidth - gap * 3) / 4
      const halfHeight = (availableHeight - gap) / 2
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          positions.push({
            x: startX + col * (quarterWidth + gap),
            y: startY + row * (halfHeight + gap),
            width: quarterWidth,
            height: halfHeight
          })
        }
      }
    }

    // Create a Map for O(1) lookup instead of O(n) findIndex
    const tiledIndexMap = new Map(tiledWindows.map((tw, i) => [tw.id, i]))

    // Update Fenster-Positionen
    set((state) => ({
      windows: state.windows.map((w) => {
        if (!w.isTiled) return w
        const index = tiledIndexMap.get(w.id)
        if (index === undefined || !positions[index]) return w
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

  minimizeByAppId: (appId) => {
    const { windows } = get()
    const targetWindow = windows.find((w) => w.appId === appId && !w.isMinimized)
    if (targetWindow) {
      get().minimizeWindow(targetWindow.id)
    }
  },

  closeWindowByAppId: (appId) => {
    const { windows } = get()
    const targetWindow = windows.find((w) => w.appId === appId)
    if (targetWindow) {
      get().closeWindow(targetWindow.id)
    }
  },

  setSpotlightOpen: (open) => {
    set({ isSpotlightOpen: open })
  },

  setOrbOpen: (open) => {
    set({ isOrbOpen: open })
  },
    }),
    {
      name: 'consultingos-windows',
      partialize: (state) => ({
        // Nur relevante Felder speichern
        windows: state.windows.map((w): PersistedWindow => ({
          appId: w.appId,
          isMinimized: w.isMinimized,
          isMaximized: w.isMaximized,
          isTiled: w.isTiled,
          position: w.position,
          size: w.size,
          previousPosition: w.previousPosition,
          previousSize: w.previousSize,
        })),
        stageManagerEnabled: state.stageManagerEnabled,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { windows?: PersistedWindow[]; stageManagerEnabled?: boolean } | undefined
        if (!persisted?.windows?.length) {
          return currentState
        }

        // IDs und zIndex neu generieren
        let zIndex = 1
        const restoredWindows: Window[] = persisted.windows
          .filter((w: PersistedWindow) => appRegistry[w.appId]) // Nur existierende Apps
          .map((w: PersistedWindow) => ({
            ...w,
            id: `${w.appId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: getAppTitle(w.appId),
            zIndex: zIndex++,
            tiledAt: w.isTiled ? Date.now() : undefined,
          }))

        return {
          ...currentState,
          windows: restoredWindows,
          nextZIndex: zIndex,
          activeWindowId: restoredWindows.find((w) => !w.isMinimized)?.id || null,
          stageManagerEnabled: persisted.stageManagerEnabled ?? currentState.stageManagerEnabled,
        }
      },
    }
  )
)
