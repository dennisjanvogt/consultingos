import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'

interface CreditNote {
  id: number
  number: string
  customerName: string
  date: string
  relatedInvoice?: string
  reason: string
  status: 'draft' | 'issued' | 'applied'
  total: number
  currency: string
}

const initialCreditNotes: CreditNote[] = [
  {
    id: 1,
    number: 'GS-2024-001',
    customerName: 'Mustermann GmbH',
    date: '2024-01-18',
    relatedInvoice: 'RE-2024-001',
    reason: 'Teilrückerstattung',
    status: 'issued',
    total: 250,
    currency: 'EUR',
  },
  {
    id: 2,
    number: 'GS-2024-002',
    customerName: 'Tech Solutions AG',
    date: '2024-01-22',
    relatedInvoice: 'RE-2024-003',
    reason: 'Stornierung',
    status: 'applied',
    total: 1200,
    currency: 'EUR',
  },
]

export function CreditNotesTab() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingNote, setEditingNote] = useState<CreditNote | null>(null)
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(initialCreditNotes)

  const statusStyles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    issued: 'bg-gold-50 text-gold-600 dark:bg-gold-900/30 dark:text-gold-400',
    applied: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  const statusLabels: Record<string, string> = {
    draft: t('transactions.draft'),
    issued: t('transactions.issued'),
    applied: t('transactions.applied'),
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount)
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('de-DE')

  const handleEdit = (note: CreditNote) => {
    setEditingNote(note)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (confirm(t('common.confirm') + '?')) {
      setCreditNotes(creditNotes.filter(n => n.id !== id))
    }
  }

  const handleSave = (note: Omit<CreditNote, 'id'>) => {
    if (editingNote) {
      setCreditNotes(creditNotes.map(n => n.id === editingNote.id ? { ...note, id: editingNote.id } : n))
    } else {
      const newNumber = `GS-${new Date().getFullYear()}-${String(creditNotes.length + 1).padStart(3, '0')}`
      setCreditNotes([...creditNotes, { ...note, id: Date.now(), number: newNumber }])
    }
    setShowForm(false)
    setEditingNote(null)
  }

  const filteredNotes = creditNotes.filter(n =>
    n.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => { setEditingNote(null); setShowForm(true); }}
            className="flex items-center gap-1.5 text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('transactions.addCreditNote')}
          </button>
        </div>

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

      {/* Credit Notes List */}
      <div className="flex-1 overflow-auto">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">{t('transactions.noCreditNotes')}</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">{t('transactions.creditNoteNumber')}</th>
                <th className="px-4 py-3 font-medium">{t('invoices.customer')}</th>
                <th className="px-4 py-3 font-medium">{t('invoices.date')}</th>
                <th className="px-4 py-3 font-medium">{t('transactions.relatedInvoice')}</th>
                <th className="px-4 py-3 font-medium">{t('invoices.status')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('invoices.total')}</th>
                <th className="px-4 py-3 font-medium w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredNotes.map((note) => (
                <CreditNoteRow
                  key={note.id}
                  note={note}
                  statusStyles={statusStyles}
                  statusLabels={statusLabels}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  onEdit={() => handleEdit(note)}
                  onDelete={() => handleDelete(note.id)}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <CreditNoteForm
          note={editingNote}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingNote(null); }}
        />
      )}
    </div>
  )
}

interface CreditNoteRowProps {
  note: CreditNote
  statusStyles: Record<string, string>
  statusLabels: Record<string, string>
  formatCurrency: (amount: number, currency: string) => string
  formatDate: (dateStr: string) => string
  onEdit: () => void
  onDelete: () => void
  t: (key: string) => string
}

function CreditNoteRow({ note, statusStyles, statusLabels, formatCurrency, formatDate, onEdit, onDelete, t }: CreditNoteRowProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
      <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100">{note.number}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{note.customerName}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(note.date)}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{note.relatedInvoice || '-'}</td>
      <td className="px-4 py-3">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusStyles[note.status]}`}>
          {statusLabels[note.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-right font-medium text-red-600 dark:text-red-400">
        -{formatCurrency(note.total, note.currency)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
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

interface CreditNoteFormProps {
  note: CreditNote | null
  onSave: (note: Omit<CreditNote, 'id'>) => void
  onClose: () => void
}

function CreditNoteForm({ note, onSave, onClose }: CreditNoteFormProps) {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    number: note?.number || '',
    customerName: note?.customerName || '',
    date: note?.date || today,
    relatedInvoice: note?.relatedInvoice || '',
    reason: note?.reason || '',
    status: note?.status || 'draft' as const,
    total: note?.total || 0,
    currency: note?.currency || 'EUR',
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
            {note ? t('common.edit') : t('transactions.addCreditNote')}
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
                {t('transactions.relatedInvoice')}
              </label>
              <input
                type="text"
                value={formData.relatedInvoice}
                onChange={(e) => setFormData({ ...formData, relatedInvoice: e.target.value })}
                placeholder="RE-2024-001"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transactions.reason')}
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder={t('transactions.reasonPlaceholder')}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-gray-300"
            />
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
