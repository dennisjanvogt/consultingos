import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflowStore'
import { ProgressBar } from './ProgressBar'

export function DashboardView() {
  const { t } = useTranslation()
  const { stats, fetchStats, instances, fetchInstances, setViewMode, selectInstance } = useWorkflowStore()

  useEffect(() => {
    fetchStats()
    fetchInstances('active')
  }, [fetchStats, fetchInstances])

  const handleWorkflowClick = (id: number) => {
    selectInstance(id)
    setViewMode('active')
  }

  // Get upcoming due dates from active instances
  const upcomingSteps = instances
    .flatMap(instance =>
      (instance as any).steps?.filter((step: any) => step.due_date && !step.is_completed) || []
    )
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5)

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.total_active || 0}
              </div>
              <div className="text-sm text-gray-500">{t('workflows.activeWorkflows')}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.total_completed || 0}
              </div>
              <div className="text-sm text-gray-500">{t('workflows.completedWorkflows')}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.overdue_steps || 0}
              </div>
              <div className="text-sm text-gray-500">{t('workflows.overdueSteps')}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.by_category?.length || 0}
              </div>
              <div className="text-sm text-gray-500">{t('workflows.categories')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Progress by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('workflows.progressByCategory')}
          </h3>

          {stats?.by_category && stats.by_category.length > 0 ? (
            <div className="space-y-4">
              {stats.by_category.map((cat, index) => (
                <div key={cat.category_id || 'uncategorized'}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{cat.category_name}</span>
                    <span className="text-gray-500">
                      {Math.round(cat.avg_progress)}% ({cat.count})
                    </span>
                  </div>
                  <ProgressBar
                    progress={cat.avg_progress}
                    color={['violet', 'green', 'blue', 'yellow'][index % 4]}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              {t('workflows.noActiveWorkflows')}
            </div>
          )}
        </div>

        {/* Active Workflows */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('workflows.activeWorkflows')}
          </h3>

          {instances.length > 0 ? (
            <div className="space-y-3">
              {instances.slice(0, 5).map(instance => (
                <button
                  key={instance.id}
                  onClick={() => handleWorkflowClick(instance.id)}
                  className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {instance.name}
                    </span>
                    <span className="text-xs text-gray-500">{instance.progress}%</span>
                  </div>
                  <ProgressBar progress={instance.progress} size="sm" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              {t('workflows.noActiveWorkflows')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
