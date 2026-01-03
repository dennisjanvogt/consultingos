import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FileText, FileCheck, FileMinus, ArrowLeft, Clock } from 'lucide-react'
import { InvoicesTab } from './InvoicesTab'
import { QuotesTab } from './QuotesTab'
import { CreditNotesTab } from './CreditNotesTab'
import { TimeEntriesTab } from './TimeEntriesTab'

type ViewId = 'home' | 'invoices' | 'quotes' | 'creditnotes' | 'timeentries'

interface TransactionItem {
  id: ViewId
  labelKey: string
  icon: React.ReactNode
}

const transactionItems: TransactionItem[] = [
  { id: 'invoices', labelKey: 'transactions.invoices', icon: <FileText className="h-6 w-6" /> },
  { id: 'quotes', labelKey: 'transactions.quotes', icon: <FileCheck className="h-6 w-6" /> },
  { id: 'creditnotes', labelKey: 'transactions.creditNotes', icon: <FileMinus className="h-6 w-6" /> },
  { id: 'timeentries', labelKey: 'transactions.timeEntries', icon: <Clock className="h-6 w-6" /> },
]

export function TransactionsApp() {
  const { t } = useTranslation()
  const [activeView, setActiveView] = useState<ViewId>('home')

  // Handle ESC key - go back to home before closing window
  useEffect(() => {
    if (activeView === 'home') return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
          return
        }
        e.stopImmediatePropagation()
        setActiveView('home')
      }
    }

    document.addEventListener('keydown', handleEsc, true)
    return () => document.removeEventListener('keydown', handleEsc, true)
  }, [activeView])

  // Determine grid columns: under 10 items = 3 per row, 10+ = 5 per row
  const gridCols = transactionItems.length >= 10 ? 5 : 3

  if (activeView !== 'home') {
    const getTitle = () => {
      switch (activeView) {
        case 'invoices': return t('transactions.invoices')
        case 'quotes': return t('transactions.quotes')
        case 'creditnotes': return t('transactions.creditNotes')
        case 'timeentries': return t('transactions.timeEntries')
        default: return ''
      }
    }

    return (
      <div className="h-full flex flex-col">
        {/* Header with back button */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveView('home')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {getTitle()}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'invoices' && <InvoicesTab />}
          {activeView === 'quotes' && <QuotesTab />}
          {activeView === 'creditnotes' && <CreditNotesTab />}
          {activeView === 'timeentries' && <TimeEntriesTab />}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      {/* Title */}
      <h1 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-8">
        {t('transactions.title')}
      </h1>

      {/* Button Grid */}
      <motion.div
        className="glass-dock rounded-2xl p-4"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
      >
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
        >
          {transactionItems.map((item, index) => (
            <TransactionButton
              key={item.id}
              item={item}
              label={t(item.labelKey)}
              onClick={() => setActiveView(item.id)}
              index={index}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}

interface TransactionButtonProps {
  item: TransactionItem
  label: string
  onClick: () => void
  index: number
}

function TransactionButton({ item, label, onClick, index }: TransactionButtonProps) {
  return (
    <motion.button
      className="relative flex flex-col items-center p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm mb-2">
        {item.icon}
      </div>

      {/* Label */}
      <span className="text-xs text-gray-600 dark:text-gray-400 text-center max-w-[80px] truncate">
        {label}
      </span>
    </motion.button>
  )
}
