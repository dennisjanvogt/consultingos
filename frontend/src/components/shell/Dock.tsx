import { useRef, useEffect, useMemo, useCallback, memo, useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useWindowStore, type AppType } from '@/stores/windowStore'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { useAuthStore } from '@/stores/authStore'
import { useAdminStore } from '@/stores/adminStore'
import { useTranslation } from 'react-i18next'
import { appRegistry } from '@/config/apps'
import { EyeOff } from 'lucide-react'

interface DockItem {
  id: string
  icon: React.ReactNode
  labelKey: string
  canDisable: boolean
  badge?: number
}

export function Dock() {
  const { t } = useTranslation()
  const { openWindow, closeWindow, windows, showDock, setShowDock } = useWindowStore()
  const { settings, fetchSettings, isAppEnabled, reorderDock, toggleApp } = useAppSettingsStore()
  const { user } = useAuthStore()
  const { pendingCount, connectWebSocket, disconnectWebSocket } = useAdminStore()
  const hideTimeoutRef = useRef<number | null>(null)
  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null)

  // Fetch app settings on mount
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Connect to WebSocket for real-time admin notifications
  useEffect(() => {
    if (user?.is_staff) {
      connectWebSocket()
      return () => disconnectWebSocket()
    }
  }, [user?.is_staff, connectWebSocket, disconnectWebSocket])

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
        canDisable: appRegistry[id].canDisable,
        badge: id === 'admin' && pendingCount > 0 ? pendingCount : undefined,
      })),
    [settings.dock_order, isAppEnabled, user?.is_staff, pendingCount]
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

  // Handler zum Deaktivieren einer App
  const handleDisableApp = useCallback((id: string) => {
    // Schließe das Fenster falls offen
    const openWindow = windows.find(w => w.appId === id)
    if (openWindow) {
      closeWindow(openWindow.id)
    }
    // Deaktiviere die App
    toggleApp(id)
  }, [windows, closeWindow, toggleApp])

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
                onDisable={handleDisableApp}
                isContextMenuOpen={activeContextMenu === item.id}
                onContextMenuChange={(open) => setActiveContextMenu(open ? item.id : null)}
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
  onDisable: (id: string) => void
  isContextMenuOpen: boolean
  onContextMenuChange: (open: boolean) => void
}

// Memoized DockIcon verhindert unnötige Re-Renders
const DockIcon = memo(function DockIcon({ item, label, isOpen, onClick, onDisable, isContextMenuOpen, onContextMenuChange }: DockIconProps) {
  const { t } = useTranslation()
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const [showConfirm, setShowConfirm] = useState(false)

  // Stabiler onClick Handler für dieses Item
  const handleClick = useCallback(() => onClick(item.id), [onClick, item.id])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!item.canDisable) return
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    onContextMenuChange(true)
  }, [item.canDisable, onContextMenuChange])

  const handleDisableClick = useCallback(() => {
    onContextMenuChange(false)
    setShowConfirm(true)
  }, [onContextMenuChange])

  const handleConfirmDisable = useCallback(() => {
    setShowConfirm(false)
    onDisable(item.id)
  }, [onDisable, item.id])

  // Close context menu on click outside
  useEffect(() => {
    if (!isContextMenuOpen) return
    const handleClickOutside = () => onContextMenuChange(false)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isContextMenuOpen, onContextMenuChange])

  return (
    <Reorder.Item
      value={item}
      layout
      className="relative flex flex-col items-center p-1.5 group cursor-grab active:cursor-grabbing"
      initial={{ scale: 1, y: 0 }}
      animate={{ scale: 1, y: 0 }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.95 }}
      whileDrag={{ scale: 1.05, y: 0, zIndex: 50 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Clickable Area */}
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className="relative w-11 h-11 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-200"
      >
        {item.icon}
        {/* Badge */}
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full shadow-sm"
            style={{ backgroundColor: 'var(--color-gold-400)', color: 'var(--color-gold-900)' }}
          >
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
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

      {/* Context Menu */}
      {isContextMenuOpen && createPortal(
        <div
          className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[140px]"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDisableClick}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <EyeOff className="w-4 h-4" />
            {t('dock.disableApp', 'App deaktivieren')}
          </button>
        </div>,
        document.body
      )}

      {/* Confirmation Dialog */}
      {showConfirm && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm mx-4 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
                <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('dock.disableAppTitle', 'App deaktivieren?')}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {t('dock.disableAppMessage', 'Möchtest du "{{name}}" wirklich deaktivieren? Du kannst sie in den Einstellungen wieder aktivieren.', { name: label })}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('common.cancel', 'Abbrechen')}
              </button>
              <button
                onClick={handleConfirmDisable}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-800 dark:bg-gray-200 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 rounded-lg transition-colors"
              >
                {t('dock.disable', 'Deaktivieren')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Reorder.Item>
  )
})
