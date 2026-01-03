import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Video, Calendar, Clock, MapPin, User, ExternalLink, AlertCircle } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface MeetingInfo {
  event_title: string
  event_date: string
  event_start_time: string
  event_end_time: string
  event_location: string
  event_description: string
  meeting_link: string
  host_name: string
}

export function MeetingJoinPage() {
  const { token } = useParams<{ token: string }>()
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMeetingInfo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/calendar/join/${token}`)
        if (!response.ok) {
          throw new Error('Meeting nicht gefunden')
        }
        const data = await response.json()
        setMeetingInfo(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchMeetingInfo()
    }
  }, [token])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !meetingInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Meeting nicht gefunden
          </h1>
          <p className="text-gray-500">
            Der Einladungslink ist ungueltig oder abgelaufen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-white/80">Video-Meeting</p>
              <h1 className="text-xl font-semibold">{meetingInfo.event_title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <User className="h-4 w-4" />
            <span>Eingeladen von {meetingInfo.host_name}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Date & Time */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {formatDate(meetingInfo.event_date)}
              </p>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                <Clock className="h-3.5 w-3.5" />
                {meetingInfo.event_start_time} - {meetingInfo.event_end_time} Uhr
              </div>
            </div>
          </div>

          {/* Location */}
          {meetingInfo.event_location && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {meetingInfo.event_location}
                </p>
                <p className="text-sm text-gray-500">Ort</p>
              </div>
            </div>
          )}

          {/* Description */}
          {meetingInfo.event_description && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {meetingInfo.event_description}
              </p>
            </div>
          )}
        </div>

        {/* Join Button */}
        <div className="p-6 pt-0">
          <a
            href={meetingInfo.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30"
          >
            <Video className="h-5 w-5" />
            Meeting beitreten
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="text-center text-xs text-gray-400 mt-3">
            Wird in einem neuen Tab geoeffnet
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 text-center">
          <p className="text-xs text-gray-400">
            Powered by <span className="font-medium text-violet-500">ConsultingOS</span> & Jitsi Meet
          </p>
        </div>
      </div>
    </div>
  )
}
