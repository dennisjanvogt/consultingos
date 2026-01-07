import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, FileText, Trash2, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useKnowledgebaseStore } from '@/stores/knowledgebaseStore'
import { useConfirmStore } from '@/stores/confirmStore'
import type { Expert, ExpertDocument } from '@/api/types'

interface DocumentListProps {
  expert: Expert
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: ExpertDocument['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-3 h-3" />
          Ausstehend
        </span>
      )
    case 'processing':
      return (
        <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Verarbeitung...
        </span>
      )
    case 'completed':
      return (
        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CheckCircle className="w-3 h-3" />
          Fertig
        </span>
      )
    case 'failed':
      return (
        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <XCircle className="w-3 h-3" />
          Fehlgeschlagen
        </span>
      )
  }
}

export function DocumentList({ expert }: DocumentListProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { confirm } = useConfirmStore()

  const {
    documents,
    isLoadingDocuments,
    isUploadingDocument,
    uploadDocument,
    deleteDocument,
  } = useKnowledgebaseStore()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    await uploadDocument(expert.id, file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (docId: number) => {
    const confirmed = await confirm({
      title: t('knowledgebase.deleteDocument', 'Dokument löschen'),
      message: t('knowledgebase.confirmDeleteDoc', 'Dokument und alle Chunks wirklich löschen?'),
      confirmLabel: t('common.delete', 'Löschen'),
      variant: 'danger',
    })
    if (confirmed) {
      await deleteDocument(expert.id, docId)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Upload Area */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingDocument}
          className="w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploadingDocument ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {t('knowledgebase.uploading', 'Wird hochgeladen...')}
              </span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                {t('knowledgebase.uploadHint', 'PDF oder TXT hochladen')}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoadingDocuments ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <FileText className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">{t('knowledgebase.noDocuments', 'Noch keine Dokumente')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{doc.file_type.toUpperCase()}</span>
                    <span>{formatFileSize(doc.file_size)}</span>
                    {doc.status === 'completed' && (
                      <>
                        <span>{doc.page_count} {t('knowledgebase.pages', 'Seiten')}</span>
                        <span>{doc.chunk_count} Chunks</span>
                      </>
                    )}
                  </div>
                  {doc.error_message && (
                    <p className="text-xs text-red-500 mt-1 truncate">{doc.error_message}</p>
                  )}
                </div>
                <StatusBadge status={doc.status} />
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
