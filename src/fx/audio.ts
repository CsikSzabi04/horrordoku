import type { Settings } from '../shared/storage'
import { level } from './mix'

const MUTE_KEY = 'nd_mute'
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
})()
/** A játékképernyő hang-kapcsolója (per-böngésző kényelmi érték, nem a Beállítások). */
export const isMuted = (): boolean => muted
export function setMuted(m: boolean): void {
  muted = m
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0')
  } catch {
    /* tiltott tároló: a némítás csak az oldal életére érvényes */
  }
}

export type Sfx = 'select' | 'place' | 'mark' | 'erase' | 'undo' | 'hint' | 'win' | 'error' | 'stinger' | 'cue'

type Ctx = AudioContext
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

/**
 * Procedurális hangeffektek (nincs hangfájl, NINCS háttérzene) WebAudio-val.
 * Minden kimenet a hangerő-plafonon (`level`) megy át; a böngésző-szabály miatt csak felhasználói gesztus után szólal meg.
 */
export function createAudio(getSettings: () => Settings) {
  let ctx: Ctx | null = null

  const ensure = (): Ctx | null => {
    if (typeof window === 'undefined') return null
    if (!ctx) {
      const C = window.AudioContext ?? window.webkitAudioContext
      if (!C) return null
      ctx = new C()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }
  const vol = (kind: 'music' | 'sfx', rel = 1): number => {
    if (muted) return 0
    const a = getSettings().audio
    return level(a[kind] * rel, a.volumeCap)
  }

  const tone = (c: Ctx, f0: number, dur: number, type: OscillatorType, gain: number, f1 = f0, delay = 0) => {
    const o = c.createOscillator()
    const g = c.createGain()
    const t = c.currentTime + delay
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + dur + 0.05)
  }
  const noise = (c: Ctx, dur: number, filter: BiquadFilterType, freq: number, gain: number) => {
    const len = Math.max(1, Math.floor(c.sampleRate * dur))
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const s = c.createBufferSource()
    const f = c.createBiquadFilter()
    const g = c.createGain()
    f.type = filter
    f.frequency.value = freq
    g.gain.setValueAtTime(gain, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
    s.buffer = buf
    s.connect(f).connect(g).connect(c.destination)
    s.start()
  }

  return {
    /** Gesztus után hívandó (első kattintás): feloldja a hangot. */
    unlock: () => void ensure(),
    sfx(name: Sfx, loudness = 1) {
      const c = ensure()
      const v = vol('sfx', loudness)
      if (!c || v <= 0) return
      switch (name) {
        case 'select': return noise(c, 0.09, 'bandpass', 2400, 0.22 * v)
        case 'place': return (tone(c, 110, 0.18, 'sine', 0.5 * v, 42), noise(c, 0.05, 'lowpass', 400, 0.3 * v))
        case 'mark': return noise(c, 0.07, 'highpass', 3000, 0.18 * v)
        case 'erase': return noise(c, 0.25, 'bandpass', 900, 0.15 * v)
        case 'undo': return tone(c, 520, 0.18, 'triangle', 0.18 * v, 180)
        case 'hint': return tone(c, 330, 0.5, 'sine', 0.25 * v, 880)
        case 'win': return [440, 660, 880, 1320].forEach((f, i) => tone(c, f, 1.8, 'sine', (0.22 / (i + 1)) * v, f * 0.99, i * 0.02))
        case 'error': return // szándékosan néma: a hibát a keret rázkódása / a karikák mutatják
        case 'cue': return tone(c, 880, 0.12, 'sine', 0.08 * v)
        case 'stinger':
          noise(c, 0.7, 'highpass', 1500, 0.9 * v)
          tone(c, 880, 0.6, 'sawtooth', 0.7 * v, 1760)
          tone(c, 932, 0.6, 'sawtooth', 0.7 * v, 1500)
          tone(c, 60, 0.8, 'square', 0.6 * v, 30)
      }
    },
  }
}
export type AudioEngine = ReturnType<typeof createAudio>
