import type { ReactElement } from 'react'
import { OBJECTS } from '../engine'
import { DRAWN } from './drawn'

const wood = '#a9743f'
const dark = '#3b2412'

/** Saját rajzolt jelek ott, ahol nincs jó emoji (pl. pad ≠ szék). Minden más tárgy az `OBJECTS[type].emoji`-t használja. */
const SVG: Record<string, () => ReactElement> = {
  bench: () => (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="57" rx="26" ry="3.5" fill="rgba(0,0,0,.25)" />
      <g stroke={dark} strokeWidth="2" strokeLinejoin="round">
        <rect x="6" y="13" width="52" height="7" rx="2" fill={wood} />
        <rect x="6" y="23" width="52" height="7" rx="2" fill={wood} />
        <rect x="4" y="35" width="56" height="9" rx="2" fill="#c08a4e" />
        <path d="M10 44 V56 M54 44 V56 M10 20 V35 M54 20 V35" fill="none" stroke="#4a4a52" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  ),
  plant: () => (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="58" rx="18" ry="3" fill="rgba(0,0,0,.25)" />
      <g stroke={dark} strokeWidth="1.8" strokeLinejoin="round">
        <path d="M32 40 C18 38 12 24 14 12 C26 14 32 24 32 40Z" fill="#3fa34d" />
        <path d="M32 40 C46 38 52 24 50 12 C38 14 32 24 32 40Z" fill="#58c265" />
        <path d="M32 40 C28 30 30 18 32 6 C34 18 36 30 32 40Z" fill="#2f8f3e" />
        <path d="M18 40 H46 L42 58 H22Z" fill="#c8693a" />
        <rect x="16" y="37" width="32" height="6" rx="2" fill="#dd8250" />
      </g>
    </svg>
  ),
  mirror: () => (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="59" rx="18" ry="3" fill="rgba(0,0,0,.25)" />
      <ellipse cx="32" cy="30" rx="19" ry="25" fill="#cfe9f7" stroke="#8a6a1c" strokeWidth="5" />
      <path d="M22 18 L30 10 M20 28 L36 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".85" />
      <path d="M26 54 L22 60 M38 54 L42 60" stroke="#8a6a1c" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  window: () => (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="9" y="8" width="46" height="48" rx="3" fill="#5a5a66" stroke={dark} strokeWidth="2" />
      <g fill="#a9d4ee" stroke={dark} strokeWidth="1.5">
        <rect x="14" y="13" width="16" height="17" />
        <rect x="34" y="13" width="16" height="17" />
        <rect x="14" y="34" width="16" height="17" />
        <rect x="34" y="34" width="16" height="17" />
      </g>
      <path d="M22 13 V51 M42 13 V51" stroke="#2a2a30" strokeWidth="2.5" />
    </svg>
  ),
  grave: () => (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="57" rx="24" ry="4" fill="#3d6b34" stroke={dark} strokeWidth="1.5" />
      <path d="M16 56 V26 C16 8 48 8 48 26 V56Z" fill="#a4aab0" stroke={dark} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M32 20 V40 M24 28 H40" stroke="#5b6168" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  slide: () => (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="58" rx="26" ry="3.2" fill="rgba(0,0,0,.25)" />
      <g stroke={dark} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M8 56 V12 M20 56 V12" stroke="#d1162f" strokeWidth="4" />
        <path d="M8 22 H20 M8 32 H20 M8 42 H20 M8 52 H20" stroke="#f1b81c" strokeWidth="3" />
        <rect x="6" y="9" width="16" height="5" fill="#f1b81c" />
        <path d="M22 13 C40 14 46 30 56 52" stroke="#2f7de1" strokeWidth="9" />
        <path d="M22 13 C40 14 46 30 56 52" stroke="#8ec0ff" strokeWidth="4" />
      </g>
    </svg>
  ),
}

const ALL: Record<string, () => ReactElement> = { ...SVG, ...DRAWN }

/**
 * Azok a tárgyak, amelyeknek az emojija tényleg azt ábrázolja, aminek a neve (oroszlán → 🦁). Minden más tárgynak RAJZOLT jele kell
 * (`SVG` / `DRAWN`) — a `vocab.test.ts` ellenőrzi, hogy új tárgy ne kerüljön be átnézés nélkül (a torta nem „party-asztal").
 */
export const FAITHFUL = new Set([
  'coffin', 'bed', 'sofa', 'crate', 'candle', 'tree', 'bell', 'statue', 'fountain', 'cauldron', 'armor', 'painting', 'barrel', 'pump', 'cross', 'chair', 'flowers', 'shelf', 'tv', 'bath',
  'toilet', 'sink', 'globe', 'computer', 'ball', 'picnic', 'parasol', 'palm', 'boat', 'lion', 'penguin', 'bear', 'croc', 'elephant', 'rock', 'bush', 'carousel', 'wheel', 'coaster', 'balloon',
  'popcorn', 'target', 'ticket', 'luggage', 'minibar', 'microscope', 'medcab', 'exhibit', 'weights', 'treadmill', 'haybale', 'tractor', 'cow', 'horse', 'clock', 'train', 'plane', 'tent',
  'campfire', 'canoe', 'printer', 'goal', 'fish', 'apples', 'anchor', 'hairchair', 'car', 'toolbox', 'mic', 'dogcage', 'machine', 'giftbox', 'camera', 'speaker', 'typewriter', 'herb',
  'itembox', 'tracker', 'cardreader', 'savepoint', 'terminal', 'batterybox', 'wheelchair', 'radio', 'charger', 'coffeemaker', 'arcade', 'trophy', 'sword', 'bmo', 'broom', 'doll',
  'rug', 'carpet', // a szőnyegeket a térkép CSS-sel rajzolja
])

/** Egy tárgy jele a térképen és a jelmagyarázatban: rajzolt (SVG), ennek híján az emoji. */
export function ObjectIcon({ type }: { type: string }) {
  const draw = ALL[type]
  return draw ? draw() : <>{OBJECTS[type]?.emoji ?? '▫️'}</>
}
export const hasDrawnIcon = (type: string): boolean => type in ALL
