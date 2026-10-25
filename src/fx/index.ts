import { getStorage } from '../storage'
import type { Settings } from '../shared/storage'
import { createAudio } from './audio'
import { showFake, showScare } from './jumpscare'
import { scarePlan, variantsFor } from './mix'
import './fx.css'

let settings: Settings = {
  v: 1, language: 'hu', theme: 'dark', audio: { music: 0.6, sfx: 0.8, volumeCap: 0.8 }, jumpscare: 'off', photosensitive: false,
  screenShake: true, streamerMode: false, invisible: false, updatedAt: new Date(0).toISOString(),
}
const refresh = () => void getStorage().getSettings().then((s) => { settings = s })
refresh()
getStorage().onChange((e) => e.type === 'settings' && refresh())

/** A Beállításokat követő, az egész appban közös hang-motor. */
export const audio = createAudio(() => settings)

/**
 * Rossz beküldés utáni jumpscare (GDD 12): véletlen 0,5–6 mp késleltetés, kamu/arany változat, a beállítások szerint.
 * `null`, ha ki van kapcsolva. A visszaadott függvény megszakítja a függőben lévő jelenetet.
 */
export function scheduleScare(world: string, onDone?: () => void): (() => void) | null {
  const variants = variantsFor(world)
  const plan = scarePlan(
    { mode: settings.jumpscare, photosensitive: settings.photosensitive, screenShake: settings.screenShake, streamerMode: settings.streamerMode, variants: variants.length },
    Math.random,
  )
  if (!plan) return null
  const timers: ReturnType<typeof setTimeout>[] = []
  if (plan.cue && plan.delayMs > 1000) timers.push(setTimeout(() => audio.sfx('cue'), plan.delayMs - 1000))
  timers.push(
    setTimeout(() => {
      if (plan.fake) showFake()
      else {
        showScare(variants[plan.variant]!, plan)
        if (plan.sound) audio.sfx('stinger', plan.golden ? 1 : plan.loudness)
      }
      onDone?.()
    }, plan.delayMs),
  )
  return () => timers.forEach(clearTimeout)
}
