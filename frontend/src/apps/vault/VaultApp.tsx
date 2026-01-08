import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Star, FileText, ChevronRight, ChevronDown, MoreHorizontal, Trash2, Link2, Network, Table, FileEdit } from 'lucide-react'
import { useVaultStore } from '@/stores/vaultStore'
import type { VaultPageListItem } from '@/stores/vaultStore'
import { BlockEditor } from './components/Editor/BlockEditor'
import { EmojiPicker } from './components/EmojiPicker'
import { GraphView } from './components/GraphView'
import { DatabaseView } from './components/DatabaseView'
import { useConfirmStore } from '@/stores/confirmStore'

// Drag and drop context
interface DragState {
  draggedId: number | null
  dropTargetId: number | null
  dropPosition: 'before' | 'after' | 'inside' | null
}

type PageMode = 'editor' | 'database'

export function VaultApp() {
  const { t } = useTranslation()
  const confirm = useConfirmStore((state) => state.confirm)
  const [searchInput, setSearchInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [pageMode, setPageMode] = useState<PageMode>('editor')
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    dropTargetId: null,
    dropPosition: null,
  })

  const {
    pages,
    currentPage,
    currentPageId,
    isLoading,
    tags,
    searchResults,
    isSearching,
    graphData,
    viewMode,
    fetchPages,
    fetchPage,
    fetchTags,
    fetchGraph,
    createPage,
    updatePage,
    deletePage,
    movePage,
    toggleFavorite,
    setCurrentPageId,
    toggleExpanded,
    setViewMode,
    search,
    clearSearch,
    getRootPages,
    getChildren,
    getFavorites,
    isExpanded,
  } = useVaultStore()

  // Drag and drop handlers
  const handleDragStart = (pageId: number) => {
    setDragState({ draggedId: pageId, dropTargetId: null, dropPosition: null })
  }

  const handleDragEnd = async () => {
    if (dragState.draggedId && dragState.dropTargetId && dragState.dropPosition) {
      let newParentId: number | null = null

      if (dragState.dropPosition === 'inside') {
        // Drop inside another page - make it a child
        newParentId = dragState.dropTargetId
      } else {
        // Drop before/after - keep at same level as target
        const targetPage = pages.find(p => p.id === dragState.dropTargetId)
        newParentId = targetPage?.parent_id ?? null
      }

      // Don't move to itself or to its own children (prevent circular references)
      if (dragState.draggedId !== newParentId) {
        await movePage(dragState.draggedId, newParentId)
      }
    }
    setDragState({ draggedId: null, dropTargetId: null, dropPosition: null })
  }

  const handleDragOver = (pageId: number, position: 'before' | 'after' | 'inside') => {
    if (dragState.draggedId && dragState.draggedId !== pageId) {
      setDragState(prev => ({ ...prev, dropTargetId: pageId, dropPosition: position }))
    }
  }

  const handleDragLeave = () => {
    setDragState(prev => ({ ...prev, dropTargetId: null, dropPosition: null }))
  }

  // Initial fetch
  useEffect(() => {
    fetchPages()
    fetchTags()
  }, [fetchPages, fetchTags])

  // Fetch graph when view mode changes
  useEffect(() => {
    if (viewMode === 'graph' && !graphData) {
      fetchGraph()
    }
  }, [viewMode, graphData, fetchGraph])

  // Load current page on mount if we have a stored ID
  useEffect(() => {
    if (currentPageId && !currentPage) {
      fetchPage(currentPageId)
    }
  }, [currentPageId, currentPage, fetchPage])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput) {
        search(searchInput)
      } else {
        clearSearch()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, search, clearSearch])

  const handleCreatePage = async (parentId?: number | null) => {
    const page = await createPage(parentId)
    if (page) {
      setCurrentPageId(page.id)
    }
  }

  const handleDeletePage = async (id: number, title: string) => {
    const confirmed = await confirm({
      title: t('vault.deletePage', 'Seite löschen'),
      message: t('vault.confirmDelete', `Möchtest du "${title}" wirklich löschen? Alle Unterseiten werden ebenfalls gelöscht.`),
      confirmLabel: t('common.delete', 'Löschen'),
      variant: 'danger',
    })
    if (confirmed) {
      await deletePage(id)
    }
  }

  const handleContentChange = (content: Record<string, unknown>) => {
    if (currentPageId) {
      updatePage(currentPageId, { content })
    }
  }

  const handleTitleChange = (title: string) => {
    if (currentPageId) {
      updatePage(currentPageId, { title })
    }
  }

  const handleIconChange = (icon: string) => {
    if (currentPageId) {
      updatePage(currentPageId, { icon })
    }
  }

  const rootPages = getRootPages()
  const favorites = getFavorites()
  const displayPages = searchInput ? searchResults : rootPages

  return (
    <div className="h-full flex bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
        {/* Search (only in pages view) */}
        {viewMode === 'pages' && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('vault.search', 'Suchen...')}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Pages List (only in pages view) */}
        {viewMode === 'pages' ? (
          <div className="flex-1 overflow-y-auto p-2">
            {/* Favorites */}
            {!searchInput && favorites.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                <Star className="w-3 h-3" />
                {t('vault.favorites', 'Favoriten')}
              </div>
              {favorites.map((page) => (
                <PageTreeItem
                  key={page.id}
                  page={page}
                  level={0}
                  isSelected={currentPageId === page.id}
                  isExpanded={isExpanded(page.id)}
                  onSelect={() => setCurrentPageId(page.id)}
                  onToggle={() => toggleExpanded(page.id)}
                  onDelete={() => handleDeletePage(page.id, page.title)}
                  onToggleFavorite={() => toggleFavorite(page.id)}
                  onCreateChild={() => handleCreatePage(page.id)}
                  getChildren={getChildren}
                  isExpandedFn={isExpanded}
                  currentPageId={currentPageId}
                  setCurrentPageId={setCurrentPageId}
                  toggleExpanded={toggleExpanded}
                  handleDeletePage={handleDeletePage}
                  toggleFavorite={toggleFavorite}
                  handleCreatePage={handleCreatePage}
                  isDragging={dragState.draggedId === page.id}
                  isDropTarget={dragState.dropTargetId === page.id}
                  dropPosition={dragState.dropTargetId === page.id ? dragState.dropPosition : null}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  draggedId={dragState.draggedId}
                  dropTargetId={dragState.dropTargetId}
                  globalDropPosition={dragState.dropPosition}
                />
              ))}
            </div>
          )}

          {/* All Pages / Search Results */}
          <div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {searchInput ? t('vault.searchResults', 'Suchergebnisse') : t('vault.pages', 'Seiten')}
              </span>
              {!searchInput && (
                <button
                  onClick={() => handleCreatePage()}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title={t('vault.newPage', 'Neue Seite')}
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            {isLoading || isSearching ? (
              <div className="px-2 py-4 text-center text-sm text-gray-500">
                {t('common.loading', 'Laden...')}
              </div>
            ) : displayPages.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-gray-500">
                {searchInput
                  ? t('vault.noResults', 'Keine Ergebnisse')
                  : t('vault.noPages', 'Keine Seiten')}
              </div>
            ) : (
              displayPages.map((page) => (
                <PageTreeItem
                  key={page.id}
                  page={page}
                  level={0}
                  isSelected={currentPageId === page.id}
                  isExpanded={isExpanded(page.id)}
                  onSelect={() => setCurrentPageId(page.id)}
                  onToggle={() => toggleExpanded(page.id)}
                  onDelete={() => handleDeletePage(page.id, page.title)}
                  onToggleFavorite={() => toggleFavorite(page.id)}
                  onCreateChild={() => handleCreatePage(page.id)}
                  getChildren={getChildren}
                  isExpandedFn={isExpanded}
                  currentPageId={currentPageId}
                  setCurrentPageId={setCurrentPageId}
                  toggleExpanded={toggleExpanded}
                  handleDeletePage={handleDeletePage}
                  toggleFavorite={toggleFavorite}
                  handleCreatePage={handleCreatePage}
                  isDragging={dragState.draggedId === page.id}
                  isDropTarget={dragState.dropTargetId === page.id}
                  dropPosition={dragState.dropTargetId === page.id ? dragState.dropPosition : null}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  draggedId={dragState.draggedId}
                  dropTargetId={dragState.dropTargetId}
                  globalDropPosition={dragState.dropPosition}
                />
              ))
            )}
          </div>

          {/* Tags */}
          {!searchInput && tags.length > 0 && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-2 py-1">
                {t('vault.tags', 'Tags')}
              </div>
              <div className="flex flex-wrap gap-1 px-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{
                      backgroundColor: `${getTagColor(tag.color)}20`,
                      color: getTagColor(tag.color),
                    }}
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{t('vault.graphDescription', 'Visualisierung der Seiten-Verbindungen')}</p>
              <p className="text-xs mt-1">{t('vault.clickToNavigate', 'Klicke auf einen Knoten um zur Seite zu springen')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {viewMode === 'graph' ? (
          <div className="flex-1 p-4">
            {graphData ? (
              <GraphView
                nodes={graphData.nodes}
                edges={graphData.edges}
                onNodeClick={(nodeId) => {
                  setCurrentPageId(nodeId)
                  setViewMode('pages')
                }}
                currentPageId={currentPageId}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {t('common.loading', 'Loading...')}
              </div>
            )}
          </div>
        ) : currentPage ? (
          <>
            {/* Page Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              {/* Breadcrumbs */}
              {currentPage.breadcrumbs.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                  {currentPage.breadcrumbs.slice(0, -1).map((crumb, idx) => (
                    <span key={crumb.id} className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPageId(crumb.id)}
                        className="hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {crumb.icon || '📄'} {crumb.title}
                      </button>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  ))}
                </div>
              )}

              {/* Title Row */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                    title={t('vault.changeIcon', 'Icon ändern')}
                  >
                    {currentPage.icon || '📄'}
                  </button>
                  {showEmojiPicker && (
                    <EmojiPicker
                      currentEmoji={currentPage.icon}
                      onSelect={handleIconChange}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}
                </div>
                <input
                  type="text"
                  value={currentPage.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="flex-1 text-2xl font-bold bg-transparent outline-none text-gray-900 dark:text-white"
                  placeholder={t('vault.untitled', 'Untitled')}
                />

                {/* Mode Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setPageMode('editor')}
                    className={`p-1.5 rounded transition-colors ${
                      pageMode === 'editor'
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title={t('vault.editorMode', 'Editor')}
                  >
                    <FileEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPageMode('database')}
                    className={`p-1.5 rounded transition-colors ${
                      pageMode === 'database'
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title={t('vault.databaseMode', 'Datenbank')}
                  >
                    <Table className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content: Editor or Database */}
            {pageMode === 'editor' ? (
              <div className="flex-1 overflow-y-auto p-4">
                <BlockEditor
                  content={currentPage.content}
                  onChange={handleContentChange}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <DatabaseView pageId={currentPage.id} />
              </div>
            )}

            {/* Backlinks */}
            {currentPage.backlinks.length > 0 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  <Link2 className="w-4 h-4" />
                  {t('vault.backlinks', 'Backlinks')} ({currentPage.backlinks.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentPage.backlinks.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => setCurrentPageId(link.id)}
                      className="flex items-center gap-1.5 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-violet-500 transition-colors"
                    >
                      <span>{link.icon || '📄'}</span>
                      <span>{link.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium">{t('vault.selectPage', 'Wähle eine Seite')}</p>
              <p className="text-sm mt-1">{t('vault.orCreate', 'oder erstelle eine neue')}</p>
              <button
                onClick={() => handleCreatePage()}
                className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-4 h-4 inline-block mr-1" />
                {t('vault.newPage', 'Neue Seite')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Page Tree Item Component
interface PageTreeItemProps {
  page: { id: number; title: string; icon: string; has_children: boolean; is_favorited: boolean; parent_id: number | null }
  level: number
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggle: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onCreateChild: () => void
  getChildren: (parentId: number) => VaultPageListItem[]
  isExpandedFn: (id: number) => boolean
  currentPageId: number | null
  setCurrentPageId: (id: number | null) => void
  toggleExpanded: (id: number) => void
  handleDeletePage: (id: number, title: string) => void
  toggleFavorite: (id: number) => void
  handleCreatePage: (parentId?: number | null) => void
  // Drag and drop props
  isDragging?: boolean
  isDropTarget?: boolean
  dropPosition?: 'before' | 'after' | 'inside' | null
  onDragStart?: (pageId: number) => void
  onDragEnd?: () => void
  onDragOver?: (pageId: number, position: 'before' | 'after' | 'inside') => void
  onDragLeave?: () => void
  // Drag state passed down for recursive children
  draggedId?: number | null
  dropTargetId?: number | null
  globalDropPosition?: 'before' | 'after' | 'inside' | null
}

function PageTreeItem({
  page,
  level,
  isSelected,
  isExpanded,
  onSelect,
  onToggle,
  onDelete,
  onToggleFavorite,
  onCreateChild,
  getChildren,
  isExpandedFn,
  currentPageId,
  setCurrentPageId,
  toggleExpanded,
  handleDeletePage,
  toggleFavorite,
  handleCreatePage,
  isDragging,
  isDropTarget,
  dropPosition,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  draggedId,
  dropTargetId,
  globalDropPosition,
}: PageTreeItemProps) {
  const [showMenu, setShowMenu] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)
  const children = getChildren(page.id)

  const handleDragStartEvent = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(page.id))
    onDragStart?.(page.id)
  }

  const handleDragOverEvent = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!itemRef.current) return

    const rect = itemRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    // Determine drop position based on mouse position
    if (y < height * 0.25) {
      onDragOver?.(page.id, 'before')
    } else if (y > height * 0.75) {
      onDragOver?.(page.id, 'after')
    } else {
      onDragOver?.(page.id, 'inside')
    }
  }

  const handleDragLeaveEvent = (e: React.DragEvent) => {
    e.preventDefault()
    onDragLeave?.()
  }

  const handleDropEvent = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDragEnd?.()
  }

  return (
    <div className="relative">
      {/* Drop indicator - before */}
      {isDropTarget && dropPosition === 'before' && (
        <div
          className="absolute left-0 right-0 h-0.5 bg-violet-500 -top-0.5 z-10"
          style={{ marginLeft: `${8 + level * 12}px` }}
        />
      )}

      <div
        ref={itemRef}
        draggable
        onDragStart={handleDragStartEvent}
        onDragOver={handleDragOverEvent}
        onDragLeave={handleDragLeaveEvent}
        onDrop={handleDropEvent}
        onDragEnd={onDragEnd}
        className={`group flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
        } ${isDragging ? 'opacity-50' : ''} ${
          isDropTarget && dropPosition === 'inside' ? 'ring-2 ring-violet-500 ring-inset' : ''
        }`}
        style={{ paddingLeft: `${8 + level * 12}px` }}
        onClick={onSelect}
      >
        {/* Expand/Collapse */}
        {page.has_children ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        ) : (
          <div className="w-4.5" />
        )}

        {/* Icon */}
        <span className="text-sm">{page.icon || '📄'}</span>

        {/* Title */}
        <span className="flex-1 text-sm truncate">{page.title || 'Untitled'}</span>

        {/* Favorite indicator */}
        {page.is_favorited && (
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
        )}

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCreateChild()
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="Unterseite erstellen"
          >
            <Plus className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite()
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Star className={`w-4 h-4 ${page.is_favorited ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                    {page.is_favorited ? 'Aus Favoriten' : 'Zu Favoriten'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Drop indicator - after */}
      {isDropTarget && dropPosition === 'after' && (
        <div
          className="absolute left-0 right-0 h-0.5 bg-violet-500 -bottom-0.5 z-10"
          style={{ marginLeft: `${8 + level * 12}px` }}
        />
      )}

      {/* Children */}
      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              level={level + 1}
              isSelected={currentPageId === child.id}
              isExpanded={isExpandedFn(child.id)}
              onSelect={() => setCurrentPageId(child.id)}
              onToggle={() => toggleExpanded(child.id)}
              onDelete={() => handleDeletePage(child.id, child.title)}
              onToggleFavorite={() => toggleFavorite(child.id)}
              onCreateChild={() => handleCreatePage(child.id)}
              getChildren={getChildren}
              isExpandedFn={isExpandedFn}
              currentPageId={currentPageId}
              setCurrentPageId={setCurrentPageId}
              toggleExpanded={toggleExpanded}
              handleDeletePage={handleDeletePage}
              toggleFavorite={toggleFavorite}
              handleCreatePage={handleCreatePage}
              isDragging={draggedId === child.id}
              isDropTarget={dropTargetId === child.id}
              dropPosition={dropTargetId === child.id ? globalDropPosition : null}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              draggedId={draggedId}
              dropTargetId={dropTargetId}
              globalDropPosition={globalDropPosition}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Helper function for tag colors
function getTagColor(color: string): string {
  const colors: Record<string, string> = {
    gray: '#6B7280',
    red: '#EF4444',
    orange: '#F97316',
    yellow: '#EAB308',
    green: '#22C55E',
    blue: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899',
  }
  return colors[color] || colors.gray
}
