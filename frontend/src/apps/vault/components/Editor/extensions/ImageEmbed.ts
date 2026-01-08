import { Node, mergeAttributes } from '@tiptap/core'

export interface ImageEmbedOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageEmbed: {
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType
    }
  }
}

export const ImageEmbed = Node.create<ImageEmbedOptions>({
  name: 'imageEmbed',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      align: {
        default: 'center',
      },
      width: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-image-embed]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const alignClass = {
      left: 'mr-auto',
      center: 'mx-auto',
      right: 'ml-auto',
    }[HTMLAttributes.align as string] || 'mx-auto'

    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-image-embed': '',
        class: `image-embed my-4 ${alignClass}`,
        style: HTMLAttributes.width ? `max-width: ${HTMLAttributes.width}px` : undefined,
      }),
      [
        'img',
        mergeAttributes({
          src: HTMLAttributes.src,
          alt: HTMLAttributes.alt || '',
          title: HTMLAttributes.title || '',
          class: 'rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 max-w-full h-auto',
          draggable: 'false',
        }),
      ],
      HTMLAttributes.title
        ? [
            'figcaption',
            { class: 'text-center text-sm text-gray-500 dark:text-gray-400 mt-2' },
            HTMLAttributes.title,
          ]
        : '',
    ]
  },

  addCommands() {
    return {
      setImage:
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
