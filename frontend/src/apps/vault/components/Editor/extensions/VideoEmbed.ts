import { Node, mergeAttributes } from '@tiptap/core'

export interface VideoEmbedOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideo: (options: { src: string; title?: string }) => ReturnType
    }
  }
}

// Extract video ID and provider from URL
function parseVideoUrl(url: string): { provider: 'youtube' | 'vimeo' | 'direct'; videoId?: string; embedUrl: string } {
  // YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  )
  if (youtubeMatch) {
    return {
      provider: 'youtube',
      videoId: youtubeMatch[1],
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
    }
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) {
    return {
      provider: 'vimeo',
      videoId: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    }
  }

  // Direct video URL
  return {
    provider: 'direct',
    embedUrl: url,
  }
}

export const VideoEmbed = Node.create<VideoEmbedOptions>({
  name: 'videoEmbed',

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
      src: {
        default: null,
      },
      title: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-video-embed]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { provider, embedUrl } = parseVideoUrl(HTMLAttributes.src as string || '')

    if (provider === 'direct') {
      // Direct video file
      return [
        'figure',
        mergeAttributes(this.options.HTMLAttributes, {
          'data-video-embed': '',
          class: 'video-embed my-4',
        }),
        [
          'video',
          {
            src: embedUrl,
            controls: 'true',
            class: 'w-full rounded-lg shadow-sm',
            preload: 'metadata',
          },
        ],
        HTMLAttributes.title
          ? [
              'figcaption',
              { class: 'text-center text-sm text-gray-500 dark:text-gray-400 mt-2' },
              HTMLAttributes.title,
            ]
          : '',
      ]
    }

    // YouTube or Vimeo embed
    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-video-embed': '',
        class: 'video-embed my-4',
      }),
      [
        'div',
        { class: 'relative w-full pt-[56.25%] rounded-lg overflow-hidden shadow-sm' },
        [
          'iframe',
          {
            src: embedUrl,
            class: 'absolute inset-0 w-full h-full',
            frameborder: '0',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowfullscreen: 'true',
          },
        ],
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
      setVideo:
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
