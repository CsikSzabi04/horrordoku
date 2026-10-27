import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { EventPortrait, hasLook } from '../components/EventPortrait'
import { pick } from '../i18n/lang'
import './ui.css'

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ')

export function Button({
  variant,
  size,
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ghost' | 'danger'; size?: 'sm' }) {
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

/** Avatár: a karakter rajzolt portréja (ha van), különben az emoji-ja vagy a kezdőbetűje. */
export function Avatar({ id, emoji, size }: { id: string; emoji?: string; size?: string }) {
  return (
    <span className="nd-avatar" style={size ? ({ '--s': size } as React.CSSProperties) : undefined} aria-label={id}>
      {hasLook(id) ? <EventPortrait id={id} className="nd-avatar-art" crop="face" /> : (emoji ?? id.charAt(0).toUpperCase())}
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

/** Értesítés: `ms` = meddig látszik (alap 3,2 mp); azonos `key`-jű értesítés lecseréli az előzőt (pl. az új tipp a régit). */
export type ToastFn = (msg: string, opts?: number | { ms?: number; key?: string }) => void
const ToastCtx = createContext<ToastFn>(() => undefined)
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; key?: string }[]>([])
  const push = useCallback<ToastFn>((msg, opts) => {
    const { ms = 3200, key } = typeof opts === 'number' ? { ms: opts } : (opts ?? {})
    const id = Date.now() + Math.random()
    setItems((s) => [...s.filter((x) => key === undefined || x.key !== key), { id, msg, key }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), ms)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="nd-toasts" role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className="nd-toast" title={pick('Kattints a bezáráshoz', 'Click to dismiss')} onClick={() => setItems((s) => s.filter((x) => x.id !== i.id))}>
            {i.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
