import { useMemo } from 'react'
import { CATEGORIES, OBJECTS, TERRAIN } from '../engine'
import { ObjectIcon } from './ObjectIcon'
import type { Puzzle } from '../shared/puzzle'

interface Props {
  puzzle: Pick<Puzzle, 'objects' | 'characters' | 'floors'>
  title: string
  hint: string
  blockedNote: string
  /** A rámutatott / rákattintott tárgytípus kiemelése a térképen (null: nincs). */
  focus: string | null
  onFocus: (type: string | null) => void
}

/** Jelmagyarázat a térkép alatt: minden, a pályán lévő tárgytípus jele és neve — hogy a nyomokban említett tárgy azonnal azonosítható legyen. */
export function Legend({ puzzle, title, hint, blockedNote, focus, onFocus }: Props) {
  const items = useMemo(() => {
    const seen = new Map<string, boolean>()
    for (const o of puzzle.objects) seen.set(o.type, !!o.blocking || !!OBJECTS[o.type]?.blocking)
    return [...seen].map(([type, blocking]) => ({ type, blocking, vocab: OBJECTS[type] }))
  }, [puzzle])
  const anyBlocking = items.some((i) => i.blocking)
  // a nyomokban szereplő fogalmak: kategóriák (állat…), padlók (víz, mocsár…), égtájak
  const used = useMemo(() => {
    const cats = new Set<string>()
    const floors = new Set<string>()
    let compass = false
    for (const c of puzzle.characters)
      for (const cl of c.clues) {
        if ('cat' in cl) cats.add(cl.cat)
        if (cl.kind === 'terrain') floors.add(cl.style)
        if (cl.kind === 'dir' || cl.kind === 'northOf' || cl.kind === 'southOf' || cl.kind === 'leftOf') compass = true
      }
    const onBoard = new Set(puzzle.objects.map((o) => o.type))
    return {
      cats: [...cats].map((cat) => ({ cat, hu: CATEGORIES[cat]?.hu ?? cat, types: (CATEGORIES[cat]?.types ?? []).filter((t) => onBoard.has(t)) })),
      floors: [...floors],
      compass,
    }
  }, [puzzle])
  return (
    <div className="legend" role="group" aria-label={title} title={hint}>
      {items.map(({ type, blocking, vocab }) => (
        <button
          key={type}
          type="button"
          className={`lg${blocking ? ' blk' : ''}${focus === type ? ' on' : ''}`}
          data-legend={type}
          aria-pressed={focus === type}
          onMouseEnter={() => onFocus(type)}
          onMouseLeave={() => onFocus(null)}
          onFocus={() => onFocus(type)}
          onBlur={() => onFocus(null)}
          onClick={() => onFocus(focus === type ? null : type)}
        >
          <span className="em" aria-hidden="true"><ObjectIcon type={type} /></span>
          {vocab?.hu ?? type}
        </button>
      ))}
      {used.cats.map((c) => (
        <span key={c.cat} className="cat" data-cat={c.cat} title={c.types.map((t) => OBJECTS[t]?.hu ?? t).join(', ')}>
          <b>{c.hu}</b>
          {c.types.map((t) => (
            <span key={t} className="em" aria-hidden="true"><ObjectIcon type={t} /></span>
          ))}
        </span>
      ))}
      {used.floors.map((f) => (
        <span key={f} className="terr" data-terrain={f}>
          <i className={`sw fl fl-${f}`} aria-hidden="true" />
          <b>{TERRAIN[f]?.name ?? f}</b>
        </span>
      ))}
      {used.compass && <small className="note compass">↑ észak · → kelet · ↓ dél · ← nyugat</small>}
      {anyBlocking && <small className="note">▨ {blockedNote}</small>}
    </div>
  )
}
