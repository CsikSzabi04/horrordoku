import type { ReactNode } from 'react'
import type { Lang } from '../game/strings'
import './game-frame.css'

export interface GameHeaderProps {
  title: string
  subtitle?: string
  time: string
  onBack: () => void
  backLabel: string
  lang: Lang
  onLang: (l: Lang) => void
  languageLabel: string
  /** Klasszikus sötét mód kapcsoló (a horror-módokban nincs, azok mindig sötétek). */
  dark?: boolean
  onDark?: (v: boolean) => void
  darkLabel?: string
}

/** A bal oszlop teteje: vissza-nyíl, logó, nyelvváltó, a pálya címe és az idő (minden játékmódban ugyanez). */
export function GameHeader(p: GameHeaderProps) {
  return (
    <header className="gf-head">
      <div className="top">
        <button type="button" className="back" data-act="exit" onClick={p.onBack} title={p.backLabel} aria-label={p.backLabel}>←</button>
        <span className="logo" aria-label="NIGHTDOKU">NIGH<i>T</i>DOKU</span>
        {p.onDark && (
          <button type="button" className="dm" data-act="dark" aria-pressed={!!p.dark} title={p.darkLabel} aria-label={p.darkLabel} onClick={() => p.onDark!(!p.dark)}>
            🌙
          </button>
        )}
        <select className="lang" value={p.lang} aria-label={p.languageLabel} onChange={(e) => p.onLang(e.target.value as Lang)}>
          <option value="hu">Magyar</option>
          <option value="en">English</option>
        </select>
      </div>
      <div className="line">
        <b className="ttl">
          {p.title}
          {p.subtitle && <span> ({p.subtitle})</span>}
        </b>
        <span className="clock" data-timer>{p.time}</span>
      </div>
    </header>
  )
}

interface FrameProps {
  /** classic: hétköznapi kinézet (fehér játék, kapcsolható sötét móddal); horror: sötét horror-kinézet. Az elrendezés ugyanaz. */
  theme: 'classic' | 'horror'
  dark?: boolean
  header: ReactNode
  intro?: ReactNode
  cards: ReactNode
  board: ReactNode
  tools: ReactNode
  overlays?: ReactNode
}

/**
 * A játékképernyő közös kerete — MINDEN játékmód ezt használja (AGENTS.md: „Játékképernyő-elrendezés"):
 * bal oszlop (fejléc + bevezető + karakterek), középen a térkép, jobb szélen a keskenyebb eszközoszlop.
 */
export function GameFrame({ theme, dark, header, intro, cards, board, tools, overlays }: FrameProps) {
  return (
    <div className="gf" data-theme={theme} data-dark={dark ? '1' : '0'}>
      <aside className="gf-left">
        {header}
        {intro}
        {cards}
      </aside>
      <main className="gf-board">{board}</main>
      <aside className="gf-tools">{tools}</aside>
      {overlays}
    </div>
  )
}
