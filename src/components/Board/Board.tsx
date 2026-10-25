import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { boardEngine, OBJECTS, violations } from '../../engine'
import { buildGrid, cellId } from '../../engine/grid'
import { ROOM_STYLE } from '../../engine/vocab'
import type { BoardView } from '../../game/controller'
import type { CellId, CharId } from '../../shared/base'
import type { Puzzle } from '../../shared/puzzle'
import { ObjectIcon } from '../ObjectIcon'
import { Portrait } from '../Portrait'
import './board.css'

/** Ennyi ideig kell nyomva tartani a mezőt, hogy a karakter ténylegesen lekerüljön (a gyűrű eddig telik meg). */
export const HOLD_MS = 1000

export type Tool = 'letter' | 'x' | 'erase'

interface Props {
  puzzle: Puzzle
  view: BoardView
  selected: CharId | null
  markers: Map<CharId, string>
  /** Arcképek (Klasszikus) vagy emoji-jelek (horror-módok). */
  person: boolean
  /** Padló-stílusok (Klasszikus) vagy sötét tónusok (horror-módok). */
  floors: boolean
  tool: Tool
  highlightRoom?: string | null
  shake?: CellId | null
  /** Éjjellátó (Outlast): csak a kurzor körüli mezők látszanak. */
  fog?: boolean
  disabled?: boolean
  /** Beküldés után: melyik szereplő áll jó (zöld karika) / rossz (piros karika) helyen. */
  verdict?: Record<CharId, 'ok' | 'bad'> | null
  /** Kiemelt tárgytípusok (a kijelölt kártya nyoma, a jelmagyarázat) — a mezők villogó kerettel jelennek meg. */
  focusTypes?: string[]
  /** Kiemelt padló-osztályok (terrain nyom), karakterek (dir / diagonal… nyom) és sorok / oszlopok (line / col / row nyom). */
  focusFloors?: string[]
  focusChars?: CharId[]
  focusLines?: { axis: 'row' | 'col'; n: number }[]
  /** Rövid koppintás: a kiválasztott karakter betűje (jegyzet), ✕, radír — az eszköz szerint. */
  onTap: (cell: CellId) => void
  /** Hosszú nyomás (HOLD_MS): a kiválasztott karakter lerakása. */
  onHold: (cell: CellId) => void
}

/** A tárgynév betűmérete: a leghosszabb szó is kiférjen a mezőbe (szóközön törhet, szó közepén nem). */
const nameSize = (name: string): CSSProperties => ({ ['--nf' as string]: Math.min(0.125, 1.15 / Math.max(...name.split(' ').map((w) => w.length))) } as CSSProperties)

const FALLBACK_STYLES = ['wood', 'checker', 'brick', 'grass', 'tile', 'carpet', 'sand', 'stone']
const DARK_TINTS = ['#2a1520', '#16202a', '#1d2a1a', '#2a2415', '#241a2e', '#14282a', '#2d1c1c', '#1b1b2d', '#2a2a2a', '#1a2e24']

export function Board({ puzzle, view, selected, markers, person, floors, tool, highlightRoom, shake, fog, disabled, verdict, focusTypes, focusFloors, focusChars, focusLines, onTap, onHold }: Props) {
  const n = puzzle.size
  const grid = useMemo(() => buildGrid(puzzle), [puzzle])
  const letters = useMemo(() => Object.keys(puzzle.rooms), [puzzle])
  const [hover, setHover] = useState<CellId | null>(null)
  const [ring, setRing] = useState<CellId | null>(null)
  const [eye, setEye] = useState<{ x: number; y: number } | null>(null)
  const holdRef = useRef<{ cell: CellId; fired: boolean; timer: ReturnType<typeof setTimeout> } | null>(null)

  const floorOf = useMemo(() => {
    const used = new Map<string, number>()
    const m = new Map<string, { style: string; tone: number }>()
    letters.forEach((l, i) => {
      const style = ROOM_STYLE[puzzle.rooms[l]!] ?? FALLBACK_STYLES[i % FALLBACK_STYLES.length]!
      m.set(l, { style, tone: used.get(style) ?? 0 })
      used.set(style, (used.get(style) ?? 0) + 1)
    })
    return m
  }, [puzzle, letters])
  const objAt = useMemo(() => {
    const m = new Map<CellId, string[]>()
    for (const o of puzzle.objects) for (const id of Array.isArray(o.at) ? o.at : [o.at]) m.set(id, [...(m.get(id) ?? []), o.type])
    return m
  }, [puzzle])
  const placedAt = useMemo(() => new Map(Object.entries(view.state.placed).map(([ch, cell]) => [cell, ch])), [view.state.placed])
  const auto = useMemo(() => new Set(boardEngine.autoMarks(puzzle, view.state)), [puzzle, view.state])
  const bad = useMemo(() => new Set(violations(puzzle, view.state.placed)), [puzzle, view.state.placed])
  const charById = useMemo(() => new Map(puzzle.characters.map((c) => [c.id, c])), [puzzle])
  /** A helyiség neve a legalsó sor bal szélső mezője alatt/mellett (mint a murdoku.com-on). */
  const labelCell = useMemo(() => {
    // a helyiség neve a leghosszabb vízszintes szakaszán (ott fér ki a legjobban), lehetőleg lent és tárgy nélküli mezők fölött
    // (a tárgyak felirata is a mező aljára kerül, a kettő nem takarhatja egymást)
    const withObj = new Set(puzzle.objects.flatMap((o) => (Array.isArray(o.at) ? o.at : [o.at])))
    const best = new Map<string, { r: number; c: number; run: number; score: number }>()
    puzzle.layout.forEach((row, r) => {
      let c = 0
      while (c < n) {
        const l = row[c]!
        let e = c
        while (e + 1 < n && row[e + 1] === l) e++
        const run = e - c + 1
        let objs = 0
        for (let x = c; x <= e; x++) if (withObj.has(cellId(r, x))) objs++
        const score = run - 1.5 * objs
        const b = best.get(l)
        if (!b || score > b.score || (score === b.score && r > b.r)) best.set(l, { r, c, run, score })
        c = e + 1
      }
    })
    return [...best].map(([l, { r, c, run }]) => ({ letter: l, r, c, run }))
  }, [puzzle, n])
  const cursors = Object.entries(view.cursors).filter(([, c]) => c)

  useEffect(
    () => () => {
      if (holdRef.current) clearTimeout(holdRef.current.timer)
    },
    [],
  )

  const isBlocked = (r: number, c: number) => grid.blocked[r]![c]! || view.vanished.includes(cellId(r, c)) || view.locked.includes(cellId(r, c))
  const holdable = (id: CellId, r: number, c: number) => tool === 'letter' && !!selected && !placedAt.has(id) && !isBlocked(r, c)

  const down = (e: PointerEvent, id: CellId, r: number, c: number) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    if (holdRef.current) clearTimeout(holdRef.current.timer)
    const h = { cell: id, fired: false, timer: setTimeout(() => undefined, 0) }
    clearTimeout(h.timer)
    if (holdable(id, r, c)) {
      setRing(id)
      h.timer = setTimeout(() => {
        h.fired = true
        setRing(null)
        onHold(id)
      }, HOLD_MS)
    }
    holdRef.current = h
  }
  const up = (id: CellId) => {
    const h = holdRef.current
    if (!h) return
    clearTimeout(h.timer)
    holdRef.current = null
    setRing(null)
    if (!h.fired && h.cell === id) onTap(id)
  }
  const cancel = () => {
    if (holdRef.current) clearTimeout(holdRef.current.timer)
    holdRef.current = null
    setRing(null)
  }
  const key = (e: KeyboardEvent, id: CellId) => {
    if (disabled) return
    if (e.key === 'Enter') {
      e.preventDefault()
      onHold(id) // billentyűzettel azonnal lerak (nincs mit „nyomva tartani")
    }
  }

  const hoverLetter = hover ? puzzle.layout[Number(hover.slice(1)) - 1]![hover.charCodeAt(0) - 65]! : null
  const hl = highlightRoom ?? (selected && tool === 'letter' ? hoverLetter : null)

  const cells = []
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const id = cellId(r, c)
      const letter = puzzle.layout[r]![c]!
      const diff = (rr: number, cc: number) => puzzle.layout[rr]?.[cc] !== letter
      const objs = objAt.get(id) ?? []
      const vanished = view.vanished.includes(id)
      const locked = view.locked.includes(id)
      const blocked = isBlocked(r, c)
      const who = placedAt.get(id)
      const ch = who ? charById.get(who) : undefined
      const notes = view.state.notes[id]
      const crossed = view.state.marks.includes(id) || (!blocked && auto.has(id))
      const fl = floorOf.get(letter)!
      const ri = letters.indexOf(letter)
      const cls = ['cell']
      if (diff(r - 1, c)) cls.push('wt')
      if (diff(r + 1, c)) cls.push('wb')
      if (diff(r, c - 1)) cls.push('wl')
      if (diff(r, c + 1)) cls.push('wr')
      if (floors) cls.push('fl', `fl-${fl.style}`, `tone${fl.tone % 3}`)
      if (objs.some((t) => OBJECTS[t]?.blocking)) cls.push('blocking')
      if (hl === letter) cls.push('hr')
      if (locked) cls.push('locked')
      if (shake === id) cls.push('shake')
      if (puzzle.worldRule === 'light') cls.push(grid.lit[r]![c]! ? 'lit' : 'dim')
      if (grid.vacuum.has(letter)) cls.push('vac')
      if (focusTypes?.length && objs.some((t) => focusTypes.includes(t))) cls.push('ref')
      if (focusFloors?.length && focusFloors.includes(puzzle.floors?.[letter] ?? '')) cls.push('reffloor')
      if (focusLines?.some((l) => (l.axis === 'row' ? r : c) === l.n - 1)) cls.push('refline')
      const marker = selected ? markers.get(selected) : undefined
      const style = {
        ['--dl' as string]: `${ri * 100 + ((r * 7 + c * 3) % 5) * 12}ms`,
        ['--rot' as string]: `${(ri % 2 ? 1 : -1) * (4 + (ri % 4) * 3)}deg`,
        ...(floors ? {} : { backgroundColor: DARK_TINTS[ri % DARK_TINTS.length] }),
      } as CSSProperties
      cells.push(
        <button
          key={id}
          type="button"
          className={cls.join(' ')}
          data-cell={id}
          style={style}
          aria-label={`${id}${ch ? `, ${ch.name}` : ''}${objs.length ? `, ${objs.map((t) => OBJECTS[t]?.hu ?? t).join(', ')}` : ''}`}
          onPointerDown={(e) => down(e, id, r, c)}
          onPointerUp={() => up(id)}
          onPointerLeave={cancel}
          onPointerCancel={cancel}
          onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(id)}
          onKeyDown={(e) => key(e, id)}
          onClick={(e) => e.detail === 0 && !disabled && onTap(id)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {!vanished && objs.map((t) => (t === 'rug' || t === 'carpet' ? (
            <Fragment key={t}>
              <span className={`obj rugobj ${t}`} title={OBJECTS[t]?.hu ?? t} />
              <span className="oname" aria-hidden="true" style={nameSize(OBJECTS[t]?.hu ?? t)}>{OBJECTS[t]?.hu ?? t}</span>
            </Fragment>
          ) : (
            <span key={t} className="obj" title={OBJECTS[t]?.hu ?? t}>
              <ObjectIcon type={t} />
              <span className="oname" aria-hidden="true" style={nameSize(OBJECTS[t]?.hu ?? t)}>{OBJECTS[t]?.hu ?? t}</span>
            </span>
          )))}
          {locked && <span className="lock">⛓</span>}
          {view.state.marks.includes(id) && <span className="x">✕</span>}
          {!who && !view.state.marks.includes(id) && !blocked && auto.has(id) && <span className="x auto">✕</span>}
          {/* ahol X van (kézi vagy sor/oszlop szerinti), ott a ceruzás jegyzet eltűnik — minden módban, mert a tábla közös */}
          {!who && !crossed && ((notes && notes.length > 0) || (hover === id && marker && tool === 'letter' && !blocked)) && (
            <span className="letters">
              {notes?.map((k) => <span key={k} className="letter">{markers.get(k)}</span>)}
              {hover === id && marker && tool === 'letter' && !blocked && !notes?.includes(selected!) && <span className="letter pv">{marker}</span>}
            </span>
          )}
          {ch && (
            <span className={`token${bad.has(ch.id) ? ' bad' : ''}${ch.victim ? ' victim' : ''}${focusChars?.includes(ch.id) ? ' focus' : ''}`} title={ch.name}>
              <Portrait ch={ch} person={person} className="pic" />
              <span className="letter">{markers.get(ch.id)}</span>
            </span>
          )}
          {ch && verdict?.[ch.id] && (
            <svg className={`vring ${verdict[ch.id]}`} viewBox="0 0 100 100" aria-hidden="true">
              <ellipse cx="50" cy="50" rx="46" ry="46" pathLength="100" />
            </svg>
          )}
          {ring === id && (
            <svg className="ring" viewBox="0 0 40 40" aria-hidden="true" style={{ ['--hold' as string]: `${HOLD_MS}ms` }}>
              <circle className="track" cx="20" cy="20" r="16" />
              <circle className="fill" cx="20" cy="20" r="16" pathLength="100" />
            </svg>
          )}
          {cursors.filter(([, cell]) => cell === id).map(([uid]) => {
            const peer = view.peers.find((p) => p.userId === uid)
            return <span key={uid} className="peer" style={{ borderColor: peer?.color ?? 'var(--gold)' }} />
          })}
        </button>,
      )
    }
  return (
    <div className="board-frame">
      <div
        className="board"
        role="grid"
        aria-label={puzzle.title}
        style={{ ['--n' as string]: n } as CSSProperties}
        onPointerMove={fog ? (e) => { const b = e.currentTarget.getBoundingClientRect(); setEye({ x: e.clientX - b.left, y: e.clientY - b.top }) } : undefined}
        onPointerLeave={() => {
          setHover(null)
          if (fog) setEye(null)
        }}
      >
        {cells}
        <div className="labels" aria-hidden="true">
          {labelCell.map((l) => (
            <span
              key={l.letter}
              className={`room-name${hl === l.letter ? ' hr' : ''}`}
              style={{ left: `${(l.c / n) * 100}%`, top: `${((l.r + 1) / n) * 100}%`, ['--run' as string]: l.run, ['--fs' as string]: Math.min(0.27, (l.run * 1.5) / puzzle.rooms[l.letter]!.length) } as CSSProperties}
            >
              {puzzle.rooms[l.letter]}
            </span>
          ))}
        </div>
        {fog && <div className="fog" style={{ ['--ex' as string]: `${eye?.x ?? -999}px`, ['--ey' as string]: `${eye?.y ?? -999}px` }} />}
      </div>
    </div>
  )
}
