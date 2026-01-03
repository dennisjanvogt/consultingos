import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Users, Package, Percent, ArrowLeft, FolderKanban, Building2 } from 'lucide-react'
import { CustomersTab } from './CustomersTab'
import { ProductsTab } from './ProductsTab'
import { TaxRatesTab } from './TaxRatesTab'
import { TimeTrackingProjectsTab } from './TimeTrackingProjectsTab'
import { TimeTrackingClientsTab } from './TimeTrackingClientsTab'

type ViewId = 'home' | 'customers' | 'products' | 'taxrates' | 'ttprojects' | 'ttclients'

interface MasterDataItem {
  id: ViewId
  labelKey: string
  icon: React.ReactNode
}

const masterDataItems: MasterDataItem[] = [
  { id: 'customers', labelKey: 'masterdata.customers', icon: <Users className="h-6 w-6" /> },
  { id: 'products', labelKey: 'masterdata.products', icon: <Package className="h-6 w-6" /> },
  { id: 'taxrates', labelKey: 'masterdata.taxRates', icon: <Percent className="h-6 w-6" /> },
  { id: 'ttprojects', labelKey: 'masterdata.ttProjects', icon: <FolderKanban className="h-6 w-6" /> },
  { id: 'ttclients', labelKey: 'masterdata.ttClients', icon: <Building2 className="h-6 w-6" /> },
]

export function MasterDataApp() {
  const { t } = useTranslation()
  const [activeView, setActiveView] = useState<ViewId>('home')

  // Handle ESC key - go back to home before closing window
  useEffect(() => {
    if (activeView === 'home') return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't trigger if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
          return
        }
        e.stopImmediatePropagation()
        setActiveView('home')
      }
    }

    // Use capture phase to handle before Window's handler
    document.addEventListener('keydown', handleEsc, true)
    return () => document.removeEventListener('keydown', handleEsc, true)
  }, [activeView])

  // Determine grid columns: under 10 items = 3 per row, 10+ = 5 per row
  const gridCols = masterDataItems.length >= 10 ? 5 : 3

  if (activeView !== 'home') {
    const getTitle = () => {
      switch (activeView) {
        case 'customers': return t('masterdata.customers')
        case 'products': return t('masterdata.products')
        case 'taxrates': return t('masterdata.taxRates')
        case 'ttprojects': return t('masterdata.ttProjects')
        case 'ttclients': return t('masterdata.ttClients')
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
          {activeView === 'customers' && <CustomersTab />}
          {activeView === 'products' && <ProductsTab />}
          {activeView === 'taxrates' && <TaxRatesTab />}
          {activeView === 'ttprojects' && <TimeTrackingProjectsTab />}
          {activeView === 'ttclients' && <TimeTrackingClientsTab />}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      {/* Title */}
      <h1 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-8">
        {t('masterdata.title')}
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
          {masterDataItems.map((item, index) => (
            <MasterDataButton
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

interface MasterDataButtonProps {
  item: MasterDataItem
  label: string
  onClick: () => void
  index: number
}

function MasterDataButton({ item, label, onClick, index }: MasterDataButtonProps) {
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
