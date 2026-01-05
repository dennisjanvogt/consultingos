import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  MessageSquare,
  Trash2,
  Send,
  Loader2,
  User,
  Bot,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react'
import { useAIStore } from '@/stores/aiStore'
import { useWindowStore } from '@/stores/windowStore'
import { sendMessage, sendMessageStream, type Message, type ToolCall, type AIResponse } from '@/services/aiAgent'
import { executeTool } from '@/services/tools'
import { HelperDialog } from './HelperDialog'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  image_url?: string | null
}

export function ChatApp() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showHelperDropdown, setShowHelperDropdown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const helperDropdownRef = useRef<HTMLDivElement>(null)

  const { openWindow } = useWindowStore()

  const {
    conversations,
    currentConversationId,
    currentMessages,
    isLoadingConversations,
    fetchConversations,
    createConversation,
    loadConversation,
    deleteConversation,
    addMessage: addMessageToStore,
    clearCurrentConversation,
    // Helper management
    helpers,
    currentHelperId,
    fetchHelpers,
    setCurrentHelper,
    getCurrentHelper,
    showHelperDialog,
    setShowHelperDialog,
  } = useAIStore()

  const currentHelper = getCurrentHelper()

  // Fetch conversations and helpers on mount
  useEffect(() => {
    fetchConversations()
    fetchHelpers()
  }, [fetchConversations, fetchHelpers])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helperDropdownRef.current && !helperDropdownRef.current.contains(event.target as Node)) {
        setShowHelperDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync messages when currentMessages changes
  useEffect(() => {
    if (currentConversationId && currentMessages.length > 0) {
      setMessages(
        currentMessages.map((m) => ({
          role: m.role,
          content: m.content,
          image_url: m.image_url,
        }))
      )
      setConversationHistory(
        currentMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      )
    } else if (!currentConversationId) {
      setMessages([])
      setConversationHistory([])
    }
  }, [currentConversationId, currentMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Tool execution
  const executeToolCall = useCallback(
    async (toolCall: ToolCall): Promise<string> => {
      const args = JSON.parse(toolCall.function.arguments)
      return executeTool(toolCall.function.name, args, { openWindow, onClose: () => {} })
    },
    [openWindow]
  )

  // Handle new conversation
  const handleNewConversation = () => {
    clearCurrentConversation()
    setMessages([])
    setConversationHistory([])
    inputRef.current?.focus()
  }

  // Handle submit with streaming
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    // Persist user message
    await addMessageToStore({ role: 'user', content: userMessage })

    // Add empty assistant message for streaming
    const streamingMsgIndex = messages.length + 1 // +1 because we just added user message
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const newHistory: Message[] = [
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ]

      let currentHistory = [...newHistory]
      let lastImageUrl: string | null = null
      let streamedContent = ''

      // Stream the first response
      await new Promise<AIResponse>((resolve, reject) => {
        sendMessageStream(
          currentHistory,
          {
            onChunk: (chunk) => {
              streamedContent += chunk
              setMessages((prev) => {
                const updated = [...prev]
                updated[streamingMsgIndex] = {
                  role: 'assistant',
                  content: streamedContent
                }
                return updated
              })
            },
            onComplete: resolve,
            onError: reject
          },
          { helper: currentHelper }
        )
      }).then(async (response) => {
        // Handle tool calls (non-streaming for simplicity)
        while (response.toolCalls.length > 0) {
          currentHistory.push({
            role: 'assistant',
            content: response.content,
            tool_calls: response.toolCalls,
          })

          const toolResults: Message[] = []
          for (const toolCall of response.toolCalls) {
            const result = await executeToolCall(toolCall)

            if (toolCall.function.name === 'generate_image') {
              try {
                const resultData = JSON.parse(result)
                if (resultData.file_url) {
                  lastImageUrl = resultData.file_url
                }
              } catch {
                // Not JSON
              }
            }

            toolResults.push({
              role: 'tool',
              content: result,
              tool_call_id: toolCall.id,
            })
          }

          currentHistory = [...currentHistory, ...toolResults]

          // Stream the follow-up response after tool calls
          streamedContent = ''
          response = await new Promise<AIResponse>((resolve, reject) => {
            sendMessageStream(
              currentHistory,
              {
                onChunk: (chunk) => {
                  streamedContent += chunk
                  setMessages((prev) => {
                    const updated = [...prev]
                    updated[streamingMsgIndex] = {
                      role: 'assistant',
                      content: streamedContent,
                      image_url: lastImageUrl
                    }
                    return updated
                  })
                },
                onComplete: resolve,
                onError: reject
              },
              { helper: currentHelper }
            )
          })
        }

        // Update final message with image if any
        if (lastImageUrl) {
          setMessages((prev) => {
            const updated = [...prev]
            updated[streamingMsgIndex] = {
              role: 'assistant',
              content: response.content || streamedContent,
              image_url: lastImageUrl
            }
            return updated
          })
        }

        setConversationHistory([
          ...currentHistory,
          { role: 'assistant', content: response.content || streamedContent },
        ])

        // Persist final message
        await addMessageToStore({
          role: 'assistant',
          content: response.content || streamedContent,
          image_url: lastImageUrl,
        })
      })
    } catch (error) {
      console.error('AI Error:', error)
      const errorMsg = 'Entschuldigung, es gab einen Fehler bei der Verarbeitung.'
      setMessages((prev) => {
        const updated = [...prev]
        updated[streamingMsgIndex] = { role: 'assistant', content: errorMsg }
        return updated
      })
      await addMessageToStore({ role: 'assistant', content: errorMsg })
    } finally {
      setIsLoading(false)
      // Refocus input after message is sent
      inputRef.current?.focus()
    }
  }

  // Handle key down in textarea
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Copy code to clipboard
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'gerade eben'
    if (diffMins < 60) return `vor ${diffMins} Min.`
    if (diffHours < 24) return `vor ${diffHours} Std.`
    if (diffDays === 1) return 'gestern'
    if (diffDays < 7) return `vor ${diffDays} Tagen`
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="h-full flex bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Helper Selector */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700" ref={helperDropdownRef}>
          <div className="relative">
            <button
              onClick={() => setShowHelperDropdown(!showHelperDropdown)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{currentHelper?.icon || '🤖'}</span>
                <span className="truncate font-medium">{currentHelper?.name || 'Kein Helfer'}</span>
              </div>
              <ChevronDown className="w-4 h-4 shrink-0 text-gray-500" />
            </button>

            {showHelperDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                {helpers.map((helper) => (
                  <button
                    key={helper.id}
                    onClick={() => {
                      setCurrentHelper(helper.id)
                      setShowHelperDropdown(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentHelperId === helper.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <span className="text-lg">{helper.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{helper.name}</div>
                      {helper.description && (
                        <div className="text-xs text-gray-500 truncate">{helper.description}</div>
                      )}
                    </div>
                    {helper.is_default && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300">
                        Standard
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoadingConversations ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p>Keine Gespräche</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-gray-200 dark:bg-gray-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {conv.title}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {formatRelativeTime(conv.updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conv.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium">Wie kann ich dir helfen?</p>
                <p className="text-sm mt-1">Starte ein Gespräch mit deiner Frage</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            const codeString = String(children).replace(/\n$/, '')

                            if (match) {
                              return (
                                <div className="relative group/code">
                                  <button
                                    onClick={() => copyToClipboard(codeString, idx)}
                                    className="absolute right-2 top-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded opacity-0 group-hover/code:opacity-100 transition-opacity"
                                  >
                                    {copiedIndex === idx ? (
                                      <Check className="w-3.5 h-3.5 text-green-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5 text-gray-300" />
                                    )}
                                  </button>
                                  <SyntaxHighlighter
                                    style={oneDark}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{
                                      margin: 0,
                                      borderRadius: '0.5rem',
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              )
                            }
                            return (
                              <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm" {...props}>
                                {children}
                              </code>
                            )
                          },
                          p({ children }) {
                            return <p className="mb-2 last:mb-0">{children}</p>
                          },
                          ul({ children }) {
                            return <ul className="list-disc ml-4 mb-2">{children}</ul>
                          },
                          ol({ children }) {
                            return <ol className="list-decimal ml-4 mb-2">{children}</ol>
                          },
                          a({ href, children }) {
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                {children}
                              </a>
                            )
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      {/* Inline Image */}
                      {msg.image_url && (
                        <img
                          src={msg.image_url.startsWith('http') ? msg.image_url : `http://localhost:8000${msg.image_url}`}
                          alt="Generiertes Bild"
                          className="mt-3 max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.image_url!.startsWith('http') ? msg.image_url! : `http://localhost:8000${msg.image_url}`, '_blank')}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-800 dark:bg-gray-200 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-white dark:text-gray-800" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-gray-500" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3">
                <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht eingeben... (Enter zum Senden, Shift+Enter für neue Zeile)"
              className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-shadow"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Helper Dialog */}
      <HelperDialog
        open={showHelperDialog}
        onClose={() => setShowHelperDialog(false)}
      />
    </div>
  )
}
