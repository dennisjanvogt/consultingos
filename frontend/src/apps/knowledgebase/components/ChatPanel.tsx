import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Plus, Trash2, Loader2, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { useKnowledgebaseStore } from '@/stores/knowledgebaseStore'
import { useConfirmStore } from '@/stores/confirmStore'
import type { Expert, ExpertMessage, SourceChunk } from '@/api/types'

interface ChatPanelProps {
  expert: Expert
}

function MessageBubble({ message }: { message: ExpertMessage }) {
  const [showSources, setShowSources] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-violet-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Sources */}
        {!isUser && message.source_chunks && message.source_chunks.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <FileText className="w-3 h-3" />
              {message.source_chunks.length} Quellen
              {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showSources && (
              <div className="mt-2 space-y-2">
                {message.source_chunks.map((source, idx) => (
                  <SourceCard key={idx} source={source} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SourceCard({ source }: { source: SourceChunk }) {
  // Convert similarity (0-1) to percentage and color
  const similarity = source.similarity ?? 0
  const percent = Math.round(similarity * 100)
  const getColor = () => {
    if (similarity >= 0.85) return 'text-green-600 dark:text-green-400'
    if (similarity >= 0.75) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-gray-500 dark:text-gray-400'
  }

  return (
    <div className="p-2 bg-white/50 dark:bg-gray-700/50 rounded text-xs">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
        <FileText className="w-3 h-3" />
        <span className="font-medium flex-1">{source.document_name}</span>
        {source.page_number && <span>(S. {source.page_number})</span>}
        {similarity > 0 && (
          <span className={`font-mono ${getColor()}`}>{percent}%</span>
        )}
      </div>
      <p className="text-gray-500 dark:text-gray-400 line-clamp-2">{source.content_preview}</p>
    </div>
  )
}

export function ChatPanel({ expert }: ChatPanelProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { confirm } = useConfirmStore()

  const {
    conversations,
    currentConversationId,
    messages,
    lastSources,
    isLoadingConversations,
    isLoadingMessages,
    isSendingMessage,
    createConversation,
    loadConversation,
    deleteConversation,
    sendMessage,
    clearCurrentConversation,
  } = useKnowledgebaseStore()

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on conversation change
  useEffect(() => {
    if (currentConversationId) {
      inputRef.current?.focus()
    }
  }, [currentConversationId])

  const handleSend = async () => {
    if (!input.trim() || isSendingMessage) return

    let convId = currentConversationId

    // Create conversation if none exists
    if (!convId) {
      const conv = await createConversation(expert.id)
      if (!conv) return
      convId = conv.id
    }

    const message = input.trim()
    setInput('')
    await sendMessage(convId, message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewConversation = () => {
    clearCurrentConversation()
  }

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = await confirm({
      title: t('knowledgebase.deleteConversation', 'Konversation löschen'),
      message: t('knowledgebase.confirmDeleteConv', 'Konversation und alle Nachrichten löschen?'),
      confirmLabel: t('common.delete', 'Löschen'),
      variant: 'danger',
    })
    if (confirmed) {
      await deleteConversation(id)
    }
  }

  if (!expert.is_indexed) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-3">📄</div>
          <p>{t('knowledgebase.noIndexedDocs', 'Lade zuerst Dokumente hoch')}</p>
          <p className="text-sm mt-1">
            {t('knowledgebase.needDocsForChat', 'Der Chat benötigt indexierte Dokumente')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Conversation List */}
      <div className="w-56 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('knowledgebase.newChat', 'Neuer Chat')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingConversations ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
              {t('knowledgebase.noConversations', 'Keine Konversationen')}
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conv.id
                    ? 'bg-violet-100 dark:bg-violet-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="flex-1 text-sm truncate text-gray-700 dark:text-gray-300">
                  {conv.title}
                </span>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-red-500 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingMessages ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-3">{expert.icon}</div>
              <p className="font-medium">{expert.name}</p>
              <p className="text-sm mt-1">
                {t('knowledgebase.startChat', 'Stelle eine Frage...')}
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isSendingMessage && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('knowledgebase.askPlaceholder', 'Frage eingeben...')}
              rows={1}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSendingMessage}
              className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:bg-violet-300 text-white rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
