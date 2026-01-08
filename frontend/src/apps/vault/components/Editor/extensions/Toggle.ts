import { Node, mergeAttributes } from '@tiptap/core'

export interface ToggleOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType
      unsetToggle: () => ReturnType
    }
  }
}

export const Toggle = Node.create<ToggleOptions>({
  name: 'toggle',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  content: 'toggleTitle toggleContent',

  group: 'block',

  defining: true,

  parseHTML() {
    return [
      {
        tag: 'details[data-toggle]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'details',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-toggle': '',
        class: 'toggle my-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50',
        open: true,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ commands, chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              content: [
                {
                  type: 'toggleTitle',
                  content: [{ type: 'text', text: 'Toggle title' }],
                },
                {
                  type: 'toggleContent',
                  content: [{ type: 'paragraph' }],
                },
              ],
            })
            .run()
        },
      unsetToggle:
        () =>
        ({ commands }) => {
          return commands.lift(this.name)
        },
    }
  },
})

export const ToggleTitle = Node.create({
  name: 'toggleTitle',

  content: 'inline*',

  defining: true,

  parseHTML() {
    return [
      {
        tag: 'summary',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'summary',
      mergeAttributes(HTMLAttributes, {
        class: 'toggle-title cursor-pointer px-4 py-3 font-medium text-gray-900 dark:text-gray-100 select-none hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-t-lg list-none flex items-center gap-2',
      }),
      [
        'span',
        { class: 'toggle-icon text-gray-500 transition-transform', contenteditable: 'false' },
        '▶',
      ],
      ['span', { class: 'flex-1' }, 0],
    ]
  },
})

export const ToggleContent = Node.create({
  name: 'toggleContent',

  content: 'block+',

  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-toggle-content]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-toggle-content': '',
        class: 'toggle-content px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700',
      }),
      0,
    ]
  },
})
