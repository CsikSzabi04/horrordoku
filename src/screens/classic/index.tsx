import { useEffect, useMemo, useState } from 'react'
import { puzzleTitle } from '../../content/localize'
import { useNav } from '../../app/nav'
import { listPuzzles, startedIds } from '../../content/catalog'
import type { PuzzleMeta } from '../../content/catalog'
import { LEVELS, levelOf, PER_LEVEL } from '../../game/levels'
import type { Level } from '../../game/levels'
import { useGameDark } from '../../game/theme'
import { pick, useCurrentLang } from '../../i18n/lang'
import { getStorage } from '../../storage'
import type { ProgressEntry } from '../../shared/storage'
import { Button, Chip } from '../../ui'
import './classic.css'

type Sort = 'difficulty' | 'size' | 'name'
interface View {
  level: number // 0 = mind
  sort: Sort
  hideDone: boolean
  hideStarted: boolean
}
const VIEW_KEY = 'nd_classic_view'
const readView = (): View => {
  try {
    return { level: 0, sort: 'difficulty', hideDone: false, hideStarted: false, ...JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}') }
  } catch {
    return { level: 0, sort: 'difficulty', hideDone: false, hideStarted: false }
  }
}

const STARS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★']
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`
/** A szint szó szerinti nehézsége (a `Level.plain` csak magyar). */
const PLAIN_EN: Record<number, string> = { 1: 'very easy', 2: 'easy', 3: 'medium', 4: 'hard', 5: 'expert' }
const numOf = (id: string) => id.match(/-(\d+)-[a-z-]+$/)?.[1] ?? ''

/** Klasszikus mód: sima Murdoku, 5 szint × 20 pálya (+ bónuszügyek). Szűrés szint szerint, rendezés, befejezettek / megkezdettek elrejtése. */
export default function ClassicScreen() {
  const { go, back } = useNav()
  const [dark, setDark] = useGameDark()
  const lang = useCurrentLang()
  const levelName = (lv: Level) => (lang === 'en' ? lv.en : lv.name)
  const levelPlain = (lv: Level) => (lang === 'en' ? (PLAIN_EN[lv.d] ?? lv.plain) : lv.plain)
  const [view, setView] = useState<View>(readView)
  const [progress, setProgress] = useState<Record<string, ProgressEntry>>({})
  const [started, setStarted] = useState<Set<string>>(new Set())
  useEffect(() => {
    void (async () => {
      const s = getStorage()
      setProgress((await s.getProgress()).puzzles)
      setStarted(startedIds((await s.getSessions()).sessions))
    })()
  }, [])
  const change = (patch: Partial<View>) =>
    setView((v) => {
      const next = { ...v, ...patch }
      try {
        localStorage.setItem(VIEW_KEY, JSON.stringify(next))
      } catch {
        /* tiltott tároló: a nézet csak az oldal életére érvényes */
      }
      return next
    })

  const main = useMemo(() => listPuzzles('classic'), [])
  const bonus = useMemo(() => listPuzzles('bonus'), [])
  const solved = main.filter((p) => progress[p.id]?.solved).length
  const perLevel = (d: number) => ({ total: main.filter((p) => p.difficulty === d).length, done: main.filter((p) => p.difficulty === d && progress[p.id]?.solved).length })

  const shown = useMemo(() => {
    const rows = main.filter((p) => (view.level === 0 || p.difficulty === view.level) && !(view.hideDone && progress[p.id]?.solved) && !(view.hideStarted && started.has(p.id) && !progress[p.id]?.solved))
    const by: Record<Sort, (a: PuzzleMeta, b: PuzzleMeta) => number> = {
      difficulty: (a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id),
      size: (a, b) => a.size - b.size || a.difficulty - b.difficulty || a.id.localeCompare(b.id),
      name: (a, b) => puzzleTitle(a).localeCompare(puzzleTitle(b), lang) || a.id.localeCompare(b.id),
    }
    return [...rows].sort(by[view.sort])
  }, [main, view, progress, started, lang])

  const card = (p: PuzzleMeta, tag: string) => {
    const pr = progress[p.id]
    return (
      <button key={p.id} type="button" className={`case${pr?.solved ? ' done' : ''}`} data-puzzle={p.id} data-level={p.difficulty} onClick={() => go({ name: 'game', ref: p.id })}>
        <span className="no" aria-hidden="true">{p.icon ?? '🔎'}</span>
        <i className="num">{tag}</i>
        <b>{puzzleTitle(p)}</b>
        <small>
          {p.size}×{p.size} · {levelName(levelOf(p.difficulty))}
        </small>
        <span className="state">{pr?.solved ? `✔ ${pr.bestMs ? fmt(pr.bestMs) : ''}` : started.has(p.id) ? pick('▶ Folytatás', '▶ Continue') : STARS[p.difficulty]}</span>
      </button>
    )
  }

  return (
    <main className="classic plain" data-dark={dark ? '1' : '0'}>
      <header>
        <Button variant="ghost" size="sm" onClick={back}>← {pick('Menü', 'Menu')}</Button>
        <h2>{pick('Klasszikus', 'Classic')}</h2>
        <Chip>{solved} / {main.length} {pick('megoldva', 'solved')}</Chip>
        <button type="button" className="dm" data-act="dark" aria-pressed={dark} title={pick('Sötét mód', 'Dark mode')} aria-label={pick('Sötét mód', 'Dark mode')} onClick={() => setDark(!dark)}>
          🌙
        </button>
      </header>
      <p className="lead">
        {pick(
          `Tedd a helyére mindenkit a nyomok alapján. Nincs trükk, csak logika — öt szint, szintenként ${PER_LEVEL} hétköznapi ügy.`,
          `Put everyone in their place using the clues. No tricks, just logic — five levels, ${PER_LEVEL} everyday cases each.`,
        )}
      </p>

      <div className="filters" role="tablist" aria-label={pick('Szint', 'Level')}>
        <button type="button" role="tab" aria-selected={view.level === 0} className={`pill${view.level === 0 ? ' on' : ''}`} data-filter="0" onClick={() => change({ level: 0 })}>
          {pick('Mind', 'All')}
        </button>
        {LEVELS.map((lv) => {
          const c = perLevel(lv.d)
          return (
            <button key={lv.d} type="button" role="tab" aria-selected={view.level === lv.d} className={`pill${view.level === lv.d ? ' on' : ''}`} data-filter={lv.d} title={levelPlain(lv)} onClick={() => change({ level: lv.d })}>
              {lv.emoji} {levelName(lv)}
              <small>{c.done}/{c.total}</small>
            </button>
          )
        })}
      </div>
      <div className="filters sub">
        <label>
          {pick('Rendezés:', 'Sort by:')}
          <select value={view.sort} data-sort onChange={(e) => change({ sort: e.target.value as Sort })}>
            <option value="difficulty">{pick('Nehézség', 'Difficulty')}</option>
            <option value="size">{pick('Méret', 'Size')}</option>
            <option value="name">{pick('Név', 'Name')}</option>
          </select>
        </label>
        <button type="button" className={`pill${view.hideDone ? ' on' : ''}`} data-act="hide-done" aria-pressed={view.hideDone} onClick={() => change({ hideDone: !view.hideDone })}>
          {pick('Befejezettek elrejtése', 'Hide completed')}
        </button>
        <button type="button" className={`pill${view.hideStarted ? ' on' : ''}`} data-act="hide-started" aria-pressed={view.hideStarted} onClick={() => change({ hideStarted: !view.hideStarted })}>
          {pick('Megkezdettek elrejtése', 'Hide started')}
        </button>
        <span className="count" data-count>{shown.length} {pick('pálya', shown.length === 1 ? 'puzzle' : 'puzzles')}</span>
      </div>

      <section>
        <div className="cases">{shown.map((p) => card(p, numOf(p.id)))}</div>
        {shown.length === 0 && <p className="lead">{pick('Nincs a szűrésnek megfelelő pálya.', 'No puzzles match the filter.')}</p>}
      </section>
      {bonus.length > 0 && (
        <section>
          <h3>{pick('Bónuszügyek', 'Bonus cases')}</h3>
          <div className="cases">{bonus.map((p) => card(p, '★'))}</div>
        </section>
      )}
    </main>
  )
}
