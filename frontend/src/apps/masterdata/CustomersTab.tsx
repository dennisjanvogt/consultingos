import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, MoreHorizontal, Pencil, Trash2, X, ArrowLeft, Mail, Phone, MapPin, FileText, Receipt } from 'lucide-react'
import { useCustomersStore } from '@/stores/customersStore'
import { useMasterDataStore } from '@/stores/masterdataStore'
import { useConfirmStore } from '@/stores/confirmStore'
import type { Customer, CustomerCreate } from '@/api/types'

export function CustomersTab() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const { customers, isLoading, fetchCustomers, deleteCustomer } = useCustomersStore()
  const { showNewForm, clearNewFormTrigger } = useMasterDataStore()
  const confirm = useConfirmStore(state => state.confirm)

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Listen for title bar "Neu" button
  useEffect(() => {
    if (showNewForm) {
      setShowForm(true)
      clearNewFormTrigger()
    }
  }, [showNewForm, clearNewFormTrigger])

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: t('customers.deleteCustomer', 'Kunde löschen'),
      message: t('customers.confirmDelete', 'Kunde wirklich löschen?'),
      confirmLabel: t('common.delete', 'Löschen'),
      variant: 'danger',
    })
    if (confirmed) {
      await deleteCustomer(id)
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingCustomer(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={`${t('common.search')}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            {t('common.loading')}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            {t('customers.noCustomers')}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCustomers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onClick={() => setSelectedCustomer(customer)}
                onEdit={() => handleEdit(customer)}
                onDelete={() => handleDelete(customer.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onClose={handleCloseForm}
        />
      )}

      {/* Detail View */}
      {selectedCustomer && (
        <CustomerDetail
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onEdit={() => { setEditingCustomer(selectedCustomer); setShowForm(true); setSelectedCustomer(null); }}
          onDelete={() => { handleDelete(selectedCustomer.id); setSelectedCustomer(null); }}
          t={t}
        />
      )}
    </div>
  )
}

interface CustomerRowProps {
  customer: Customer
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}

function CustomerRow({ customer, onClick, onEdit, onDelete }: CustomerRowProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
          {customer.name.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{customer.name}</div>
          <div className="text-xs text-gray-500">{customer.company || customer.email}</div>
        </div>
      </div>

      <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs text-gray-500 hidden md:block">{customer.city}</div>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-500" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
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

interface CustomerFormProps {
  customer: Customer | null
  onClose: () => void
}

function CustomerForm({ customer, onClose }: CustomerFormProps) {
  const { t } = useTranslation()
  const { createCustomer, updateCustomer } = useCustomersStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CustomerCreate>({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    company: customer?.company || '',
    street: customer?.street || '',
    zip_code: customer?.zip_code || '',
    city: customer?.city || '',
    country: customer?.country || 'Deutschland',
    tax_id: customer?.tax_id || '',
    notes: customer?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (customer) {
      await updateCustomer(customer.id, formData)
    } else {
      await createCustomer(formData)
    }

    setIsSubmitting(false)
    onClose()
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85%] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            {customer ? t('common.edit') : t('customers.addCustomer')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.name')} *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
                required
              />
            </div>

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.company')}</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.phone')}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.street')}</label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.zipCode')}</label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.city')}</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.taxId')}</label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.country')}</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.notes')}</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300 resize-none"
              />
            </div>
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
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CustomerDetailProps {
  customer: Customer
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  t: (key: string) => string
}

function CustomerDetail({ customer, onClose, onEdit, onDelete, t }: CustomerDetailProps) {
  const fullAddress = [customer.street, `${customer.zip_code} ${customer.city}`, customer.country]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90%] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium">
                {customer.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">{customer.name}</h2>
                {customer.company && (
                  <div className="text-xs text-gray-500">{customer.company}</div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Pencil className="h-4 w-4" />
            {t('common.edit')}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            {customer.email && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Mail className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">{t('customers.email')}</div>
                  <a href={`mailto:${customer.email}`} className="text-sm text-lavender-600 hover:underline">
                    {customer.email}
                  </a>
                </div>
              </div>
            )}

            {customer.phone && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Phone className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">{t('customers.phone')}</div>
                  <a href={`tel:${customer.phone}`} className="text-sm text-gray-800 dark:text-gray-100 hover:underline">
                    {customer.phone}
                  </a>
                </div>
              </div>
            )}

            {fullAddress && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <MapPin className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">{t('customers.street')}</div>
                  <div className="text-sm text-gray-800 dark:text-gray-100">{fullAddress}</div>
                </div>
              </div>
            )}

            {customer.tax_id && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <FileText className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">{t('customers.taxId')}</div>
                  <div className="text-sm text-gray-800 dark:text-gray-100">{customer.tax_id}</div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {customer.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('customers.notes')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                {customer.notes}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 p-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Receipt className="h-4 w-4" />
              Neue Rechnung
            </button>
            <button className="flex items-center justify-center gap-2 p-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Mail className="h-4 w-4" />
              E-Mail senden
            </button>
          </div>

          {/* Delete Action */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
