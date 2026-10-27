// Jobb gombos menü egy szobatag kártyáján (némítás / feloldás). Kattintásra, Esc-re, görgetésre és átméretezésre bezárul.
import { useEffect, useRef } from 'react'
import { t } from '../../i18n'

const W = 230 // a menü becsült mérete: ennyi helyet hagyunk a képernyő szélén
const H = 92

export function MemberMenu({ x, y, name, muted, onToggle, onClose }: { x: number; y: number; name: string; muted: boolean; onToggle: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const away = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    window.addEventListener('blur', onClose)
    return () => {
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])
  useEffect(() => ref.current?.querySelector('button')?.focus(), [])

  const left = Math.max(4, Math.min(x, window.innerWidth - W - 4))
  const top = Math.max(4, Math.min(y, window.innerHeight - H - 4))
  return (
    <div ref={ref} className="nd-ctx" role="menu" aria-label={t('lobby.memberMenu')} style={{ left, top }} onContextMenu={(e) => e.preventDefault()}>
      <div className="nd-ctx-head">{name}</div>
      <button type="button" role="menuitem" className="nd-ctx-item" onClick={onToggle}>
        <span aria-hidden="true">{muted ? '🔊' : '🔇'}</span>
        {muted ? t('lobby.unmute') : t('lobby.mute')}
      </button>
    </div>
  )
}
