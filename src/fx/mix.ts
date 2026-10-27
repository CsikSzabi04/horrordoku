import type { JumpscareMode } from '../shared/storage'
import { pick } from '../i18n/lang'

/** A jumpscare tiszta (hang nélküli) logikája: mikor, mekkora, melyik változat. A kimenetet az `audio` és a `jumpscare` játssza le. */
export const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0)

/** A végső hangerő: a kért érték, de SOSEM a hangerő-plafon felett (GDD 12.4). */
export const level = (requested: number, cap: number): number => clamp01(Math.min(clamp01(requested), clamp01(cap)))

export interface ScarePlan {
  image: boolean
  sound: boolean
  flash: boolean
  shake: boolean
  /** A hang relatív hangereje (0..1) a hangeffekt-hangerőhöz képest; a plafont a `level` érvényesíti. */
  loudness: number
  delayMs: number // 500–6000
  /** Kamu jumpscare: feszültséget épít, de nem üt. */
  fake: boolean
  /** Arany (ritka): hosszabb, különleges. */
  golden: boolean
  variant: number
  /** Streamer mód: 1 mp-es halk jelzés az ütés előtt. */
  cue: boolean
}

export interface ScareInput {
  mode: JumpscareMode
  photosensitive: boolean
  screenShake: boolean
  streamerMode: boolean
  variants: number // a világ változatainak száma (3–5)
}

export const FAKE_CHANCE = 0.12
export const GOLD_CHANCE = 0.05

export function scarePlan(inp: ScareInput, rnd: () => number): ScarePlan | null {
  if (inp.mode === 'off') return null
  const soft = inp.mode === 'soft'
  const calm = inp.photosensitive || soft
  const golden = rnd() < GOLD_CHANCE
  const fake = !golden && inp.mode === 'on' && rnd() < FAKE_CHANCE
  return {
    image: inp.mode !== 'soundOnly',
    sound: inp.mode !== 'imageOnly',
    flash: !calm && inp.mode !== 'soundOnly',
    shake: !calm && inp.screenShake,
    loudness: soft ? 0.35 : inp.photosensitive ? 0.6 : 1,
    delayMs: Math.round(500 + rnd() * 5500),
    fake,
    golden,
    variant: Math.floor(rnd() * Math.max(1, inp.variants)),
    cue: inp.streamerMode,
  }
}

export interface Variant {
  emoji: string
  dir: 'bottom' | 'left' | 'right' | 'center' | 'grid'
  /** A változat neve az aktuális nyelven (olvasáskor számolódik; a képernyőn nem jelenik meg, csak a megnevezéshez kell). */
  readonly caption: string
}
const V = (emoji: string, dir: Variant['dir'], caption: string, captionEn: string = caption): Variant => ({
  emoji,
  dir,
  get caption() {
    return pick(caption, captionEn)
  },
})
/** Világonként 3–5 változat. A Hollowmere (Random mód) a saját lényeit használja; a többi világ az `event` bővítésekor jön. */
export const SCARES: Record<string, Variant[]> = {
  hollowmere: [V('🦇', 'bottom', 'Vlad'), V('👁️', 'center', 'Lilith'), V('👻', 'left', 'Silas'), V('🐺', 'right', 'Ezekiel'), V('🌒', 'grid', 'Morrigan')],
  fnaf: [V('🐻', 'center', 'Animatronika', 'Animatronic'), V('👁️', 'bottom', 'Szemek', 'Eyes'), V('🎪', 'grid', 'Függöny', 'Curtain')],
  'poppy-playtime': [V('🧸', 'bottom', 'Plüss', 'Plush'), V('🎁', 'center', 'Játékdoboz', 'Toy box'), V('🖐️', 'right', 'Kéz', 'Hand')],
}
export const variantsFor = (world: string): Variant[] => SCARES[world] ?? SCARES.hollowmere!

/** A jumpscare csak ezekben a módokban élhet (a Klasszikusban és a bónuszban SOHA). */
export const scareAllowed = (mode: string): boolean => mode === 'event' || mode === 'generated' || mode === 'community'
