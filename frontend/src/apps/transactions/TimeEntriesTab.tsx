import { useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from 'lucide-react'
import { useTimeTrackingStore } from '@/stores/timetrackingStore'
import type {
  TimeTrackingProject,
  TimeEntry,
  ProjectColor,
} from '@/api/types'

const colorOptions: { value: ProjectColor; class: string }[] = [
  { value: 'gray', class: 'bg-gray-500' },
  { value: 'violet', class: 'bg-violet-500' },
  { value: 'green', class: 'bg-green-500' },
  { value: 'yellow', class: 'bg-yellow-500' },
  { value: 'red', class: 'bg-red-500' },
  { value: 'purple', class: 'bg-purple-500' },
  { value: 'pink', class: 'bg-pink-500' },
  { value: 'orange', class: 'bg-orange-500' },
]

function getColorClass(color: ProjectColor): string {
  return colorOptions.find((c) => c.value === color)?.class || 'bg-gray-500'
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}:${mins.toString().padStart(2, '0')}`
}

function getWeekDates(date: Date): Date[] {
  const startOfWeek = new Date(date)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
  startOfWeek.setDate(diff)

  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    dates.push(d)
  }
  return dates
}

export function TimeEntriesTab() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [formData, setFormData] = useState({
    project: '',
    date: '',
    start_time: '',
    end_time: '',
    description: '',
    billable: true,
  })

  const {
    projects,
    entries,
    fetchProjects,
    fetchEntries,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useTimeTrackingStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    const weekDates = getWeekDates(currentWeek)
    const dateFrom = weekDates[0].toISOString().split('T')[0]
    const dateTo = weekDates[6].toISOString().split('T')[0]
    fetchEntries(dateFrom, dateTo)
  }, [currentWeek, fetchEntries])

  const weekDates = getWeekDates(currentWeek)
  const activeProjects = projects.filter((p) => p.status === 'active')

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + direction * 7)
    setCurrentWeek(newDate)
  }

  const getEntriesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return entries.filter((e) => e.date === dateStr)
  }

  const getTotalForDate = (date: Date) => {
    const dayEntries = getEntriesForDate(date)
    return dayEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
  }

  const getWeekTotal = () => {
    return weekDates.reduce((sum, date) => sum + getTotalForDate(date), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.project || !formData.date || !formData.start_time || !formData.end_time) return

    const data = {
      project: parseInt(formData.project),
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      description: formData.description,
      billable: formData.billable,
    }

    if (editingEntry) {
      await updateEntry(editingEntry.id, data)
    } else {
      await addEntry(data)
    }

    setShowForm(false)
    setEditingEntry(null)
    setFormData({ project: '', date: '', start_time: '', end_time: '', description: '', billable: true })
  }

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setFormData({
      project: String(entry.project),
      date: entry.date,
      start_time: entry.start_time,
      end_time: entry.end_time,
      description: entry.description,
      billable: entry.billable,
    })
    setShowForm(true)
  }

  const handleNewEntry = (date?: Date) => {
    setEditingEntry(null)
    setFormData({
      project: '',
      date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      description: '',
      billable: true,
    })
    setShowForm(true)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <span className="font-medium">
            {weekDates[0].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
            {' - '}
            {weekDates[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <div className="text-sm text-gray-500">
            Gesamt: {formatDuration(getWeekTotal())} h
          </div>
        </div>
        <button
          onClick={() => navigateWeek(1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* New Entry Button */}
      <button
        onClick={() => handleNewEntry()}
        className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Neuer Eintrag
      </button>

      {/* Entry Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Projekt</label>
              <select
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              >
                <option value="">Projekt wählen...</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.client_name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Datum</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ende</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Beschreibung</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Was hast du gemacht?"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="billable"
              checked={formData.billable}
              onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="billable" className="text-sm">Abrechenbar</label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
            >
              <Check className="h-4 w-4" />
              {editingEntry ? 'Speichern' : 'Erstellen'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingEntry(null)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const dayEntries = getEntriesForDate(date)
          const dayTotal = getTotalForDate(date)

          return (
            <div
              key={date.toISOString()}
              className={`border rounded-lg p-2 min-h-[150px] ${
                isToday(date) ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">
                  {date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric' })}
                </div>
                <button
                  onClick={() => handleNewEntry(date)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-1">
                {dayEntries.map((entry) => {
                  const project = projects.find((p) => p.id === entry.project)
                  return (
                    <div
                      key={entry.id}
                      className={`text-xs p-1.5 rounded cursor-pointer hover:opacity-80 ${getColorClass(project?.color || 'gray')} text-white`}
                      onClick={() => handleEdit(entry)}
                    >
                      <div className="font-medium truncate">{entry.project_name}</div>
                      <div className="opacity-80">
                        {entry.start_time} - {entry.end_time} ({formatDuration(entry.duration_minutes)})
                      </div>
                    </div>
                  )
                })}
              </div>
              {dayTotal > 0 && (
                <div className="text-xs text-gray-500 mt-2 pt-1 border-t border-gray-200 dark:border-gray-700">
                  {formatDuration(dayTotal)} h
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
