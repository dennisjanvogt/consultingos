import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { useMasterDataStore } from '@/stores/masterdataStore'
import { useConfirmStore } from '@/stores/confirmStore'

interface TaxRate {
  id: number
  name: string
  rate: number
  isDefault: boolean
}

const initialTaxRates: TaxRate[] = [
  { id: 1, name: 'Regelsteuersatz', rate: 19, isDefault: true },
  { id: 2, name: 'Ermäßigter Steuersatz', rate: 7, isDefault: false },
  { id: 3, name: 'Steuerfrei', rate: 0, isDefault: false },
]

export function TaxRatesTab() {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null)
  const [taxRates, setTaxRates] = useState<TaxRate[]>(initialTaxRates)
  const { showNewForm, clearNewFormTrigger } = useMasterDataStore()
  const confirm = useConfirmStore(state => state.confirm)

  // Listen for title bar "Neu" button
  useEffect(() => {
    if (showNewForm) {
      setShowForm(true)
      clearNewFormTrigger()
    }
  }, [showNewForm, clearNewFormTrigger])

  const handleEdit = (rate: TaxRate) => {
    setEditingRate(rate)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: t('masterdata.deleteTaxRate', 'Steuersatz löschen'),
      message: t('masterdata.confirmDeleteTaxRate', 'Steuersatz wirklich löschen?'),
      confirmLabel: t('common.delete', 'Löschen'),
      variant: 'danger',
    })
    if (confirmed) {
      setTaxRates(taxRates.filter(r => r.id !== id))
    }
  }

  const handleSetDefault = (id: number) => {
    setTaxRates(taxRates.map(r => ({ ...r, isDefault: r.id === id })))
  }

  const handleSave = (rate: Omit<TaxRate, 'id'>) => {
    if (editingRate) {
      setTaxRates(taxRates.map(r => r.id === editingRate.id ? { ...rate, id: editingRate.id } : r))
    } else {
      setTaxRates([...taxRates, { ...rate, id: Date.now() }])
    }
    setShowForm(false)
    setEditingRate(null)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingRate(null)
  }

  return (
    <div className="h-full flex flex-col">

      {/* Tax Rates List */}
      <div className="flex-1 overflow-auto p-4">
        {taxRates.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            {t('masterdata.noTaxRates')}
          </div>
        ) : (
          <div className="space-y-1">
            {taxRates.map((rate) => (
              <TaxRateRow
                key={rate.id}
                rate={rate}
                onEdit={() => handleEdit(rate)}
                onDelete={() => handleDelete(rate.id)}
                onSetDefault={() => handleSetDefault(rate.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <TaxRateForm
          rate={editingRate}
          onSave={handleSave}
          onClose={handleCloseForm}
        />
      )}
    </div>
  )
}

interface TaxRateRowProps {
  rate: TaxRate
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}

function TaxRateRow({ rate, onEdit, onDelete, onSetDefault }: TaxRateRowProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-sm font-medium">
          %
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{rate.name}</span>
            {rate.isDefault && (
              <span className="px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                Standard
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">{rate.rate}% MwSt.</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-lg font-medium text-gray-800 dark:text-gray-100">
          {rate.rate}%
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-500" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                {!rate.isDefault && (
                  <button
                    onClick={() => { onSetDefault(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Als Standard
                  </button>
                )}
                <button
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Bearbeiten
                </button>
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Löschen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface TaxRateFormProps {
  rate: TaxRate | null
  onSave: (rate: Omit<TaxRate, 'id'>) => void
  onClose: () => void
}

function TaxRateForm({ rate, onSave, onClose }: TaxRateFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: rate?.name || '',
    rate: rate?.rate || 19,
    isDefault: rate?.isDefault || false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            {rate ? t('common.edit') : t('masterdata.addTaxRate')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('masterdata.taxRateName')} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              placeholder="z.B. Regelsteuersatz"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('masterdata.taxRatePercent')} (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
