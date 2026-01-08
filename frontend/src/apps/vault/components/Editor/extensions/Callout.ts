import { Node, mergeAttributes } from '@tiptap/core'

export type CalloutType = 'info' | 'warning' | 'success' | 'error'

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { type: CalloutType }) => ReturnType
      toggleCallout: (attributes?: { type: CalloutType }) => ReturnType
      unsetCallout: () => ReturnType
    }
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  content: 'block+',

  group: 'block',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-callout-type') || 'info',
        renderHTML: attributes => ({
          'data-callout-type': attributes.type,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes['data-callout-type'] || 'info'

    const styles: Record<CalloutType, string> = {
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
      success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
      error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    }

    const icons: Record<CalloutType, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      success: '✅',
      error: '❌',
    }

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-callout': '',
        class: `callout callout-${type} p-4 my-2 rounded-lg border ${styles[type as CalloutType] || styles.info}`,
      }),
      [
        'div',
        { class: 'flex gap-3' },
        [
          'span',
          { class: 'callout-icon text-lg flex-shrink-0', contenteditable: 'false' },
          icons[type as CalloutType] || icons.info,
        ],
        [
          'div',
          { class: 'callout-content flex-1 min-w-0' },
          0,
        ],
      ],
    ]
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes)
        },
      toggleCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes)
        },
      unsetCallout:
        () =>
        ({ commands }) => {
          return commands.lift(this.name)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => this.editor.commands.toggleCallout({ type: 'info' }),
    }
  },
})
