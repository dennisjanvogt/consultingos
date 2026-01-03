import { useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react'
import { useTimeTrackingStore } from '@/stores/timetrackingStore'
import type { TimeTrackingClient } from '@/api/types'

export function TimeTrackingClientsTab() {
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<TimeTrackingClient | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  })

  const {
    clients,
    fetchClients,
    addClient,
    updateClient,
    deleteClient,
  } = useTimeTrackingStore()

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    if (editingClient) {
      await updateClient(editingClient.id, formData)
    } else {
      await addClient(formData)
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
    <div className="h-full overflow-auto p-4 space-y-4">
      <button
        onClick={() => {
          setEditingClient(null)
          setFormData({ name: '', email: '', phone: '', address: '', notes: '' })
          setShowForm(true)
        }}
        className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
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
                  onClick={() => deleteClient(client.id)}
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
