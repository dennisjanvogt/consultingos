import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, MoreHorizontal, Pencil, Trash2, X, FileText, Send, ArrowLeft, Calendar, Building2, Download } from 'lucide-react'
import { useTransactionsStore } from '@/stores/transactionsStore'

interface Quote {
  id: number
  number: string
  customerName: string
  date: string
  validUntil: string
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
  total: number
  currency: string
}

const initialQuotes: Quote[] = [
  {
    id: 1,
    number: 'ANG-2024-001',
    customerName: 'Mustermann GmbH',
    date: '2024-01-15',
    validUntil: '2024-02-15',
    status: 'sent',
    total: 5500,
    currency: 'EUR',
  },
  {
    id: 2,
    number: 'ANG-2024-002',
    customerName: 'Tech Solutions AG',
    date: '2024-01-20',
    validUntil: '2024-02-20',
    status: 'accepted',
    total: 12000,
    currency: 'EUR',
  },
  {
    id: 3,
    number: 'ANG-2024-003',
    customerName: 'Digital Services KG',
    date: '2024-01-25',
    validUntil: '2024-02-25',
    status: 'draft',
    total: 3200,
    currency: 'EUR',
  },
]

export function QuotesTab() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes)
  const { showNewForm, clearNewFormTrigger } = useTransactionsStore()

  // Listen for title bar "Neu" button
  useEffect(() => {
    if (showNewForm) {
      setShowForm(true)
      clearNewFormTrigger()
    }
  }, [showNewForm, clearNewFormTrigger])

  const statusStyles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    sent: 'bg-gold-50 text-gold-600 dark:bg-gold-900/30 dark:text-gold-400',
    accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    declined: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    expired: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
  }

  const statusLabels: Record<string, string> = {
    draft: t('transactions.draft'),
    sent: t('transactions.sent'),
    accepted: t('transactions.accepted'),
    declined: t('transactions.declined'),
    expired: t('transactions.expired'),
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount)
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('de-DE')

  const handleEdit = (quote: Quote) => {
    setEditingQuote(quote)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (confirm(t('common.confirm') + '?')) {
      setQuotes(quotes.filter(q => q.id !== id))
    }
  }

  const handleConvertToInvoice = (quote: Quote) => {
    // TODO: Implement conversion to invoice
    alert(`Angebot ${quote.number} wird zu Rechnung konvertiert...`)
  }

  const handleSave = (quote: Omit<Quote, 'id'>) => {
    if (editingQuote) {
      setQuotes(quotes.map(q => q.id === editingQuote.id ? { ...quote, id: editingQuote.id } : q))
    } else {
      const newNumber = `ANG-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, '0')}`
      setQuotes([...quotes, { ...quote, id: Date.now(), number: newNumber }])
    }
    setShowForm(false)
    setEditingQuote(null)
  }

  const filteredQuotes = quotes.filter(q =>
    q.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4">
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

      {/* Quotes List */}
      <div className="flex-1 overflow-auto">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">{t('transactions.noQuotes')}</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">{t('transactions.quoteNumber')}</th>
                <th className="px-4 py-3 font-medium">{t('invoices.customer')}</th>
                <th className="px-4 py-3 font-medium">{t('invoices.date')}</th>
                <th className="px-4 py-3 font-medium">{t('transactions.validUntil')}</th>
                <th className="px-4 py-3 font-medium">{t('invoices.status')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('invoices.total')}</th>
                <th className="px-4 py-3 font-medium w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredQuotes.map((quote) => (
                <QuoteRow
                  key={quote.id}
                  quote={quote}
                  statusStyles={statusStyles}
                  statusLabels={statusLabels}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  onClick={() => setSelectedQuote(quote)}
                  onEdit={() => handleEdit(quote)}
                  onDelete={() => handleDelete(quote.id)}
                  onConvert={() => handleConvertToInvoice(quote)}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <QuoteForm
          quote={editingQuote}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingQuote(null); }}
        />
      )}

      {selectedQuote && (
        <QuoteDetail
          quote={selectedQuote}
          statusStyles={statusStyles}
          statusLabels={statusLabels}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onClose={() => setSelectedQuote(null)}
          onEdit={() => { setEditingQuote(selectedQuote); setShowForm(true); setSelectedQuote(null); }}
          onConvert={() => { handleConvertToInvoice(selectedQuote); setSelectedQuote(null); }}
          onDelete={() => { handleDelete(selectedQuote.id); setSelectedQuote(null); }}
          t={t}
        />
      )}
    </div>
  )
}

interface QuoteRowProps {
  quote: Quote
  statusStyles: Record<string, string>
  statusLabels: Record<string, string>
  formatCurrency: (amount: number, currency: string) => string
  formatDate: (dateStr: string) => string
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onConvert: () => void
  t: (key: string) => string
}

function QuoteRow({ quote, statusStyles, statusLabels, formatCurrency, formatDate, onClick, onEdit, onDelete, onConvert, t }: QuoteRowProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer" onClick={onClick}>
      <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100">{quote.number}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{quote.customerName}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(quote.date)}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(quote.validUntil)}</td>
      <td className="px-4 py-3">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusStyles[quote.status]}`}>
          {statusLabels[quote.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-right font-medium text-gray-800 dark:text-gray-100">
        {formatCurrency(quote.total, quote.currency)}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
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
                <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                  <button
                    onClick={() => { onEdit(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('common.edit')}
                  </button>
                  {quote.status === 'draft' && (
                    <button
                      onClick={() => setShowMenu(false)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {t('transactions.send')}
                    </button>
                  )}
                  {quote.status === 'accepted' && (
                    <button
                      onClick={() => { onConvert(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {t('transactions.convertToInvoice')}
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

interface QuoteFormProps {
  quote: Quote | null
  onSave: (quote: Omit<Quote, 'id'>) => void
  onClose: () => void
}

function QuoteForm({ quote, onSave, onClose }: QuoteFormProps) {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    number: quote?.number || '',
    customerName: quote?.customerName || '',
    date: quote?.date || today,
    validUntil: quote?.validUntil || validUntil,
    status: quote?.status || 'draft' as const,
    total: quote?.total || 0,
    currency: quote?.currency || 'EUR',
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
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            {quote ? t('common.edit') : t('transactions.addQuote')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('invoices.customer')} *
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('invoices.date')}
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('transactions.validUntil')}
              </label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('invoices.total')} (EUR)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.total}
              onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
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

interface QuoteDetailProps {
  quote: Quote
  statusStyles: Record<string, string>
  statusLabels: Record<string, string>
  formatCurrency: (amount: number, currency: string) => string
  formatDate: (dateStr: string) => string
  onClose: () => void
  onEdit: () => void
  onConvert: () => void
  onDelete: () => void
  t: (key: string) => string
}

function QuoteDetail({ quote, statusStyles, statusLabels, formatCurrency, formatDate, onClose, onEdit, onConvert, onDelete, t }: QuoteDetailProps) {
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
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">{quote.number}</h2>
              <span className={`text-xs px-2 py-0.5 rounded ${statusStyles[quote.status]}`}>
                {statusLabels[quote.status]}
              </span>
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
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Building2 className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">{t('invoices.customer')}</div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{quote.customerName}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">{t('invoices.date')}</div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{formatDate(quote.date)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">{t('transactions.validUntil')}</div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{formatDate(quote.validUntil)}</div>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">{t('invoices.total')}</div>
            <div className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              {formatCurrency(quote.total, quote.currency)}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {quote.status === 'accepted' && (
              <button
                onClick={onConvert}
                className="w-full flex items-center justify-center gap-2 p-3 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
              >
                <FileText className="h-4 w-4" />
                {t('transactions.convertToInvoice')}
              </button>
            )}
            {quote.status === 'draft' && (
              <button className="w-full flex items-center justify-center gap-2 p-3 text-sm text-lavender-600 bg-lavender-50 dark:bg-lavender-900/20 hover:bg-lavender-100 dark:hover:bg-lavender-900/30 rounded-lg transition-colors">
                <Send className="h-4 w-4" />
                {t('transactions.send')}
              </button>
            )}
            <button className="w-full flex items-center justify-center gap-2 p-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Download className="h-4 w-4" />
              PDF Download
            </button>
          </div>

          {/* Delete */}
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
