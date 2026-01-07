import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { appRegistry, type AppDefinition } from '@/config/apps'

const categoryOrder = ['core', 'productivity', 'tools', 'games', 'admin']

export function AppsTab() {
  const { t } = useTranslation()
  const { settings, fetchSettings, toggleApp, isAppEnabled, enableAllApps, disableAllApps } = useAppSettingsStore()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Get all apps from registry
  const allApps = useMemo(() => {
    return Object.values(appRegistry)
  }, [])

  // Filter apps based on search query
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return allApps

    const query = searchQuery.toLowerCase()
    return allApps.filter(app => {
      const appName = t(app.titleKey).toLowerCase()
      const category = t(`settings.category.${app.category}`).toLowerCase()
      return appName.includes(query) || category.includes(query) || app.id.includes(query)
    })
  }, [allApps, searchQuery, t])

  // Group apps by category
  const groupedApps = useMemo(() => {
    const groups: Record<string, AppDefinition[]> = {}

    filteredApps.forEach(app => {
      if (!groups[app.category]) {
        groups[app.category] = []
      }
      groups[app.category].push(app)
    })

    // Sort categories by predefined order
    return categoryOrder
      .filter(cat => groups[cat]?.length > 0)
      .map(cat => ({
        category: cat,
        apps: groups[cat]
      }))
  }, [filteredApps])

  const isSearching = searchQuery.trim().length > 0

  // Get all app IDs and required (non-disableable) app IDs
  const allAppIds = useMemo(() => allApps.map(app => app.id), [allApps])
  const requiredAppIds = useMemo(() => allApps.filter(app => !app.canDisable).map(app => app.id), [allApps])

  const handleEnableAll = () => {
    enableAllApps(allAppIds)
  }

  const handleDisableAll = () => {
    disableAllApps(requiredAppIds)
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {t('settings.apps')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleEnableAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
          >
            <ToggleRight className="w-3.5 h-3.5" />
            {t('settings.enableAll')}
          </button>
          <button
            onClick={handleDisableAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ToggleLeft className="w-3.5 h-3.5" />
            {t('settings.disableAll')}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('settings.appsDescription')}
      </p>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('settings.searchApps', 'Apps durchsuchen...')}
          className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results count when searching */}
      {isSearching && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {filteredApps.length} {filteredApps.length === 1 ? 'App' : 'Apps'} {t('settings.found', 'gefunden')}
        </p>
      )}

      {filteredApps.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>{t('settings.noAppsFound', 'Keine Apps gefunden')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedApps.map(({ category, apps }) => (
            <div key={category}>
              {/* Category Header */}
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {t(`settings.category.${category}`)}
              </h3>

              {/* Apps Grid - 3 columns */}
              <div className="grid grid-cols-3 gap-2">
                {apps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isEnabled={isAppEnabled(app.id)}
                    onToggle={() => toggleApp(app.id)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface AppCardProps {
  app: AppDefinition
  isEnabled: boolean
  onToggle: () => void
  t: (key: string) => string
}

function AppCard({ app, isEnabled, onToggle, t }: AppCardProps) {
  const canToggle = app.canDisable
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isEnabled
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60'
      }`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      {showTooltip && app.description && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-[200px] text-center">
            {app.description}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </div>
        </div>
      )}

      {/* App Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isEnabled
          ? 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
      }`}>
        {app.icon}
      </div>

      {/* App Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
          {t(app.titleKey)}
        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={() => canToggle && onToggle()}
        disabled={!canToggle}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
          isEnabled
            ? 'bg-violet-500 dark:bg-violet-400'
            : 'bg-gray-300 dark:bg-gray-600'
        } ${!canToggle ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            isEnabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
