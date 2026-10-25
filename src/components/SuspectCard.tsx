import type { CSSProperties } from 'react'
import { RACE_HU } from '../game/look'
import { Rich } from '../game/rich'
import type { PuzzleCharacter } from '../shared/puzzle'
import { Portrait } from './Portrait'

const PASTEL = ['#a9d3df', '#c9b9de', '#a7e0c1', '#d8c3e0', '#eab5a8', '#d9b4ca', '#f1d58f', '#b8c8ee', '#c8e0a4', '#f0c0a0', '#9fd8d0', '#e6b9c9']
export const cardColor = (index: number, victim?: boolean): string => (victim ? '#f2b3bd' : PASTEL[index % PASTEL.length]!)

interface Props {
  ch: PuzzleCharacter
  index: number
  marker: string
  person: boolean
  selected: boolean
  placedAt?: string
  bad: boolean
  override?: string
  pulse?: boolean
  dim?: boolean
  unlocked?: boolean
  /** A zuhanó belépő animáció késleltetése (ms). */
  delay: number
  victimLabel: string
  lockedText: string
  onSelect: () => void
}

/** Murdoku-kártya: arckép (♂/♀ jelvénnyel, a nevével) és alatta a színes nyomkártya. A Gyilkos-mód szövegcseréje jelzés nélkül cserél. */
export function SuspectCard({ ch, index, marker, person, selected, placedAt, bad, override, pulse, dim, unlocked, delay, victimLabel, lockedText, onSelect }: Props) {
  const text = override ?? ch.clueText.map((t, i) => (ch.hidden?.includes(i) && !unlocked ? lockedText : t)).join(' ')
  return (
    <div
      className={`suspect${selected ? ' sel' : ''}${placedAt ? ' placed' : ''}${ch.victim ? ' victim' : ''}${bad ? ' bad' : ''}${pulse ? ' pulse' : ''}${dim ? ' dim' : ''}`}
      data-char={ch.id}
      style={{ ['--card' as string]: cardColor(index, ch.victim), ['--delay' as string]: `${delay}ms` } as CSSProperties}
    >
      <button type="button" className="face" aria-pressed={selected} aria-label={`${ch.name} — ${text.replaceAll('**', '')}`} onClick={onSelect}>
        <Portrait ch={ch} person={person} className="pic" />
        {ch.gender && <span className={`gender ${ch.gender}`} aria-hidden="true">{ch.gender === 'm' ? '♂' : '♀'}</span>}
        {placedAt && <span className="here" aria-hidden="true">{placedAt}</span>}
        <span className="name" style={ch.name.length > 10 ? { fontSize: ch.name.length > 13 ? '0.95rem' : '1.05rem' } : undefined}>{ch.name}</span>
        <kbd aria-hidden="true">{marker}</kbd>
      </button>
      <div className="clue">
        {ch.victim && !text.startsWith('Az áldozat') && <b className="vl">{victimLabel}. </b>}
        <Rich text={text} />
        {!person && !ch.victim && <small className="race">{RACE_HU[ch.race]}{ch.armored ? ' · 🛡' : ''}</small>}
      </div>
    </div>
  )
}
