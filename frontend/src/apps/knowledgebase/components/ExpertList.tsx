import { useTranslation } from 'react-i18next'
import { MoreVertical, Pencil, Trash2, Check, AlertCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useKnowledgebaseStore } from '@/stores/knowledgebaseStore'
import { useConfirmStore } from '@/stores/confirmStore'
import type { Expert } from '@/api/types'

interface ExpertListProps {
  experts: Expert[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  onEdit: (id: number) => void
}

export function ExpertList({ experts, selectedId, onSelect, onEdit }: ExpertListProps) {
  const { t } = useTranslation()
  const { deleteExpert } = useKnowledgebaseStore()
  const { confirm } = useConfirmStore()

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = await confirm({
      title: t('knowledgebase.deleteExpert', 'Experte löschen'),
      message: t('knowledgebase.confirmDelete', 'Experten und alle zugehörigen Dokumente wirklich löschen?'),
      confirmLabel: t('common.delete', 'Löschen'),
      variant: 'danger',
    })
    if (confirmed) {
      await deleteExpert(id)
    }
  }

  if (experts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-500 dark:text-gray-400">
        <div>
          <div className="text-3xl mb-2">📚</div>
          <p className="text-sm">{t('knowledgebase.noExperts', 'Noch keine Experten')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2 space-y-1">
        {experts.map((expert) => (
          <div
            key={expert.id}
            onClick={() => onSelect(expert.id)}
            className={`group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
              selectedId === expert.id
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-900 dark:text-violet-100'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            <span className="text-xl">{expert.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{expert.name}</span>
                {expert.is_indexed ? (
                  <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {expert.document_count} {t('knowledgebase.docs', 'Dok.')}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(expert.id) }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  {t('common.edit', 'Bearbeiten')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => handleDelete(expert.id, e)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('common.delete', 'Löschen')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  )
}
