import { useState, useRef, useEffect } from 'react'

const EMOJI_CATEGORIES = {
  'Recent': ['📄', '📁', '📝', '💡', '⭐', '🎯', '📌', '🔖'],
  'Objects': ['📄', '📁', '📂', '📝', '📋', '📊', '📈', '📉', '📑', '📓', '📔', '📕', '📖', '📗', '📘', '📙'],
  'Symbols': ['⭐', '💡', '🎯', '📌', '🔖', '💭', '💬', '🔔', '❤️', '✅', '❌', '⚠️', '💫', '✨', '🔥', '💎'],
  'Work': ['💼', '🏢', '📞', '📧', '💻', '🖥️', '⌨️', '🖱️', '📱', '🔧', '⚙️', '🔨', '📦', '🚀', '💰', '📈'],
  'People': ['👤', '👥', '🧑‍💼', '👨‍💻', '👩‍💻', '🤝', '💪', '🧠', '👀', '✋', '👍', '👎', '🎉', '🎊', '🏆', '🥇'],
  'Nature': ['🌱', '🌿', '🍀', '🌸', '🌺', '🌻', '🌳', '🌲', '🌴', '🍃', '🌙', '⭐', '☀️', '🌈', '💧', '🔥'],
  'Food': ['☕', '🍵', '🍔', '🍕', '🍎', '🍋', '🍇', '🥑', '🥕', '🍰', '🍪', '🍩', '🧁', '🍫', '🍬', '🍭'],
}

interface EmojiPickerProps {
  currentEmoji?: string
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function EmojiPicker({ currentEmoji, onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState('Recent')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Category tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 scrollbar-hide">
        {Object.keys(EMOJI_CATEGORIES).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === category
                ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 max-h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, idx) => (
            <button
              key={`${emoji}-${idx}`}
              onClick={() => {
                onSelect(emoji)
                onClose()
              }}
              className={`w-8 h-8 flex items-center justify-center text-lg rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                currentEmoji === emoji ? 'bg-violet-100 dark:bg-violet-900/30' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Remove icon option */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            onSelect('')
            onClose()
          }}
          className="w-full px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          Remove icon
        </button>
      </div>
    </div>
  )
}
