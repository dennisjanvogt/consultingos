import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/components/shell/ThemeProvider'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { Building2, CreditCard, Receipt, Palette, LayoutGrid, User as UserIcon, ShieldCheck } from 'lucide-react'
import { AppsTab } from './AppsTab'
import type { User } from '@/api/types'

type SettingsTab = 'profile' | 'company' | 'banking' | 'invoices' | 'appearance' | 'apps'

export function SettingsApp() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const { settings, fetchSettings } = useSettingsStore()
  const { user } = useAuthStore()

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const tabs = [
    { id: 'profile' as const, label: t('settings.profile', 'Profil'), icon: UserIcon },
    { id: 'company' as const, label: t('settings.company'), icon: Building2 },
    { id: 'banking' as const, label: t('settings.banking'), icon: CreditCard },
    { id: 'invoices' as const, label: t('settings.invoiceSettings'), icon: Receipt },
    { id: 'appearance' as const, label: t('settings.appearance'), icon: Palette },
    { id: 'apps' as const, label: t('settings.apps'), icon: LayoutGrid },
  ]

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-44 border-r border-gray-200 dark:border-gray-700 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('settings.accountInfo', 'Kontoinformationen')}
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p><span className="font-medium">ID:</span> {user.id}</p>
          <p><span className="font-medium">Username:</span> @{user.username}</p>
          {user.is_staff && (
            <p><span className="font-medium">Rolle:</span> Administrator</p>
          )}
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
