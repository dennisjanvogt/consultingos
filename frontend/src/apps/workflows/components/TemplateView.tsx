import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronRight, Trash2, GripVertical, FileText } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflowStore'
import { useConfirmStore } from '@/stores/confirmStore'
import type { WorkflowTemplateStep } from '@/api/types'

type StepWithChildren = WorkflowTemplateStep & { children: StepWithChildren[] }

export function TemplateView() {
  const { t } = useTranslation()
  const confirm = useConfirmStore(state => state.confirm)
  const {
    categories,
    templates,
    selectedTemplate,
    selectedCategoryId,
    isLoading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    selectTemplate,
    setSelectedCategoryId,
    createTemplateStep,
    updateTemplateStep,
    deleteTemplateStep,
    getTemplateStepsHierarchy,
  } = useWorkflowStore()

  const [editingName, setEditingName] = useState(false)
  const [newStepTitle, setNewStepTitle] = useState('')
  const [addingStepToParent, setAddingStepToParent] = useState<number | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleCreateTemplate = async () => {
    const template = await createTemplate({
      name: t('workflows.newTemplate'),
      category_id: selectedCategoryId,
    })
    if (template) {
      selectTemplate(template.id)
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    const template = templates.find(t => t.id === id)
    const confirmed = await confirm({
      title: t('workflows.deleteTemplate'),
      message: t('workflows.deleteTemplateConfirm', { name: template?.name }),
      confirmLabel: t('common.delete'),
      variant: 'danger',
    })
    if (confirmed) {
      await deleteTemplate(id)
    }
  }

  const handleAddStep = async (parentId: number | null = null) => {
    if (!selectedTemplate || !newStepTitle.trim()) return
    await createTemplateStep(selectedTemplate.id, {
      title: newStepTitle.trim(),
      parent_id: parentId,
    })
    setNewStepTitle('')
    setAddingStepToParent(null)
  }

  const handleDeleteStep = async (stepId: number) => {
    if (!selectedTemplate) return
    const confirmed = await confirm({
      title: t('workflows.deleteStep'),
      message: t('workflows.deleteStepConfirm'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
    })
    if (confirmed) {
      await deleteTemplateStep(selectedTemplate.id, stepId)
    }
  }

  const stepsHierarchy = getTemplateStepsHierarchy()

  const renderStep = (step: StepWithChildren, isChild = false) => (
    <div key={step.id} className={isChild ? 'ml-6' : ''}>
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group">
        <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
        <div className="flex-1">
          <input
            type="text"
            value={step.title}
            onChange={(e) => {
              if (selectedTemplate) {
                updateTemplateStep(selectedTemplate.id, step.id, { title: e.target.value })
              }
            }}
            className="w-full bg-transparent border-0 p-0 text-sm text-gray-900 dark:text-gray-100 focus:ring-0"
          />
        </div>
        {!isChild && (
          <button
            onClick={() => setAddingStepToParent(addingStepToParent === step.id ? null : step.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
            title={t('workflows.addSubStep')}
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={() => handleDeleteStep(step.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Add substep input */}
      {addingStepToParent === step.id && (
        <div className="ml-6 flex items-center gap-2 py-2 px-3">
          <input
            type="text"
            value={newStepTitle}
            onChange={(e) => setNewStepTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddStep(step.id)
              if (e.key === 'Escape') {
                setAddingStepToParent(null)
                setNewStepTitle('')
              }
            }}
            placeholder={t('workflows.stepTitlePlaceholder')}
            className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded px-2 py-1 focus:ring-2 focus:ring-violet-500"
            autoFocus
          />
          <button
            onClick={() => handleAddStep(step.id)}
            className="px-2 py-1 text-xs bg-violet-500 text-white rounded hover:bg-violet-600"
          >
            {t('common.add')}
          </button>
        </div>
      )}

      {/* Child steps */}
      {step.children && step.children.length > 0 && (
        <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-4">
          {step.children.map(child => renderStep(child as StepWithChildren, true))}
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full flex">
      {/* Sidebar - Template List */}
      <div className="w-72 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
        {/* Category Filter */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <select
            value={selectedCategoryId || ''}
            onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg py-2 px-3 focus:ring-2 focus:ring-violet-500 dark:text-gray-100"
          >
            <option value="">{t('workflows.allCategories')}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>
          ) : templates.length === 0 ? (
            <div className="p-4 text-center text-gray-500">{t('workflows.noTemplates')}</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template.id)}
                  className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {template.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {template.step_count} {t('workflows.steps')}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New Template Button */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCreateTemplate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('workflows.newTemplate')}
          </button>
        </div>
      </div>

      {/* Main Content - Template Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTemplate ? (
          <>
            {/* Template Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-4">
                {editingName ? (
                  <input
                    type="text"
                    value={selectedTemplate.name}
                    onChange={(e) => updateTemplate(selectedTemplate.id, { name: e.target.value })}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                    className="text-xl font-semibold bg-transparent border-b-2 border-violet-500 focus:outline-none text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                ) : (
                  <h2
                    className="text-xl font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-violet-600"
                    onClick={() => setEditingName(true)}
                  >
                    {selectedTemplate.name}
                  </h2>
                )}

                <select
                  value={selectedTemplate.category_id || ''}
                  onChange={(e) => updateTemplate(selectedTemplate.id, {
                    category_id: e.target.value ? parseInt(e.target.value) : null
                  })}
                  className="text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-violet-500 dark:text-gray-100"
                >
                  <option value="">{t('workflows.noCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                <div className="flex-1" />

                <button
                  onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <textarea
                value={selectedTemplate.description}
                onChange={(e) => updateTemplate(selectedTemplate.id, { description: e.target.value })}
                placeholder={t('workflows.descriptionPlaceholder')}
                className="mt-3 w-full text-sm bg-transparent border-0 p-0 resize-none text-gray-600 dark:text-gray-400 placeholder-gray-400 focus:ring-0"
                rows={2}
              />
            </div>

            {/* Steps */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {(stepsHierarchy as StepWithChildren[]).map(step => renderStep(step))}
              </div>

              {/* Add main step */}
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={addingStepToParent === null ? newStepTitle : ''}
                  onChange={(e) => {
                    setAddingStepToParent(null)
                    setNewStepTitle(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddStep(null)
                  }}
                  placeholder={t('workflows.addStepPlaceholder')}
                  className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 dark:text-gray-100"
                />
                <button
                  onClick={() => handleAddStep(null)}
                  disabled={!newStepTitle.trim() || addingStepToParent !== null}
                  className="px-4 py-2 text-sm bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <div className="text-lg">{t('workflows.selectTemplate')}</div>
              <div className="text-sm mt-1">{t('workflows.orCreateNew')}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
