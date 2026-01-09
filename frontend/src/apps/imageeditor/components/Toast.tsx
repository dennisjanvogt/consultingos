import { useEffect } from 'react'
import { X, CheckCircle, Info, AlertCircle } from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'

export function ToastContainer() {
  const { toasts, dismissToast } = useImageEditorStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-in-right ${
            toast.type === 'success'
              ? 'bg-green-600'
              : toast.type === 'error'
              ? 'bg-red-600'
              : 'bg-gray-700'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-white" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-white" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-white" />}
          <span className="text-sm text-white">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ))}
    </div>
  )
}
