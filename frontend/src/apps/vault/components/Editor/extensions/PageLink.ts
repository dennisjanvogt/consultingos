import { Mark, mergeAttributes } from '@tiptap/core'

export interface PageLinkOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageLink: {
      setPageLink: (attributes: { pageId: number; title: string }) => ReturnType
      unsetPageLink: () => ReturnType
    }
  }
}

export const PageLink = Mark.create<PageLinkOptions>({
  name: 'pageLink',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-page-id'),
        renderHTML: (attributes) => ({
          'data-page-id': attributes.pageId,
        }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-page-title'),
        renderHTML: (attributes) => ({
          'data-page-title': attributes.title,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-page-link]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-page-link': '',
        class: 'page-link inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded cursor-pointer hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setPageLink:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      unsetPageLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})
