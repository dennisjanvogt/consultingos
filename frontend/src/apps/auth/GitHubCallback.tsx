import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'

export function GitHubCallback() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { handleGitHubCallback, error, isPending } = useAuthStore()
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')

      if (!code || !state) {
        navigate('/')
        return
      }

      const result = await handleGitHubCallback(code, state)
      setProcessing(false)

      if (result.success) {
        navigate('/')
      }
      // If pending, stay on this page to show the message
    }

    processCallback()
  }, [searchParams, handleGitHubCallback, navigate])

  return (
    <div className="min-h-screen desktop-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="glass rounded-2xl p-8 window-shadow text-center">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
            GitHub Login
          </h1>
          {processing ? (
            <p className="text-gray-500 dark:text-gray-400">
              Authenticating...
            </p>
          ) : isPending ? (
            <div>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('auth.pendingApproval')}
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.back')}
              </button>
            </div>
          ) : error ? (
            <div>
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm font-medium bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
              >
                {t('common.back')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
