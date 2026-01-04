import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Play,
  Pause,
  Square,
  RotateCcw,
} from 'lucide-react'
import { useTimeTrackingStore } from '@/stores/timetrackingStore'
import type {
  TimeTrackingClient,
  TimeTrackingProject,
  TimeEntry,
  ProjectColor,
} from '@/api/types'

const colorOptions: { value: ProjectColor; label: string; class: string }[] = [
  { value: 'gray', label: 'Grau', class: 'bg-gray-500' },
  { value: 'lavender', label: 'Lavendel', class: 'bg-lavender-500' },
  { value: 'green', label: 'Grün', class: 'bg-green-500' },
  { value: 'gold', label: 'Gold', class: 'bg-gold-500' },
  { value: 'red', label: 'Rot', class: 'bg-red-500' },
  { value: 'purple', label: 'Lila', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
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
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Monday
  startOfWeek.setDate(diff)

  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    dates.push(d)
  }
  return dates
}

export function TimeTrackingApp() {
  const { t } = useTranslation()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [elapsedTime, setElapsedTime] = useState(0)

  const {
    clients,
    projects,
    entries,
    summary,
    activeTab,
    timer,
    fetchClients,
    fetchProjects,
    fetchEntries,
    fetchSummary,
    addClient,
    updateClient,
    deleteClient,
    addProject,
    updateProject,
    deleteProject,
    addEntry,
    updateEntry,
    deleteEntry,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    setTimerProject,
    setTimerDescription,
  } = useTimeTrackingStore()

  const activeProjects = projects.filter((p) => p.status === 'active')

  useEffect(() => {
    fetchClients()
    fetchProjects()
  }, [fetchClients, fetchProjects])

  useEffect(() => {
    const weekDates = getWeekDates(currentWeek)
    const dateFrom = weekDates[0].toISOString().split('T')[0]
    const dateTo = weekDates[6].toISOString().split('T')[0]
    fetchEntries(dateFrom, dateTo)
    fetchSummary(dateFrom, dateTo)
  }, [currentWeek, fetchEntries, fetchSummary])

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
    const interval = setInterval(updateElapsed, 100) // Smoother updates
    return () => clearInterval(interval)
  }, [timer.isRunning, timer.isPaused, timer.startTime, timer.pausedTime])

  const formatElapsedTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [])

  const handleStopTimer = async () => {
    const entry = await stopTimer()
    if (entry) {
      // Refresh entries to show the new entry
      const weekDates = getWeekDates(currentWeek)
      const dateFrom = weekDates[0].toISOString().split('T')[0]
      const dateTo = weekDates[6].toISOString().split('T')[0]
      fetchEntries(dateFrom, dateTo)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Timer Widget */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className={`p-4 rounded-xl transition-all ${
          timer.isRunning && !timer.isPaused
            ? 'bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/20 dark:to-gold-800/20 border-2 border-gold-200 dark:border-gold-800'
            : timer.isPaused
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800'
            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center gap-6">
            {/* Timer Display */}
            <div className="text-center">
              <div className={`text-4xl font-mono font-bold tracking-wider ${
                timer.isRunning && !timer.isPaused
                  ? 'text-gold-600 dark:text-gold-400'
                  : timer.isPaused
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {formatElapsedTime(elapsedTime)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {timer.isRunning && !timer.isPaused && 'Läuft...'}
                {timer.isPaused && 'Pausiert'}
                {!timer.isRunning && !timer.isPaused && 'Bereit'}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {!timer.isRunning && !timer.isPaused ? (
                <button
                  onClick={() => startTimer(timer.projectId || undefined, timer.description)}
                  className="p-3 bg-gold-500 hover:bg-gold-600 text-white rounded-full transition-colors shadow-lg"
                  title="Timer starten"
                >
                  <Play className="h-6 w-6" />
                </button>
              ) : (
                <>
                  {timer.isPaused ? (
                    <button
                      onClick={resumeTimer}
                      className="p-3 bg-gold-500 hover:bg-gold-600 text-white rounded-full transition-colors shadow-lg"
                      title="Fortsetzen"
                    >
                      <Play className="h-6 w-6" />
                    </button>
                  ) : (
                    <button
                      onClick={pauseTimer}
                      className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-colors shadow-lg"
                      title="Pausieren"
                    >
                      <Pause className="h-6 w-6" />
                    </button>
                  )}
                  <button
                    onClick={handleStopTimer}
                    className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors shadow-lg"
                    title="Stoppen und speichern"
                  >
                    <Square className="h-6 w-6" />
                  </button>
                  <button
                    onClick={resetTimer}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Zurücksetzen"
                  >
                    <RotateCcw className="h-5 w-5 text-gray-500" />
                  </button>
                </>
              )}
            </div>

            {/* Project Selection & Description */}
            <div className="flex-1 flex gap-3">
              <select
                value={timer.projectId || ''}
                onChange={(e) => setTimerProject(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-w-[200px]"
                disabled={timer.isRunning || timer.isPaused}
              >
                <option value="">Projekt wählen...</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.client_name})
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={timer.description}
                onChange={(e) => setTimerDescription(e.target.value)}
                placeholder="Was machst du gerade?"
                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          {/* Info Text */}
          {!timer.projectId && (timer.isRunning || timer.isPaused) && (
            <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              Hinweis: Wähle ein Projekt aus, damit der Eintrag beim Stoppen gespeichert wird.
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'entries' && (
          <EntriesTab
            entries={entries}
            projects={projects}
            currentWeek={currentWeek}
            setCurrentWeek={setCurrentWeek}
            onAdd={addEntry}
            onUpdate={updateEntry}
            onDelete={deleteEntry}
          />
        )}
        {activeTab === 'projects' && (
          <ProjectsTab
            projects={projects}
            clients={clients}
            onAdd={addProject}
            onUpdate={updateProject}
            onDelete={deleteProject}
          />
        )}
        {activeTab === 'clients' && (
          <ClientsTab
            clients={clients}
            onAdd={addClient}
            onUpdate={updateClient}
            onDelete={deleteClient}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsTab summary={summary} />
        )}
      </div>
    </div>
  )
}

// ===== Entries Tab =====

interface EntriesTabProps {
  entries: TimeEntry[]
  projects: TimeTrackingProject[]
  currentWeek: Date
  setCurrentWeek: (date: Date) => void
  onAdd: (entry: any) => Promise<TimeEntry | null>
  onUpdate: (id: number, entry: any) => Promise<TimeEntry | null>
  onDelete: (id: number) => Promise<boolean>
}

function EntriesTab({ entries, projects, currentWeek, setCurrentWeek, onAdd, onUpdate, onDelete }: EntriesTabProps) {
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
      await onUpdate(editingEntry.id, data)
    } else {
      await onAdd(data)
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
    <div className="space-y-4">
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
        className="flex items-center gap-2 px-4 py-2 bg-lavender-500 text-white rounded-lg hover:bg-lavender-600 transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 bg-lavender-500 text-white rounded-lg hover:bg-lavender-600"
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
                isToday(date) ? 'border-lavender-500 bg-lavender-50 dark:bg-lavender-900/20' : 'border-gray-200 dark:border-gray-700'
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

// ===== Projects Tab =====

interface ProjectsTabProps {
  projects: TimeTrackingProject[]
  clients: TimeTrackingClient[]
  onAdd: (project: any) => Promise<TimeTrackingProject | null>
  onUpdate: (id: number, project: any) => Promise<TimeTrackingProject | null>
  onDelete: (id: number) => Promise<boolean>
}

function ProjectsTab({ projects, clients, onAdd, onUpdate, onDelete }: ProjectsTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<TimeTrackingProject | null>(null)
  const [formData, setFormData] = useState({
    client: '',
    name: '',
    description: '',
    hourly_rate: '',
    color: 'violet' as ProjectColor,
    status: 'active',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.client || !formData.name) return

    const data = {
      client: parseInt(formData.client),
      name: formData.name,
      description: formData.description,
      hourly_rate: parseFloat(formData.hourly_rate) || 0,
      color: formData.color,
      status: formData.status,
    }

    if (editingProject) {
      await onUpdate(editingProject.id, data)
    } else {
      await onAdd(data)
    }

    setShowForm(false)
    setEditingProject(null)
    setFormData({ client: '', name: '', description: '', hourly_rate: '', color: 'violet', status: 'active' })
  }

  const handleEdit = (project: TimeTrackingProject) => {
    setEditingProject(project)
    setFormData({
      client: String(project.client),
      name: project.name,
      description: project.description,
      hourly_rate: String(project.hourly_rate),
      color: project.color,
      status: project.status,
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          setEditingProject(null)
          setFormData({ client: '', name: '', description: '', hourly_rate: '', color: 'violet', status: 'active' })
          setShowForm(true)
        }}
        className="flex items-center gap-2 px-4 py-2 bg-lavender-500 text-white rounded-lg hover:bg-lavender-600 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Neues Projekt
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Kunde</label>
              <select
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              >
                <option value="">Kunde wählen...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stundensatz (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Farbe</label>
              <div className="flex gap-1">
                {colorOptions.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    className={`w-6 h-6 rounded ${c.class} ${
                      formData.color === c.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-lavender-500 text-white rounded-lg hover:bg-lavender-600"
            >
              <Check className="h-4 w-4" />
              {editingProject ? 'Speichern' : 'Erstellen'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingProject(null)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Projects List */}
      <div className="space-y-2">
        {projects.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Keine Projekte vorhanden</p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getColorClass(project.color)}`} />
                <div>
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-gray-500">{project.client_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-medium">{project.hourly_rate} €/h</div>
                  <div className={`text-xs ${project.status === 'active' ? 'text-green-500' : 'text-gray-500'}`}>
                    {project.status === 'active' ? 'Aktiv' : 'Archiviert'}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(project)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(project.id)}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ===== Clients Tab =====

interface ClientsTabProps {
  clients: TimeTrackingClient[]
  onAdd: (client: any) => Promise<TimeTrackingClient | null>
  onUpdate: (id: number, client: any) => Promise<TimeTrackingClient | null>
  onDelete: (id: number) => Promise<boolean>
}

function ClientsTab({ clients, onAdd, onUpdate, onDelete }: ClientsTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<TimeTrackingClient | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    if (editingClient) {
      await onUpdate(editingClient.id, formData)
    } else {
      await onAdd(formData)
    }

    setShowForm(false)
    setEditingClient(null)
    setFormData({ name: '', email: '', phone: '', address: '', notes: '' })
  }

  const handleEdit = (client: TimeTrackingClient) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          setEditingClient(null)
          setFormData({ name: '', email: '', phone: '', address: '', notes: '' })
          setShowForm(true)
        }}
        className="flex items-center gap-2 px-4 py-2 bg-lavender-500 text-white rounded-lg hover:bg-lavender-600 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Neuer Kunde
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-Mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notizen</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-lavender-500 text-white rounded-lg hover:bg-lavender-600"
            >
              <Check className="h-4 w-4" />
              {editingClient ? 'Speichern' : 'Erstellen'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingClient(null)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Clients List */}
      <div className="space-y-2">
        {clients.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Keine Kunden vorhanden</p>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div>
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-gray-500">
                  {[client.email, client.phone].filter(Boolean).join(' • ')}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(client)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(client.id)}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ===== Reports Tab =====

interface ReportsTabProps {
  summary: any
}

function ReportsTab({ summary }: ReportsTabProps) {
  if (!summary) {
    return <p className="text-gray-500 text-center py-8">Keine Daten für diesen Zeitraum</p>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-lavender-50 dark:bg-lavender-900/20 p-4 rounded-lg">
          <div className="text-sm text-lavender-600 dark:text-lavender-400">Gesamt Stunden</div>
          <div className="text-2xl font-bold text-lavender-700 dark:text-lavender-300">
            {summary.total_hours.toFixed(1)} h
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-sm text-green-600 dark:text-green-400">Gesamt Umsatz</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {summary.total_revenue.toFixed(2)} €
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">Anzahl Einträge</div>
          <div className="text-2xl font-bold">{summary.entries_count}</div>
        </div>
      </div>

      {/* By Project */}
      <div>
        <h3 className="font-medium mb-3">Nach Projekt</h3>
        <div className="space-y-2">
          {summary.by_project.length === 0 ? (
            <p className="text-gray-500">Keine Projektdaten</p>
          ) : (
            summary.by_project.map((p: any) => (
              <div
                key={p.project_id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="font-medium">{p.project_name}</div>
                <div className="text-right">
                  <div>{p.hours.toFixed(1)} h</div>
                  <div className="text-sm text-green-600">{p.revenue.toFixed(2)} €</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* By Client */}
      <div>
        <h3 className="font-medium mb-3">Nach Kunde</h3>
        <div className="space-y-2">
          {summary.by_client.length === 0 ? (
            <p className="text-gray-500">Keine Kundendaten</p>
          ) : (
            summary.by_client.map((c: any) => (
              <div
                key={c.client_id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="font-medium">{c.client_name}</div>
                <div>{c.hours.toFixed(1)} h</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
