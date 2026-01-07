import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Check, Circle, AlertCircle, Pause, Play, Trash2 } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflowStore'
import { useConfirmStore } from '@/stores/confirmStore'
import { ProgressBar } from './ProgressBar'
import type { WorkflowInstanceStep } from '@/api/types'

type StepWithChildren = WorkflowInstanceStep & { children: StepWithChildren[] }

export function InstanceView() {
  const { t } = useTranslation()
  const confirm = useConfirmStore(state => state.confirm)
  const {
    categories,
    templates,
    instances,
    selectedInstance,
    statusFilter,
    isLoading,
    fetchInstances,
    fetchTemplates,
    createInstance,
    updateInstance,
    deleteInstance,
    selectInstance,
    setStatusFilter,
    toggleInstanceStep,
    getInstanceStepsHierarchy,
  } = useWorkflowStore()

  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false)
  const [newWorkflowTemplateId, setNewWorkflowTemplateId] = useState<number | null>(null)
  const [newWorkflowName, setNewWorkflowName] = useState('')

  useEffect(() => {
    fetchInstances()
    fetchTemplates()
  }, [fetchInstances, fetchTemplates])

  const handleCreateInstance = async () => {
    if (!newWorkflowTemplateId) return
    await createInstance({
      template_id: newWorkflowTemplateId,
      name: newWorkflowName || undefined,
    })
    setShowNewWorkflowModal(false)
    setNewWorkflowTemplateId(null)
    setNewWorkflowName('')
  }

  const handleDeleteInstance = async (id: number) => {
    const instance = instances.find(i => i.id === id)
    const confirmed = await confirm({
      title: t('workflows.deleteWorkflow'),
      message: t('workflows.deleteWorkflowConfirm', { name: instance?.name }),
      confirmLabel: t('common.delete'),
      variant: 'danger',
    })
    if (confirmed) {
      await deleteInstance(id)
    }
  }

  const handleToggleStep = async (stepId: number) => {
    if (!selectedInstance) return
    await toggleInstanceStep(selectedInstance.id, stepId)
  }

  const handleStatusChange = async (status: string) => {
    if (!selectedInstance) return
    await updateInstance(selectedInstance.id, { status: status as 'active' | 'completed' | 'paused' })
  }

  const stepsHierarchy = getInstanceStepsHierarchy()

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  }

  const renderStep = (step: StepWithChildren, isChild = false) => (
    <div key={step.id} className={isChild ? 'ml-6' : ''}>
      <div
        className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
          step.is_completed ? 'opacity-60' : ''
        }`}
      >
        <button
          onClick={() => handleToggleStep(step.id)}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            step.is_completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-violet-500'
          }`}
        >
          {step.is_completed && <Check className="h-3 w-3" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className={`text-sm ${step.is_completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
            {step.title}
          </div>
          {step.description && (
            <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
          )}
        </div>

        {step.due_date && !step.is_completed && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue(step.due_date) ? 'text-red-500' : 'text-gray-500'}`}>
            {isOverdue(step.due_date) && <AlertCircle className="h-3 w-3" />}
            {formatDate(step.due_date)}
          </div>
        )}
      </div>

      {/* Child steps */}
      {step.children && step.children.length > 0 && (
        <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-4">
          {step.children.map(child => renderStep(child as StepWithChildren, true))}
        </div>
      )}
    </div>
  )

  const statusOptions = [
    { value: 'active', label: t('workflows.statusActive'), icon: Play },
    { value: 'paused', label: t('workflows.statusPaused'), icon: Pause },
    { value: 'completed', label: t('workflows.statusCompleted'), icon: Check },
  ]

  return (
    <div className="h-full flex">
      {/* Sidebar - Instance List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
        {/* Status Filter */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            {['active', 'paused', 'completed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t(`workflows.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Instance List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>
          ) : instances.length === 0 ? (
            <div className="p-4 text-center text-gray-500">{t('workflows.noWorkflows')}</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {instances.map((instance) => (
                <button
                  key={instance.id}
                  onClick={() => selectInstance(instance.id)}
                  className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedInstance?.id === instance.id ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {instance.name}
                      </div>
                      {instance.customer_name && (
                        <div className="text-xs text-gray-500 mt-0.5">{instance.customer_name}</div>
                      )}
                      <div className="mt-2">
                        <ProgressBar progress={instance.progress} size="sm" />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{instance.progress}%</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New Workflow Button */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowNewWorkflowModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('workflows.startWorkflow')}
          </button>
        </div>
      </div>

      {/* Main Content - Instance Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedInstance ? (
          <>
            {/* Instance Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {selectedInstance.name}
                </h2>

                <select
                  value={selectedInstance.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`text-sm border-0 rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-violet-500 ${
                    selectedInstance.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : selectedInstance.status === 'paused'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <div className="flex-1" />

                <button
                  onClick={() => handleDeleteInstance(selectedInstance.id)}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{t('workflows.progress')}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{selectedInstance.progress}%</span>
                </div>
                <ProgressBar progress={selectedInstance.progress} />
              </div>

              {/* Meta Info */}
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                {selectedInstance.customer_name && (
                  <span>{t('workflows.customer')}: {selectedInstance.customer_name}</span>
                )}
                {selectedInstance.project_name && (
                  <span>{t('workflows.project')}: {selectedInstance.project_name}</span>
                )}
                <span>{t('workflows.started')}: {formatDate(selectedInstance.started_at)}</span>
              </div>
            </div>

            {/* Steps */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {(stepsHierarchy as StepWithChildren[]).map(step => renderStep(step))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Circle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <div className="text-lg">{t('workflows.selectWorkflow')}</div>
              <div className="text-sm mt-1">{t('workflows.orStartNew')}</div>
            </div>
          </div>
        )}
      </div>

      {/* New Workflow Modal */}
      {showNewWorkflowModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('workflows.startWorkflow')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workflows.selectTemplateLabel')}
                </label>
                <select
                  value={newWorkflowTemplateId || ''}
                  onChange={(e) => setNewWorkflowTemplateId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg py-2 px-3 focus:ring-2 focus:ring-violet-500 dark:text-gray-100"
                >
                  <option value="">{t('workflows.chooseTemplate')}</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workflows.workflowName')} ({t('common.optional')})
                </label>
                <input
                  type="text"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  placeholder={t('workflows.workflowNamePlaceholder')}
                  className="w-full text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg py-2 px-3 focus:ring-2 focus:ring-violet-500 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewWorkflowModal(false)
                  setNewWorkflowTemplateId(null)
                  setNewWorkflowName('')
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateInstance}
                disabled={!newWorkflowTemplateId}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-violet-500 rounded-lg hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('workflows.start')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
