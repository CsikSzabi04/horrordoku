import { useCallback, useEffect, useState } from 'react'
import { useNav } from '../../app/nav'
import { dailyRef, makeRef, newSeed, refFromCode } from '../../engine'
import { getStorage } from '../../storage'
import type { PuzzleRef } from '../../shared/base'
import type { Difficulty } from '../../shared/puzzle'
import type { SessionState } from '../../shared/storage'
import { Button, Chip, Panel, useToast } from '../../ui'
import './random.css'

const LEVELS: { d: Difficulty; name: string; size: string }[] = [
  { d: 1, name: 'Gyertyafény', size: '6×6' },
  { d: 2, name: 'Szürkület', size: '7×7' },
  { d: 3, name: 'Éjfél', size: '8×8' },
  { d: 4, name: 'Farkasóra', size: '9×9' },
  { d: 5, name: 'Pokol kapuja', size: '10×10' },
]
const EXPIRE_MS = 30 * 24 * 3600 * 1000
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000)
  return m < 1 ? 'most' : m < 60 ? `${m} perce` : m < 1440 ? `${Math.round(m / 60)} órája` : `${Math.round(m / 1440)} napja`
}

/** Random mód: új véletlen ügy, ügykód, napi ügy és a félbehagyott ügyek listája. */
export default function RandomScreen() {
  const { go, back } = useNav()
  const toast = useToast()
  const [level, setLevel] = useState<Difficulty>(2)
  const [code, setCode] = useState('')
  const [sessions, setSessions] = useState<[PuzzleRef, SessionState][]>([])
  const [dailyDone, setDailyDone] = useState(false)
  const daily = dailyRef()

  const load = useCallback(async () => {
    const s = getStorage()
    const all = (await s.getSessions()).sessions
    for (const [ref, ss] of Object.entries(all))
      if (Date.now() - Date.parse(ss.updatedAt) > EXPIRE_MS) {
        await s.deleteSession(ref)
        delete all[ref]
      }
    setSessions(Object.entries(all).sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt)))
    setDailyDone(!!(await s.getProgress()).puzzles[daily]?.solved)
  }, [daily])
  useEffect(() => {
    void load()
  }, [load])

  const start = (ref: PuzzleRef) => go({ name: 'game', ref })
  const discard = async (ref: PuzzleRef, ss: SessionState) => {
    const s = getStorage()
    await s.recordRun({
      id: crypto.randomUUID(), ref, kind: ref.startsWith('gen:') ? 'random' : 'catalog', solved: false,
      hints: ss.hintsUsed, wrongSubmits: ss.wrongSubmits, at: new Date().toISOString(),
    })
    await s.deleteSession(ref)
    toast('Ügy elvetve.')
    void load()
  }
  const openCode = () => {
    const ref = refFromCode(code)
    if (!ref) return toast('Érvénytelen ügykód. Példa: 3-7F3K92')
    start(ref)
  }

  return (
    <main className="random">
      <header>
        <Button variant="ghost" size="sm" onClick={back}>← Menü</Button>
        <h2>Random</h2>
      </header>
      <p className="lead">Minden ügy egyedi, a gép állítja össze — de mindig pontosan egy megoldással. Az ügykóddal bárkivel megoszthatod.</p>

      <Panel tag="ÚJ ÜGY">
        <div className="levels" role="radiogroup" aria-label="Nehézség">
          {LEVELS.map((l) => (
            <button key={l.d} type="button" role="radio" aria-checked={level === l.d} className={level === l.d ? 'on' : ''} data-level={l.d} onClick={() => setLevel(l.d)}>
              <b>{l.name}</b>
              <small>{l.size}</small>
            </button>
          ))}
        </div>
        <div className="row">
          <Button onClick={() => start(makeRef(level, newSeed()))} data-act="new">🎲 Új véletlen ügy</Button>
          <label className="code">
            <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && openCode()} placeholder="Ügykód, pl. 3-7F3K92" aria-label="Ügykód" />
            <Button variant="ghost" size="sm" onClick={openCode} data-act="open-code">Megnyitás</Button>
          </label>
        </div>
      </Panel>

      <Panel tag="NAPI ÜGY">
        <div className="row">
          <div className="grow">
            <b>{daily.split(':')[3]!.replace('D', '').replace(/(\d{4})(\d\d)(\d\d)/, '$1.$2.$3.')}</b>
            <small>{LEVELS[Number(daily.split(':')[2]) - 1]!.name} · mindenkinek ugyanaz</small>
          </div>
          {dailyDone && <Chip>✔ megoldva</Chip>}
          <Button size="sm" onClick={() => start(daily)} data-act="daily">{dailyDone ? 'Újra' : 'Játék'}</Button>
        </div>
      </Panel>

      <Panel tag="FOLYTATÁS">
        {sessions.length === 0 && <p className="empty">Nincs félbehagyott ügy.</p>}
        <ul className="resume">
          {sessions.map(([ref, ss]) => (
            <li key={ref} data-session={ref}>
              <button type="button" className="info" onClick={() => start(ref)}>
                <b>{ss.meta?.title ?? ref}</b>
                <small>
                  {ss.meta ? `${ss.meta.size}×${ss.meta.size} · ` : ''}
                  {fmt(ss.elapsedMs)} · {ago(ss.updatedAt)}
                </small>
              </button>
              <Button variant="ghost" size="sm" onClick={() => void discard(ref, ss)} data-act="discard" title="Feladott futásként a naplóba kerül">Elvetem</Button>
            </li>
          ))}
        </ul>
      </Panel>
    </main>
  )
}
