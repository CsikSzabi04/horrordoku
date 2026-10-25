import { useEffect, useMemo, useRef } from 'react'
import type { Puzzle } from '../shared/puzzle'
import { audio, scheduleScare } from '.'
import { scareAllowed } from './mix'

/** A játékképernyő hang- és jelenet-kapcsolata: hangeffektek, rossz beküldésre jumpscare. Háttérzene nincs. */
export function useFx(puzzle: Puzzle, _placed: number) {
  const cancel = useRef<(() => void) | null>(null)
  useEffect(() => {
    const unlock = () => audio.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      cancel.current?.()
    }
  }, [puzzle.id])
  return useMemo(
    () => ({
      sfx: audio.sfx,
      win() {
        audio.sfx('win')
      },
      wrong() {
        if (!scareAllowed(puzzle.mode)) return
        cancel.current?.()
        cancel.current = scheduleScare(puzzle.world, () => undefined) // jumpscare csak ha van és be van kapcsolva
      },
    }),
    [puzzle],
  )
}
