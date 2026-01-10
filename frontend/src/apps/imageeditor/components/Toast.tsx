import { CheckCircle, Info, AlertCircle } from 'lucide-react'
import { useImageEditorStore } from '@/stores/imageEditorStore'

export function ToastContainer() {
  const { toasts } = useImageEditorStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-3 left-3 z-50 flex flex-col gap-1.5">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs shadow-md animate-slide-in-left ${
            toast.type === 'success'
              ? 'bg-[#2d3a1f] text-white/80'
              : toast.type === 'error'
              ? 'bg-red-900/90 text-white/80'
              : 'bg-gray-700/90 text-white/80'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-3 h-3" />}
          {toast.type === 'info' && <Info className="w-3 h-3" />}
          {toast.type === 'error' && <AlertCircle className="w-3 h-3" />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
