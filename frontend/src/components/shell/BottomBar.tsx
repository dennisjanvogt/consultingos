import { useTranslation } from 'react-i18next'
import { useTheme } from './ThemeProvider'
import { useAuthStore } from '@/stores/authStore'
import { useWindowStore } from '@/stores/windowStore'
import { Globe, Sun, Moon, Monitor, User, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export function BottomBar() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuthStore()
  const setShowDock = useWindowStore((state) => state.setShowDock)

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  return (
    <div
      className="glass h-7 flex items-center justify-end px-4 text-sm"
      onMouseEnter={() => setShowDock(true)}
    >
      {/* Right side - Settings */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5 rounded">
            <Globe className="h-4 w-4" />
            <span className="text-xs uppercase">{i18n.language}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="glass">
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
          <DropdownMenuContent align="end" side="top" className="glass">
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
            <DropdownMenuContent align="end" side="top" className="glass">
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
      </div>
    </div>
  )
}
