import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'

export function LoginScreen() {
  const { t } = useTranslation()
  const { login, register, error, isLoading, clearError } = useAuthStore()
  const [isRegister, setIsRegister] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isRegister) {
      await register(formData)
    } else {
      await login({ username: formData.username, password: formData.password })
    }
  }

  const toggleMode = () => {
    setIsRegister(!isRegister)
    clearError()
  }

  return (
    <div className="min-h-screen desktop-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="glass rounded-2xl p-8 window-shadow">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 text-center mb-2">
            ConsultingOS
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            {isRegister ? t('auth.createAccount') : t('auth.signIn')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('auth.username')}
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none transition-colors"
                required
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none transition-colors"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none transition-colors"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 text-sm font-medium bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isLoading
                ? '...'
                : isRegister
                ? t('auth.register')
                : t('auth.login')}
            </button>
          </form>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
            {isRegister ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-gray-800 dark:text-gray-200 font-medium hover:underline"
            >
              {isRegister ? t('auth.login') : t('auth.register')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
