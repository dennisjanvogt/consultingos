import { useTranslation } from 'react-i18next'
import { useTheme } from './ThemeProvider'
import { useAuthStore } from '@/stores/authStore'
import { useWindowStore } from '@/stores/windowStore'
import { Globe, Sun, Moon, Monitor, LogOut, Settings, ShieldCheck, Blocks, Keyboard } from 'lucide-react'
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
  const { setShowDock, openWindow, showKeyboardShortcuts, setShowKeyboardShortcuts } = useWindowStore()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  return (
    <div
      className="glass h-7 flex items-center justify-between px-4 text-sm relative"
      onMouseEnter={() => setShowDock(true)}
    >
      {/* Center - App name (3D hover reveal) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 group cursor-default"
        style={{ perspective: '400px', perspectiveOrigin: 'center center' }}
      >
        {/* COS - 3D Monogram */}
        <span
          className="relative font-black tracking-widest text-gold-500 group-hover:opacity-0 transition-all duration-300 inline-block"
          style={{
            transform: 'rotateY(-8deg) rotateX(3deg)',
            transformStyle: 'preserve-3d',
            textShadow: '1px 1px 0 #8b6914, 2px 2px 0 #6b5210, 2px 3px 5px rgba(0,0,0,0.35)',
          }}
        >
          COS
        </span>
        {/* ConsultingOS - Full 3D Text */}
        <span
          className="absolute left-1/2 -translate-x-1/2 font-black tracking-wide text-gold-500 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap inline-block"
          style={{
            transform: 'rotateY(-8deg) rotateX(3deg)',
            transformStyle: 'preserve-3d',
            textShadow: '1px 1px 0 #8b6914, 2px 2px 0 #6b5210, 2px 3px 5px rgba(0,0,0,0.35)',
          }}
        >
          ConsultingOS
        </span>
      </div>

      {/* Left - Keyboard Shortcuts Toggle + Shortcuts */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
        {/* Toggle Button */}
        <button
          onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
          className={`p-1 rounded transition-colors ${
            showKeyboardShortcuts
              ? 'bg-lavender-500/20 text-lavender-600 dark:text-lavender-400'
              : 'hover:bg-black/5 dark:hover:bg-white/10'
          }`}
          title={t('shortcuts.toggle', 'Tastaturkürzel anzeigen')}
        >
          <Keyboard className="h-3.5 w-3.5" />
        </button>

        {/* Shortcuts (conditional) */}
        {showKeyboardShortcuts && (
          <>
            <div className="flex items-center gap-1">
              <span>AI Orb</span>
              <kbd className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[9px] font-mono">⌥</kbd>
            </div>
            <div className="flex items-center gap-1">
              <span>Max/Min</span>
              <kbd className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[9px] font-mono">Space</kbd>
            </div>
            <div className="flex items-center gap-1">
              <span>Close</span>
              <kbd className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[9px] font-mono">ESC</kbd>
            </div>
            <div className="flex items-center gap-1">
              <span>Tiling</span>
              <kbd className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[9px] font-mono">→</kbd>
            </div>
            <div className="flex items-center gap-1">
              <span>Stage Manager</span>
              <span className="text-[9px] opacity-70">hover ↑</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Dock</span>
              <span className="text-[9px] opacity-70">hover ↓</span>
            </div>
          </>
        )}
      </div>

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
            <DropdownMenuItem onClick={() => changeLanguage('tr')}>
              Turkce
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
            <DropdownMenuTrigger className="flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5 rounded">
              {/* Avatar */}
              <div className="relative w-5 h-5 rounded-full overflow-hidden ring-1 ring-black/10 dark:ring-white/10">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">
                      {(user.first_name?.[0] || user.username[0]).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs">{user.first_name || user.username}</span>
              {/* Admin Badge */}
              {user.is_staff && (
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="glass w-64">
              {/* User Info Header */}
              <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3">
                  {/* Large Avatar */}
                  <div className="relative flex-shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white/50 dark:ring-gray-600/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center ring-2 ring-white/50 dark:ring-gray-600/50">
                        <span className="text-sm font-bold text-white">
                          {user.first_name
                            ? `${user.first_name[0]}${user.last_name?.[0] || ''}`.toUpperCase()
                            : user.username.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {user.is_staff && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-800">
                        <ShieldCheck className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{user.username}
                    </p>
                    {user.is_staff && (
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-medium">
                        <ShieldCheck className="w-2 h-2" />
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-1">
                <DropdownMenuItem onClick={() => openWindow('architecture')}>
                  <Blocks className="h-4 w-4 mr-2" />
                  {t('apps.architecture', 'Architektur')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openWindow('settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('profile.settings', 'Einstellungen')}
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator />

              <div className="p-1">
                <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </div>

              {/* Footer with email */}
              <div className="px-3 py-2 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-200/50 dark:border-gray-700/50">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
