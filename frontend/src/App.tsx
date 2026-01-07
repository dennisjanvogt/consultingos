import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Desktop } from '@/components/shell/Desktop'
import { ThemeProvider } from '@/components/shell/ThemeProvider'
import { LoginScreen } from '@/apps/auth/LoginScreen'
import { GitHubCallback } from '@/apps/auth/GitHubCallback'
import { MeetingJoinPage } from '@/apps/calendar/MeetingJoinPage'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useAuthStore } from '@/stores/authStore'
import { useTimeTrackingStore } from '@/stores/timetrackingStore'
import '@/i18n/config'

function MainApp() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const { loadTimerFromBackend } = useTimeTrackingStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Load timer from backend when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadTimerFromBackend()
    }
  }, [isAuthenticated, loadTimerFromBackend])

  if (isLoading) {
    return (
      <div className="min-h-screen desktop-bg flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return isAuthenticated ? <Desktop /> : <LoginScreen />
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="consultingos-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/join/:token" element={<MeetingJoinPage />} />
          <Route path="/auth/github/callback" element={<GitHubCallback />} />
          <Route path="*" element={<MainApp />} />
        </Routes>
      </BrowserRouter>
      <ConfirmDialog />
    </ThemeProvider>
  )
}

export default App
