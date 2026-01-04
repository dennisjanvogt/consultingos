import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWindowStore, type AppType } from '@/stores/windowStore'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  FolderOpen,
  Kanban,
  Clock,
} from 'lucide-react'

interface DockItem {
  id: AppType
  icon: React.ReactNode
  labelKey: string
}

const dockItems: DockItem[] = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard className="h-6 w-6" />,
    labelKey: 'apps.dashboard',
  },
  {
    id: 'masterdata',
    icon: <Users className="h-6 w-6" />,
    labelKey: 'apps.masterdata',
  },
  {
    id: 'transactions',
    icon: <FileText className="h-6 w-6" />,
    labelKey: 'apps.transactions',
  },
  {
    id: 'documents',
    icon: <FolderOpen className="h-6 w-6" />,
    labelKey: 'apps.documents',
  },
  {
    id: 'kanban',
    icon: <Kanban className="h-6 w-6" />,
    labelKey: 'apps.kanban',
  },
  {
    id: 'timetracking',
    icon: <Clock className="h-6 w-6" />,
    labelKey: 'apps.timetracking',
  },
  {
    id: 'settings',
    icon: <Settings className="h-6 w-6" />,
    labelKey: 'apps.settings',
  },
]

export function Dock() {
  const { t } = useTranslation()
  const { openWindow, windows, showDock, setShowDock } = useWindowStore()
  const hideTimeoutRef = useRef<number | null>(null)

  const hasVisibleWindows = windows.some((w) => !w.isMinimized)
  const shouldShow = !hasVisibleWindows || showDock

  const isAppOpen = (appId: AppType) => {
    return windows.some((w) => w.appId === appId && !w.isMinimized)
  }

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setShowDock(true)
  }

  const handleMouseLeave = () => {
    if (hasVisibleWindows) {
      hideTimeoutRef.current = window.setTimeout(() => {
        setShowDock(false)
      }, 1300)
    }
  }

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
          <div className="glass-dock rounded-2xl px-1.5 py-1.5 flex items-end gap-0.5">
            {/* App Icons */}
            {dockItems.map((item) => (
              <DockIcon
                key={item.id}
                item={item}
                label={t(item.labelKey)}
                isOpen={isAppOpen(item.id)}
                onClick={() => openWindow(item.id)}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface DockIconProps {
  item: DockItem
  label: string
  isOpen: boolean
  onClick: () => void
}

function DockIcon({ item, label, isOpen, onClick }: DockIconProps) {
  return (
    <motion.button
      className="relative flex flex-col items-center p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
      onClick={onClick}
      whileHover={{ scale: 1.15, y: -4 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Icon */}
      <div className="w-11 h-11 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm">
        {item.icon}
      </div>

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
    </motion.button>
  )
}
