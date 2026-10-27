import { charEmoji, RACE_COLOR } from '../game/look'
import type { PuzzleCharacter } from '../shared/puzzle'
import { EventPortrait, hasLook } from './EventPortrait'

/** Saját kép (png / jpg / webp / svg) a `src/assets/portraits/<karakter-id>.<kiterjesztés>` helyről — ez elsőbbséget kap a rajzolt portréval szemben. */
const PHOTOS = new Map(
  Object.entries(import.meta.glob('../assets/portraits/*.{png,jpg,jpeg,webp,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>).map(([path, url]) => [
    path.slice(path.lastIndexOf('/') + 1).replace(/.[^.]+$/, ''),
    url,
  ]),
)

const SKIN = ['#f3cfae', '#e6b48a', '#c98d66', '#8f5b3d', '#f7dcc2', '#6d4529']
const HAIR = ['#2a1c12', '#5b3a1f', '#a4562c', '#d9b46a', '#161616', '#8f8f8f', '#c0402b', '#e9dcb4']
const BG = ['#a9d9e9', '#c9b8e3', '#a7e4c1', '#f5b9a9', '#f8da8e', '#b9caf1', '#e9b5c9', '#cbe5a9']
const SHIRT = ['#3b6c36', '#4a70a6', '#b6537b', '#c9a228', '#6e4d7e', '#d9544f', '#2f9084', '#585858']

const hash = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
const at = <T,>(arr: T[], h: number, shift: number): T => arr[((h >>> shift) & 0xffff) % arr.length]!

/** A frizura-választék nemenként: a női kártyán sosem jelenhet meg férfias (rövid / kopasz / sapkás) fej, és fordítva. */
export const HAIRSTYLES = { f: ['long', 'bob', 'bun', 'pony', 'wavy'], m: ['short', 'side', 'bald', 'curly', 'cap'] } as const
export type AvatarStyle = (typeof HAIRSTYLES)['f' | 'm'][number]

/** A Klasszikus szereplő arcképének pólószíne (a térképen a kezdőbetűje is ezt kapja). */
export const avatarColor = (id: string): string => at(SHIRT, hash(id), 20)

/** Egyszerű, lapos, arc nélküli arckép (mint a murdoku.com-on): bőrszín, haj, szakáll, szemüveg, póló — a névből determinisztikus. */
export function Avatar({ id, gender, className }: { id: string; gender?: 'm' | 'f'; className?: string }) {
  const h = hash(id)
  const skin = at(SKIN, h, 0)
  const hair = at(HAIR, h, 4)
  const f = gender === 'f' || (gender === undefined && h % 2 === 0)
  const style: AvatarStyle = at<AvatarStyle>([...HAIRSTYLES[f ? 'f' : 'm']], h, 8)
  const earrings = f && (h >>> 14) % 3 !== 0 // a női arcon gyakran fülbevaló is van — ez is segít a felismerésben
  const beard = !f && style !== 'bald' && (h >>> 12) % 3 === 0
  const bald = !f && style === 'bald'
  const glasses = (h >>> 16) % 4 === 0
  const shirt = at(SHIRT, h, 20)
  return (
    <svg className={className} viewBox="0 0 100 120" role="img" aria-label={id}>
      <rect width="100" height="120" fill={at(BG, h, 24)} />
      {style === 'long' && <path d="M25 52 Q20 16 50 15 Q80 16 75 52 L78 104 L22 104Z" fill={hair} />}
      {style === 'bob' && <path d="M25 54 Q20 16 50 15 Q80 16 75 54 L75 70 Q50 76 25 70Z" fill={hair} />}
      {style === 'pony' && <circle cx="76" cy="46" r="9" fill={hair} />}
      {style === 'wavy' &&
        [50, 63, 76, 89].flatMap((y, i) => [
          <circle key={`l${y}`} cx={24 - (i % 2) * 2} cy={y} r="10" fill={hair} />,
          <circle key={`r${y}`} cx={76 + (i % 2) * 2} cy={y} r="10" fill={hair} />,
        ])}
      <path d={f ? 'M15 120 Q15 90 50 86 Q85 90 85 120Z' : 'M6 120 Q6 88 50 84 Q94 88 94 120Z'} fill={shirt} />
      <path d={f ? 'M41 87 L50 98 L59 87' : 'M40 86 L50 100 L60 86'} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="2" />
      <rect x={f ? 43 : 41} y="68" width={f ? 14 : 18} height="20" rx="4" fill={skin} />
      <rect x="42" y="68" width="16" height="9" fill="rgba(0,0,0,.12)" />
      <circle cx="29" cy="54" r="5" fill={skin} />
      <circle cx="71" cy="54" r="5" fill={skin} />
      <ellipse cx="50" cy="52" rx={f ? 20.5 : 22} ry="26" fill={skin} />
      {earrings && (
        <g fill="#e8c64a" stroke="rgba(0,0,0,.35)" strokeWidth="0.8">
          <circle cx="28.5" cy="62" r="2.6" />
          <circle cx="71.5" cy="62" r="2.6" />
        </g>
      )}
      {beard && <path d="M29 56 Q31 80 50 82 Q69 80 71 56 Q62 68 50 68 Q38 68 29 56Z" fill={hair} />}
      {!bald && style !== 'curly' && style !== 'wavy' && style !== 'cap' && <path d="M27 48 Q24 20 50 20 Q76 20 73 48 Q64 34 50 34 Q36 34 27 48Z" fill={hair} />}
      {(style === 'curly' || style === 'wavy') && [34, 43, 50, 57, 66].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 24 : 27} r="10" fill={hair} />)}
      {style === 'cap' && (
        <>
          <path d="M27 44 Q26 18 50 18 Q74 18 73 44Z" fill={hair} />
          <rect x="26" y="40" width="48" height="6" rx="3" fill="rgba(0,0,0,.25)" />
        </>
      )}
      {style === 'bun' && <circle cx="50" cy="15" r="9" fill={hair} />}
      {glasses && (
        <g fill="none" stroke="#111" strokeWidth="2.2">
          <circle cx="41" cy="52" r="6.5" />
          <circle cx="59" cy="52" r="6.5" />
          <path d="M47.5 52 H52.5" />
        </g>
      )}
      <path d="M50 52 q-2 8 1 10" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** Arckép a szereplőről: hétköznapi módban (Klasszikus) a generált arc; horror-módban saját kép, ennek híján a rajzolt portré, végül a faj emojija körben. */
export function Portrait({ ch, person, className }: { ch: Pick<PuzzleCharacter, 'id' | 'race' | 'gender'>; person: boolean; className?: string }) {
  if (person) return <Avatar id={ch.id} gender={ch.gender} className={className} />
  const photo = PHOTOS.get(ch.id)
  if (photo) return <img className={className} src={photo} alt={ch.id} style={{ objectFit: 'cover' }} />
  if (hasLook(ch.id)) return <EventPortrait id={ch.id} className={className} />
  return (
    <span className={`emoji-face ${className ?? ''}`} style={{ borderColor: RACE_COLOR[ch.race] }}>
      {charEmoji(ch.id, ch.race)}
    </span>
  )
}
