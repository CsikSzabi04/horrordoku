import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { HOLD_MS } from './Board/Board'
import type { Tool } from './Board/Board'

export interface ToolsProps {
  t: (key: ToolKey) => string
  tool: Tool
  onTool: (t: Tool) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  /** Radír hosszú nyomása: minden mező törlése. */
  onClearAll: () => void
  onHint: () => void
  hints: number
  canSubmit: boolean
  onSubmit: () => void
  onHow: () => void
  onHelp: () => void
  onShare: () => void
  onSave: () => void
  onSound: () => void
  muted: boolean
  onSettings: () => void
  disabled?: boolean
  /** Mód-specifikus extra gombok (pl. Gyilkos-képességek) — az alsó sor fölé kerülnek. */
  extra?: ReactNode
}
export type ToolKey = 'xTool' | 'erase' | 'eraseHint' | 'undo' | 'redo' | 'hint' | 'submit' | 'submitHint' | 'how' | 'help' | 'share' | 'save' | 'sound' | 'settings'

/**
 * A jobb szélső eszközoszlop (minden játékmódban ugyanez): ✕, radír (nyomva tartva teljes törlés), visszavonás / újra,
 * tipp, beküldés, súgó, megosztás, mentés, hang, beállítások.
 */
export function Tools(p: ToolsProps) {
  const { t } = p
  const [ring, setRing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const start = () => {
    if (p.disabled) return
    fired.current = false
    setRing(true)
    timer.current = setTimeout(() => {
      fired.current = true
      setRing(false)
      p.onClearAll()
    }, HOLD_MS)
  }
  const stop = (tap: boolean) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setRing(false)
    if (tap && !fired.current) p.onTool(p.tool === 'erase' ? 'letter' : 'erase')
  }

  return (
    <div className="tools" role="toolbar" aria-label="Eszközök">
      <button type="button" className={`tbtn big${p.tool === 'x' ? ' on' : ''}`} data-tool="x" aria-pressed={p.tool === 'x'} title={t('xTool')} disabled={p.disabled} onClick={() => p.onTool(p.tool === 'x' ? 'letter' : 'x')}>
        <span className="xmark">✕</span>
      </button>
      <button
        type="button"
        className={`tbtn big eraser${p.tool === 'erase' ? ' on' : ''}${ring ? ' holding' : ''}`}
        data-tool="erase"
        aria-pressed={p.tool === 'erase'}
        title={`${t('erase')} — ${t('eraseHint')}`}
        disabled={p.disabled}
        onPointerDown={start}
        onPointerUp={() => stop(true)}
        onPointerLeave={() => stop(false)}
        onPointerCancel={() => stop(false)}
        onKeyDown={(e) => e.key === 'Delete' && p.onClearAll()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="eico">🧽</span>
        <small>{t('eraseHint')}</small>
        {ring && (
          <svg className="bring" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none" style={{ ['--hold' as string]: `${HOLD_MS}ms` }}>
            <rect x="3" y="3" width="94" height="94" rx="14" pathLength="100" />
          </svg>
        )}
      </button>
      <div className="pair">
        <button type="button" className="tbtn wide" data-act="undo" disabled={!p.canUndo || p.disabled} onClick={p.onUndo}>{t('undo')}</button>
        <button type="button" className="tbtn sq" data-act="redo" disabled={!p.canRedo || p.disabled} onClick={p.onRedo} title={t('redo')} aria-label={t('redo')}>↷</button>
      </div>
      <div className="grow" />
      {p.extra}
      <button type="button" className="tbtn" data-act="hint" disabled={p.disabled} onClick={p.onHint}>💡 {t('hint')}{p.hints > 0 ? ` (${p.hints})` : ''}</button>
      <button type="button" className="tbtn submit" data-act="submit" disabled={!p.canSubmit || p.disabled} onClick={p.onSubmit}>
        {t('submit')}
        {!p.canSubmit && <small>{t('submitHint')}</small>}
      </button>
      <button type="button" className="tbtn" data-act="how" onClick={p.onHow}>{t('how')}</button>
      <div className="row3">
        <button type="button" className="tbtn sq" data-act="help" title={t('help')} aria-label={t('help')} onClick={p.onHelp}>?</button>
        <button type="button" className="tbtn sq" data-act="share" title={t('share')} aria-label={t('share')} onClick={p.onShare}>↗</button>
        <button type="button" className="tbtn sq" data-act="save" title={t('save')} aria-label={t('save')} onClick={p.onSave}>💾</button>
      </div>
      <div className="row2">
        <button type="button" className={`tbtn sq${p.muted ? ' on' : ''}`} data-act="sound" title={t('sound')} aria-label={t('sound')} aria-pressed={p.muted} onClick={p.onSound}>{p.muted ? '🔇' : '🔊'}</button>
        <button type="button" className="tbtn sq" data-act="settings" title={t('settings')} aria-label={t('settings')} onClick={p.onSettings}>⚙</button>
      </div>
    </div>
  )
}
