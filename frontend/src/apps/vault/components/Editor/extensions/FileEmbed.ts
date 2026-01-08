import { Node, mergeAttributes } from '@tiptap/core'

export interface FileEmbedOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileEmbed: {
      setFileEmbed: (options: {
        url: string
        name: string
        size?: number
        type?: string
      }) => ReturnType
    }
  }
}

// Format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

// Get icon based on file type
function getFileIcon(type?: string): string {
  if (!type) return '📄'
  if (type.includes('pdf')) return '📕'
  if (type.includes('word') || type.includes('document')) return '📘'
  if (type.includes('excel') || type.includes('spreadsheet')) return '📗'
  if (type.includes('powerpoint') || type.includes('presentation')) return '📙'
  if (type.includes('image')) return '🖼️'
  if (type.includes('video')) return '🎬'
  if (type.includes('audio')) return '🎵'
  if (type.includes('zip') || type.includes('archive')) return '📦'
  if (type.includes('text')) return '📝'
  return '📄'
}

export const FileEmbed = Node.create<FileEmbedOptions>({
  name: 'fileEmbed',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  draggable: true,

  atom: true,

  addAttributes() {
    return {
      url: {
        default: null,
      },
      name: {
        default: 'File',
      },
      size: {
        default: null,
      },
      type: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-file-embed]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const icon = getFileIcon(HTMLAttributes.type as string)
    const sizeText = formatFileSize(HTMLAttributes.size as number)
    const isPdf = (HTMLAttributes.type as string)?.includes('pdf')

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-file-embed': '',
        class: 'file-embed my-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-violet-300 dark:hover:border-violet-700 transition-colors',
      }),
      [
        'a',
        {
          href: HTMLAttributes.url,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'flex items-center gap-3 no-underline text-inherit',
          download: HTMLAttributes.name,
        },
        [
          'span',
          { class: 'file-icon text-3xl flex-shrink-0' },
          icon,
        ],
        [
          'div',
          { class: 'flex-1 min-w-0' },
          [
            'div',
            { class: 'file-name font-medium text-gray-900 dark:text-gray-100 truncate' },
            HTMLAttributes.name || 'File',
          ],
          [
            'div',
            { class: 'file-meta text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2' },
            sizeText ? [['span', {}, sizeText]] : '',
            isPdf ? [['span', { class: 'text-red-500' }, 'PDF']] : '',
          ],
        ],
        [
          'span',
          { class: 'text-gray-400 flex-shrink-0' },
          '↓',
        ],
      ],
    ]
  },

  addCommands() {
    return {
      setFileEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})
