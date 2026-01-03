import { useEffect } from 'react'
import { useTheme } from './ThemeProvider'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Monitor, Globe, User, LogOut, Sparkles, Calendar, LayoutGrid, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useWindowStore } from '@/stores/windowStore'
import { useCalendarStore } from '@/stores/calendarStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface MenuBarProps {
  onOpenSpotlight?: () => void
}

export function MenuBar({ onOpenSpotlight }: MenuBarProps) {
  const { theme, setTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuthStore()
  const { openWindow, stageManagerEnabled, toggleStageManager, setShowStageThumbnails } = useWindowStore()
  const { events, fetchEvents, setSelectedEventId } = useCalendarStore()

  // Fetch events on mount
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const currentTime = new Date().toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const currentDate = new Date().toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  // Get next upcoming event (today or future, starting from now)
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const currentTimeStr = now.toTimeString().slice(0, 5)

  const nextEvent = events
    .filter((e) => {
      if (e.date > todayStr) return true
      if (e.date === todayStr && e.end_time > currentTimeStr) return true
      return false
    })
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.start_time.localeCompare(b.start_time)
    })[0]

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  return (
    <div className="glass h-7 flex items-center justify-between px-4 text-sm relative">
      {/* Stage Manager Trigger Zone - Center 100px */}
      {stageManagerEnabled && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-[100px] h-full z-10"
          onMouseEnter={() => setShowStageThumbnails(true)}
        />
      )}

      {/* Left side - App name */}
      <div className="flex items-center gap-4">
        <span className="font-semibold">ConsultingOS</span>
        {onOpenSpotlight && (
          <button
            onClick={onOpenSpotlight}
            className="flex items-center gap-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI</span>
            <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-black/10 dark:bg-white/10 rounded">⌘</kbd>
          </button>
        )}
      </div>

      {/* Right side - System tray */}
      <div className="flex items-center gap-3">
        {/* Stage Manager Toggle */}
        <button
          onClick={toggleStageManager}
          className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
            stageManagerEnabled
              ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
              : 'hover:bg-black/5 dark:hover:bg-white/10'
          }`}
          title="Stage Manager"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>

        {/* Next Event */}
        {nextEvent && (
          <button
            onClick={() => {
              setSelectedEventId(nextEvent.id)
              openWindow('calendar')
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors max-w-[200px]"
            title={`${nextEvent.title} - ${nextEvent.start_time}`}
          >
            <Clock className="h-3.5 w-3.5 text-violet-500 shrink-0" />
            <span className="text-xs truncate">
              {nextEvent.date === todayStr ? nextEvent.start_time : new Date(nextEvent.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
            </span>
            <span className="text-xs opacity-70 truncate">{nextEvent.title}</span>
          </button>
        )}

        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5 rounded">
            <Globe className="h-4 w-4" />
            <span className="text-xs uppercase">{i18n.language}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass">
            <DropdownMenuItem onClick={() => changeLanguage('de')}>
              Deutsch
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => changeLanguage('en')}>
              English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5 rounded">
            {theme === 'light' && <Sun className="h-4 w-4" />}
            {theme === 'dark' && <Moon className="h-4 w-4" />}
            {theme === 'system' && <Monitor className="h-4 w-4" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="h-4 w-4 mr-2" />
              {t('settings.light')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="h-4 w-4 mr-2" />
              {t('settings.dark')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="h-4 w-4 mr-2" />
              {t('settings.system')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5 rounded">
              <User className="h-4 w-4" />
              <span className="text-xs">{user.username}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass">
              <DropdownMenuItem className="text-xs text-gray-500" disabled>
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Date & Time - Click to open Calendar */}
        <button
          onClick={() => openWindow('calendar')}
          className="flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
        >
          <Calendar className="h-3.5 w-3.5 opacity-60" />
          <span className="text-xs opacity-80">{currentDate}</span>
        </button>
        <span className="font-medium">{currentTime}</span>
      </div>
    </div>
  )
}
