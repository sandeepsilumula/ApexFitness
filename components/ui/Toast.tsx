import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type ToastTone = 'success' | 'error'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

interface ToastApi {
  notify: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-emerald-600 bg-navy-900 text-emerald-400',
  error: 'border-red-500 bg-navy-900 text-red-400',
}

const AUTO_DISMISS_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Monotonic id rather than an array index: two toasts raised in the same tick
  // must not share a React key.
  const [nextId, setNextId] = useState(0)

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId
      setNextId((current) => current + 1)
      setToasts((current) => [...current, { id, message, tone }])
      setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, AUTO_DISMISS_MS)
    },
    [nextId],
  )

  const api = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-md border px-4 py-3 text-caption shadow-lg ${TONE_STYLES[toast.tone]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside a ToastProvider')
  return context
}
