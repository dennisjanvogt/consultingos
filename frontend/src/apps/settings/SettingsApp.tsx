import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/components/shell/ThemeProvider'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { useConfirmStore } from '@/stores/confirmStore'
import { Building2, CreditCard, Receipt, Palette, LayoutGrid, User as UserIcon, ShieldCheck, Key, Eye, EyeOff, Trash2, Check } from 'lucide-react'
import { AppsTab } from './AppsTab'
import type { User } from '@/api/types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type SettingsTab = 'profile' | 'company' | 'banking' | 'invoices' | 'appearance' | 'apps' | 'api'

const SETTINGS_TAB_KEY = 'settings-active-tab'

export function SettingsApp() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const saved = localStorage.getItem(SETTINGS_TAB_KEY)
    return (saved as SettingsTab) || 'profile'
  })
  const { settings, fetchSettings } = useSettingsStore()
  const { user } = useAuthStore()

  // Persist active tab
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab)
    localStorage.setItem(SETTINGS_TAB_KEY, tab)
  }

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const personalTabs = [
    { id: 'profile' as const, label: t('settings.profile', 'Profil'), icon: UserIcon },
    { id: 'appearance' as const, label: t('settings.appearance'), icon: Palette },
    { id: 'apps' as const, label: t('settings.apps'), icon: LayoutGrid },
    { id: 'api' as const, label: t('settings.apiKeys', 'API Keys'), icon: Key },
  ]

  const businessTabs = [
    { id: 'company' as const, label: t('settings.company'), icon: Building2 },
    { id: 'banking' as const, label: t('settings.banking'), icon: CreditCard },
    { id: 'invoices' as const, label: t('settings.invoiceSettings'), icon: Receipt },
  ]

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-44 border-r border-gray-200 dark:border-gray-700 p-2 flex flex-col">
        {/* Personal Section */}
        <div className="mb-4">
          <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t('settings.sectionPersonal', 'Persönlich')}
          </p>
          {personalTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Business Section */}
        <div>
          <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t('settings.sectionBusiness', 'Geschäftlich')}
          </p>
          {businessTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeTab === 'profile' && user && <ProfileSettings user={user} />}
        {activeTab === 'company' && <CompanySettings settings={settings} />}
        {activeTab === 'banking' && <BankingSettings settings={settings} />}
        {activeTab === 'invoices' && <InvoiceSettings settings={settings} />}
        {activeTab === 'appearance' && (
          <AppearanceSettings
            theme={theme}
            setTheme={setTheme}
            language={i18n.language}
            setLanguage={(lng) => {
              i18n.changeLanguage(lng)
              localStorage.setItem('language', lng)
            }}
          />
        )}
        {activeTab === 'apps' && <AppsTab />}
        {activeTab === 'api' && <APIKeysSettings />}
      </div>
    </div>
  )
}

interface ProfileSettingsProps {
  user: User
}

function ProfileSettings({ user }: ProfileSettingsProps) {
  const { t } = useTranslation()
  const { updateProfile } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
  })

  useEffect(() => {
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
    })
  }, [user])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    const success = await updateProfile(formData)
    setIsSaving(false)
    if (success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    }
  }

  const initials = user.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] || ''}`.toUpperCase()
    : user.username.slice(0, 2).toUpperCase()

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">
        {t('settings.profile', 'Profil')}
      </h2>

      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        {/* Avatar */}
        <div className="relative">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-white dark:ring-gray-700"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center ring-2 ring-white dark:ring-gray-700">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
          )}
          {user.is_staff && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-800">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>

        {/* User Info */}
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">@{user.username}</p>
          {user.is_staff && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
              <ShieldCheck className="w-3 h-3" />
              Administrator
            </span>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('settings.profileAvatarHint', 'Avatar wird von GitHub geladen')}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label={t('settings.firstName', 'Vorname')}
            value={formData.first_name}
            onChange={(v) => setFormData({ ...formData, first_name: v })}
            placeholder="Max"
          />
          <InputField
            label={t('settings.lastName', 'Nachname')}
            value={formData.last_name}
            onChange={(v) => setFormData({ ...formData, last_name: v })}
            placeholder="Mustermann"
          />
        </div>

        <InputField
          label={t('settings.email', 'E-Mail')}
          value={formData.email}
          onChange={(v) => setFormData({ ...formData, email: v })}
          placeholder="max@example.com"
          type="email"
        />

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="text-sm bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg transition-colors hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-50"
          >
            {isSaving ? '...' : t('common.save')}
          </button>
          {saveSuccess && (
            <span className="text-sm text-green-600 dark:text-green-400">
              {t('common.saved', 'Gespeichert!')}
            </span>
          )}
        </div>
      </div>

      {/* Account Info */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          {t('settings.accountInfo', 'Kontoinformationen')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* User ID */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              {t('settings.userId', 'User ID')}
            </p>
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
              #{user.id}
            </p>
          </div>

          {/* Username */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              {t('settings.username', 'Username')}
            </p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              @{user.username}
            </p>
          </div>

          {/* Role */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              {t('settings.role', 'Rolle')}
            </p>
            <div className="flex items-center gap-1.5">
              {user.is_staff ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Administrator</span>
                </>
              ) : (
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.roleUser', 'Benutzer')}</span>
              )}
            </div>
          </div>

          {/* Account Status */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              {t('settings.status', 'Status')}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-600 dark:text-green-400">{t('settings.statusActive', 'Aktiv')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SettingsProps {
  settings: {
    company_name?: string
    street?: string
    zip_code?: string
    city?: string
    tax_id?: string
    bank_name?: string
    iban?: string
    bic?: string
    invoice_prefix?: string
    default_hourly_rate?: string
    default_tax_rate?: string
    default_currency?: string
  } | null
}

function CompanySettings({ settings }: SettingsProps) {
  const { t } = useTranslation()
  const { updateSettings } = useSettingsStore()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    company_name: settings?.company_name || '',
    street: settings?.street || '',
    zip_code: settings?.zip_code || '',
    city: settings?.city || '',
    tax_id: settings?.tax_id || '',
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        street: settings.street || '',
        zip_code: settings.zip_code || '',
        city: settings.city || '',
        tax_id: settings.tax_id || '',
      })
    }
  }, [settings])

  const handleSave = async () => {
    setIsSaving(true)
    await updateSettings(formData)
    setIsSaving(false)
  }

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('settings.company')}</h2>

      <div className="space-y-4">
        <InputField
          label={t('settings.companyName')}
          value={formData.company_name}
          onChange={(v) => setFormData({ ...formData, company_name: v })}
          placeholder="Meine Firma GmbH"
        />
        <InputField
          label={t('customers.street')}
          value={formData.street}
          onChange={(v) => setFormData({ ...formData, street: v })}
          placeholder="Musterstraße 123"
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label={t('customers.zipCode')}
            value={formData.zip_code}
            onChange={(v) => setFormData({ ...formData, zip_code: v })}
            placeholder="12345"
          />
          <InputField
            label={t('customers.city')}
            value={formData.city}
            onChange={(v) => setFormData({ ...formData, city: v })}
            placeholder="Berlin"
          />
        </div>

        <InputField
          label={t('customers.taxId')}
          value={formData.tax_id}
          onChange={(v) => setFormData({ ...formData, tax_id: v })}
          placeholder="DE123456789"
        />

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="text-sm bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg transition-colors hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-50"
        >
          {isSaving ? '...' : t('common.save')}
        </button>
      </div>
    </div>
  )
}

function BankingSettings({ settings }: SettingsProps) {
  const { t } = useTranslation()
  const { updateSettings } = useSettingsStore()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    bank_name: settings?.bank_name || '',
    iban: settings?.iban || '',
    bic: settings?.bic || '',
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        bank_name: settings.bank_name || '',
        iban: settings.iban || '',
        bic: settings.bic || '',
      })
    }
  }, [settings])

  const handleSave = async () => {
    setIsSaving(true)
    await updateSettings(formData)
    setIsSaving(false)
  }

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('settings.banking')}</h2>

      <div className="space-y-4">
        <InputField
          label={t('settings.bankName')}
          value={formData.bank_name}
          onChange={(v) => setFormData({ ...formData, bank_name: v })}
          placeholder="Deutsche Bank"
        />
        <InputField
          label={t('settings.iban')}
          value={formData.iban}
          onChange={(v) => setFormData({ ...formData, iban: v })}
          placeholder="DE89 3704 0044 0532 0130 00"
        />
        <InputField
          label={t('settings.bic')}
          value={formData.bic}
          onChange={(v) => setFormData({ ...formData, bic: v })}
          placeholder="COBADEFFXXX"
        />

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="text-sm bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg transition-colors hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-50"
        >
          {isSaving ? '...' : t('common.save')}
        </button>
      </div>
    </div>
  )
}

function InvoiceSettings({ settings }: SettingsProps) {
  const { t } = useTranslation()
  const { updateSettings } = useSettingsStore()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    invoice_prefix: settings?.invoice_prefix || 'INV-',
    default_hourly_rate: settings?.default_hourly_rate || '100',
    default_tax_rate: settings?.default_tax_rate || '19',
    default_currency: settings?.default_currency || 'EUR',
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        invoice_prefix: settings.invoice_prefix || 'INV-',
        default_hourly_rate: settings.default_hourly_rate || '100',
        default_tax_rate: settings.default_tax_rate || '19',
        default_currency: settings.default_currency || 'EUR',
      })
    }
  }, [settings])

  const handleSave = async () => {
    setIsSaving(true)
    await updateSettings(formData)
    setIsSaving(false)
  }

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('settings.invoiceSettings')}</h2>

      <div className="space-y-4">
        <InputField
          label={t('settings.invoicePrefix')}
          value={formData.invoice_prefix}
          onChange={(v) => setFormData({ ...formData, invoice_prefix: v })}
          placeholder="INV-"
        />
        <InputField
          label={t('settings.hourlyRate')}
          value={formData.default_hourly_rate}
          onChange={(v) => setFormData({ ...formData, default_hourly_rate: v })}
          placeholder="100"
          type="number"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('settings.defaultTaxRate')}</label>
          <select
            value={formData.default_tax_rate}
            onChange={(e) => setFormData({ ...formData, default_tax_rate: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none transition-colors"
          >
            <option value="19">19%</option>
            <option value="7">7%</option>
            <option value="0">0%</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('settings.defaultCurrency')}</label>
          <select
            value={formData.default_currency}
            onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none transition-colors"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="CHF">CHF</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="text-sm bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg transition-colors hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-50"
        >
          {isSaving ? '...' : t('common.save')}
        </button>
      </div>
    </div>
  )
}

interface AppearanceSettingsProps {
  theme: string
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  language: string
  setLanguage: (lng: string) => void
}

function AppearanceSettings({ theme, setTheme, language, setLanguage }: AppearanceSettingsProps) {
  const { t } = useTranslation()

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('settings.appearance')}</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.theme')}</label>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t_theme) => (
              <button
                key={t_theme}
                onClick={() => setTheme(t_theme)}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  theme === t_theme
                    ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {t(`settings.${t_theme}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.language')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('de')}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                language === 'de'
                  ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Deutsch
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                language === 'en'
                  ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('tr')}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                language === 'tr'
                  ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Turkce
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface InputFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none transition-colors"
      />
    </div>
  )
}


function APIKeysSettings() {
  const { t } = useTranslation()
  const confirm = useConfirmStore((state) => state.confirm)
  const [hasKey, setHasKey] = useState(false)
  const [keyPreview, setKeyPreview] = useState<string | null>(null)
  const [hasServerFallback, setHasServerFallback] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch current API key status
  useEffect(() => {
    fetchKeyStatus()
  }, [])

  const fetchKeyStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/api-keys`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setHasKey(data.has_openrouter_key)
        setKeyPreview(data.key_preview)
        setHasServerFallback(data.has_server_fallback)
      }
    } catch (err) {
      console.error('Failed to fetch API key status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveKey = async () => {
    if (!newKey.trim()) {
      setError(t('settings.apiKeyRequired', 'API Key is required'))
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`${API_BASE}/auth/api-keys`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ openrouter_key: newKey }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(t('settings.apiKeySaved', 'API Key saved successfully'))
        setNewKey('')
        setShowKey(false)
        fetchKeyStatus()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || t('settings.apiKeyError', 'Failed to save API key'))
      }
    } catch (err) {
      setError(t('settings.apiKeyError', 'Failed to save API key'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteKey = async () => {
    const confirmed = await confirm({
      title: t('settings.deleteApiKey', 'API Key löschen'),
      message: t('settings.confirmDeleteApiKey', 'Are you sure you want to delete your API key?'),
      confirmLabel: t('common.delete', 'Löschen'),
      variant: 'danger',
    })
    if (!confirmed) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/auth/api-keys`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setSuccess(t('settings.apiKeyDeleted', 'API Key deleted'))
        fetchKeyStatus()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await response.json()
        setError(data.error || t('settings.apiKeyDeleteError', 'Failed to delete API key'))
      }
    } catch (err) {
      setError(t('settings.apiKeyDeleteError', 'Failed to delete API key'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-lg">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">
          {t('settings.apiKeys', 'API Keys')}
        </h2>
        <div className="animate-pulse h-32 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
        {t('settings.apiKeys', 'API Keys')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('settings.apiKeysDescription', 'Configure your API keys for AI features. Your keys are encrypted and stored securely.')}
      </p>

      {/* OpenRouter API Key */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">OpenRouter API Key</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('settings.openrouterDescription', 'Required for AI chat and image generation')}
            </p>
          </div>
        </div>

        {/* Current Status */}
        {hasKey ? (
          <div className="mb-4 flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                {t('settings.apiKeyConfigured', 'API Key configured')}
              </span>
              {keyPreview && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  ({keyPreview})
                </span>
              )}
            </div>
            <button
              onClick={handleDeleteKey}
              disabled={isSaving}
              className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title={t('settings.deleteApiKey', 'Delete API Key')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : hasServerFallback ? (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {t('settings.serverKeyActive', 'Server-Key aktiv')}
              </span>
            </div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
              {t('settings.serverKeyHint', 'KI-Funktionen nutzen den Server-Key. Optional kannst du deinen eigenen Key hinterlegen.')}
            </p>
          </div>
        ) : null}

        {/* Input for new key */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder={hasKey ? t('settings.enterNewApiKey', 'Enter new API key to replace...') : 'sk-or-v1-...'}
              className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 outline-none transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveKey}
              disabled={isSaving || !newKey.trim()}
              className="text-sm bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg transition-colors hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-50"
            >
              {isSaving ? '...' : hasKey ? t('settings.updateApiKey', 'Update Key') : t('settings.saveApiKey', 'Save Key')}
            </button>
          </div>
        </div>

        {/* Help text */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('settings.openrouterHelp', 'Get your API key from')}{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 dark:text-violet-400 hover:underline"
            >
              openrouter.ai/keys
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
