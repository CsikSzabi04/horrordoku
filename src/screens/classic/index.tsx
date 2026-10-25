import { useEffect, useMemo, useState } from 'react'
import { useNav } from '../../app/nav'
import { listPuzzles, startedIds } from '../../content/catalog'
import type { PuzzleMeta } from '../../content/catalog'
import { LEVELS, levelOf, PER_LEVEL } from '../../game/levels'
import { useGameDark } from '../../game/theme'
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
const numOf = (id: string) => id.match(/-(\d+)-[a-z-]+$/)?.[1] ?? ''

/** Klasszikus mód: sima Murdoku, 5 szint × 20 pálya (+ bónuszügyek). Szűrés szint szerint, rendezés, befejezettek / megkezdettek elrejtése. */
export default function ClassicScreen() {
  const { go, back } = useNav()
  const [dark, setDark] = useGameDark()
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
      name: (a, b) => a.title.localeCompare(b.title, 'hu') || a.id.localeCompare(b.id),
    }
    return [...rows].sort(by[view.sort])
  }, [main, view, progress, started])

  const card = (p: PuzzleMeta, tag: string) => {
    const pr = progress[p.id]
    return (
      <button key={p.id} type="button" className={`case${pr?.solved ? ' done' : ''}`} data-puzzle={p.id} data-level={p.difficulty} onClick={() => go({ name: 'game', ref: p.id })}>
        <span className="no" aria-hidden="true">{p.icon ?? '🔎'}</span>
        <i className="num">{tag}</i>
        <b>{p.title}</b>
        <small>
          {p.size}×{p.size} · {levelOf(p.difficulty).name}
        </small>
        <span className="state">{pr?.solved ? `✔ ${pr.bestMs ? fmt(pr.bestMs) : ''}` : started.has(p.id) ? '▶ Folytatás' : STARS[p.difficulty]}</span>
      </button>
    )
  }

  return (
    <main className="classic plain" data-dark={dark ? '1' : '0'}>
      <header>
        <Button variant="ghost" size="sm" onClick={back}>← Menü</Button>
        <h2>Klasszikus</h2>
        <Chip>{solved} / {main.length} megoldva</Chip>
        <button type="button" className="dm" data-act="dark" aria-pressed={dark} title="Sötét mód" aria-label="Sötét mód" onClick={() => setDark(!dark)}>
          🌙
        </button>
      </header>
      <p className="lead">Sima Murdoku: tedd a helyére mindenkit a nyomok alapján. Nincs trükk, csak logika — öt szint, szintenként {PER_LEVEL} hétköznapi ügy.</p>

      <div className="filters" role="tablist" aria-label="Szint">
        <button type="button" role="tab" aria-selected={view.level === 0} className={`pill${view.level === 0 ? ' on' : ''}`} data-filter="0" onClick={() => change({ level: 0 })}>
          Mind
        </button>
        {LEVELS.map((lv) => {
          const c = perLevel(lv.d)
          return (
            <button key={lv.d} type="button" role="tab" aria-selected={view.level === lv.d} className={`pill${view.level === lv.d ? ' on' : ''}`} data-filter={lv.d} title={lv.plain} onClick={() => change({ level: lv.d })}>
              {lv.emoji} {lv.name}
              <small>{c.done}/{c.total}</small>
            </button>
          )
        })}
      </div>
      <div className="filters sub">
        <label>
          Rendezés:
          <select value={view.sort} data-sort onChange={(e) => change({ sort: e.target.value as Sort })}>
            <option value="difficulty">Nehézség</option>
            <option value="size">Méret</option>
            <option value="name">Név</option>
          </select>
        </label>
        <button type="button" className={`pill${view.hideDone ? ' on' : ''}`} data-act="hide-done" aria-pressed={view.hideDone} onClick={() => change({ hideDone: !view.hideDone })}>
          Befejezettek elrejtése
        </button>
        <button type="button" className={`pill${view.hideStarted ? ' on' : ''}`} data-act="hide-started" aria-pressed={view.hideStarted} onClick={() => change({ hideStarted: !view.hideStarted })}>
          Megkezdettek elrejtése
        </button>
        <span className="count" data-count>{shown.length} pálya</span>
      </div>

      <section>
        <div className="cases">{shown.map((p) => card(p, numOf(p.id)))}</div>
        {shown.length === 0 && <p className="lead">Nincs a szűrésnek megfelelő pálya.</p>}
      </section>
      {bonus.length > 0 && (
        <section>
          <h3>Bónuszügyek</h3>
          <div className="cases">{bonus.map((p) => card(p, '★'))}</div>
        </section>
      )}
    </main>
  )
}
