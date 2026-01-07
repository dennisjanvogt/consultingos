import { useState, useEffect } from 'react'
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  ShieldOff,
  Trash2,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Github,
} from 'lucide-react'
import { api } from '@/api/client'
import { useConfirmStore } from '@/stores/confirmStore'

interface AdminUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  github_username: string | null
  is_approved: boolean
  is_staff: boolean
  is_active: boolean
  date_joined: string
  last_login: string | null
}

type TabType = 'pending' | 'all'

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const confirm = useConfirmStore((state) => state.confirm)

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const data = await api.get<AdminUser[]>('/auth/admin/users')
      setUsers(data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter users based on active tab
  const filteredUsers = users.filter((user) => {
    if (activeTab === 'pending') return !user.is_approved
    return true
  })

  const pendingCount = users.filter((u) => !u.is_approved).length

  // Actions
  const handleApprove = async (userId: number) => {
    setActionLoading(userId)
    try {
      await api.post('/auth/admin/approve', { user_id: userId })
      await fetchUsers()
    } catch (err) {
      console.error('Failed to approve user:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (userId: number) => {
    const confirmed = await confirm({
      title: 'User ablehnen',
      message: 'User wirklich ablehnen und löschen?',
      confirmLabel: 'Ablehnen',
      variant: 'danger',
    })
    if (!confirmed) return
    setActionLoading(userId)
    try {
      await api.post('/auth/admin/reject', { user_id: userId })
      await fetchUsers()
    } catch (err) {
      console.error('Failed to reject user:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleStaff = async (userId: number) => {
    setActionLoading(userId)
    try {
      await api.post('/auth/admin/toggle-staff', { user_id: userId })
      await fetchUsers()
    } catch (err) {
      console.error('Failed to toggle staff:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId: number) => {
    const confirmed = await confirm({
      title: 'User löschen',
      message: 'User wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      confirmLabel: 'Löschen',
      variant: 'danger',
    })
    if (!confirmed) return
    setActionLoading(userId)
    try {
      await api.post('/auth/admin/delete-user', { user_id: userId })
      await fetchUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Benutzerverwaltung
              </h1>
              <p className="text-xs text-gray-500">
                {users.length} Benutzer insgesamt
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          Ausstehend
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Alle Benutzer
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            {activeTab === 'pending' ? (
              <>
                <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
                <p className="font-medium">Keine ausstehenden Anfragen</p>
                <p className="text-sm">Alle Benutzer sind freigeschaltet</p>
              </>
            ) : (
              <>
                <Users className="w-12 h-12 text-gray-300 mb-3" />
                <p>Keine Benutzer gefunden</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    {user.username.charAt(0).toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {user.username}
                      </span>
                      {user.github_username && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Github className="w-3 h-3" />
                          {user.github_username}
                        </span>
                      )}
                      {user.is_staff && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                          Admin
                        </span>
                      )}
                      {!user.is_approved && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                          Ausstehend
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.email}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Registriert: {formatDate(user.date_joined)}
                      {user.last_login && ` • Letzter Login: ${formatDate(user.last_login)}`}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {actionLoading === user.id ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <>
                      {!user.is_approved ? (
                        <>
                          <button
                            onClick={() => handleApprove(user.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Freischalten
                          </button>
                          <button
                            onClick={() => handleReject(user.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Ablehnen
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleToggleStaff(user.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              user.is_staff
                                ? 'text-orange-700 bg-orange-100 hover:bg-orange-200 dark:text-orange-400 dark:bg-orange-900/30 dark:hover:bg-orange-900/50'
                                : 'text-purple-700 bg-purple-100 hover:bg-purple-200 dark:text-purple-400 dark:bg-purple-900/30 dark:hover:bg-purple-900/50'
                            }`}
                            title={user.is_staff ? 'Admin-Rechte entziehen' : 'Zum Admin machen'}
                          >
                            {user.is_staff ? (
                              <>
                                <ShieldOff className="w-3.5 h-3.5" />
                                Degradieren
                              </>
                            ) : (
                              <>
                                <Shield className="w-3.5 h-3.5" />
                                Zum Admin
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                            title="Benutzer loeschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
