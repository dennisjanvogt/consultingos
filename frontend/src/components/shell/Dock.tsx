import { useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useWindowStore, type AppType } from '@/stores/windowStore'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { useAuthStore } from '@/stores/authStore'
import { useTranslation } from 'react-i18next'
import { appRegistry } from '@/config/apps'

interface DockItem {
  id: string
  icon: React.ReactNode
  labelKey: string
}

export function Dock() {
  const { t } = useTranslation()
  const { openWindow, windows, showDock, setShowDock } = useWindowStore()
  const { settings, fetchSettings, isAppEnabled, reorderDock } = useAppSettingsStore()
  const { user } = useAuthStore()
  const hideTimeoutRef = useRef<number | null>(null)

  // Fetch app settings on mount
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Memoize derived state
  const hasVisibleWindows = useMemo(
    () => windows.some((w) => !w.isMinimized),
    [windows]
  )
  const shouldShow = !hasVisibleWindows || showDock

  // Set für O(1) lookup statt O(n) windows.some() pro Item
  const openAppIds = useMemo(
    () => new Set(windows.filter((w) => !w.isMinimized).map((w) => w.appId)),
    [windows]
  )

  // Dock Items aus der Registry basierend auf Settings (Reihenfolge + nur aktivierte Apps)
  // Admin-only Apps nur für Staff-User anzeigen
  const dockItems: DockItem[] = useMemo(() =>
    settings.dock_order
      .filter(id => {
        const app = appRegistry[id]
        if (!app || !isAppEnabled(id)) return false
        if (app.adminOnly && !user?.is_staff) return false
        return true
      })
      .map(id => ({
        id,
        icon: appRegistry[id].icon,
        labelKey: appRegistry[id].titleKey,
      })),
    [settings.dock_order, isAppEnabled, user?.is_staff]
  )

  // Handle reorder - update dock_order with new positions
  const handleReorder = useCallback((newItems: DockItem[]) => {
    const newOrder = newItems.map(item => item.id)
    // Behalte deaktivierte Apps in der Reihenfolge
    const disabledApps = settings.dock_order.filter(id => !isAppEnabled(id))
    reorderDock([...newOrder, ...disabledApps])
  }, [settings.dock_order, isAppEnabled, reorderDock])

  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setShowDock(true)
  }, [setShowDock])

  const handleMouseLeave = useCallback(() => {
    if (hasVisibleWindows) {
      hideTimeoutRef.current = window.setTimeout(() => {
        setShowDock(false)
      }, 1300)
    }
  }, [hasVisibleWindows, setShowDock])

  // Stabile onClick Handler für jedes Item
  const handleItemClick = useCallback((id: string) => {
    openWindow(id as AppType)
  }, [openWindow])

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Reorder.Group
            axis="x"
            values={dockItems}
            onReorder={handleReorder}
            className="glass-dock rounded-2xl px-1.5 py-1.5 flex items-end gap-0.5"
          >
            {/* App Icons */}
            {dockItems.map((item) => (
              <DockIcon
                key={item.id}
                item={item}
                label={t(item.labelKey)}
                isOpen={openAppIds.has(item.id)}
                onClick={handleItemClick}
              />
            ))}
          </Reorder.Group>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface DockIconProps {
  item: DockItem
  label: string
  isOpen: boolean
  onClick: (id: string) => void
}

// Memoized DockIcon verhindert unnötige Re-Renders
const DockIcon = memo(function DockIcon({ item, label, isOpen, onClick }: DockIconProps) {
  // Stabiler onClick Handler für dieses Item
  const handleClick = useCallback(() => onClick(item.id), [onClick, item.id])

  return (
    <Reorder.Item
      value={item}
      layout
      className="relative flex flex-col items-center p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors group cursor-grab active:cursor-grabbing"
      initial={{ scale: 1, y: 0 }}
      animate={{ scale: 1, y: 0 }}
      whileHover={{ scale: 1.15, y: -4 }}
      whileTap={{ scale: 0.95 }}
      whileDrag={{ scale: 1.1, y: 0, zIndex: 50 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Clickable Area */}
      <button
        onClick={handleClick}
        className="w-11 h-11 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm"
      >
        {item.icon}
      </button>

      {/* Tooltip */}
      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="glass px-2 py-1 rounded text-xs whitespace-nowrap">
          {label}
        </div>
      </div>

      {/* Active indicator dot */}
      {isOpen && (
        <motion.div
          className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        />
      )}
    </Reorder.Item>
  )
})
