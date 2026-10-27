import { useEffect, useMemo, useState } from 'react'
import { useNav } from '../../app/nav'
import { WorldIcon } from '../../components/WorldIcon'
import { listPuzzles, startedIds } from '../../content/catalog'
import type { PuzzleMeta } from '../../content/catalog'
import { puzzleTitle } from '../../content/localize'
import { ruleInfo, worldInfo } from '../../game/worlds'
import { pick } from '../../i18n/lang'
import { getStorage } from '../../storage'
import type { ProgressEntry } from '../../shared/storage'
import { Button, Chip } from '../../ui'
import '../classic/classic.css'
import './event.css'

const STARS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★']
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`

/** Esemény mód: eredeti horror-történetek világai; mindegyikben 5 egymás utáni ügy (egyre nehezebb), saját világ-szabállyal. 16+ */
export default function EventScreen() {
  const { go, back, route } = useNav()
  const world = route.name === 'event' ? route.world : undefined
  const [progress, setProgress] = useState<Record<string, ProgressEntry>>({})
  const [started, setStarted] = useState<Set<string>>(new Set())
  useEffect(() => {
    void (async () => {
      const s = getStorage()
      setProgress((await s.getProgress()).puzzles)
      setStarted(startedIds((await s.getSessions()).sessions))
    })()
  }, [])
  // világok az eredeti sorrendben, bennük az ügyek sorszám szerint
  const worlds = useMemo(() => {
    const by = new Map<string, PuzzleMeta[]>()
    for (const m of listPuzzles('event')) by.set(m.world!, [...(by.get(m.world!) ?? []), m])
    return [...by.entries()].map(([id, cases]) => ({ id, cases: cases.sort((a, b) => (a.no ?? 0) - (b.no ?? 0)) }))
  }, [])
  const done = (id: string) => !!progress[id]?.solved
  const total = worlds.reduce((n, w) => n + w.cases.length, 0)
  const solved = worlds.reduce((n, w) => n + w.cases.filter((c) => done(c.id)).length, 0)
  const open = world ? worlds.find((w) => w.id === world) : undefined

  if (open) {
    const w = worldInfo(open.id)
    const rule = ruleInfo(open.id, open.cases[0]?.worldRule ?? undefined)
    const next = open.cases.find((c) => !done(c.id))
    return (
      <main className="classic event" data-world={open.id}>
        <header>
          <Button variant="ghost" size="sm" onClick={back}>← {pick('Világok', 'Worlds')}</Button>
          <h2>{w && <WorldIcon id={open.id} emoji={w.emoji} />} {w?.title ?? open.id}</h2>
          <Chip>{open.cases.filter((c) => done(c.id)).length} / {open.cases.length} {pick('megoldva', 'solved')}</Chip>
        </header>
        <p className="lead">
          {w?.game}.{' '}
          {pick(
            'Öt ügy sorban, egyre nehezebben — bármelyiket megnyithatod, a félbehagyott játék elmentődik.',
            'Five cases in a row, each harder than the last — open any of them; an unfinished game is saved.',
          )}
          {rule && (
            <>
              {' '}<b>{rule.name}:</b> {rule.text}
            </>
          )}
        </p>
        <ol className="cases order">
          {open.cases.map((p) => {
            const pr = progress[p.id]
            return (
              <li key={p.id}>
                <button type="button" className={`case world${pr?.solved ? ' done' : ''}${next?.id === p.id ? ' next' : ''}`} data-puzzle={p.id} data-no={p.no} onClick={() => go({ name: 'game', ref: p.id })}>
                  <span className="no">{p.no}</span>
                  <b>{puzzleTitle(p)}</b>
                  <small>
                    {p.size}×{p.size} · {STARS[p.difficulty]}
                  </small>
                  <span className="state">{pr?.solved ? `✔ ${pr.bestMs ? fmt(pr.bestMs) : ''}` : started.has(p.id) ? pick('▶ Folytatás', '▶ Continue') : next?.id === p.id ? pick('Következő ügy', 'Next case') : pick('Új ügy', 'New case')}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </main>
    )
  }

  return (
    <main className="classic event">
      <header>
        <Button variant="ghost" size="sm" onClick={back}>← {pick('Menü', 'Menu')}</Button>
        <h2>{pick('Esemény', 'Event')}</h2>
        <Chip>{solved} / {total} {pick('megoldva', 'solved')}</Chip>
      </header>
      <p className="lead">
        {pick(
          `${worlds.length} világ eredeti horror-történetekből, mindegyikben 5 ügy sorban. Minden világnak saját szabálya van — olvasd el, mielőtt belevágsz. A jumpscare itt élhet (a Beállításokban kapcsolható).`,
          `${worlds.length} worlds of original horror stories, each with 5 cases in a row. Every world has its own rule — read it before you dive in. Jumpscares can happen here (toggle them in Settings).`,
        )}{' '}
        <b>16+</b>
      </p>
      <div className="cases worlds">
        {worlds.map((wd, i) => {
          const w = worldInfo(wd.id)
          const n = wd.cases.filter((c) => done(c.id)).length
          const going = wd.cases.some((c) => started.has(c.id))
          return (
            <button key={wd.id} type="button" className={`case world${n === wd.cases.length ? ' done' : ''}`} data-world={wd.id} onClick={() => go({ name: 'event', world: wd.id })}>
              <span className="no">{w ? <WorldIcon id={wd.id} emoji={w.emoji} /> : String(i + 1)}</span>
              <b>{w?.title ?? wd.id}</b>
              <small>{w?.game}</small>
              <span className="state">
                {n === wd.cases.length ? '✔ ' : ''}{n} / {wd.cases.length} {pick('ügy', wd.cases.length === 1 ? 'case' : 'cases')}{going ? pick(' · ▶ Folytatás', ' · ▶ Continue') : ''}
              </span>
            </button>
          )
        })}
      </div>
    </main>
  )
}
