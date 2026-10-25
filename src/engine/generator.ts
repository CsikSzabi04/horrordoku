import type { CellId, CharId, PuzzleRef } from '../shared/base'
import type { Clue, Difficulty, ObjectDef, Puzzle, PuzzleCharacter, PuzzleMode, Race } from '../shared/puzzle'
import { buildGrid, cellId, NEIGH4, parseCell } from './grid'
import type { Grid } from './grid'
import { classicCast } from './names'
import { clueHolds, unaryOk } from './rules'
import { solve } from './solver'
import { clueText } from './text'
import { BLOCKING, CAST, CATEGORIES, DEFAULT_BLOCK, DEFAULT_STAND, OBJECTS, ROOM_POOL, terrainOf } from './vocab'
import type { CastMember } from './vocab'

export type { CastMember }

export const GEN_VERSION = 1
const SIZE: Record<Difficulty, number> = { 1: 6, 2: 7, 3: 8, 4: 9, 5: 10 }
/** Hány gyanúsított nyomát gyengítjük (nehezebb = több gyenge nyom, több kizárás). */
const WEAKEN: Record<Difficulty, number> = { 1: 0, 2: 0.3, 3: 0.6, 4: 0.85, 5: 1 }
const CLASSIC_KINDS = ['on', 'onlyOn', 'in', 'beside', 'besideAny'] as const
const EXTRA_KINDS = ['notIn', 'besideChar', 'sameRoom', 'leftOf', 'corner'] as const
/** Változatos, de játékosbarát nyomfajták (égtájak, tagadások, kategóriák, sor-oszlop relációk…) — minden módban használhatók. */
export const VARIETY_KINDS = ['notIn', 'dir', 'notBeside', 'besideCat', 'notBesideCat', 'line', 'edge', 'roomCount', 'notSameRoom', 'diagonal', 'besideChar'] as const
export const MURDOKU_KINDS = [...CLASSIC_KINDS, 'col', 'row', 'northOf', 'southOf', 'roomAlone', 'aloneWith', ...VARIETY_KINDS, 'terrain', 'withGender', 'sameRoom'] as const
export type ClueKind = (typeof CLASSIC_KINDS)[number] | (typeof EXTRA_KINDS)[number] | (typeof MURDOKU_KINDS)[number] | 'distance' | 'lit' | 'dark'

/** A kézzel témázott (előre megírt) pályák paraméterei; a Random mód ezeket nem használja. */
export interface GenOpts {
  id?: PuzzleRef
  mode?: PuzzleMode
  world?: string
  chapter?: number
  title?: string
  story?: string
  size?: number
  rooms?: string[] // helyiségnevek (a `ROOM_IN`-ben szerepelniük kell)
  stand?: string[] // állható tárgytípusok
  block?: string[] // foglalt tárgytípusok
  cast?: CastMember[] // gyanúsítottak (legalább size−1)
  victim?: CastMember
  /** Csak a Murdoku nyomfajták (Klasszikus). */
  classicOnly?: boolean
  /** Tárgytípus → a helyiségek (név), ahová való (pl. tűzhely: Konyha). Ami nincs benne, az bárhol lehet. */
  objRooms?: Record<string, string[]>
  /** Murdoku-stílus: hétköznapi nevek (A, B, C… + V az áldozat), az áldozat kártyáján nincs helyiség, a Murdoku nyomfajtái. */
  murdoku?: boolean
  /** Esemény-világ szabálya (`Puzzle.worldRule`) és a hozzá tartozó adatok. */
  worldRule?: string
  kinds?: ClueKind[] // a nyomfajták felülbírálása
  extra?: { type: string; count: number; boundary?: boolean }[] // kötelező tárgyak (boundary: helyiség-határon, pl. ajtó)
  prefer?: { kind: ClueKind; count: number } // legalább ennyi szereplő kapjon ilyen fajta nyomot (ha így is egyértelmű)
  vacuum?: string[] // nyomásmentes helyiségek (név) — csak páncélos állhat bent
  armoredRatio?: number
  hidden?: number // ennyi szereplőnek legyen egy plusz, zárolt nyoma (Until Dawn)
  redact?: boolean // a rádió melletti nyomok egy szava ki van takarva (Silent Hill)
  rich?: number // 0–1: ennyi hányadának legyen „összetett” nyoma (égtáj, átlós, kapcsolat, tagadás…; nem sima tárgy / sor) — Esemény-pályák
}

const RACES: Race[] = ['human', 'vampire', 'ghost', 'demon', 'werewolf', 'witch', 'ghoul']
const FIRST = ['Vlad', 'Morrigan', 'Silas', 'Lilith', 'Ezekiel', 'Mira', 'Corvin', 'Selene', 'Damian', 'Isolde', 'Bram', 'Nyx', 'Cassian', 'Elara', 'Rowan']
const LAST = ['Ashvale', 'Grey', 'Vane', 'Thorne', 'Kóródi', 'Black', 'Hollow', 'Crane', 'Morrow', 'Wren', 'Dusk', 'Marsh']

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export const makeRef = (difficulty: Difficulty, seed: string): PuzzleRef => `gen:${GEN_VERSION}:${difficulty}:${seed}`

export function parseRef(ref: PuzzleRef): { difficulty: Difficulty; seed: string } | null {
  const m = /^gen:(\d+):([1-5]):([A-Za-z0-9]{1,16})$/.exec(ref)
  return m && Number(m[1]) === GEN_VERSION ? { difficulty: Number(m[2]) as Difficulty, seed: m[3] } : null
}

export const newSeed = (rnd: () => number = Math.random): string =>
  Array.from({ length: 6 }, () => '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(rnd() * 34)]).join('')

type Rnd = () => number
const pick = <T>(r: Rnd, a: readonly T[]): T => a[Math.floor(r() * a.length)]
function shuffle<T>(r: Rnd, a: readonly T[]): T[] {
  const o = [...a]
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[o[i], o[j]] = [o[j], o[i]]
  }
  return o
}

/** Összefüggő helyiségek: k véletlen magból, véletlen szomszéd-foglalással. */
function makeLayout(r: Rnd, n: number, k: number): string[][] {
  const g: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(-1))
  const cells = shuffle(r, Array.from({ length: n * n }, (_, i) => i))
  for (let i = 0; i < k; i++) g[Math.floor(cells[i] / n)][cells[i] % n] = i
  let free = n * n - k
  while (free > 0) {
    const frontier: [number, number, number][] = []
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (g[y][x] < 0)
          for (const [dy, dx] of NEIGH4) {
            const ny = y + dy
            const nx = x + dx
            if (ny >= 0 && nx >= 0 && ny < n && nx < n && g[ny][nx] >= 0) frontier.push([y, x, g[ny][nx]])
          }
    // kiegyensúlyozott helyiségek: a legkisebb(ek)hez tartozó szomszédos mezőkből sorsolunk
    const size = new Map<number, number>()
    for (const row of g) for (const id of row) if (id >= 0) size.set(id, (size.get(id) ?? 0) + 1)
    const smallest = Math.min(...frontier.map(([, , id]) => size.get(id) ?? 0))
    const [y, x, id] = pick(r, frontier.filter(([, , i]) => (size.get(i) ?? 0) <= smallest + 1))
    g[y][x] = id
    free--
  }
  return g.map((row) => row.map(String))
}

/** Egy nyom „gyengesége": hány mezőre igaz (több = gyengébb). A páros / globális nyomok közepesnek számítanak. */
const looseness = (g: Grid, cl: Clue): number => {
  if (cl.kind === 'onlyOn' || cl.kind === 'aloneWithKiller') return g.n
  if (cl.kind === 'besideChar' || cl.kind === 'sameRoom' || cl.kind === 'leftOf' || cl.kind === 'diagonal' || cl.kind === 'roomAlone' || cl.kind === 'liar' || cl.kind === 'northOf' || cl.kind === 'southOf' || cl.kind === 'aloneWith' || cl.kind === 'dir' || cl.kind === 'notSameRoom' || cl.kind === 'withGender' || cl.kind === 'roomCount') return (g.n * g.n) / 2
  let c = 0
  for (let y = 0; y < g.n; y++) for (let x = 0; x < g.n; x++) if (!g.blocked[y][x] && unaryOk(g, cl, y, x)) c++
  return c
}

function attempt(r: Rnd, seed: string, difficulty: Difficulty, opts: GenOpts): Puzzle | null {
  const n = opts.size ?? SIZE[difficulty]
  const BIG = n >= 9 ? 2_000_000 : 400_000 // a bizonyításhoz engedélyezett keresési csomópontok
  const k = opts.rooms?.length ?? Math.max(4, Math.min(8, Math.round(n * 0.75)))
  const roomIdx = makeLayout(r, n, k)
  const names0 = opts.rooms ?? shuffle(r, ROOM_POOL).slice(0, k).map((x) => x.name)
  const used = new Set<string>()
  const letters = names0.map((nm) => {
    const l = [...nm.toUpperCase(), ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find((c) => /[A-Z]/.test(c) && !used.has(c))!
    used.add(l)
    return l
  })
  const layout = roomIdx.map((row) => row.map((i) => letters[Number(i)]).join(''))
  const rooms = Object.fromEntries(names0.map((nm, i) => [letters[i], nm]))
  const vacuumLetters = (opts.vacuum ?? []).map((nm) => letters[names0.indexOf(nm)]!)
  // padló-osztályok a „vízben / mocsárban / fűben volt" nyomokhoz (csak a hétköznapi, mintás térképeken)
  const floorEntries = opts.murdoku ? names0.map((nm, i) => [letters[i]!, terrainOf(nm)] as const).filter((e): e is readonly [string, string] => !!e[1]) : []
  const floors = floorEntries.length ? Object.fromEntries(floorEntries) : undefined

  // megoldás: soronként egy oszlop
  const cols = shuffle(r, Array.from({ length: n }, (_, i) => i))
  const at: [number, number][] = cols.map((c, row) => [row, c])
  const sol = new Set(at.map(([y, x]) => y * n + x))

  // szereplők: az áldozat helyiségében pontosan egy másik szereplő legyen
  const roomOf = (y: number, x: number) => layout[y][x]
  const victimIdx = shuffle(r, Array.from({ length: n }, (_, i) => i)).find((i) => at.filter(([y, x]) => roomOf(y, x) === roomOf(...at[i])).length === 2)
  if (victimIdx === undefined) return null
  const victimRoom = roomOf(...at[victimIdx])

  // tárgyak
  const taken = new Set<number>()
  const byType = new Map<string, CellId[]>()
  const put = (type: string, y: number, x: number) => {
    taken.add(y * n + x)
    const arr = byType.get(type) ?? []
    arr.push(cellId(y, x))
    byType.set(type, arr)
  }
  const standTypes = opts.stand ?? shuffle(r, DEFAULT_STAND).slice(0, 3 + Math.floor(r() * 2))
  const okIn = (t: string, y: number, x: number) => !opts.objRooms?.[t] || opts.objRooms[t]!.includes(rooms[layout[y]![x]!]!)
  for (const [y, x] of shuffle(r, at))
    if (r() < (opts.murdoku ? 0.55 : 0.65)) {
      const opt = standTypes.filter((t) => okIn(t, y, x))
      if (opt.length) put(pick(r, opt), y, x)
    }
  const others = shuffle(r, Array.from({ length: n * n }, (_, i) => i)).filter((i) => !sol.has(i))
  const border = (i: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dy, dx]) => layout[Math.floor(i / n) + dy!]?.[(i % n) + dx!] !== undefined && layout[Math.floor(i / n) + dy!]![(i % n) + dx!] !== layout[Math.floor(i / n)]![i % n])
  const take = (pred: (i: number) => boolean = () => true): number | null => {
    const i = others.findIndex((c) => !taken.has(c) && pred(c))
    return i < 0 ? null : others[i]!
  }
  for (const ex of opts.extra ?? [])
    for (let k2 = 0; k2 < ex.count; k2++) {
      const c = take(ex.boundary ? border : undefined)
      if (c === null) return null
      put(ex.type, Math.floor(c / n), c % n)
    }
  const nBlock = Math.round(n * 0.7)
  const blockTypes = opts.block ?? shuffle(r, DEFAULT_BLOCK).slice(0, 4)
  const placeAny = (types: string[]) => {
    for (const t of shuffle(r, types)) {
      const c = take((i) => okIn(t, Math.floor(i / n), i % n))
      if (c !== null) return put(t, Math.floor(c / n), c % n)
    }
  }
  for (let i = 0; i < nBlock; i++) placeAny(blockTypes)
  for (let i = 0; i < Math.round(n * 0.4); i++) placeAny(standTypes)
  const objects: ObjectDef[] = [...byType].map(([type, cells]) => ({
    type,
    at: cells.length === 1 ? cells[0] : cells,
    ...(BLOCKING.includes(type) ? { blocking: true } : {}),
  }))

  // szereplők
  const names = new Set<string>()
  const murd = opts.murdoku ? classicCast(r, n) : null
  const cast = murd ? [...murd.suspects] : shuffle(r, opts.cast ?? CAST)
  const characters: PuzzleCharacter[] = at.map((_, i) => {
    const victim = i === victimIdx
    const given = victim ? (murd?.victim ?? opts.victim ?? cast.shift()) : cast.shift()
    if (given) names.add(given.name)
    const m = given ?? { id: `c${i + 1}`, name: `${pick(r, FIRST)} ${pick(r, LAST)}`, race: pick(r, RACES) }
    const armored = vacuumLetters.length > 0 && (vacuumLetters.includes(roomOf(...at[i])) || victim || r() < (opts.armoredRatio ?? 0.4))
    return { id: m.id, name: m.name, race: m.race, ...(m.gender ? { gender: m.gender } : {}), ...(victim ? { victim: true } : {}), ...(armored ? { armored: true } : {}), clues: [], clueText: [] }
  })
  const solution: Record<CharId, CellId> = Object.fromEntries(characters.map((c, i) => [c.id, cellId(...at[i])]))
  const murderer = characters.find((c, i) => i !== victimIdx && roomOf(...at[i]) === victimRoom)!.id

  const p: Puzzle = {
    v: 1, id: opts.id ?? makeRef(difficulty, seed), mode: opts.mode ?? 'generated', world: opts.world ?? 'hollowmere', title: opts.title ?? `Véletlen ügy ${seed}`,
    ...(opts.chapter ? { chapter: opts.chapter } : {}), ...(opts.story ? { story: opts.story } : {}), size: n, difficulty,
    rooms, layout, objects, characters, activePowers: [], solution, murderer, rev: 1,
    ...(opts.worldRule ? { worldRule: opts.worldRule } : {}), ...(vacuumLetters.length ? { vacuumRooms: vacuumLetters } : {}), ...(floors ? { floors } : {}),
  }
  const g = buildGrid(p)
  const pos = new Map(characters.map((c, i) => [c.id, at[i]]))
  const victim = characters[victimIdx]
  victim.clues = [opts.murdoku ? { kind: 'aloneWithKiller' } : { kind: 'aloneWithKiller', room: victimRoom }]

  const kinds: readonly ClueKind[] = opts.kinds ?? (opts.murdoku ? MURDOKU_KINDS : difficulty >= 2 && !opts.classicOnly ? [...CLASSIC_KINDS, ...EXTRA_KINDS, ...VARIETY_KINDS] : CLASSIC_KINDS)
  const types = [...byType.keys()]
  const candidates = (me: PuzzleCharacter): Clue[] => {
    const [y, x] = pos.get(me.id)!
    const out: Clue[] = []
    const rl = roomOf(y, x)
    for (const t of g.objs[y][x]) out.push({ kind: 'on', object: t }, { kind: 'on', object: t, room: rl }, { kind: 'onlyOn', object: t })
    out.push({ kind: 'in', room: rl })
    if (kinds.includes('col')) out.push({ kind: 'col', n: x + 1 })
    if (kinds.includes('row')) out.push({ kind: 'row', n: y + 1 })
    if (kinds.includes('roomAlone')) out.push({ kind: 'roomAlone' })
    for (const t of types) out.push({ kind: 'beside', object: t })
    for (const a of types) for (const b of types) if (a < b) out.push({ kind: 'besideAny', objects: [a, b] })
    if (kinds.includes('notIn')) for (const l of Object.keys(rooms)) out.push({ kind: 'notIn', room: l })
    if (kinds.includes('corner')) out.push({ kind: 'corner' })
    if (kinds.includes('lit')) out.push({ kind: 'lit' }, { kind: 'dark' })
    if (kinds.includes('notBeside')) for (const t of types) out.push({ kind: 'notBeside', object: t })
    for (const [cat, c2] of Object.entries(CATEGORIES))
      if (c2.types.some((t) => types.includes(t))) {
        if (kinds.includes('besideCat')) out.push({ kind: 'besideCat', cat })
        if (kinds.includes('notBesideCat')) out.push({ kind: 'notBesideCat', cat })
      }
    if (kinds.includes('terrain')) for (const cls of new Set(Object.values(floors ?? {}))) out.push({ kind: 'terrain', style: cls }, { kind: 'terrain', style: cls, not: true })
    if (kinds.includes('line')) for (const axis of ['row', 'col'] as const) for (const op of ['lt', 'gt', 'ne'] as const) for (let k2 = 1; k2 <= n; k2++) out.push({ kind: 'line', axis, op, n: k2 })
    if (kinds.includes('edge')) out.push({ kind: 'edge' }, { kind: 'edge', inner: true })
    if (kinds.includes('roomCount')) for (const k2 of [2, 3, 4, 5, 6]) out.push({ kind: 'roomCount', n: k2 })
    if (kinds.includes('withGender')) out.push({ kind: 'withGender', gender: 'm' }, { kind: 'withGender', gender: 'f' })
    if (kinds.includes('distance'))
      for (const t of types.filter((x) => OBJECTS[x]?.abl))
        for (let d = 1; d < 2 * n; d++)
          if (unaryOk(g, { kind: 'distance', fromObject: t, cells: d }, y, x)) {
            out.push({ kind: 'distance', fromObject: t, cells: d })
            break
          }
    for (const o of characters)
      if (o.id !== me.id) {
        if (kinds.includes('northOf')) for (const k of [1, 2, 3]) out.push({ kind: 'northOf', of: o.id, rows: k }, { kind: 'southOf', of: o.id, rows: k })
        if (kinds.includes('aloneWith')) out.push({ kind: 'aloneWith', with: o.id })
        if (kinds.includes('dir')) for (const d2 of ['N', 'E', 'S', 'W'] as const) out.push({ kind: 'dir', of: o.id, dir: d2 })
        if (kinds.includes('notSameRoom')) out.push({ kind: 'notSameRoom', with: o.id })
        if (kinds.includes('diagonal')) out.push({ kind: 'diagonal', of: o.id })
        if (kinds.includes('besideChar')) out.push({ kind: 'besideChar', char: o.id })
        if (kinds.includes('sameRoom')) out.push({ kind: 'sameRoom', with: o.id })
        if (kinds.includes('leftOf')) out.push({ kind: 'leftOf', of: o.id })
      }
    return out.filter((cl) => kinds.includes(cl.kind as ClueKind) && clueHolds(g, characters, pos, me, cl))
  }

  /** Megoldásszám `cap`-ig; ha a keret kevés a teljes kereséshez, `cap` (= „sok / nem bizonyított"). */
  const count = (cap: number, budget = 20_000) => {
    const rr = solve(p, cap, budget)
    return rr.truncated ? cap : rr.solutions.length
  }
  const suspects = characters.filter((c) => !c.victim)
  const cand = new Map(suspects.map((c) => [c.id, candidates(c)]))
  // 1. fázis: mindenkinek a legszűkebb (legkevesebb mezőre igaz) nyom — ettől rendszerint már egyértelmű
  for (const s of suspects) {
    const memo = new Map<Clue, number>()
    const loose = (cl: Clue) => memo.get(cl) ?? (memo.set(cl, looseness(g, cl)), memo.get(cl)!)
    const sorted = shuffle(r, cand.get(s.id)!).sort((a, b) => loose(a) - loose(b))
    // Murdoku-stílusban a legszűkebbek közül sorsolunk (változatosabb nyomfajták), egyébként a legszűkebb
    const pool = opts.murdoku ? sorted.filter((cl) => loose(cl) <= Math.max(loose(sorted[0]!), 1) * 2) : [sorted[0]!]
    const chosen = pool[Math.floor(r() * pool.length)]!
    cand.set(s.id, [...sorted].reverse())
    s.clues = [chosen]
  }
  // ellenpélda-vezérelt javítás: ha több megoldás van, egy eltérő szereplő nyomát a legszűkebb olyanra cseréljük,
  // ami az alternatívát kizárja ÉS az eddig talált összes korábbit is kizárva hagyja — addig, amíg egyértelmű nem lesz
  type Pos2 = Map<CharId, [number, number]>
  const alts: Pos2[] = []
  const kills = (altPos: Pos2) => characters.some((c) => c.clues.length > 0 && !clueHolds(g, characters, altPos, c, c.clues[0]!))
  const refine = (): boolean => {
    for (let it = 0; it < 120; it++) {
      const rr = solve(p, 2, BIG)
      if (rr.truncated || rr.solutions.length === 0) return false
      if (rr.solutions.length === 1) return true
      const alt = rr.solutions.find((sol) => characters.some((c) => sol[c.id] !== solution[c.id]))!
      const altPos: Pos2 = new Map(characters.map((c) => [c.id, ((q) => [q.r, q.c] as [number, number])(parseCell(alt[c.id]!))]))
      alts.push(altPos)
      const options: { s: PuzzleCharacter; cl: Clue; l: number }[] = []
      for (const s2 of suspects) {
        if (alt[s2.id] === solution[s2.id]) continue
        for (const cl of cand.get(s2.id)!) if (cl !== s2.clues[0] && !clueHolds(g, characters, altPos, s2, cl)) options.push({ s: s2, cl, l: looseness(g, cl) })
      }
      options.sort((x, y) => x.l - y.l)
      let done = false
      for (const o2 of options.slice(0, 800)) {
        const keep = o2.s.clues
        o2.s.clues = [o2.cl]
        if (alts.every(kills)) {
          done = true
          break
        }
        o2.s.clues = keep
      }
      if (!done) return false
    }
    return false
  }
  if (count(2, BIG) !== 1 && !refine()) return null
  // kedvelt nyomfajta (pl. mozgásérzékelő-távolság, „Birtokolt" = sötét mező): amelyiknél így is egyértelmű, azt használjuk
  const pinned = new Set<string>()
  if (opts.prefer)
    for (const s2 of shuffle(r, suspects)) {
      if (pinned.size >= opts.prefer.count) break
      const pool = cand.get(s2.id)!.filter((cl) => cl.kind === opts.prefer!.kind)
      if (pool.length === 0) continue
      const keep = s2.clues
      s2.clues = [pool[pool.length - 1]!]
      if (count(2, 100_000) === 1) pinned.add(s2.id)
      else s2.clues = keep
    }
  // változatosság: a megszokott fajták (tárgyon / tárgy mellett / oszlop / sor) egy részét ötletesebbre cseréljük (égtáj, tagadás, kategória,
  // padló, sor-oszlop reláció, átlós…), ha így is egyértelmű marad — a magasabb szinteken többet
  const NOVEL = new Set<string>(['dir', 'notBeside', 'notIn', 'besideCat', 'notBesideCat', 'terrain', 'line', 'edge', 'roomCount', 'notSameRoom', 'diagonal', 'withGender', 'northOf', 'southOf', 'aloneWith', 'besideChar', 'sameRoom'])
  const COMMON = new Set<string>(['on', 'col', 'row', 'beside', 'besideAny', 'in'])
  const frac = opts.murdoku ? [0.25, 0.4, 0.55, 0.65, 0.75][difficulty - 1]! : 0.25
  for (const s2 of shuffle(r, suspects.filter((x) => !pinned.has(x.id) && COMMON.has(x.clues[0]!.kind))).slice(0, Math.round(suspects.length * frac))) {
    const keep = s2.clues
    // fajtánként egyet sorsolunk (körforgásban), hogy a sok „line" jelölt ne nyomja el a ritkább fajtákat
    const byKind = new Map<string, Clue[]>()
    for (const c2 of shuffle(r, cand.get(s2.id)!.filter((c3) => NOVEL.has(c3.kind)))) byKind.set(c2.kind, [...(byKind.get(c2.kind) ?? []), c2])
    const rounds = shuffle(r, [...byKind.values()]).flatMap((list) => list.slice(0, 2))
    for (const cl of shuffle(r, rounds).slice(0, 14)) {
      s2.clues = [cl]
      if (count(2, 100_000) === 1) break
      s2.clues = keep
    }
  }
  // 2. fázis: gyengítés — a leglazább nyom, ami mellett még egyértelmű (ettől lesz kizárásos, „szép" a pálya)
  // összetett nyomok (Esemény): a sima „tárgyon / mellett / sor” nyomok egy részét összetettebbre cseréljük, ha így is egyértelmű
  const RICHK = new Set<string>([...NOVEL, 'leftOf'])
  RICHK.delete('line')
  const isRich = (x: PuzzleCharacter) => RICHK.has(x.clues[0]!.kind)
  const enrich = () => {
    const want = Math.ceil(suspects.length * (opts.rich ?? 0))
    // két kör: egy csere más szereplőnek is megnyithatja a lehetőséget
    for (let round = 0; round < 2; round++)
      for (const s2 of shuffle(r, suspects.filter((x) => !pinned.has(x.id) && !isRich(x)))) {
        if (suspects.filter(isRich).length >= want) return
        const keep = s2.clues
        const byKind = new Map<string, Clue[]>()
        for (const c2 of shuffle(r, cand.get(s2.id)!.filter((c3) => RICHK.has(c3.kind)))) byKind.set(c2.kind, [...(byKind.get(c2.kind) ?? []), c2])
        const tries = shuffle(r, [...byKind.values()].flatMap((list) => list.slice(0, 4)))
        for (const cl of tries.slice(0, 48)) {
          s2.clues = [cl]
          if (count(2, 800_000) === 1) break
          s2.clues = keep
        }
      }
  }
  if (opts.rich) enrich() // a gyengítés előtt: így a gyengítés már csak a maradék (sima) nyomokat lazítja
  const nWeak = Math.round(suspects.length * WEAKEN[difficulty])
  for (const s of shuffle(r, suspects.filter((x) => !pinned.has(x.id) && !(opts.rich && isRich(x)))).slice(0, nWeak)) {
    const keep = s.clues
    const loose = cand.get(s.id)!.filter((cl) => looseness(g, cl) > looseness(g, keep[0]))
    // a leglazább jelöltek közül sorsolunk (így változatosabb a nyomfajta), nem mindig ugyanaz az első
    for (const cl of shuffle(r, loose.slice(0, 24)).slice(0, 14)) {
      s.clues = [cl]
      if (count(2, 60_000) === 1) break
      s.clues = keep
    }
  }
  if (opts.rich) enrich() // gyengítés után még egyszer: ami addig nem sikerült
  // zárolt plusz nyom (Until Dawn): igaz, tehát az egyértelműséget nem rontja
  for (const s2 of shuffle(r, suspects).slice(0, opts.hidden ?? 0)) {
    const extra = cand.get(s2.id)!.filter((cl) => cl.kind !== s2.clues[0]!.kind)
    if (extra.length === 0) continue
    s2.clues = [...s2.clues, extra[extra.length - 1]!]
    s2.hidden = [1]
  }
  for (const c of characters) c.clueText = c.clues.map((cl) => clueText(cl, p))
  if (opts.redact) {
    // Silent Hill: a rádió melletti szereplők tárgyas nyomában a tárgy neve ki van takarva (a helyiség látszik)
    const nearRadio = (id: string) => {
      const [y, x] = pos.get(id)!
      return [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => g.objs[y + dy]?.[x + dx]?.includes('radio')))
    }
    const ok = suspects.filter((c) => c.clues[0]!.kind === 'on' && (c.clues[0] as { room?: string }).room)
    const order = [...ok.filter((x) => nearRadio(x.id)), ...ok.filter((x) => !nearRadio(x.id))]
    const redacted: typeof ok = []
    const visible = (cs: Clue[]): Clue[] => [{ kind: 'in', room: (cs[0] as { room: string }).room }]
    for (const c of order) {
      if (redacted.length >= Math.max(2, ok.filter((x) => nearRadio(x.id)).length)) break
      // csak akkor takarunk ki, ha a LÁTHATÓ információból (csak a helyiség) is egyértelmű marad a pálya — az eddig kitakartakkal együtt
      const keep = c.clues
      const saved = redacted.map((x) => x.clues)
      for (const x of redacted) x.clues = visible(x.clues)
      c.clues = visible(keep)
      const stillUnique = count(2, BIG) === 1
      c.clues = keep
      redacted.forEach((x, i) => (x.clues = saved[i]!))
      if (!stillUnique) continue
      const t = (keep[0] as { object: string }).object
      c.clueText[0] = c.clueText[0]!.replace(OBJECTS[t]?.on ?? t, '███')
      redacted.push(c)
    }
  }
  return count(2, BIG) === 1 ? p : null
}

/** Seedelt, determinisztikus generátor: ugyanaz a (seed, nehézség) mindig ugyanazt a — pontosan 1 megoldású — pályát adja. */
export function generate(seed: string, difficulty: Difficulty, opts: GenOpts = {}): Puzzle {
  const r = mulberry32(hashSeed(`${GEN_VERSION}:${difficulty}:${seed}`))
  for (let i = 0; i < 80; i++) {
    const p = attempt(r, seed, difficulty, opts)
    if (p) return p
  }
  throw new Error(`generate: nincs érvényes pálya (${makeRef(difficulty, seed)})`)
}

export function generateFromRef(ref: PuzzleRef): Puzzle | null {
  const x = parseRef(ref)
  return x ? generate(x.seed, x.difficulty) : null
}

/** Rövid, megosztható ügykód: `<nehézség>-<seed>` (pl. `3-7F3K92`). */
export const codeOf = (ref: PuzzleRef): string | null => {
  const x = parseRef(ref)
  return x ? `${x.difficulty}-${x.seed}` : null
}

/** Ügykód vagy teljes `gen:` ref → ref. A seed kis/nagybetűre nem érzékeny. */
export function refFromCode(input: string): PuzzleRef | null {
  const t = input.trim()
  if (/^gen:/i.test(t)) return parseRef(t.replace(/^gen/i, 'gen')) ? t : null
  const m = /^([1-5])\s*[-:·]?\s*([A-Za-z0-9]{3,16})$/.exec(t)
  return m ? makeRef(Number(m[1]) as Difficulty, m[2].toUpperCase()) : null
}

/** Napi ügy: a dátum a seed (mindenkinek ugyanaz), a nehézség a hét napjától függ (hétfő könnyű … péntek nehéz). */
export function dailyRef(d: Date = new Date()): PuzzleRef {
  const day = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  const seed = `D${day.toISOString().slice(0, 10).replaceAll('-', '')}`
  const diff = ([2, 1, 2, 3, 4, 5, 3] as const)[day.getUTCDay()]
  return makeRef(diff as Difficulty, seed)
}

export const isDailyRef = (ref: PuzzleRef): boolean => /^gen:\d+:[1-5]:D\d{8}$/.test(ref)
