import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers, Monitor, Database, Bot, Server, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'

interface Diagram {
  id: string
  titleKey: string
  descriptionKey: string
  icon: React.ReactNode
  file: string
}

const diagrams: Diagram[] = [
  {
    id: 'system-overview',
    titleKey: 'architecture.systemOverview',
    descriptionKey: 'architecture.systemOverviewDesc',
    icon: <Layers className="w-5 h-5" />,
    file: '/architecture/01-system-overview.svg',
  },
  {
    id: 'frontend-shell',
    titleKey: 'architecture.frontendShell',
    descriptionKey: 'architecture.frontendShellDesc',
    icon: <Monitor className="w-5 h-5" />,
    file: '/architecture/02-frontend-shell.svg',
  },
  {
    id: 'state-management',
    titleKey: 'architecture.stateManagement',
    descriptionKey: 'architecture.stateManagementDesc',
    icon: <Database className="w-5 h-5" />,
    file: '/architecture/03-state-management.svg',
  },
  {
    id: 'ai-tools',
    titleKey: 'architecture.aiTools',
    descriptionKey: 'architecture.aiToolsDesc',
    icon: <Bot className="w-5 h-5" />,
    file: '/architecture/04-ai-tools-system.svg',
  },
  {
    id: 'backend-api',
    titleKey: 'architecture.backendApi',
    descriptionKey: 'architecture.backendApiDesc',
    icon: <Server className="w-5 h-5" />,
    file: '/architecture/05-backend-api.svg',
  },
]

export function ArchitectureApp() {
  const { t } = useTranslation()
  const [selectedDiagram, setSelectedDiagram] = useState<Diagram>(diagrams[0])
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentIndex = diagrams.findIndex((d) => d.id === selectedDiagram.id)

  const goToPrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : diagrams.length - 1
    setSelectedDiagram(diagrams[newIndex])
  }

  const goToNext = () => {
    const newIndex = currentIndex < diagrams.length - 1 ? currentIndex + 1 : 0
    setSelectedDiagram(diagrams[newIndex])
  }

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-56 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('architecture.title', 'Architektur')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('architecture.subtitle', 'System-Diagramme')}
          </p>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-auto">
          {diagrams.map((diagram) => (
            <button
              key={diagram.id}
              onClick={() => setSelectedDiagram(diagram)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                selectedDiagram.id === diagram.id
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <span
                className={
                  selectedDiagram.id === diagram.id
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-gray-400 dark:text-gray-500'
                }
              >
                {diagram.icon}
              </span>
              <span className="text-sm font-medium truncate">
                {t(diagram.titleKey, diagram.id)}
              </span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
          {t('architecture.adminOnly', 'Nur für Administratoren')}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t(selectedDiagram.titleKey, selectedDiagram.id)}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t(selectedDiagram.descriptionKey, '')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title={t('common.previous', 'Zurück')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[60px] text-center">
              {currentIndex + 1} / {diagrams.length}
            </span>
            <button
              onClick={goToNext}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title={t('common.next', 'Weiter')}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title={t('common.fullscreen', 'Vollbild')}
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Diagram View */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <img
              src={selectedDiagram.file}
              alt={t(selectedDiagram.titleKey, selectedDiagram.id)}
              className="max-w-full max-h-full object-contain p-4"
            />
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex flex-col"
          data-modal-open="true"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t(selectedDiagram.titleKey, selectedDiagram.id)}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevious}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-500 min-w-[60px] text-center">
                {currentIndex + 1} / {diagrams.length}
              </span>
              <button
                onClick={goToNext}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-auto flex items-center justify-center">
            <img
              src={selectedDiagram.file}
              alt={t(selectedDiagram.titleKey, selectedDiagram.id)}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
