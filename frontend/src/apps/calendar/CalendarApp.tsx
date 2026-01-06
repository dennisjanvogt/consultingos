import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  MapPin,
  Trash2,
  Pencil,
  Video,
  Mail,
  Copy,
  Check,
  Users,
  ExternalLink,
} from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useCustomersStore } from '@/stores/customersStore'
import type { CalendarEvent } from '@/api/types'

const EVENT_COLORS = [
  { name: 'lavender', bg: 'bg-lavender-500', light: 'bg-lavender-100 dark:bg-lavender-900/30', text: 'text-lavender-600 dark:text-lavender-400' },
  { name: 'green', bg: 'bg-green-500', light: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  { name: 'red', bg: 'bg-red-500', light: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  { name: 'gold', bg: 'bg-gold-500', light: 'bg-gold-100 dark:bg-gold-900/30', text: 'text-gold-600 dark:text-gold-400' },
  { name: 'orange', bg: 'bg-orange-500', light: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  { name: 'pink', bg: 'bg-pink-500', light: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400' },
]

type ViewType = 'day' | 'week' | 'month' | 'year'

const CALENDAR_VIEW_KEY = 'calendar-view'

export function CalendarApp() {
  const { t, i18n } = useTranslation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null)
  const [view, setView] = useState<ViewType>(() => {
    const saved = localStorage.getItem(CALENDAR_VIEW_KEY)
    return (saved as ViewType) || 'month'
  })

  // Persist view selection
  const handleViewChange = (newView: ViewType) => {
    setView(newView)
    localStorage.setItem(CALENDAR_VIEW_KEY, newView)
  }

  const { events, fetchEvents, addEvent, updateEvent, deleteEvent, getEventsForDate, selectedEventId, setSelectedEventId, enableMeeting, inviteAttendee, removeInvitation, showEventForm, setShowEventForm } = useCalendarStore()

  // Fetch events on mount
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Handle selectedEventId from MenuBar click
  useEffect(() => {
    if (selectedEventId) {
      const event = events.find((e) => e.id === selectedEventId)
      if (event) {
        setViewingEvent(event)
        setCurrentDate(new Date(event.date))
        setSelectedEventId(null) // Clear after opening
      }
    }
  }, [selectedEventId, events, setSelectedEventId])

  // Handle ESC key for hierarchical navigation
  useEffect(() => {
    if (!showEventForm && !selectedDate && !viewingEvent) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return
        }
        e.stopImmediatePropagation()
        if (showEventForm) {
          setShowEventForm(false)
          setEditingEvent(null)
        } else if (viewingEvent) {
          setViewingEvent(null)
        } else if (selectedDate) {
          setSelectedDate(null)
        }
      }
    }

    document.addEventListener('keydown', handleEsc, true)
    return () => document.removeEventListener('keydown', handleEsc, true)
  }, [showEventForm, selectedDate, viewingEvent])

  const locale = i18n.language === 'de' ? 'de-DE' : 'en-US'

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Monday = 0

    const days: (number | null)[] = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  const formatDateKey = (day: number, month?: number, year?: number) => {
    const y = year ?? currentDate.getFullYear()
    const m = month ?? currentDate.getMonth()
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const getEventsForDateKey = (dateKey: string) => {
    return getEventsForDate(dateKey)
  }

  const isToday = (day: number, month?: number, year?: number) => {
    const today = new Date()
    const checkMonth = month ?? currentDate.getMonth()
    const checkYear = year ?? currentDate.getFullYear()
    return (
      day === today.getDate() &&
      checkMonth === today.getMonth() &&
      checkYear === today.getFullYear()
    )
  }

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const navigateDay = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + direction)
    setCurrentDate(newDate)
  }

  const navigateYear = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear() + direction, currentDate.getMonth(), 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleCreateEvent = (date?: string) => {
    setEditingEvent(null)
    setShowEventForm(true)
    if (date) setSelectedDate(date)
  }

  const handleViewEvent = (event: CalendarEvent) => {
    setViewingEvent(event)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setViewingEvent(null)
    setEditingEvent(event)
    setShowEventForm(true)
  }

  const handleDeleteEvent = async (id: number) => {
    if (confirm(t('common.confirm') + '?')) {
      await deleteEvent(id)
    }
  }

  const handleSaveEvent = async (eventData: { title: string; date: string; start_time: string; end_time: string; location?: string; description?: string; color?: string; is_meeting?: boolean }, inviteEmails?: string[]) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, eventData)
    } else {
      const newEvent = await addEvent(eventData)
      // Send invitations if emails provided and event is a meeting
      if (newEvent && inviteEmails && inviteEmails.length > 0 && newEvent.is_meeting) {
        for (const email of inviteEmails) {
          await inviteAttendee(newEvent.id, email)
        }
      }
    }
    setShowEventForm(false)
    setEditingEvent(null)
  }

  const days = getDaysInMonth(currentDate)
  const weekdays = [t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat'), t('calendar.sun')]

  const selectedDateEvents = selectedDate ? getEventsForDateKey(selectedDate) : []

  const getHeaderText = () => {
    switch (view) {
      case 'day':
        return currentDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      case 'week':
        return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
      case 'month':
        return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
      case 'year':
        return currentDate.getFullYear().toString()
    }
  }

  const handleNavigate = (direction: number) => {
    switch (view) {
      case 'day':
        navigateDay(direction)
        break
      case 'week':
      case 'month':
        navigateMonth(direction)
        break
      case 'year':
        navigateYear(direction)
        break
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleNavigate(-1)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleNavigate(1)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {getHeaderText()}
          </h2>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {t('calendar.today')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            {(['day', 'week', 'month', 'year'] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  view === v
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t(`calendar.${v}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Calendar */}
        <div className={`flex-1 p-4 overflow-auto ${selectedDate ? 'w-2/3' : 'w-full'}`}>
          {view === 'month' && (
            <MonthView
              days={days}
              weekdays={weekdays}
              formatDateKey={formatDateKey}
              getEventsForDateKey={getEventsForDateKey}
              isToday={isToday}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onSelectDate={setSelectedDate}
              onViewEvent={handleViewEvent}
              locale={locale}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={events}
              onViewEvent={handleViewEvent}
              locale={locale}
            />
          )}
          {view === 'year' && (
            <YearView
              currentDate={currentDate}
              events={events}
              onSelectMonth={(month) => {
                setCurrentDate(new Date(currentDate.getFullYear(), month, 1))
                handleViewChange('month')
              }}
              locale={locale}
            />
          )}
        </div>

        {/* Side Panel - Selected Date Events */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '33.333%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-4 h-full flex flex-col w-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-gray-100">
                      {new Date(selectedDate).toLocaleDateString(locale, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedDateEvents.length} {t('calendar.events')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto space-y-2">
                  {selectedDateEvents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      {t('calendar.noEvents')}
                    </div>
                  ) : (
                    selectedDateEvents.map((event) => {
                      const color = EVENT_COLORS.find(c => c.name === event.color) || EVENT_COLORS[0]
                      return (
                        <button
                          key={event.id}
                          onClick={() => handleViewEvent(event)}
                          className={`w-full text-left p-3 rounded-lg ${color.light} hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all`}
                        >
                          <h4 className={`font-medium text-sm ${color.text}`}>
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            {event.start_time} - {event.end_time}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>

                <button
                  onClick={() => handleCreateEvent(selectedDate)}
                  className="mt-4 w-full flex items-center justify-center gap-2 text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 py-2 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {t('calendar.addEvent')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {viewingEvent && (
          <EventDetail
            event={viewingEvent}
            onEdit={() => handleEditEvent(viewingEvent)}
            onDelete={async () => {
              await handleDeleteEvent(viewingEvent.id)
              setViewingEvent(null)
            }}
            onClose={() => setViewingEvent(null)}
            locale={locale}
            onEnableMeeting={async () => {
              const updated = await enableMeeting(viewingEvent.id)
              if (updated) setViewingEvent(updated)
            }}
            onInvite={async (email, name) => {
              await inviteAttendee(viewingEvent.id, email, name)
              // Refresh event
              const updated = events.find(e => e.id === viewingEvent.id)
              if (updated) setViewingEvent(updated)
            }}
            onRemoveInvitation={async (invitationId) => {
              await removeInvitation(invitationId, viewingEvent.id)
              // Refresh event
              const updated = events.find(e => e.id === viewingEvent.id)
              if (updated) setViewingEvent(updated)
            }}
          />
        )}
      </AnimatePresence>

      {/* Event Form Modal */}
      <AnimatePresence>
        {showEventForm && (
          <EventForm
            event={editingEvent}
            defaultDate={selectedDate || new Date().toISOString().split('T')[0]}
            onSave={handleSaveEvent}
            onClose={() => {
              setShowEventForm(false)
              setEditingEvent(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Month View Component
interface MonthViewProps {
  days: (number | null)[]
  weekdays: string[]
  formatDateKey: (day: number) => string
  getEventsForDateKey: (dateKey: string) => CalendarEvent[]
  isToday: (day: number) => boolean
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

function MonthView({ days, weekdays, formatDateKey, getEventsForDateKey, isToday, selectedDate, onSelectDate }: MonthViewProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="flex-1 grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="p-1" />
          }

          const dateKey = formatDateKey(day)
          const dayEvents = getEventsForDateKey(dateKey)
          const isSelected = selectedDate === dateKey

          return (
            <motion.button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={`p-1 rounded-lg text-left transition-colors min-h-[80px] flex flex-col ${
                isSelected
                  ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-gray-300 dark:ring-gray-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span
                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday(day)
                    ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {day}
              </span>
              <div className="flex-1 mt-1 space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => {
                  const color = EVENT_COLORS.find(c => c.name === event.color) || EVENT_COLORS[0]
                  return (
                    <div
                      key={event.id}
                      className={`text-[10px] px-1 py-0.5 rounded truncate ${color.light} ${color.text}`}
                    >
                      {event.title}
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-500 px-1">
                    +{dayEvents.length - 3}
                  </div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// Week View Component
interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onSelectDate: (date: string) => void
  onViewEvent: (event: CalendarEvent) => void
  locale: string
}

function WeekView({ currentDate, events, onSelectDate, onViewEvent, locale }: WeekViewProps) {
  // Get start of week (Monday)
  const startOfWeek = new Date(currentDate)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
  startOfWeek.setDate(diff)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek)
    date.setDate(date.getDate() + i)
    return date
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const getEventsForDateTime = (dateKey: string, hour: number) => {
    return events.filter(e => {
      if (e.date !== dateKey) return false
      const eventHour = parseInt(e.start_time.split(':')[0])
      return eventHour === hour
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Week Header */}
      <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2" /> {/* Empty cell for time column */}
        {weekDays.map((date) => {
          const dateKey = date.toISOString().split('T')[0]
          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={`p-2 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                isToday(date) ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <div className="text-xs text-gray-500">
                {date.toLocaleDateString(locale, { weekday: 'short' })}
              </div>
              <div className={`text-sm font-medium ${
                isToday(date) ? 'text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {date.getDate()}
              </div>
            </button>
          )
        })}
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8">
          {hours.map((hour) => (
            <div key={`row-${hour}`} className="contents">
              {/* Time Label */}
              <div className="p-1 text-right pr-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
              {/* Day Cells */}
              {weekDays.map((date) => {
                const dateKey = date.toISOString().split('T')[0]
                const hourEvents = getEventsForDateTime(dateKey, hour)
                return (
                  <div
                    key={`${dateKey}-${hour}`}
                    className="min-h-[40px] border-b border-l border-gray-100 dark:border-gray-800 p-0.5"
                  >
                    {hourEvents.map((event) => {
                      const color = EVENT_COLORS.find(c => c.name === event.color) || EVENT_COLORS[0]
                      return (
                        <button
                          key={event.id}
                          onClick={() => onViewEvent(event)}
                          className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate ${color.light} ${color.text}`}
                        >
                          {event.title}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Day View Component
interface DayViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onViewEvent: (event: CalendarEvent) => void
  locale: string
}

function DayView({ currentDate, events, onViewEvent }: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const dateKey = currentDate.toISOString().split('T')[0]
  const currentHour = new Date().getHours()

  // Scroll to current hour on mount
  useEffect(() => {
    if (scrollRef.current) {
      const hourHeight = 60 // min-h-[60px] per hour row
      const scrollTop = Math.max(0, (currentHour - 1) * hourHeight)
      scrollRef.current.scrollTop = scrollTop
    }
  }, [currentHour])

  const getEventsForHour = (hour: number) => {
    return events.filter(e => {
      if (e.date !== dateKey) return false
      const eventHour = parseInt(e.start_time.split(':')[0])
      return eventHour === hour
    })
  }

  const isCurrentHour = (hour: number) => {
    const today = new Date()
    return currentDate.toDateString() === today.toDateString() && hour === currentHour
  }

  return (
    <div className="h-full flex flex-col">
      {/* Time Grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="space-y-0">
          {hours.map((hour) => {
            const hourEvents = getEventsForHour(hour)
            const isCurrent = isCurrentHour(hour)
            return (
              <div key={hour} className={`flex border-b border-gray-100 dark:border-gray-800 ${isCurrent ? 'bg-lavender-50 dark:bg-lavender-900/20' : ''}`}>
                {/* Time Label */}
                <div className="w-16 p-2 text-right pr-3 shrink-0">
                  <span className="text-xs text-gray-400">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
                {/* Events */}
                <div className="flex-1 min-h-[60px] p-1 space-y-1">
                  {hourEvents.map((event) => {
                    const color = EVENT_COLORS.find(c => c.name === event.color) || EVENT_COLORS[0]
                    return (
                      <button
                        key={event.id}
                        onClick={() => onViewEvent(event)}
                        className={`w-full text-left p-2 rounded-lg ${color.light} hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all`}
                      >
                        <div className={`font-medium text-sm ${color.text}`}>{event.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {event.start_time} - {event.end_time}
                          {event.location && ` • ${event.location}`}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Year View Component
interface YearViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onSelectMonth: (month: number) => void
  locale: string
}

function YearView({ currentDate, events, onSelectMonth, locale }: YearViewProps) {
  const year = currentDate.getFullYear()
  const months = Array.from({ length: 12 }, (_, i) => i)

  const getEventsForMonth = (month: number) => {
    const monthStr = String(month + 1).padStart(2, '0')
    return events.filter(e => e.date.startsWith(`${year}-${monthStr}`))
  }

  const getDaysInMonth = (month: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

    const days: (number | null)[] = []
    for (let i = 0; i < startingDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }

  const isToday = (day: number, month: number) => {
    const today = new Date()
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  const hasEventOnDay = (day: number, month: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.some(e => e.date === dateKey)
  }

  return (
    <div className="h-full overflow-auto">
      <div className="grid grid-cols-4 gap-4 p-2">
        {months.map((month) => {
          const monthEvents = getEventsForMonth(month)
          const days = getDaysInMonth(month)

          return (
            <button
              key={month}
              onClick={() => onSelectMonth(month)}
              className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                  {new Date(year, month).toLocaleDateString(locale, { month: 'long' })}
                </span>
                {monthEvents.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                    {monthEvents.length}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {['M', 'D', 'M', 'D', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} className="text-[8px] text-gray-400 text-center">{d}</div>
                ))}
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={`text-[9px] text-center py-0.5 ${
                      day === null
                        ? ''
                        : isToday(day, month)
                          ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full'
                          : hasEventOnDay(day, month)
                            ? 'text-lavender-600 dark:text-lavender-400 font-semibold'
                            : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Event Form Component
interface EventFormProps {
  event: CalendarEvent | null
  defaultDate: string
  onSave: (event: { title: string; date: string; start_time: string; end_time: string; location?: string; description?: string; color?: string; is_meeting?: boolean }, inviteEmails?: string[]) => void
  onClose: () => void
}

function EventForm({ event, defaultDate, onSave, onClose }: EventFormProps) {
  const { t } = useTranslation()
  const { customers, fetchCustomers } = useCustomersStore()
  const [formData, setFormData] = useState({
    title: event?.title || '',
    date: event?.date || defaultDate,
    start_time: event?.start_time || '09:00',
    end_time: event?.end_time || '10:00',
    location: event?.location || '',
    description: event?.description || '',
    color: event?.color || 'violet',
    is_meeting: event?.is_meeting || false,
  })

  // Email invitation state
  const [inviteEmails, setInviteEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)

  // Fetch customers for suggestions
  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Filter customers based on input - show top 3 matches
  const filteredCustomers = customers.filter((c) => {
    if (!c.email) return false
    if (inviteEmails.includes(c.email.toLowerCase())) return false
    if (!emailInput.trim()) return true // Show all when empty
    const searchLower = emailInput.toLowerCase().trim()
    return (
      c.email.toLowerCase().includes(searchLower) ||
      c.name.toLowerCase().includes(searchLower) ||
      (c.company && c.company.toLowerCase().includes(searchLower))
    )
  }).slice(0, 3)

  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (trimmed && !inviteEmails.includes(trimmed) && trimmed.includes('@')) {
      setInviteEmails([...inviteEmails, trimmed])
      setEmailInput('')
      setShowSuggestions(false)
    }
  }

  const removeEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter((e) => e !== email))
  }

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // If there's a matching customer, use their email
      if (filteredCustomers.length > 0) {
        addEmail(filteredCustomers[0].email)
      } else if (emailInput.includes('@')) {
        // Otherwise add typed email if it contains @
        addEmail(emailInput)
      }
    } else if (e.key === 'Backspace' && !emailInput && inviteEmails.length > 0) {
      removeEmail(inviteEmails[inviteEmails.length - 1])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData, formData.is_meeting ? inviteEmails : undefined)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[calc(100%-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            {event ? t('calendar.editEvent') : t('calendar.newEvent')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('calendar.eventTitle')} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              placeholder={t('calendar.eventTitlePlaceholder')}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('calendar.date')}
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('calendar.from')}
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-2 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('calendar.to')}
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-2 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('calendar.location')}
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              placeholder={t('calendar.locationPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('calendar.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300 resize-none"
              rows={2}
              placeholder={t('calendar.descriptionPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('calendar.color')}
            </label>
            <div className="flex gap-2">
              {EVENT_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.name })}
                  className={`w-7 h-7 rounded-full ${color.bg} transition-transform ${
                    formData.color === color.name ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Video Meeting Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Video className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {t('calendar.videoMeeting')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('calendar.videoMeetingDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_meeting: !formData.is_meeting })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                formData.is_meeting ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                  formData.is_meeting ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Email Invitations - only show when meeting is enabled */}
          <AnimatePresence>
            {formData.is_meeting && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        Teilnehmer einladen
                      </p>
                      <p className="text-xs text-gray-500">
                        E-Mail-Adressen für Einladungen
                      </p>
                    </div>
                  </div>

                  {/* Email chips and input */}
                  <div className="relative">
                    <div
                      className="min-h-[42px] px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-wrap gap-1.5 items-center cursor-text"
                      onClick={() => emailInputRef.current?.focus()}
                    >
                      {inviteEmails.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeEmail(email)
                            }}
                            className="hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        ref={emailInputRef}
                        type="email"
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value)
                          setShowSuggestions(true)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                        onKeyDown={handleEmailKeyDown}
                        placeholder={inviteEmails.length === 0 ? 'E-Mail eingeben...' : ''}
                        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-gray-400"
                      />
                    </div>

                    {/* Suggestions dropdown */}
                    <AnimatePresence>
                      {showSuggestions && filteredCustomers.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-10"
                        >
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => addEmail(customer.email)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                            >
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-800 dark:text-gray-200">{customer.email}</span>
                              <span className="text-gray-400 text-xs">
                                ({customer.company || customer.name})
                              </span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// Event Detail Component
interface EventDetailProps {
  event: CalendarEvent
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  locale: string
  onEnableMeeting: () => Promise<void>
  onInvite: (email: string, name?: string) => Promise<void>
  onRemoveInvitation: (invitationId: number) => Promise<void>
}

function EventDetail({ event, onEdit, onDelete, onClose, locale, onEnableMeeting, onInvite, onRemoveInvitation }: EventDetailProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [isInviting, setIsInviting] = useState(false)

  const color = EVENT_COLORS.find(c => c.name === event.color) || EVENT_COLORS[0]

  const eventDate = new Date(event.date)
  const formattedDate = eventDate.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const copyMeetingLink = () => {
    if (event.meeting_link) {
      navigator.clipboard.writeText(event.meeting_link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail) return
    setIsInviting(true)
    await onInvite(inviteEmail, inviteName)
    setInviteEmail('')
    setInviteName('')
    setShowInviteForm(false)
    setIsInviting(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color bar */}
        <div className={`h-2 ${color.bg}`} />

        {/* Header */}
        <div className="flex items-start justify-between p-5">
          <div className="flex-1 min-w-0">
            <h2 className={`text-xl font-semibold ${color.text}`}>
              {event.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formattedDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-4">
          {/* Time */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {event.start_time} - {event.end_time}
              </p>
              <p className="text-xs text-gray-500">
                {t('calendar.time')}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {event.location}
                </p>
                <p className="text-xs text-gray-500">
                  {t('calendar.location')}
                </p>
              </div>
            </div>
          )}

          {/* Video Meeting Section */}
          {event.is_meeting && event.meeting_link ? (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              {/* Meeting Link */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-lavender-100 dark:bg-lavender-900/30 flex items-center justify-center shrink-0">
                  <Video className="h-4 w-4 text-lavender-600 dark:text-lavender-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {t('calendar.videoMeeting')}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {event.meeting_link}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={copyMeetingLink}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title={t('common.copy')}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  <a
                    href={event.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-lavender-500 hover:bg-lavender-600 text-white rounded-lg transition-colors"
                    title={t('calendar.joinMeeting')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Invitations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('calendar.attendees')} ({event.invitations?.length || 0})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="text-xs text-lavender-600 dark:text-lavender-400 hover:underline"
                  >
                    + {t('calendar.invite')}
                  </button>
                </div>

                {/* Invite Form */}
                {showInviteForm && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder={t('calendar.inviteEmailPlaceholder')}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-lavender-300"
                    />
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder={t('calendar.inviteNamePlaceholder')}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-lavender-300"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowInviteForm(false)}
                        className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleInvite}
                        disabled={!inviteEmail || isInviting}
                        className="flex-1 px-3 py-1.5 text-sm bg-lavender-500 text-white rounded-lg hover:bg-lavender-600 transition-colors disabled:opacity-50"
                      >
                        {isInviting ? '...' : t('calendar.sendInvite')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Invitation List */}
                {event.invitations && event.invitations.length > 0 && (
                  <div className="space-y-1">
                    {event.invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-900/30 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                              {inv.name || inv.email}
                            </p>
                            {inv.name && (
                              <p className="text-xs text-gray-500 truncate">{inv.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            inv.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            inv.status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {t(`calendar.status.${inv.status}`)}
                          </span>
                          <button
                            onClick={() => onRemoveInvitation(inv.id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : !event.is_meeting ? (
            <button
              onClick={onEnableMeeting}
              className="flex items-center gap-3 w-full p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-lavender-100 dark:bg-lavender-900/30 flex items-center justify-center shrink-0">
                <Video className="h-4 w-4 text-lavender-600 dark:text-lavender-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {t('calendar.enableMeeting')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('calendar.enableMeetingDesc')}
                </p>
              </div>
            </button>
          ) : null}

          {/* Description */}
          {event.description && (
            <div className="pt-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                {t('calendar.description')}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            {t('calendar.editEvent')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
