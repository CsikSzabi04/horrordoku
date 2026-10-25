import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './ui.css'

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ')

export function Button({
  variant,
  size,
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ghost'; size?: 'sm' }) {
  return <button type="button" {...p} className={cx('nd-btn', variant, size, className)} />
}

/** Dosszié-stílusú panel; a `tag` a ráragasztott címke (pl. „ÜGYIRAT #001"). */
export function Panel({ tag, children, className }: { tag?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('nd-panel', className)} data-tag={tag}>
      {children}
    </section>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="nd-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" className="nd-tab" aria-selected={t.id === value} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ children, dot }: { children: ReactNode; dot?: boolean }) {
  return (
    <span className="nd-chip">
      {dot !== undefined && <i className={cx('nd-dot', dot && 'on')} />}
      {children}
    </span>
  )
}

/** Avatár: amíg nincsenek portrék (assets/portraits/<CharId>.png), a karakter emoji-ja vagy kezdőbetűje. */
export function Avatar({ id, emoji, size }: { id: string; emoji?: string; size?: string }) {
  return (
    <span className="nd-avatar" style={size ? ({ '--s': size } as React.CSSProperties) : undefined} aria-label={id}>
      {emoji ?? id.charAt(0).toUpperCase()}
    </span>
  )
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="nd-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <i style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="nd-modal-back" onClick={onClose}>
      <div className="nd-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <Panel>{children}</Panel>
      </div>
    </div>
  )
}

const ToastCtx = createContext<(msg: string) => void>(() => undefined)
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([])
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s, { id, msg }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="nd-toasts" role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className="nd-toast">
            {i.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
