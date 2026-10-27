import type { ReactElement } from 'react'
import { pick } from '../i18n/lang'

/**
 * Egy Esemény-világ jele: ahol van találó emoji, az; ahol nincs (a rendőrségnek nincs „jelvény" emojija), saját rajzolt SVG.
 * Az SVG 1em-es, így a környező szöveg méretét követi.
 */
const badge = (): ReactElement => (
  <svg viewBox="0 0 64 64" width="1em" height="1em" role="img" aria-label={pick('Rendőri jelvény', 'Police badge')} style={{ verticalAlign: '-0.12em' }}>
    <path d="M12 7 H52 V30 C52 44 42 54 32 58 C22 54 12 44 12 30 Z" fill="#d6a82c" stroke="#5e430a" strokeWidth="3" strokeLinejoin="round" />
    <path d="M17 12 H47 V30 C47 41 40 49 32 52.5 C24 49 17 41 17 30 Z" fill="none" stroke="#f7e08f" strokeWidth="1.8" strokeLinejoin="round" />
    <polygon points="32,17 35.3,26.5 45.3,26.7 37.3,32.7 40.2,42.3 32,36.6 23.8,42.3 26.7,32.7 18.7,26.7 28.7,26.5" fill="#1b3a66" stroke="#0e2240" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
)

const DRAWN: Record<string, () => ReactElement> = { 'city-police': badge }

export function WorldIcon({ id, emoji }: { id: string; emoji: string }) {
  const drawn = DRAWN[id]
  return drawn ? drawn() : <>{emoji}</>
}
