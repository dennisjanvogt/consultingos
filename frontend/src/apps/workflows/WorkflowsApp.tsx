import { useEffect } from 'react'
import { useWorkflowStore } from '@/stores/workflowStore'
import { TemplateView } from './components/TemplateView'
import { InstanceView } from './components/InstanceView'
import { DashboardView } from './components/DashboardView'

export function WorkflowsApp() {
  const { viewMode, fetchCategories } = useWorkflowStore()

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-hidden">
        {viewMode === 'templates' && <TemplateView />}
        {viewMode === 'active' && <InstanceView />}
        {viewMode === 'dashboard' && <DashboardView />}
      </div>
    </div>
  )
}
