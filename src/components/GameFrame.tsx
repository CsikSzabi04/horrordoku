import type { ReactNode } from 'react'
import type { Lang } from '../game/strings'
import './game-frame.css'

export interface GameHeaderProps {
  title: string
  subtitle?: string
  onBack: () => void
  backLabel: string
}

/** A bal oszlop teteje: vissza-nyíl, logó, a pálya címe (minden játékmódban ugyanez). */
export function GameHeader(p: GameHeaderProps) {
  return (
    <header className="gf-head">
      <div className="top">
        <button type="button" className="back" data-act="exit" onClick={p.onBack} title={p.backLabel} aria-label={p.backLabel}>←</button>
        <span className="logo" aria-label="NIGHTDOKU">NIGH<i>T</i>DOKU</span>
      </div>
      <div className="line">
        <b className="ttl">
          {p.title}
          {p.subtitle && <span> ({p.subtitle})</span>}
        </b>
      </div>
    </header>
  )
}

export interface GameFooterProps {
  time: string
  lang: Lang
  onLang: (l: Lang) => void
  languageLabel: string
  /** Klasszikus sötét mód kapcsoló (a horror-módokban nincs, azok mindig sötétek). */
  dark?: boolean
  onDark?: (v: boolean) => void
  darkLabel?: string
  muted: boolean
  onSound: () => void
  soundLabel: string
  onSettings: () => void
  settingsLabel: string
  /** Együtt / Gyilkos módban a beállítások nem nyílnak meg a játékból (a szoba kapcsolata megszakadna). */
  hideSettings?: boolean
}

/**
 * A bal oszlop alján, a kártyák alatt (minden játékmódban ugyanitt): balra az idő, a sötét mód és a nyelvváltó, jobbra a beállítások és a hang.
 * Így a jobb oszlopban csak a játék eszközei maradnak.
 */
export function GameFooter(p: GameFooterProps) {
  return (
    <footer className="gf-foot">
      <div className="gf-meta">
        <span className="clock" data-timer>{p.time}</span>
        {p.onDark && (
          <button type="button" className="ic dm" data-act="dark" aria-pressed={!!p.dark} title={p.darkLabel} aria-label={p.darkLabel} onClick={() => p.onDark!(!p.dark)}>
            🌙
          </button>
        )}
        <select className="lang" value={p.lang} aria-label={p.languageLabel} onChange={(e) => p.onLang(e.target.value as Lang)}>
          <option value="hu">Magyar</option>
          <option value="en">English</option>
        </select>
      </div>
      <div className="gf-sys">
        {!p.hideSettings && (
          <button type="button" className="ic" data-act="settings" title={p.settingsLabel} aria-label={p.settingsLabel} onClick={p.onSettings}>
            ⚙
          </button>
        )}
        <button type="button" className={`ic${p.muted ? ' on' : ''}`} data-act="sound" title={p.soundLabel} aria-label={p.soundLabel} aria-pressed={p.muted} onClick={p.onSound}>
          {p.muted ? '🔇' : '🔊'}
        </button>
      </div>
    </footer>
  )
}

interface FrameProps {
  /** classic: hétköznapi kinézet (fehér játék, kapcsolható sötét móddal); horror: sötét horror-kinézet. Az elrendezés ugyanaz. */
  theme: 'classic' | 'horror'
  dark?: boolean
  header: ReactNode
  intro?: ReactNode
  cards: ReactNode
  /** A bal oszlop alja: idő, sötét mód, nyelv · beállítások, hang (`GameFooter`). */
  footer?: ReactNode
  board: ReactNode
  tools: ReactNode
  overlays?: ReactNode
}

/**
 * A játékképernyő közös kerete — MINDEN játékmód ezt használja (AGENTS.md: „Játékképernyő-elrendezés"):
 * bal oszlop (fejléc + bevezető + karakterek, alul az idő / nyelv / beállítások sáv), középen a térkép, jobb szélen a keskenyebb eszközoszlop.
 */
export function GameFrame({ theme, dark, header, intro, cards, footer, board, tools, overlays }: FrameProps) {
  return (
    <div className="gf" data-theme={theme} data-dark={dark ? '1' : '0'}>
      <aside className="gf-left">
        <div className="gf-scroll">
          {header}
          {intro}
          {cards}
        </div>
        {footer}
      </aside>
      <main className="gf-board">{board}</main>
      <aside className="gf-tools">{tools}</aside>
      {overlays}
    </div>
  )
}
