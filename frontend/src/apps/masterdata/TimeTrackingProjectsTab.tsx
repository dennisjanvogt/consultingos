import { useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react'
import { useTimeTrackingStore } from '@/stores/timetrackingStore'
import type {
  TimeTrackingProject,
  ProjectColor,
} from '@/api/types'

const colorOptions: { value: ProjectColor; label: string; class: string }[] = [
  { value: 'gray', label: 'Grau', class: 'bg-gray-500' },
  { value: 'violet', label: 'Lavendel', class: 'bg-violet-500' },
  { value: 'green', label: 'Grün', class: 'bg-green-500' },
  { value: 'yellow', label: 'Gelb', class: 'bg-yellow-500' },
  { value: 'red', label: 'Rot', class: 'bg-red-500' },
  { value: 'purple', label: 'Lila', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
]

function getColorClass(color: ProjectColor): string {
  return colorOptions.find((c) => c.value === color)?.class || 'bg-gray-500'
}

export function TimeTrackingProjectsTab() {
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

  const {
    clients,
    projects,
    fetchClients,
    fetchProjects,
    addProject,
    updateProject,
    deleteProject,
  } = useTimeTrackingStore()

  useEffect(() => {
    fetchClients()
    fetchProjects()
  }, [fetchClients, fetchProjects])

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
      await updateProject(editingProject.id, data)
    } else {
      await addProject(data)
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
    <div className="h-full overflow-auto p-4 space-y-4">
      <button
        onClick={() => {
          setEditingProject(null)
          setFormData({ client: '', name: '', description: '', hourly_rate: '', color: 'violet', status: 'active' })
          setShowForm(true)
        }}
        className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
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
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="active">Aktiv</option>
                <option value="archived">Archiviert</option>
              </select>
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
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
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
                    onClick={() => deleteProject(project.id)}
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
