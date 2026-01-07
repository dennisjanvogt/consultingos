import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react'
import { useConfirmStore } from '@/stores/confirmStore'

export default function ConfirmDialog() {
  const {
    isOpen,
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant,
    onConfirm,
    onCancel,
  } = useConfirmStore()

  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmButtonRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        e.stopPropagation()
        onCancel?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const Icon = variant === 'danger' ? Trash2 : variant === 'warning' ? AlertTriangle : HelpCircle
  const iconBgColor = variant === 'danger'
    ? 'bg-red-100 dark:bg-red-900/30'
    : variant === 'warning'
    ? 'bg-amber-100 dark:bg-amber-900/30'
    : 'bg-lavender-100 dark:bg-lavender-900/30'
  const iconColor = variant === 'danger'
    ? 'text-red-600 dark:text-red-400'
    : variant === 'warning'
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-lavender-600 dark:text-lavender-400'
  const confirmBtnColor = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : variant === 'warning'
    ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
    : 'bg-lavender-600 hover:bg-lavender-700 focus:ring-lavender-500'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel || undefined}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onCancel || undefined}
          className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-full ${iconBgColor} flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>

          {/* Title */}
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
              {title}
            </h3>
          )}

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 text-center">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel || undefined}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm || undefined}
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${confirmBtnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
