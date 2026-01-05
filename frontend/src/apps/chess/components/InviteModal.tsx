import { useState, useEffect } from 'react'
import { Search, Loader2, X, Send } from 'lucide-react'
import { useChessStore } from '@/stores/chessStore'

interface InviteModalProps {
  onClose: () => void
  onInvite: (userId: number, playerColor: 'white' | 'black') => Promise<boolean>
}

export function InviteModal({ onClose, onInvite }: InviteModalProps) {
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [isSending, setIsSending] = useState(false)

  const { availableUsers, fetchAvailableUsers } = useChessStore()

  // Fetch users on mount and when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAvailableUsers(search || undefined)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchAvailableUsers])

  const handleInvite = async () => {
    if (!selectedUserId) return

    setIsSending(true)
    const success = await onInvite(selectedUserId, playerColor)
    setIsSending(false)

    if (success) {
      onClose()
    }
  }

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Spieler einladen
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Spieler suchen..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
            />
          </div>

          {/* User List */}
          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {availableUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Keine Spieler gefunden
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      selectedUserId === user.id
                        ? 'bg-gray-100 dark:bg-gray-700'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {user.username}
                        </div>
                        {(user.first_name || user.last_name) && (
                          <div className="text-xs text-gray-500">
                            {user.first_name} {user.last_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected User */}
          {selectedUser && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Ausgewaehlt:
              </div>
              <div className="font-medium text-gray-800 dark:text-gray-200">
                {selectedUser.username}
              </div>
            </div>
          )}

          {/* Player Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Du spielst als:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPlayerColor('white')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-colors ${
                  playerColor === 'white'
                    ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-700'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-300" />
                <span className="text-sm font-medium">Weiss</span>
              </button>
              <button
                onClick={() => setPlayerColor('black')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-colors ${
                  playerColor === 'black'
                    ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-700'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-gray-800 dark:bg-gray-900" />
                <span className="text-sm font-medium">Schwarz</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleInvite}
            disabled={!selectedUserId || isSending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Einladung senden
          </button>
        </div>
      </div>
    </div>
  )
}
