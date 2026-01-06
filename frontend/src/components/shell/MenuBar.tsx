import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Calendar, LayoutGrid, Clock, Play, Pause, Square, Timer, ChevronDown, Bot, Image, Check, Grid3X3, Coffee, Focus, Zap, Filter } from 'lucide-react'
import { useWindowStore } from '@/stores/windowStore'
import { useCalendarStore } from '@/stores/calendarStore'
import { useTimeTrackingStore } from '@/stores/timetrackingStore'
import { useAIStore, groupModelsByProvider, type AIModel } from '@/stores/aiStore'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface MenuBarProps {
  onOpenSpotlight?: () => void
}

export function MenuBar({ onOpenSpotlight }: MenuBarProps) {
  const { t } = useTranslation()
  const { openWindow, windows, stageManagerEnabled, toggleStageManager, setShowStageThumbnails, tileAllWindows } = useWindowStore()
  const { events, fetchEvents, setSelectedEventId } = useCalendarStore()
  const {
    timer,
    projects,
    fetchProjects,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    setTimerProject,
    setTimerDescription,
  } = useTimeTrackingStore()

  const [elapsedTime, setElapsedTime] = useState(0)
  const [timerPopoverOpen, setTimerPopoverOpen] = useState(false)

  // Chat model filters (multi-select)
  const [filterFree, setFilterFree] = useState(false)
  const [filterCheap, setFilterCheap] = useState(false)
  const [filterEstablished, setFilterEstablished] = useState(false)
  const [filterNewest, setFilterNewest] = useState(false)

  // Image model filters (multi-select)
  const [imgFilterNewest, setImgFilterNewest] = useState(false)
  const [imgFilterCheap, setImgFilterCheap] = useState(false)
  const [imgFilterEstablished, setImgFilterEstablished] = useState(false)

  // Established providers (major/well-known AI companies)
  const establishedProviders = ['Google', 'Anthropic', 'OpenAI', 'xAI', 'Meta', 'Zhipu', 'Z.ai']

  // Established image providers
  const establishedImageProviders = ['Google', 'OpenAI', 'FLUX', 'Stability', 'Ideogram', 'Recraft']

  // Get newest model per provider (first model in each provider's list is typically newest)
  const getNewestModelsPerProvider = (models: AIModel[]): Set<string> => {
    const newestByProvider = new Map<string, AIModel>()
    models.forEach((model) => {
      if (!newestByProvider.has(model.provider)) {
        newestByProvider.set(model.provider, model)
      }
    })
    return new Set(Array.from(newestByProvider.values()).map(m => m.id))
  }

  // Pomodoro state from store (persisted)
  const {
    isActive: pomodoroActive,
    minutes: pomodoroMinutes,
    endTime: pomodoroEndTime,
    isBreak,
    startPomodoro: startPomodoroStore,
    stopPomodoro: stopPomodoroStore,
    setBreak,
  } = usePomodoroStore()
  const [pomodoroRemaining, setPomodoroRemaining] = useState(0)
  const [pomodoroPopoverOpen, setPomodoroPopoverOpen] = useState(false)

  const pomodoroOptions = [
    { minutes: 15, label: 'Quick', icon: Zap, breakMinutes: 3 },
    { minutes: 25, label: 'Classic', icon: Focus, breakMinutes: 5 },
    { minutes: 50, label: 'Deep Work', icon: Coffee, breakMinutes: 10 },
  ]

  const startPomodoro = (minutes: number, breakMinutes: number) => {
    startPomodoroStore(minutes, breakMinutes)
    setPomodoroPopoverOpen(false)
  }

  const stopPomodoro = useCallback(() => {
    stopPomodoroStore()
  }, [stopPomodoroStore])

  // Pomodoro countdown effect
  useEffect(() => {
    if (!pomodoroActive || !pomodoroEndTime) return

    const updateRemaining = () => {
      const remaining = Math.max(0, pomodoroEndTime - Date.now())
      setPomodoroRemaining(remaining)

      if (remaining === 0) {
        // Play notification sound or show notification
        if (Notification.permission === 'granted') {
          new Notification(isBreak ? 'Pause vorbei!' : 'Pomodoro fertig!', {
            body: isBreak ? 'Zeit weiterzuarbeiten.' : 'Zeit für eine Pause!',
            icon: '/favicon.ico'
          })
        }

        if (!isBreak) {
          // Start break
          const option = pomodoroOptions.find(o => o.minutes === pomodoroMinutes)
          const breakMinutes = option?.breakMinutes || 5
          setBreak(true, breakMinutes)
        } else {
          // Break is over, stop
          stopPomodoro()
        }
      }
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoroActive, pomodoroEndTime, isBreak, pomodoroMinutes])

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const {
    chatModel,
    imageModel,
    chatModels,
    imageModels,
    isLoadingModels,
    setChatModel,
    setImageModel,
    getChatModelInfo,
    getImageModelInfo,
    fetchModels,
  } = useAIStore()
  const currentChatModel = getChatModelInfo()
  const currentImageModel = getImageModelInfo()

  // Check if any windows are currently tiled (for snap toggle state)
  const visibleWindows = windows.filter((w) => !w.isMinimized && !w.isMaximized)
  const isSnapEnabled = visibleWindows.length > 0 && visibleWindows.some((w) => w.isTiled)

  // Filter chat models based on selected filters (multi-select)
  const newestModelIds = filterNewest ? getNewestModelsPerProvider(chatModels) : null
  const hasActiveFilter = filterFree || filterCheap || filterEstablished || filterNewest

  const filteredChatModels = chatModels.filter((model) => {
    // If no filters active, show all
    if (!hasActiveFilter) return true

    // Check each filter - model must pass ALL active filters
    if (filterFree && !model.isFree) return false
    if (filterCheap && !model.isFree && (model.inputPrice > 1 || model.outputPrice > 1)) return false
    if (filterEstablished && !establishedProviders.includes(model.provider)) return false
    if (filterNewest && newestModelIds && !newestModelIds.has(model.id)) return false

    return true
  })

  // Filter image models based on selected filters (multi-select)
  const newestImageModelIds = imgFilterNewest ? getNewestModelsPerProvider(imageModels) : null
  const hasActiveImageFilter = imgFilterNewest || imgFilterCheap || imgFilterEstablished

  const filteredImageModels = imageModels.filter((model) => {
    // If no filters active, show all
    if (!hasActiveImageFilter) return true

    // Check each filter - model must pass ALL active filters
    if (imgFilterCheap && model.inputPrice > 0.05) return false // Cheap = unter $0.05 pro Bild
    if (imgFilterEstablished && !establishedImageProviders.includes(model.provider)) return false
    if (imgFilterNewest && newestImageModelIds && !newestImageModelIds.has(model.id)) return false

    return true
  })

  // Group models by provider
  const groupedChatModels = groupModelsByProvider(filteredChatModels)
  const groupedImageModels = groupModelsByProvider(filteredImageModels)

  // Format price for display
  const formatPrice = (model: AIModel, isImage = false) => {
    if (model.isFree) return 'Kostenlos'
    if (isImage) return `$${model.inputPrice.toFixed(3)}/Bild`
    return `$${model.inputPrice.toFixed(2)}/${model.outputPrice.toFixed(2)}`
  }

  const activeProjects = projects.filter((p) => p.status === 'active')

  // Fetch events, projects, and AI models on mount
  useEffect(() => {
    fetchEvents()
    fetchProjects()
    fetchModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (!timer.isRunning && !timer.isPaused) {
      setElapsedTime(0)
      return
    }

    const updateElapsed = () => {
      let totalMs = timer.pausedTime
      if (timer.startTime && !timer.isPaused) {
        totalMs += Date.now() - timer.startTime
      }
      setElapsedTime(totalMs)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [timer.isRunning, timer.isPaused, timer.startTime, timer.pausedTime])

  const formatElapsedTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  const formatPomodoroTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

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

  return (
    <div className="glass h-7 flex items-center justify-between px-4 text-sm relative">
      {/* Stage Manager Trigger Zone - Center 100px */}
      {stageManagerEnabled && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-[100px] h-full z-10"
          onMouseEnter={() => setShowStageThumbnails(true)}
        />
      )}

      {/* Left side - AI controls */}
      <div className="flex items-center gap-4">
        {onOpenSpotlight && (
          <button
            onClick={onOpenSpotlight}
            className="flex items-center gap-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI</span>
            <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-black/10 dark:bg-white/10 rounded">⌥</kbd>
          </button>
        )}

        {/* Chat Model Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5 rounded transition-colors">
              <Bot className="h-3.5 w-3.5 opacity-60" />
              <span className="max-w-[100px] truncate">{currentChatModel?.name || 'Chat'}</span>
              {hasActiveFilter && (
                <Filter className="h-3 w-3 text-lavender-500" />
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72 max-h-[400px] overflow-y-auto glass">
            {/* Filter Buttons - Multi-select toggles */}
            <div className="p-2 border-b border-black/10 dark:border-white/10">
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setFilterNewest(!filterNewest)
                  }}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                    filterNewest
                      ? 'bg-lavender-500 text-white'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                >
                  Neueste
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setFilterFree(!filterFree)
                  }}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                    filterFree
                      ? 'bg-green-500 text-white'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                >
                  Gratis
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setFilterCheap(!filterCheap)
                  }}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                    filterCheap
                      ? 'bg-blue-500 text-white'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                >
                  Günstig
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setFilterEstablished(!filterEstablished)
                  }}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                    filterEstablished
                      ? 'bg-gold-500 text-white'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                >
                  Etabliert
                </button>
              </div>
              {hasActiveFilter && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setFilterFree(false)
                    setFilterCheap(false)
                    setFilterEstablished(false)
                    setFilterNewest(false)
                  }}
                  className="w-full mt-1 px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
            {isLoadingModels ? (
              <div className="p-4 text-center text-sm text-gray-500">Lade Modelle...</div>
            ) : filteredChatModels.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Keine Modelle mit diesen Filtern
              </div>
            ) : (
              Object.entries(groupedChatModels).map(([provider, models]) => (
                <div key={provider}>
                  <DropdownMenuLabel className="text-xs text-lavender-600 dark:text-lavender-400">
                    {provider}
                  </DropdownMenuLabel>
                  {models.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setChatModel(model.id)}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{model.name}</span>
                          {chatModel === model.id && <Check className="h-3.5 w-3.5 text-lavender-500" />}
                        </div>
                        <span className="text-xs opacity-60 truncate block">{model.description}</span>
                      </div>
                      <span className="text-[10px] opacity-50 whitespace-nowrap">{formatPrice(model)}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Image Model Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5 rounded transition-colors">
              <Image className="h-3.5 w-3.5 opacity-60" />
              <span>{currentImageModel?.name?.split('(')[0].trim() || 'Bild'}</span>
              {hasActiveImageFilter && (
                <Filter className="h-3 w-3 text-lavender-500" />
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72 max-h-[400px] overflow-y-auto glass">
            {/* Filter Buttons - Multi-select toggles */}
            <div className="p-2 border-b border-black/10 dark:border-white/10">
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setImgFilterNewest(!imgFilterNewest)
                  }}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                    imgFilterNewest
                      ? 'bg-lavender-500 text-white'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                >
                  Neueste
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setImgFilterCheap(!imgFilterCheap)
                  }}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                    imgFilterCheap
                      ? 'bg-blue-500 text-white'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                >
                  Günstig
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setImgFilterEstablished(!imgFilterEstablished)
                  }}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                    imgFilterEstablished
                      ? 'bg-gold-500 text-white'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                >
                  Etabliert
                </button>
              </div>
              {hasActiveImageFilter && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setImgFilterNewest(false)
                    setImgFilterCheap(false)
                    setImgFilterEstablished(false)
                  }}
                  className="w-full mt-1 px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
            {isLoadingModels ? (
              <div className="p-4 text-center text-sm text-gray-500">Lade Modelle...</div>
            ) : filteredImageModels.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {hasActiveImageFilter ? 'Keine Modelle mit diesen Filtern' : 'Keine Modelle verfügbar'}
              </div>
            ) : (
              Object.entries(groupedImageModels).map(([provider, models]) => (
                <div key={provider}>
                  <DropdownMenuLabel className="text-xs text-lavender-600 dark:text-lavender-400">
                    {provider}
                  </DropdownMenuLabel>
                  {models.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setImageModel(model.id)}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{model.name}</span>
                          {imageModel === model.id && <Check className="h-3.5 w-3.5 text-lavender-500" />}
                        </div>
                        <span className="text-xs opacity-60 truncate block">{model.description}</span>
                      </div>
                      <span className="text-[10px] opacity-50 whitespace-nowrap">{formatPrice(model, true)}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right side - System tray */}
      <div className="flex items-center gap-3">
        {/* Stage Manager Toggle */}
        <div className="flex items-center gap-1">
          <motion.button
            layout
            onClick={toggleStageManager}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              stageManagerEnabled
                ? 'bg-lavender-500/20 text-lavender-600 dark:text-lavender-400'
                : 'hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Stage Manager"
          >
            <LayoutGrid className="h-4 w-4" />
          </motion.button>

          {/* Snap to Grid Toggle - nur ohne Stage Manager */}
          <AnimatePresence>
            {!stageManagerEnabled && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.8, width: 0 }}
                transition={{ duration: 0.2 }}
                onClick={tileAllWindows}
                className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors overflow-hidden ${
                  isSnapEnabled
                    ? 'bg-gold-500/20 text-gold-600 dark:text-gold-400'
                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                title="Raster-Snapping (→)"
              >
                <Grid3X3 className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Timer Display */}
        <Popover open={timerPopoverOpen} onOpenChange={setTimerPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-1">
              {(timer.isRunning || timer.isPaused) ? (
                <>
                  {/* Timer Zeit - klickbar für Popover */}
                  <button
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${
                      timer.isPaused
                        ? 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                        : 'bg-lavender-500/20 text-lavender-600 dark:text-lavender-400'
                    }`}
                  >
                    <Timer className={`h-3.5 w-3.5 ${timer.isRunning && !timer.isPaused ? 'animate-pulse' : ''}`} />
                    <span className="text-xs font-mono font-medium">{formatElapsedTime(elapsedTime)}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>

                  {/* Pause/Resume Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      timer.isPaused ? resumeTimer() : pauseTimer()
                    }}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    title={timer.isPaused ? 'Fortsetzen' : 'Pausieren'}
                  >
                    {timer.isPaused ? (
                      <Play className="h-3.5 w-3.5 text-lavender-500" />
                    ) : (
                      <Pause className="h-3.5 w-3.5 text-lavender-400" />
                    )}
                  </button>

                  {/* Stop Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      stopTimer()
                      setTimerPopoverOpen(false)
                    }}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    title="Stoppen"
                  >
                    <Square className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  </button>
                </>
              ) : (
                /* Start Timer Button */
                <button
                  className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Timer starten"
                >
                  <Timer className="h-4 w-4 opacity-60" />
                </button>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="center">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Timer</span>
                {(timer.isRunning || timer.isPaused) && (
                  <span className={`text-lg font-mono font-bold ${
                    timer.isPaused ? 'text-gray-500' : 'text-lavender-600 dark:text-lavender-400'
                  }`}>
                    {formatElapsedTime(elapsedTime)}
                  </span>
                )}
              </div>

              {/* Projekt-Auswahl */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Projekt</label>
                <select
                  value={timer.projectId || ''}
                  onChange={(e) => setTimerProject(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-2 py-1.5 text-sm border border-black/10 dark:border-white/10 rounded-lg bg-white/50 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-lavender-500/50"
                >
                  <option value="">Kein Projekt</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Beschreibung */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Beschreibung</label>
                <input
                  type="text"
                  value={timer.description}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  placeholder="Was machst du?"
                  className="w-full px-2 py-1.5 text-sm border border-black/10 dark:border-white/10 rounded-lg bg-white/50 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-lavender-500/50"
                />
              </div>

              {/* Start/Stop Buttons */}
              <div className="flex gap-2">
                {!(timer.isRunning || timer.isPaused) ? (
                  <button
                    onClick={() => {
                      startTimer(timer.projectId || undefined, timer.description)
                      setTimerPopoverOpen(false)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-lavender-500 text-white text-sm rounded-lg hover:bg-lavender-600 transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    Starten
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => timer.isPaused ? resumeTimer() : pauseTimer()}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        timer.isPaused
                          ? 'bg-lavender-500 text-white hover:bg-lavender-600'
                          : 'bg-lavender-500/20 text-lavender-700 dark:text-lavender-300 hover:bg-lavender-500/30'
                      }`}
                    >
                      {timer.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      {timer.isPaused ? 'Fortsetzen' : 'Pause'}
                    </button>
                    <button
                      onClick={() => {
                        stopTimer()
                        setTimerPopoverOpen(false)
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-1.5 bg-black/10 dark:bg-white/10 text-sm rounded-lg hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                    >
                      <Square className="h-4 w-4" />
                      Stop
                    </button>
                  </>
                )}
              </div>

              {/* Hinweis wenn kein Projekt */}
              {!timer.projectId && (timer.isRunning || timer.isPaused) && (
                <p className="text-xs text-lavender-600 dark:text-lavender-400 opacity-80">
                  Wähle ein Projekt, um den Eintrag zu speichern.
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>

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
            <Clock className="h-3.5 w-3.5 text-lavender-500 shrink-0" />
            <span className="text-xs truncate">
              {nextEvent.date === todayStr ? nextEvent.start_time : new Date(nextEvent.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
            </span>
            <span className="text-xs opacity-70 truncate">{nextEvent.title}</span>
          </button>
        )}

        {/* Date & Time - Click to open Calendar */}
        <button
          onClick={() => openWindow('calendar')}
          className="flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
        >
          <Calendar className="h-3.5 w-3.5 opacity-60" />
          <span className="text-xs opacity-80">{currentDate}</span>
        </button>

        {/* Pomodoro Timer / Clock */}
        <Popover open={pomodoroPopoverOpen} onOpenChange={setPomodoroPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className={`font-medium px-2 py-0.5 rounded transition-colors ${
                pomodoroActive
                  ? isBreak
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                    : 'bg-gold-600/20 text-gold-600 dark:text-gold-400'
                  : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              {pomodoroActive ? (
                <span className="flex items-center gap-1.5">
                  {isBreak ? <Coffee className="h-3.5 w-3.5" /> : <Focus className="h-3.5 w-3.5" />}
                  {formatPomodoroTime(pomodoroRemaining)}
                </span>
              ) : (
                currentTime
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-3">
              {pomodoroActive ? (
                <>
                  <div className="text-center">
                    <div className={`text-3xl font-mono font-bold ${
                      isBreak ? 'text-green-600 dark:text-green-400' : 'text-gold-600 dark:text-gold-400'
                    }`}>
                      {formatPomodoroTime(pomodoroRemaining)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {isBreak ? 'Pause' : `${pomodoroMinutes} min Fokus`}
                    </div>
                  </div>
                  <button
                    onClick={stopPomodoro}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Square className="h-4 w-4" />
                    Abbrechen
                  </button>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium text-center mb-2">Pomodoro starten</div>
                  <div className="grid grid-cols-3 gap-2">
                    {pomodoroOptions.map((option) => (
                      <button
                        key={option.minutes}
                        onClick={() => startPomodoro(option.minutes, option.breakMinutes)}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-lavender-100 dark:hover:bg-lavender-900/30 transition-colors"
                      >
                        <option.icon className="h-5 w-5 text-lavender-500" />
                        <span className="text-lg font-bold">{option.minutes}</span>
                        <span className="text-[10px] text-gray-500">{option.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 text-center">
                    Nach Fokus-Zeit folgt automatisch Pause
                  </p>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
