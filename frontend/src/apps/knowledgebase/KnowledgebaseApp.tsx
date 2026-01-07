import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useKnowledgebaseStore } from '@/stores/knowledgebaseStore'
import { ExpertList } from './components/ExpertList'
import { ExpertForm } from './components/ExpertForm'
import { DocumentList } from './components/DocumentList'
import { ChatPanel } from './components/ChatPanel'
import { FileText, MessageSquare, Loader2 } from 'lucide-react'

export function KnowledgebaseApp() {
  const { t } = useTranslation()

  const {
    experts,
    selectedExpertId,
    isLoadingExperts,
    activeTab,
    setActiveTab,
    fetchExperts,
    selectExpert,
    showExpertForm,
    editingExpertId,
    setShowExpertForm,
  } = useKnowledgebaseStore()

  useEffect(() => {
    fetchExperts()
  }, [fetchExperts])

  const selectedExpert = experts.find((e) => e.id === selectedExpertId)

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Expert List */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {isLoadingExperts ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <ExpertList
            experts={experts}
            selectedId={selectedExpertId}
            onSelect={selectExpert}
            onEdit={(id) => setShowExpertForm(true, id)}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedExpert ? (
          <>
            {/* Header with tabs */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedExpert.icon}</span>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {selectedExpert.name}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedExpert.document_count} {t('knowledgebase.documents', 'Dokumente')} / {selectedExpert.chunk_count} Chunks
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'documents'
                      ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {t('knowledgebase.documentsTab', 'Dokumente')}
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  {t('knowledgebase.chatTab', 'Chat')}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'documents' ? (
                <DocumentList expert={selectedExpert} />
              ) : (
                <ChatPanel expert={selectedExpert} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3">📚</div>
              <p>{t('knowledgebase.selectExpert', 'Wähle einen Experten aus')}</p>
              <p className="text-sm mt-1">
                {t('knowledgebase.orCreate', 'oder erstelle einen neuen')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Expert Form Modal */}
      {showExpertForm && (
        <ExpertForm expertId={editingExpertId} onClose={() => setShowExpertForm(false)} />
      )}
    </div>
  )
}
