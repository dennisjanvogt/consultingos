import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Download, MoreHorizontal, Pencil, Trash2, X, Check, Send, ArrowLeft, Calendar, Building2, FileText, CreditCard } from 'lucide-react'
import { useInvoicesStore } from '@/stores/invoicesStore'
import { useCustomersStore } from '@/stores/customersStore'
import { useTransactionsStore } from '@/stores/transactionsStore'
import type { Invoice, InvoiceCreate, InvoiceItemCreate } from '@/api/types'

export function InvoicesTab() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const { invoices, isLoading, fetchInvoices, deleteInvoice, markAsPaid, markAsSent } = useInvoicesStore()
  const { customers, fetchCustomers } = useCustomersStore()
  const { showNewForm, clearNewFormTrigger } = useTransactionsStore()

  useEffect(() => {
    fetchInvoices(statusFilter || '', searchQuery)
    fetchCustomers()
  }, [fetchInvoices, fetchCustomers, statusFilter, searchQuery])

  // Listen for title bar "Neu" button
  useEffect(() => {
    if (showNewForm) {
      setEditingInvoice(null)
      setShowForm(true)
      clearNewFormTrigger()
    }
  }, [showNewForm, clearNewFormTrigger])

  const statusStyles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    sent: 'bg-gold-50 text-gold-600 dark:bg-gold-900/30 dark:text-gold-400',
    paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    overdue: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
  }

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(parseFloat(amount))
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('de-DE')

  const handleDelete = async (id: number) => {
    if (confirm(t('common.confirm') + '?')) {
      await deleteInvoice(id)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={`${t('common.search')}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none transition-colors"
            />
          </div>
          <select
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value || null)}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none transition-colors"
          >
            <option value="">{t('invoices.status')}</option>
            <option value="draft">{t('invoices.draft')}</option>
            <option value="sent">{t('invoices.sent')}</option>
            <option value="paid">{t('invoices.paid')}</option>
            <option value="overdue">{t('invoices.overdue')}</option>
          </select>
        </div>
      </div>

      {/* Invoice List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 text-sm">{t('common.loading')}</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">{t('invoices.noInvoices')}</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">{t('invoices.number')}</th>
                <th className="px-4 py-3 font-medium">{t('invoices.customer')}</th>
                <th className="px-4 py-3 font-medium">{t('invoices.date')}</th>
                <th className="px-4 py-3 font-medium">{t('invoices.status')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('invoices.total')}</th>
                <th className="px-4 py-3 font-medium w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {invoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  statusStyles={statusStyles}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  onClick={() => setSelectedInvoice(invoice)}
                  onEdit={() => { setEditingInvoice(invoice); setShowForm(true); }}
                  onDelete={() => handleDelete(invoice.id)}
                  onMarkPaid={() => markAsPaid(invoice.id)}
                  onMarkSent={() => markAsSent(invoice.id)}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <InvoiceForm
          invoice={editingInvoice}
          customers={customers}
          onClose={() => { setShowForm(false); setEditingInvoice(null); }}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetail
          invoice={selectedInvoice}
          statusStyles={statusStyles}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onClose={() => setSelectedInvoice(null)}
          onEdit={() => { setEditingInvoice(selectedInvoice); setShowForm(true); setSelectedInvoice(null); }}
          onMarkPaid={() => { markAsPaid(selectedInvoice.id); setSelectedInvoice(null); }}
          onMarkSent={() => { markAsSent(selectedInvoice.id); setSelectedInvoice(null); }}
          onDelete={() => { handleDelete(selectedInvoice.id); setSelectedInvoice(null); }}
          t={t}
        />
      )}
    </div>
  )
}

interface InvoiceRowProps {
  invoice: Invoice
  statusStyles: Record<string, string>
  formatCurrency: (amount: string, currency: string) => string
  formatDate: (dateStr: string) => string
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onMarkPaid: () => void
  onMarkSent: () => void
  t: (key: string) => string
}

function InvoiceRow({ invoice, statusStyles, formatCurrency, formatDate, onClick, onEdit, onDelete, onMarkPaid, onMarkSent, t }: InvoiceRowProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer" onClick={onClick}>
      <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100">{invoice.number}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{invoice.customer_name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.issue_date)}</td>
      <td className="px-4 py-3">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusStyles[invoice.status]}`}>
          {t(`invoices.${invoice.status}`)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-right font-medium text-gray-800 dark:text-gray-100">
        {formatCurrency(invoice.total, invoice.currency)}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <Download className="h-3.5 w-3.5 text-gray-500" />
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                  <button
                    onClick={() => { onEdit(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('common.edit')}
                  </button>
                  {invoice.status === 'draft' && (
                    <button
                      onClick={() => { onMarkSent(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {t('invoices.markAsSent')}
                    </button>
                  )}
                  {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                    <button
                      onClick={() => { onMarkPaid(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t('invoices.markAsPaid')}
                    </button>
                  )}
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('common.delete')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

interface InvoiceFormProps {
  invoice: Invoice | null
  customers: { id: number; name: string; company: string }[]
  onClose: () => void
}

function InvoiceForm({ invoice, customers, onClose }: InvoiceFormProps) {
  const { t } = useTranslation()
  const { createInvoice } = useInvoicesStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    customer_id: invoice?.customer_id || 0,
    issue_date: invoice?.issue_date || today,
    due_date: invoice?.due_date || dueDate,
    currency: invoice?.currency || 'EUR',
    notes: invoice?.notes || '',
  })

  const [items, setItems] = useState<InvoiceItemCreate[]>(
    invoice?.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      tax_rate: i.tax_rate,
    })) || [{ description: '', quantity: '1', unit_price: '', tax_rate: '19' }]
  )

  const addItem = () => {
    setItems([...items, { description: '', quantity: '1', unit_price: '', tax_rate: '19' }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof InvoiceItemCreate, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(String(item.quantity)) || 0
      const price = parseFloat(String(item.unit_price)) || 0
      return sum + qty * price
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customer_id) return

    setIsSubmitting(true)

    const invoiceData: InvoiceCreate = {
      ...formData,
      items: items.map((item, index) => ({ ...item, position: index })),
    }

    await createInvoice(invoiceData)
    setIsSubmitting(false)
    onClose()
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85%] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            {invoice ? t('common.edit') : t('invoices.addInvoice')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('invoices.customer')} *</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
                required
              >
                <option value={0}>{t('invoices.customer')} wählen...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.company || c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('invoices.date')}</label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('invoices.dueDate')}</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('invoices.items')}</label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <input
                    type="text"
                    placeholder={t('invoices.description')}
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
                    required
                  />
                  <input
                    type="number"
                    placeholder={t('invoices.quantity')}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="w-20 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="number"
                    placeholder={t('invoices.unitPrice')}
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                    className="w-28 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
                    min="0"
                    step="0.01"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-gray-400 hover:text-red-500"
                    disabled={items.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              + {t('invoices.addItem')}
            </button>
          </div>

          {/* Total */}
          <div className="flex justify-end text-sm">
            <span className="text-gray-500 mr-2">{t('invoices.total')}:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-100">
              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: formData.currency }).format(calculateTotal())}
            </span>
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
              disabled={isSubmitting || !formData.customer_id}
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

interface InvoiceDetailProps {
  invoice: Invoice
  statusStyles: Record<string, string>
  formatCurrency: (amount: string, currency: string) => string
  formatDate: (dateStr: string) => string
  onClose: () => void
  onEdit: () => void
  onMarkPaid: () => void
  onMarkSent: () => void
  onDelete: () => void
  t: (key: string) => string
}

function InvoiceDetail({ invoice, statusStyles, formatCurrency, formatDate, onClose, onEdit, onMarkPaid, onMarkSent, onDelete, t }: InvoiceDetailProps) {
  const subtotal = invoice.items.reduce((sum, item) => {
    return sum + parseFloat(item.quantity) * parseFloat(item.unit_price)
  }, 0)

  const taxAmount = invoice.items.reduce((sum, item) => {
    const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price)
    return sum + itemTotal * (parseFloat(item.tax_rate) / 100)
  }, 0)

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90%] overflow-auto"
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
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">{invoice.number}</h2>
              <span className={`text-xs px-2 py-0.5 rounded ${statusStyles[invoice.status]}`}>
                {t(`invoices.${invoice.status}`)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <button
                onClick={onMarkSent}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-lavender-600 hover:bg-lavender-50 dark:hover:bg-lavender-900/20 rounded-lg transition-colors"
              >
                <Send className="h-4 w-4" />
                {t('invoices.markAsSent')}
              </button>
            )}
            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
              <button
                onClick={onMarkPaid}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
              >
                <Check className="h-4 w-4" />
                {t('invoices.markAsPaid')}
              </button>
            )}
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Pencil className="h-4 w-4" />
              {t('common.edit')}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Building2 className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">{t('invoices.customer')}</div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{invoice.customer_name}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">{t('invoices.date')}</div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{formatDate(invoice.issue_date)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <FileText className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">{t('invoices.dueDate')}</div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{formatDate(invoice.due_date)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <CreditCard className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">{t('invoices.currency')}</div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{invoice.currency}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('invoices.items')}</h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr className="text-left text-xs text-gray-500">
                    <th className="px-4 py-2 font-medium">{t('invoices.description')}</th>
                    <th className="px-4 py-2 font-medium text-right">{t('invoices.quantity')}</th>
                    <th className="px-4 py-2 font-medium text-right">{t('invoices.unitPrice')}</th>
                    <th className="px-4 py-2 font-medium text-right">MwSt.</th>
                    <th className="px-4 py-2 font-medium text-right">{t('invoices.total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {invoice.items.map((item, index) => {
                    const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price)
                    return (
                      <tr key={index} className="text-sm">
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{item.description}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-right">{formatCurrency(item.unit_price, invoice.currency)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-right">{item.tax_rate}%</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-right font-medium">{formatCurrency(itemTotal.toString(), invoice.currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Zwischensumme</span>
                <span className="text-gray-800 dark:text-gray-100">{formatCurrency(subtotal.toString(), invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">MwSt.</span>
                <span className="text-gray-800 dark:text-gray-100">{formatCurrency(taxAmount.toString(), invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-800 dark:text-gray-100">{t('invoices.total')}</span>
                <span className="text-gray-800 dark:text-gray-100">{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('customers.notes')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
              <Download className="h-4 w-4" />
              PDF Download
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
