import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { useEffect, useCallback, useState, useRef } from 'react'
import {
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  Minus,
  Code2,
  Link2,
  AlertCircle,
  ChevronDown,
  Image,
  FileIcon,
  Video,
  Sparkles,
  FileText,
  Languages,
  Expand,
  Loader2,
} from 'lucide-react'
import { sendMessageStream } from '@/services/aiAgent'
import type { Message } from '@/services/aiAgent'
import { PageLink } from './extensions/PageLink'
import { Callout } from './extensions/Callout'
import { Toggle, ToggleTitle, ToggleContent } from './extensions/Toggle'
import { ImageEmbed } from './extensions/ImageEmbed'
import { FileEmbed } from './extensions/FileEmbed'
import { VideoEmbed } from './extensions/VideoEmbed'
import { useVaultStore } from '@/stores/vaultStore'
import type { VaultPageListItem } from '@/stores/vaultStore'

const lowlight = createLowlight(common)

interface BlockEditorProps {
  content: Record<string, unknown>
  onChange: (content: Record<string, unknown>) => void
  editable?: boolean
  onPageLinkClick?: (pageId: number) => void
}

interface SlashMenuItem {
  title: string
  description: string
  icon: React.ReactNode
  command: (editor: ReturnType<typeof useEditor>) => void
}

const slashMenuItems: SlashMenuItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 className="h-4 w-4" />,
    command: (editor) => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="h-4 w-4" />,
    command: (editor) => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="h-4 w-4" />,
    command: (editor) => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Create a bulleted list',
    icon: <List className="h-4 w-4" />,
    command: (editor) => editor?.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered className="h-4 w-4" />,
    command: (editor) => editor?.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Todo List',
    description: 'Track tasks with checkboxes',
    icon: <CheckSquare className="h-4 w-4" />,
    command: (editor) => editor?.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Quote',
    description: 'Capture a quote',
    icon: <Quote className="h-4 w-4" />,
    command: (editor) => editor?.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Code with syntax highlighting',
    icon: <Code2 className="h-4 w-4" />,
    command: (editor) => editor?.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Divider',
    description: 'Visual separator',
    icon: <Minus className="h-4 w-4" />,
    command: (editor) => editor?.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Page Link',
    description: 'Link to another page',
    icon: <Link2 className="h-4 w-4" />,
    command: () => {
      // This will trigger the page link picker
    },
  },
  {
    title: 'Callout',
    description: 'Highlight important info',
    icon: <AlertCircle className="h-4 w-4" />,
    command: (editor) => editor?.chain().focus().setCallout({ type: 'info' }).run(),
  },
  {
    title: 'Warning',
    description: 'Warning callout box',
    icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
    command: (editor) => editor?.chain().focus().setCallout({ type: 'warning' }).run(),
  },
  {
    title: 'Success',
    description: 'Success callout box',
    icon: <AlertCircle className="h-4 w-4 text-green-500" />,
    command: (editor) => editor?.chain().focus().setCallout({ type: 'success' }).run(),
  },
  {
    title: 'Toggle',
    description: 'Collapsible content',
    icon: <ChevronDown className="h-4 w-4" />,
    command: (editor) => editor?.chain().focus().setToggle().run(),
  },
  {
    title: 'Image',
    description: 'Embed an image',
    icon: <Image className="h-4 w-4" />,
    command: () => {
      // This will trigger the image picker
    },
  },
  {
    title: 'File',
    description: 'Embed a file',
    icon: <FileIcon className="h-4 w-4" />,
    command: () => {
      // This will trigger the file picker
    },
  },
  {
    title: 'Video',
    description: 'Embed a video',
    icon: <Video className="h-4 w-4" />,
    command: () => {
      // This will trigger the video URL input
    },
  },
  // AI Commands
  {
    title: 'AI Summarize',
    description: 'Summarize the page content',
    icon: <Sparkles className="h-4 w-4 text-violet-500" />,
    command: () => {
      // Trigger AI summarize
    },
  },
  {
    title: 'AI Expand',
    description: 'Expand selected text',
    icon: <Expand className="h-4 w-4 text-violet-500" />,
    command: () => {
      // Trigger AI expand
    },
  },
  {
    title: 'AI Translate',
    description: 'Translate content',
    icon: <Languages className="h-4 w-4 text-violet-500" />,
    command: () => {
      // Trigger AI translate
    },
  },
  {
    title: 'AI Continue',
    description: 'Continue writing',
    icon: <FileText className="h-4 w-4 text-violet-500" />,
    command: () => {
      // Trigger AI continue
    },
  },
]

export function BlockEditor({ content, onChange, editable = true, onPageLinkClick }: BlockEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const [slashFilter, setSlashFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const slashMenuRef = useRef<HTMLDivElement>(null)

  // Page link picker state
  const [showPagePicker, setShowPagePicker] = useState(false)
  const [pagePickerPosition, setPagePickerPosition] = useState({ top: 0, left: 0 })
  const [pageFilter, setPageFilter] = useState('')
  const [pageSelectedIndex, setPageSelectedIndex] = useState(0)
  const pagePickerRef = useRef<HTMLDivElement>(null)

  // URL input modal state
  const [urlModalType, setUrlModalType] = useState<'image' | 'video' | 'file' | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [urlTitleInput, setUrlTitleInput] = useState('')
  const urlInputRef = useRef<HTMLInputElement>(null)

  // AI Modal state
  const [aiModalType, setAiModalType] = useState<'summarize' | 'expand' | 'translate' | 'continue' | null>(null)
  const [aiResult, setAiResult] = useState('')
  const [aiIsLoading, setAiIsLoading] = useState(false)
  const [aiTargetLang, setAiTargetLang] = useState('Englisch')

  const pages = useVaultStore((state) => state.pages)
  const setCurrentPageId = useVaultStore((state) => state.setCurrentPageId)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: 'Type / for commands, [[ for page links...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-violet-500 underline cursor-pointer hover:text-violet-600',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      PageLink,
      Callout,
      Toggle,
      ToggleTitle,
      ToggleContent,
      ImageEmbed,
      FileEmbed,
      VideoEmbed,
    ],
    content: content && Object.keys(content).length > 0 ? content : undefined,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px]',
      },
      handleClick: (view, pos, event) => {
        // Handle clicks on page links
        const target = event.target as HTMLElement
        if (target.hasAttribute('data-page-link')) {
          const pageId = target.getAttribute('data-page-id')
          if (pageId && onPageLinkClick) {
            onPageLinkClick(parseInt(pageId, 10))
          } else if (pageId) {
            setCurrentPageId(parseInt(pageId, 10))
          }
          return true
        }
        return false
      },
      handleKeyDown: (view, event) => {
        // Handle page picker navigation
        if (showPagePicker) {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setPageSelectedIndex((prev) =>
              prev < filteredPages.length - 1 ? prev + 1 : 0
            )
            return true
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setPageSelectedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredPages.length - 1
            )
            return true
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            const page = filteredPages[pageSelectedIndex]
            if (page) {
              insertPageLink(page)
            }
            return true
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            setShowPagePicker(false)
            setPageFilter('')
            return true
          }
          if (event.key === 'Backspace' && pageFilter === '') {
            setShowPagePicker(false)
            return false
          }
        }

        // Handle slash menu navigation
        if (showSlashMenu) {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setSelectedIndex((prev) =>
              prev < filteredItems.length - 1 ? prev + 1 : 0
            )
            return true
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setSelectedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredItems.length - 1
            )
            return true
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            const item = filteredItems[selectedIndex]
            if (item) {
              const { state } = view
              const { from } = state.selection
              const textBefore = state.doc.textBetween(Math.max(0, from - 20), from)
              const slashIndex = textBefore.lastIndexOf('/')
              if (slashIndex !== -1) {
                const deleteFrom = from - (textBefore.length - slashIndex)
                view.dispatch(state.tr.delete(deleteFrom, from))
              }

              // Special handling for page link
              if (item.title === 'Page Link') {
                setShowSlashMenu(false)
                setSlashFilter('')
                // Trigger page picker
                const coords = editor?.view.coordsAtPos(from) || { bottom: 0, left: 0 }
                const editorRect = editor?.view.dom.getBoundingClientRect() || { top: 0, left: 0 }
                setPagePickerPosition({
                  top: coords.bottom - editorRect.top + 4,
                  left: coords.left - editorRect.left,
                })
                setShowPagePicker(true)
                setPageSelectedIndex(0)
              } else {
                item.command(editor)
                setShowSlashMenu(false)
                setSlashFilter('')
              }
            }
            return true
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            setShowSlashMenu(false)
            setSlashFilter('')
            return true
          }
          if (event.key === 'Backspace' && slashFilter === '') {
            setShowSlashMenu(false)
            return false
          }
        }
        return false
      },
    },
  })

  const filteredItems = slashMenuItems.filter((item) =>
    item.title.toLowerCase().includes(slashFilter.toLowerCase())
  )

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(pageFilter.toLowerCase())
  )

  // Insert page link at cursor position
  const insertPageLink = useCallback((page: VaultPageListItem) => {
    if (!editor) return

    // Delete the [[ trigger text
    const { state } = editor.view
    const { from } = state.selection
    const textBefore = state.doc.textBetween(Math.max(0, from - 20), from)
    const bracketIndex = textBefore.lastIndexOf('[[')
    if (bracketIndex !== -1) {
      const deleteFrom = from - (textBefore.length - bracketIndex)
      editor.view.dispatch(state.tr.delete(deleteFrom, from))
    }

    // Insert the page link
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'text',
        marks: [
          {
            type: 'pageLink',
            attrs: {
              pageId: page.id,
              title: page.title,
            },
          },
        ],
        text: page.title || 'Untitled',
      })
      .insertContent(' ')
      .run()

    setShowPagePicker(false)
    setPageFilter('')
  }, [editor])

  // Handle slash command and page link detection
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      const { state } = editor
      const { from } = state.selection
      const textBefore = state.doc.textBetween(Math.max(0, from - 20), from)

      // Check for [[ page link trigger
      const bracketMatch = textBefore.match(/\[\[([^\]]*)?$/)
      if (bracketMatch) {
        const coords = editor.view.coordsAtPos(from)
        const editorRect = editor.view.dom.getBoundingClientRect()

        setPagePickerPosition({
          top: coords.bottom - editorRect.top + 4,
          left: coords.left - editorRect.left,
        })
        setPageFilter(bracketMatch[1] || '')
        setShowPagePicker(true)
        setPageSelectedIndex(0)
        setShowSlashMenu(false)
        return
      }

      // Check for / slash command trigger
      const slashMatch = textBefore.match(/\/([a-zA-Z]*)$/)
      if (slashMatch) {
        const coords = editor.view.coordsAtPos(from)
        const editorRect = editor.view.dom.getBoundingClientRect()

        setSlashMenuPosition({
          top: coords.bottom - editorRect.top + 4,
          left: coords.left - editorRect.left,
        })
        setSlashFilter(slashMatch[1] || '')
        setShowSlashMenu(true)
        setSelectedIndex(0)
        setShowPagePicker(false)
      } else if (!bracketMatch) {
        setShowSlashMenu(false)
        setSlashFilter('')
        setShowPagePicker(false)
        setPageFilter('')
      }
    }

    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleUpdate)
    }
  }, [editor])

  // Update content when prop changes
  useEffect(() => {
    if (editor && content && Object.keys(content).length > 0) {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content)
      }
    }
  }, [editor, content])

  // Execute AI command
  const executeAiCommand = useCallback(async (type: 'summarize' | 'expand' | 'translate' | 'continue') => {
    if (!editor) return

    setAiModalType(type)
    setAiResult('')
    setAiIsLoading(true)

    // Get content based on type
    let inputText = ''
    const { from, to } = editor.state.selection
    const hasSelection = from !== to

    if (type === 'summarize') {
      // Use full page content for summarize
      inputText = editor.getText()
    } else if (hasSelection) {
      // Use selected text
      inputText = editor.state.doc.textBetween(from, to)
    } else {
      // Use content up to cursor
      inputText = editor.state.doc.textBetween(0, from)
    }

    if (!inputText.trim()) {
      setAiResult('Kein Text vorhanden.')
      setAiIsLoading(false)
      return
    }

    // Build prompt based on type
    let prompt = ''
    switch (type) {
      case 'summarize':
        prompt = `Fasse den folgenden Text prägnant zusammen. Gib nur die Zusammenfassung aus, keine Einleitung:\n\n${inputText}`
        break
      case 'expand':
        prompt = `Erweitere und detailliere den folgenden Text. Behalte den Stil bei und füge mehr Details, Beispiele oder Erklärungen hinzu:\n\n${inputText}`
        break
      case 'translate':
        prompt = `Übersetze den folgenden Text ins ${aiTargetLang}. Gib nur die Übersetzung aus:\n\n${inputText}`
        break
      case 'continue':
        prompt = `Schreibe den folgenden Text nahtlos weiter. Behalte Stil und Thema bei:\n\n${inputText}`
        break
    }

    const messages: Message[] = [{ role: 'user', content: prompt }]

    try {
      await sendMessageStream(messages, {
        onChunk: (chunk) => {
          setAiResult((prev) => prev + chunk)
        },
        onComplete: () => {
          setAiIsLoading(false)
        },
        onError: (error) => {
          setAiResult(`Fehler: ${error.message}`)
          setAiIsLoading(false)
        },
      })
    } catch (error) {
      setAiResult(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
      setAiIsLoading(false)
    }
  }, [editor, aiTargetLang])

  // Insert AI result into editor
  const insertAiResult = useCallback(() => {
    if (!editor || !aiResult) return

    if (aiModalType === 'summarize') {
      // Insert as callout
      editor.chain().focus().setCallout({ type: 'info' }).insertContent(aiResult).run()
    } else {
      // Insert as plain text
      editor.chain().focus().insertContent(aiResult).run()
    }

    setAiModalType(null)
    setAiResult('')
  }, [editor, aiResult, aiModalType])

  // Replace selection with AI result
  const replaceWithAiResult = useCallback(() => {
    if (!editor || !aiResult) return

    const { from, to } = editor.state.selection
    const hasSelection = from !== to

    if (hasSelection) {
      editor.chain().focus().deleteSelection().insertContent(aiResult).run()
    } else {
      editor.chain().focus().insertContent(aiResult).run()
    }

    setAiModalType(null)
    setAiResult('')
  }, [editor, aiResult])

  const selectSlashItem = useCallback((item: SlashMenuItem) => {
    if (!editor) return

    const { state } = editor.view
    const { from } = state.selection
    const textBefore = state.doc.textBetween(Math.max(0, from - 20), from)
    const slashIndex = textBefore.lastIndexOf('/')
    if (slashIndex !== -1) {
      const deleteFrom = from - (textBefore.length - slashIndex)
      editor.view.dispatch(state.tr.delete(deleteFrom, from))
    }

    // Special handling for page link
    if (item.title === 'Page Link') {
      setShowSlashMenu(false)
      setSlashFilter('')
      const coords = editor.view.coordsAtPos(from)
      const editorRect = editor.view.dom.getBoundingClientRect()
      setPagePickerPosition({
        top: coords.bottom - editorRect.top + 4,
        left: coords.left - editorRect.left,
      })
      setShowPagePicker(true)
      setPageSelectedIndex(0)
      return
    }

    // Special handling for Image, Video, File
    if (item.title === 'Image') {
      setShowSlashMenu(false)
      setSlashFilter('')
      setUrlModalType('image')
      setUrlInput('')
      setUrlTitleInput('')
      setTimeout(() => urlInputRef.current?.focus(), 100)
      return
    }

    if (item.title === 'Video') {
      setShowSlashMenu(false)
      setSlashFilter('')
      setUrlModalType('video')
      setUrlInput('')
      setUrlTitleInput('')
      setTimeout(() => urlInputRef.current?.focus(), 100)
      return
    }

    if (item.title === 'File') {
      setShowSlashMenu(false)
      setSlashFilter('')
      setUrlModalType('file')
      setUrlInput('')
      setUrlTitleInput('')
      setTimeout(() => urlInputRef.current?.focus(), 100)
      return
    }

    // AI Commands
    if (item.title === 'AI Summarize') {
      setShowSlashMenu(false)
      setSlashFilter('')
      executeAiCommand('summarize')
      return
    }

    if (item.title === 'AI Expand') {
      setShowSlashMenu(false)
      setSlashFilter('')
      executeAiCommand('expand')
      return
    }

    if (item.title === 'AI Translate') {
      setShowSlashMenu(false)
      setSlashFilter('')
      executeAiCommand('translate')
      return
    }

    if (item.title === 'AI Continue') {
      setShowSlashMenu(false)
      setSlashFilter('')
      executeAiCommand('continue')
      return
    }

    item.command(editor)
    setShowSlashMenu(false)
    setSlashFilter('')
    editor.commands.focus()
  }, [editor, executeAiCommand])

  // Handle URL modal submit
  const handleUrlSubmit = useCallback(() => {
    if (!editor || !urlInput.trim()) return

    if (urlModalType === 'image') {
      editor.chain().focus().setImage({ src: urlInput, title: urlTitleInput || undefined }).run()
    } else if (urlModalType === 'video') {
      editor.chain().focus().setVideo({ src: urlInput, title: urlTitleInput || undefined }).run()
    } else if (urlModalType === 'file') {
      // Extract filename from URL
      const filename = urlTitleInput || urlInput.split('/').pop() || 'File'
      editor.chain().focus().setFileEmbed({ url: urlInput, name: filename }).run()
    }

    setUrlModalType(null)
    setUrlInput('')
    setUrlTitleInput('')
  }, [editor, urlModalType, urlInput, urlTitleInput])

  if (!editor) {
    return null
  }

  return (
    <div className="relative">
      <EditorContent editor={editor} />

      {/* Slash Menu */}
      {showSlashMenu && filteredItems.length > 0 && (
        <div
          ref={slashMenuRef}
          className="absolute z-50 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 py-1 max-h-80 overflow-y-auto"
          style={{
            top: slashMenuPosition.top,
            left: slashMenuPosition.left,
          }}
        >
          {filteredItems.map((item, index) => (
            <button
              key={item.title}
              onClick={() => selectSlashItem(item)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {item.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Page Link Picker */}
      {showPagePicker && (
        <div
          ref={pagePickerRef}
          className="absolute z-50 w-72 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 py-1 max-h-64 overflow-y-auto"
          style={{
            top: pagePickerPosition.top,
            left: pagePickerPosition.left,
          }}
        >
          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            Link to page
          </div>
          {filteredPages.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              No pages found
            </div>
          ) : (
            filteredPages.slice(0, 10).map((page, index) => (
              <button
                key={page.id}
                onClick={() => insertPageLink(page)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  index === pageSelectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
              >
                <span className="text-base">{page.icon || '📄'}</span>
                <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {page.title || 'Untitled'}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* URL Input Modal */}
      {urlModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {urlModalType === 'image' && 'Insert Image'}
              {urlModalType === 'video' && 'Insert Video'}
              {urlModalType === 'file' && 'Insert File'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL
                </label>
                <input
                  ref={urlInputRef}
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleUrlSubmit()
                    }
                    if (e.key === 'Escape') {
                      setUrlModalType(null)
                    }
                  }}
                  placeholder={
                    urlModalType === 'image'
                      ? 'https://example.com/image.jpg'
                      : urlModalType === 'video'
                      ? 'https://youtube.com/watch?v=...'
                      : 'https://example.com/file.pdf'
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {urlModalType === 'file' ? 'Filename' : 'Caption'} (optional)
                </label>
                <input
                  type="text"
                  value={urlTitleInput}
                  onChange={(e) => setUrlTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleUrlSubmit()
                    }
                    if (e.key === 'Escape') {
                      setUrlModalType(null)
                    }
                  }}
                  placeholder={urlModalType === 'file' ? 'document.pdf' : 'Optional caption...'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>

              {urlModalType === 'video' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Supports YouTube, Vimeo, or direct video URLs
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setUrlModalType(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {aiModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-violet-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {aiModalType === 'summarize' && 'AI Zusammenfassung'}
                {aiModalType === 'expand' && 'AI Erweiterung'}
                {aiModalType === 'translate' && 'AI Übersetzung'}
                {aiModalType === 'continue' && 'AI Weiterführung'}
              </h3>
            </div>

            {/* Language selector for translate */}
            {aiModalType === 'translate' && aiIsLoading === false && aiResult === '' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zielsprache
                </label>
                <select
                  value={aiTargetLang}
                  onChange={(e) => setAiTargetLang(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none"
                >
                  <option value="Englisch">Englisch</option>
                  <option value="Deutsch">Deutsch</option>
                  <option value="Französisch">Französisch</option>
                  <option value="Spanisch">Spanisch</option>
                  <option value="Italienisch">Italienisch</option>
                  <option value="Portugiesisch">Portugiesisch</option>
                  <option value="Niederländisch">Niederländisch</option>
                  <option value="Polnisch">Polnisch</option>
                  <option value="Türkisch">Türkisch</option>
                  <option value="Japanisch">Japanisch</option>
                  <option value="Chinesisch">Chinesisch</option>
                </select>
                <button
                  onClick={() => executeAiCommand('translate')}
                  className="mt-3 w-full px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Übersetzen starten
                </button>
              </div>
            )}

            {/* Result area */}
            <div className="flex-1 overflow-y-auto min-h-[200px] mb-4">
              {aiIsLoading && aiResult === '' ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {aiResult || (aiModalType !== 'translate' ? 'Generiere...' : 'Wähle eine Zielsprache')}
                    {aiIsLoading && (
                      <span className="inline-block w-2 h-4 ml-1 bg-violet-500 animate-pulse" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setAiModalType(null)
                  setAiResult('')
                }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              {aiResult && !aiIsLoading && (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult)
                    }}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
                  >
                    Kopieren
                  </button>
                  {aiModalType === 'expand' || aiModalType === 'translate' ? (
                    <button
                      onClick={replaceWithAiResult}
                      className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      Ersetzen
                    </button>
                  ) : (
                    <button
                      onClick={insertAiResult}
                      className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      Einfügen
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
