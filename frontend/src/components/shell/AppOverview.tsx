import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { useWindowStore } from '@/stores/windowStore'
import { useAuthStore } from '@/stores/authStore'
import { appRegistry, type AppCategory } from '@/config/apps'

const categoryOrder: AppCategory[] = ['core', 'productivity', 'tools', 'games', 'admin']

export function AppOverview() {
  const { t } = useTranslation()
  const isOpen = useWindowStore((state) => state.isAppOverviewOpen)
  const setOpen = useWindowStore((state) => state.setAppOverviewOpen)
  const openWindow = useWindowStore((state) => state.openWindow)
  const user = useAuthStore((state) => state.user)
  const [searchQuery, setSearchQuery] = useState('')

  // Get all apps that the user has access to
  const availableApps = useMemo(() => {
    return Object.values(appRegistry).filter(app => {
      // Check admin-only apps
      if (app.adminOnly && !user?.is_staff) return false
      return true
    })
  }, [user?.is_staff])

  // Filter apps based on search
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return availableApps

    const query = searchQuery.toLowerCase()
    return availableApps.filter(app => {
      const appName = t(app.titleKey).toLowerCase()
      const category = t(`settings.category.${app.category}`).toLowerCase()
      return appName.includes(query) || category.includes(query) || app.id.includes(query)
    })
  }, [availableApps, searchQuery, t])

  // Group apps by category
  const groupedApps = useMemo(() => {
    const groups: Record<string, typeof availableApps> = {}

    filteredApps.forEach(app => {
      if (!groups[app.category]) {
        groups[app.category] = []
      }
      groups[app.category].push(app)
    })

    return categoryOrder
      .filter(cat => groups[cat]?.length > 0)
      .map(cat => ({
        category: cat,
        apps: groups[cat]
      }))
  }, [filteredApps])

  // Handle keyboard
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, setOpen])

  // Reset search when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  const handleAppClick = (appId: string) => {
    openWindow(appId as keyof typeof appRegistry)
    setOpen(false)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
    >
      <div
        className="h-full flex flex-col items-center pt-8 pb-16 overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="relative w-full max-w-md mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('appOverview.search', 'Apps durchsuchen...')}
            autoFocus
            className="w-full pl-12 pr-12 py-3 text-lg bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Apps Grid */}
        <div className="w-full max-w-7xl px-8">
          {filteredApps.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">{t('appOverview.noApps', 'Keine Apps gefunden')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedApps.map(({ category, apps }) => (
                <div key={category}>
                  {/* Category Header */}
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pl-2">
                    {t(`settings.category.${category}`)}
                  </h3>

                  {/* Apps Grid */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
                    {apps.map((app) => (
                      <button
                        key={app.id}
                        onClick={() => handleAppClick(app.id)}
                        className="group flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        {/* App Icon */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-200">
                          {app.icon}
                        </div>

                        {/* App Name */}
                        <span className="text-xs text-gray-300 text-center line-clamp-2 group-hover:text-white transition-colors">
                          {t(app.titleKey)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close hint */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-gray-500 text-sm flex items-center gap-2">
          <kbd className="px-2 py-1 bg-white/10 rounded text-xs">ESC</kbd>
          <span>{t('appOverview.closeHint', 'zum Schließen')}</span>
        </div>
      </div>
    </div>
  )
}
