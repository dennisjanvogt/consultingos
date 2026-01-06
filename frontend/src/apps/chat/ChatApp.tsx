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
  Mic,
  MicOff,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
  Music,
  BarChart3,
} from 'lucide-react'
import { useAIStore } from '@/stores/aiStore'
import { useWindowStore } from '@/stores/windowStore'
import { useAuthStore } from '@/stores/authStore'
import { sendMessage, sendMessageStream, type Message, type ToolCall, type AIResponse, type TextContent, type ImageContent } from '@/services/aiAgent'
import { executeTool } from '@/services/tools'
import { HelperDialog } from './HelperDialog'
import { InlineChatWidget, parseMessageContent } from './components/InlineChatWidget'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'

// Upload image and get URL
async function uploadChatImage(file: File): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('description', 'Chat attachment')

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/documents/`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) return null

    const doc = await response.json()
    return doc.file_url
  } catch {
    return null
  }
}

interface Attachment {
  id: string
  type: 'image' | 'audio' | 'pdf'
  file: File
  preview?: string // base64 or object URL for preview
  name: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  image_url?: string | null
  attachments?: Attachment[]
}

export function ChatApp() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showHelperDropdown, setShowHelperDropdown] = useState(false)

  // Attachment state
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const helperDropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Track pending response for saving on unmount
  const pendingResponseRef = useRef<{ content: string; imageUrl: string | null } | null>(null)

  const { openWindow, closeWindowByAppId, minimizeByAppId } = useWindowStore()
  const { user } = useAuthStore()

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
    // Analysis mode
    analysisMode,
    setAnalysisMode,
    // API Key status
    apiKeyStatus,
    checkApiKeyStatus,
    hasValidApiKey,
  } = useAIStore()

  const currentHelper = getCurrentHelper()

  // Fetch conversations, helpers, and check API key on mount
  useEffect(() => {
    fetchConversations()
    fetchHelpers()
    checkApiKeyStatus()
  }, [fetchConversations, fetchHelpers, checkApiKeyStatus])

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
      setMessages((prevMessages) =>
        currentMessages.map((m, idx) => ({
          role: m.role,
          content: m.content,
          image_url: m.image_url,
          // Preserve local attachments that aren't in the store
          attachments: prevMessages[idx]?.attachments,
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

  // Save pending response on unmount and cleanup recording
  useEffect(() => {
    return () => {
      // Cleanup recording interval on unmount
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
      // Stop media recorder if running
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      // Save pending response
      if (pendingResponseRef.current && pendingResponseRef.current.content) {
        addMessageToStore({
          role: 'assistant',
          content: pendingResponseRef.current.content,
          image_url: pendingResponseRef.current.imageUrl,
        })
      }
    }
  }, [addMessageToStore])

  // Handle ESC key for preview modal (must be global to catch before window handler)
  useEffect(() => {
    if (!previewImage) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.stopImmediatePropagation()
        e.preventDefault()
        setPreviewImage(null)
      }
    }

    // Use capture phase to catch before other handlers
    document.addEventListener('keydown', handleEscape, true)
    return () => document.removeEventListener('keydown', handleEscape, true)
  }, [previewImage])

  // Tool execution
  const executeToolCall = useCallback(
    async (toolCall: ToolCall): Promise<string> => {
      let args: Record<string, unknown>
      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch {
        console.error('Failed to parse tool arguments:', toolCall.function.arguments)
        return JSON.stringify({ error: 'Invalid tool arguments' })
      }
      return executeTool(toolCall.function.name, args, { openWindow, closeWindowByAppId, minimizeByAppId, onClose: () => {} })
    },
    [openWindow, closeWindowByAppId, minimizeByAppId]
  )

  // Handle new conversation
  const handleNewConversation = () => {
    clearCurrentConversation()
    setMessages([])
    setConversationHistory([])
    setAttachments([])
    inputRef.current?.focus()
  }

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      const type = file.type.startsWith('image/') ? 'image' :
                   file.type === 'application/pdf' ? 'pdf' :
                   file.type.startsWith('audio/') ? 'audio' : null

      if (!type) continue

      const preview = type === 'image' ? await fileToBase64(file) : undefined
      const attachment: Attachment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        file,
        preview,
        name: file.name
      }
      setAttachments(prev => [...prev, attachment])
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })

      audioChunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
          type: 'audio/webm'
        })

        const attachment: Attachment = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'audio',
          file: audioFile,
          name: audioFile.name
        }
        setAttachments(prev => [...prev, attachment])

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Update recording time
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  // Format recording time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle submit with streaming
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const hasContent = input.trim() || attachments.length > 0
    if (!hasContent || isLoading) return

    const userMessage = input.trim()
    const currentAttachments = [...attachments]
    setInput('')
    setAttachments([])
    setIsLoading(true)

    // Upload images and get URLs for persistence
    const imageAttachments = currentAttachments.filter(a => a.type === 'image')
    const otherAttachments = currentAttachments.filter(a => a.type !== 'image')

    let uploadedImageUrl: string | null = null
    if (imageAttachments.length > 0 && imageAttachments[0].file) {
      uploadedImageUrl = await uploadChatImage(imageAttachments[0].file)
    }

    // Add message to UI immediately (with local preview)
    const userMsgIndex = messages.length
    setMessages((prev) => [...prev, {
      role: 'user',
      content: userMessage,
      attachments: currentAttachments,
      image_url: uploadedImageUrl
    }])

    // Build multimodal content if there are images
    let messageContent: string | (TextContent | ImageContent)[]

    if (imageAttachments.length > 0 && imageAttachments[0].preview) {
      // Multimodal message with images
      const contentParts: (TextContent | ImageContent)[] = []

      // Add text if present
      if (userMessage) {
        contentParts.push({ type: 'text', text: userMessage })
      }

      // Add images (use preview for AI, uploaded URL for persistence)
      for (const img of imageAttachments) {
        if (img.preview) {
          contentParts.push({
            type: 'image_url',
            image_url: { url: img.preview }
          })
        }
      }

      // Add descriptions for non-image attachments
      if (otherAttachments.length > 0) {
        const descriptions = otherAttachments.map(a => {
          if (a.type === 'audio') return `[Audio: ${a.name}]`
          if (a.type === 'pdf') return `[PDF: ${a.name}]`
          return `[Datei: ${a.name}]`
        }).join(' ')
        contentParts.push({ type: 'text', text: descriptions })
      }

      messageContent = contentParts
    } else {
      // Text-only message
      let textContent = userMessage
      if (otherAttachments.length > 0) {
        const descriptions = otherAttachments.map(a => {
          if (a.type === 'audio') return `[Audio: ${a.name}]`
          if (a.type === 'pdf') return `[PDF: ${a.name}]`
          return `[Datei: ${a.name}]`
        }).join(' ')
        textContent = textContent ? `${textContent}\n\n${descriptions}` : descriptions
      }
      messageContent = textContent
    }

    // Persist user message (as text for storage, with image URL)
    const messageForStorage = typeof messageContent === 'string'
      ? messageContent
      : messageContent.filter(c => c.type === 'text').map(c => (c as TextContent).text).join('\n')
    await addMessageToStore({ role: 'user', content: messageForStorage, image_url: uploadedImageUrl })

    // Add empty assistant message for streaming
    const streamingMsgIndex = messages.length + 1 // +1 because we just added user message
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const newHistory: Message[] = [
        ...conversationHistory,
        { role: 'user', content: messageContent },
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
              // Track pending response for saving on unmount
              pendingResponseRef.current = { content: streamedContent, imageUrl: null }
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
                  // Track pending response for saving on unmount
                  pendingResponseRef.current = { content: streamedContent, imageUrl: lastImageUrl }
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
        // Clear pending response after successful save
        pendingResponseRef.current = null
      })
    } catch (error) {
      console.error('AI Error:', error)
      const errorMsg = t('errors.general')
      setMessages((prev) => {
        const updated = [...prev]
        updated[streamingMsgIndex] = { role: 'assistant', content: errorMsg }
        return updated
      })
      await addMessageToStore({ role: 'assistant', content: errorMsg })
      // Clear pending response after error save
      pendingResponseRef.current = null
    } finally {
      setIsLoading(false)
      // Refocus input after message is sent (setTimeout ensures DOM has updated)
      setTimeout(() => inputRef.current?.focus(), 0)
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
                <span className="truncate font-medium">{currentHelper?.name || t('chat.noHelper')}</span>
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
                        {t('chat.defaultHelper')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Inline Charts Toggle */}
          <div className="mt-2">
            <button
              onClick={() => setAnalysisMode(!analysisMode)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                analysisMode
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${analysisMode ? 'text-violet-500' : ''}`} />
              <span className="flex-1 text-left">{t('chat.inlineCharts')}</span>
              <div
                className={`w-8 h-4 rounded-full transition-colors ${
                  analysisMode ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${
                    analysisMode ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 px-3 mt-1">
              {analysisMode ? t('chat.inlineChartsOnHint') : t('chat.inlineChartsOffHint')}
            </p>
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
              <p>{t('chat.noConversations')}</p>
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
        {/* API Key Warning */}
        {apiKeyStatus && !hasValidApiKey() && (
          <div className="mx-4 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {t('chat.noApiKey', 'Kein OpenRouter API-Key hinterlegt')}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  {t('chat.noApiKeyDescription', 'Um AI-Funktionen zu nutzen, hinterlege deinen API-Key in den Einstellungen.')}
                </p>
                <button
                  onClick={() => openWindow('settings')}
                  className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
                >
                  {t('chat.goToSettings', 'Zu den Einstellungen →')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium">{t('chat.howCanIHelp', 'Wie kann ich dir helfen?')}</p>
                <p className="text-sm mt-1">{t('chat.startConversation', 'Starte ein Gespräch mit deiner Frage')}</p>
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
                  className={`max-w-[75%] min-w-0 rounded-xl px-4 py-3 overflow-hidden ${
                    msg.role === 'user'
                      ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-full break-all [&_*]:break-all [&_pre]:whitespace-pre-wrap [&_code]:break-all" style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
                      {!msg.content && isLoading ? (
                        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                      ) : (
                        (() => {
                          const { textContent, widgets } = parseMessageContent(msg.content)
                          return (
                            <>
                              {textContent && (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    code({ className, children, ...props }) {
                                      const match = /language-(\w+)/.exec(className || '')
                                      const codeString = String(children).replace(/\n$/, '')

                                      if (match) {
                                        return (
                                          <div className="relative group/code max-w-full overflow-hidden">
                                            <button
                                              onClick={() => copyToClipboard(codeString, idx)}
                                              className="absolute right-2 top-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded opacity-0 group-hover/code:opacity-100 transition-opacity z-10"
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
                                                maxWidth: '100%',
                                                overflowX: 'auto',
                                              }}
                                              wrapLongLines={true}
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
                                  {textContent}
                                </ReactMarkdown>
                              )}
                              {/* Inline Widgets */}
                              {widgets.map((widget, widgetIdx) => (
                                <InlineChatWidget key={`widget-${idx}-${widgetIdx}`} widget={widget} />
                              ))}
                            </>
                          )
                        })()
                      )}
                      {/* Inline Image */}
                      {msg.image_url && (
                        <img
                          src={msg.image_url.startsWith('http') ? msg.image_url : `${API_BASE}${msg.image_url}`}
                          alt="Generiertes Bild"
                          className="mt-3 max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewImage(msg.image_url!.startsWith('http') ? msg.image_url! : `${API_BASE}${msg.image_url}`)}
                        />
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* User message text */}
                      {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                      {/* User message attachments (local previews) */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className={`flex flex-wrap gap-2 ${msg.content ? 'mt-2' : ''}`}>
                          {msg.attachments.map((att) => (
                            <div key={att.id}>
                              {att.type === 'image' && att.preview ? (
                                <img
                                  src={att.preview}
                                  alt={att.name}
                                  className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setPreviewImage(att.preview!)}
                                />
                              ) : (
                                <div className="flex items-center gap-1.5 bg-white/10 rounded px-2 py-1">
                                  {att.type === 'audio' ? (
                                    <Music className="w-4 h-4" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                  <span className="text-xs opacity-80">{att.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* User message image from store (when no local attachments) */}
                      {msg.image_url && (!msg.attachments || msg.attachments.length === 0) && (
                        <div className={msg.content ? 'mt-2' : ''}>
                          <img
                            src={msg.image_url.startsWith('http') ? msg.image_url : `${API_BASE}${msg.image_url}`}
                            alt="Angehängtes Bild"
                            className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImage(msg.image_url!.startsWith('http') ? msg.image_url! : `${API_BASE}${msg.image_url}`)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-800 dark:bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-white dark:text-gray-800" />
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
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
          {/* Attachment Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="relative group flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2"
                >
                  {att.type === 'image' && att.preview ? (
                    <img src={att.preview} alt={att.name} className="w-10 h-10 rounded object-cover" />
                  ) : att.type === 'image' ? (
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                  ) : att.type === 'audio' ? (
                    <Music className="w-5 h-5 text-green-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-xs text-gray-600 dark:text-gray-400 max-w-[100px] truncate">
                    {att.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Recording Indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 mb-3 text-red-500">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm">Aufnahme... {formatTime(recordingTime)}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
              title="Datei anhängen"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Mic Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`p-3 rounded-xl transition-colors disabled:opacity-50 ${
                isRecording
                  ? 'text-red-500 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={isRecording ? 'Aufnahme stoppen' : 'Audio aufnehmen'}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.typeMessage')}
              className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-shadow"
              rows={1}
            />
            <button
              type="submit"
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
          data-modal-open="true"
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
