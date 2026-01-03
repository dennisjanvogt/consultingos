import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, FileText, AlertCircle, Users } from 'lucide-react'
import { useCustomersStore } from '@/stores/customersStore'
import { useInvoicesStore } from '@/stores/invoicesStore'

export function DashboardApp() {
  const { t } = useTranslation()
  const { customers, fetchCustomers } = useCustomersStore()
  const { invoices, fetchInvoices } = useInvoicesStore()

  useEffect(() => {
    fetchCustomers()
    fetchInvoices()
  }, [fetchCustomers, fetchInvoices])

  // Calculate stats
  const paidInvoices = invoices.filter((i) => i.status === 'paid')
  const openInvoices = invoices.filter((i) => i.status === 'sent' || i.status === 'draft')
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue')

  const totalRevenue = paidInvoices.reduce((sum, i) => sum + parseFloat(i.total), 0)
  const openAmount = openInvoices.reduce((sum, i) => sum + parseFloat(i.total), 0)
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + parseFloat(i.total), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())
    .slice(0, 3)

  const recentCustomers = [...customers].slice(0, 3)

  return (
    <div className="p-6 h-full overflow-auto">
      <h1 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100">{t('dashboard.title')}</h1>

      {/* Stats Grid - auto-fit passt sich an Container-Breite an */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-6">
        <StatCard
          title={t('dashboard.revenue')}
          value={formatCurrency(totalRevenue)}
          subtitle={t('dashboard.thisMonth')}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title={t('dashboard.openInvoices')}
          value={String(openInvoices.length)}
          subtitle={formatCurrency(openAmount)}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title={t('dashboard.overdueInvoices')}
          value={String(overdueInvoices.length)}
          subtitle={formatCurrency(overdueAmount)}
          icon={<AlertCircle className="h-4 w-4" />}
          alert={overdueInvoices.length > 0}
        />
        <StatCard
          title={t('customers.title')}
          value={String(customers.length)}
          subtitle={`${customers.length} total`}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Recent Activity - auto-fit für Container-Responsivität */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
        {/* Recent Invoices */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 p-4">
          <h2 className="font-medium text-gray-700 dark:text-gray-200 mb-4">{t('dashboard.recentInvoices')}</h2>
          <div className="space-y-2">
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-gray-500">{t('invoices.noInvoices')}</p>
            ) : (
              recentInvoices.map((invoice) => (
                <InvoiceItem
                  key={invoice.id}
                  number={invoice.number}
                  customer={invoice.customer_name}
                  amount={formatCurrency(parseFloat(invoice.total))}
                  status={invoice.status}
                />
              ))
            )}
          </div>
        </div>

        {/* Recent Customers */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 p-4">
          <h2 className="font-medium text-gray-700 dark:text-gray-200 mb-4">{t('dashboard.recentCustomers')}</h2>
          <div className="space-y-2">
            {recentCustomers.length === 0 ? (
              <p className="text-sm text-gray-500">{t('customers.noCustomers')}</p>
            ) : (
              recentCustomers.map((customer) => (
                <CustomerItem key={customer.id} name={customer.company || customer.name} email={customer.email} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean
  alert?: boolean
}

function StatCard({ title, value, subtitle, icon, trend, trendUp, alert }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">{title}</span>
        <div className={`${alert ? 'text-red-500' : 'text-gray-400'}`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-semibold ${alert ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>{value}</span>
        {trend && (
          <span className={`text-xs ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>
    </div>
  )
}

interface InvoiceItemProps {
  number: string
  customer: string
  amount: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
}

function InvoiceItem({ number, customer, amount, status }: InvoiceItemProps) {
  const statusStyles = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    sent: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    overdue: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
  }

  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <div>
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{number}</div>
        <div className="text-xs text-gray-500">{customer}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{amount}</div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusStyles[status]}`}>
          {t(`invoices.${status}`)}
        </span>
      </div>
    </div>
  )
}

interface CustomerItemProps {
  name: string
  email: string
}

function CustomerItem({ name, email }: CustomerItemProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
        {name.charAt(0)}
      </div>
      <div>
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{name}</div>
        <div className="text-xs text-gray-500">{email}</div>
      </div>
    </div>
  )
}
