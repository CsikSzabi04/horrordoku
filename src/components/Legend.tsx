import { useMemo } from 'react'
import { objName, terrainName } from '../content/localize'
import { OBJECTS } from '../engine'
import { pick } from '../i18n/lang'
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
  // a nyomokban szereplő fogalmak: padlók (víz, mocsár…), égtájak. A kategória-nyomok (állat, ülőhely…) a kártyán a pályán lévő tárgyak
  // nevét mondják ki, ezért külön kategória-címke nincs — a tárgyak a fenti jelmagyarázatban már ott vannak.
  const used = useMemo(() => {
    const floors = new Set<string>()
    let compass = false
    for (const c of puzzle.characters)
      for (const cl of c.clues) {
        if (cl.kind === 'terrain') floors.add(cl.style)
        if (cl.kind === 'dir' || cl.kind === 'northOf' || cl.kind === 'southOf' || cl.kind === 'leftOf') compass = true
      }
    return { floors: [...floors], compass }
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
          {vocab ? objName(type) : type}
        </button>
      ))}
      {used.floors.map((f) => (
        <span key={f} className="terr" data-terrain={f}>
          <i className={`sw fl fl-${f}`} aria-hidden="true" />
          <b>{terrainName(f)}</b>
        </span>
      ))}
      {used.compass && <small className="note compass">{pick('↑ észak · → kelet · ↓ dél · ← nyugat', '↑ north · → east · ↓ south · ← west')}</small>}
      {anyBlocking && <small className="note">▨ {blockedNote}</small>}
    </div>
  )
}
