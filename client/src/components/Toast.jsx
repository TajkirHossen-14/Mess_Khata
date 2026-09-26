import { useEffect, useState } from 'react'

const toastVariants = {
  success: 'bg-success text-white',
  error: 'bg-rejected text-white',
  warning: 'bg-pending text-white',
  info: 'bg-blue700 text-white',
}

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

export function Toast({ message, type = 'info', duration = 4000, onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!visible) return null

  return (
    <div
      className={`${toastVariants[type]} flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right duration-300`}
      role="alert"
      aria-live="polite"
    >
      <span className="flex-shrink-0">{icons[type]}</span>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => { setVisible(false); onClose?.() }}
        className="ml-2 text-white/80 hover:text-white transition-opacity"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => onClose(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}

export default Toast