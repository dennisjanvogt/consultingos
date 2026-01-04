import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Reorder } from 'framer-motion'
import { GripVertical } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { appRegistry, type AppDefinition } from '@/config/apps'

export function AppsTab() {
  const { t } = useTranslation()
  const { settings, fetchSettings, toggleApp, reorderDock, isAppEnabled } = useAppSettingsStore()

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Get all apps from registry sorted by current dock order
  const allApps = settings.dock_order
    .filter(id => appRegistry[id])
    .map(id => appRegistry[id])

  // Add any apps not in dock_order (should be rare)
  Object.values(appRegistry).forEach(app => {
    if (!allApps.find(a => a.id === app.id)) {
      allApps.push(app)
    }
  })

  const handleReorder = (newApps: AppDefinition[]) => {
    const newOrder = newApps.map(app => app.id)
    reorderDock(newOrder)
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
        {t('settings.apps')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('settings.appsDescription')}
      </p>

      <Reorder.Group
        axis="y"
        values={allApps}
        onReorder={handleReorder}
        className="space-y-2"
      >
        {allApps.map((app) => (
          <AppItem
            key={app.id}
            app={app}
            isEnabled={isAppEnabled(app.id)}
            onToggle={() => toggleApp(app.id)}
            t={t}
          />
        ))}
      </Reorder.Group>
    </div>
  )
}

interface AppItemProps {
  app: AppDefinition
  isEnabled: boolean
  onToggle: () => void
  t: (key: string) => string
}

function AppItem({ app, isEnabled, onToggle, t }: AppItemProps) {
  const canToggle = app.canDisable

  return (
    <Reorder.Item
      value={app}
      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-grab active:cursor-grabbing"
      whileDrag={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
    >
      {/* Drag Handle */}
      <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />

      {/* App Icon */}
      <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
        {app.icon}
      </div>

      {/* App Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {t(app.titleKey)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {t(`settings.category.${app.category}`)}
        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (canToggle) onToggle()
        }}
        disabled={!canToggle}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          isEnabled
            ? 'bg-gray-800 dark:bg-gray-200'
            : 'bg-gray-300 dark:bg-gray-600'
        } ${!canToggle ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white dark:bg-gray-800 transition-transform ${
            isEnabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </Reorder.Item>
  )
}
