import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

type Tone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  description?: string
  tone: Tone
}

interface ToastApi {
  success: (message: string, description?: string) => void
  error: (message: string, description?: string) => void
  info: (message: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

const TONE_STYLES: Record<Tone, string> = {
  success: 'border-paper',
  error: 'border-2 border-paper',
  info: 'border-rule-strong',
}

const TONE_LABEL: Record<Tone, string> = {
  success: 'Confirmed',
  error: 'Attention',
  info: 'Notice',
}

const TONE_ICONS: Record<Tone, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-paper" />,
  error: <TriangleAlert className="h-4 w-4 shrink-0 text-paper" />,
  info: <Info className="h-4 w-4 shrink-0 text-paper" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (tone: Tone, message: string, description?: string) => {
      counter.current += 1
      const id = counter.current
      setToasts((current) => [...current.slice(-3), { id, tone, message, description }])
      window.setTimeout(() => dismiss(id), 5200)
    },
    [dismiss],
  )

  const api = {
    success: (message: string, description?: string) => push('success', message, description),
    error: (message: string, description?: string) => push('error', message, description),
    info: (message: string, description?: string) => push('info', message, description),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm animate-rise-in items-start gap-3.5 border bg-surface px-5 py-4 ${TONE_STYLES[toast.tone]}`}
            role="status"
          >
            <span className="mt-0.5">{TONE_ICONS[toast.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                {TONE_LABEL[toast.tone]}
              </p>
              <p className="mt-1.5 text-[14px] leading-snug font-medium text-paper">{toast.message}</p>
              {toast.description ? (
                <p className="mt-1 text-[13px] leading-5 text-muted">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="p-0.5 text-muted transition-colors hover:text-paper"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useAutoDismiss(open: boolean, onClose: () => void, delay = 0) {
  useEffect(() => {
    if (!open || delay <= 0) return
    const timer = window.setTimeout(onClose, delay)
    return () => window.clearTimeout(timer)
  }, [open, delay, onClose])
}
