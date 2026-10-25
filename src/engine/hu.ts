/** Magyar toldalékok a nyomszövegekhez (névből): -tól/-től és -val/-vel. A hétköznapi névkészlethez elég a szabály-alapú változat. */
const FRONT = 'eéiíöőüűy'
const BACK = 'aáoóuú'
const VOWELS = FRONT + BACK

// a hosszú magánhangzó utáni „ly” (király, Éjkirály) mássalhangzó-betűpár, nem „y” magánhangzó: a harmóniát az előtte álló hang adja
// (az idegen nevek — Carly, Emily, Kelly — „y”-ja magánhangzó marad)
const HU_LY = /[áéíóőúű]ly$/i
const isFront = (w: string): boolean => {
  const base = w.replace(/ly$/i, (m) => (HU_LY.test(w) ? 'l' : m)).toLowerCase()
  const vs = [...base].filter((c) => VOWELS.includes(c))
  const last = vs[vs.length - 1] ?? 'a'
  // a semleges „i” a hátrébb álló magas / mély hangot követi: Martin → Martintól, Robin → Robintól, de Jim → Jimtől, Kevin → Kevintől
  if (last === 'i' || last === 'í')
    for (let j = vs.length - 2; j >= 0; j--) if (!'ií'.includes(vs[j]!)) return !BACK.includes(vs[j]!)
  return FRONT.includes(last)
}

/** „A Látogató" / „Az Éjkirály": névelős név — a toldalék a név utolsó szavára kerül, a névelő kisbetűs lesz („a Látogatótól"). */
const ARTICLE = /^(Az?)\s+(.+)$/
function withArticle(name: string, fn: (word: string) => string): string | null {
  const m = ARTICLE.exec(name)
  if (!m) return null
  const words = m[2]!.split(' ')
  const last = words.pop()!
  return [m[1]!.toLowerCase(), ...words, fn(last)].join(' ')
}

/** Előtagok, amelyek nem a név „magja”: a toldalék a név végére kerül („Dr. Wernickével”, „Father Martinnal”, „Evil Mortyval”). */
const PREFIX = new Set(['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Father', 'Evil', 'Golden'])

/**
 * Hová kerül a toldalék: általában a keresztnévre („Leon S. Kennedy” → Leonnal), de előtagos névnél (Dr. …, Father …) vagy ha a név
 * kisbetűs közszóval végződik (Rágógumi hercegnő → Rágógumi hercegnővel) a név utolsó szavára; az előtag megmarad.
 */
function target(name: string): { head: string; word: string } {
  const words = name.split(' ')
  const last = words[words.length - 1]!
  if (words.length > 1 && (PREFIX.has(words[0]!) || /^\p{Ll}/u.test(last))) return { head: `${words.slice(0, -1).join(' ')} `, word: last }
  return { head: '', word: words[0]! }
}

/** Egybetűs név (Mr. X): a betű kiejtése szerint („iksz”) ragozzuk — X-től, X-szel. */
const isLetterName = (w: string): boolean => w === 'X'

/** Mara → Marától, Henry → Henrytől, Deborah → Deborahtól. */
export function abl(name: string): string {
  const art = withArticle(name, abl)
  if (art) return art
  const { head, word: w0 } = target(name)
  if (isLetterName(w0)) return `${head}${w0}-től`
  return head + ablWord(w0)
}

function ablWord(w: string): string {
  const l = w.toLowerCase()
  if (l.endsWith('a')) return `${w.slice(0, -1)}á` + 'tól'
  if (l.endsWith('e')) return `${w.slice(0, -1)}étől`
  if (l.endsWith('o')) return `${w.slice(0, -1)}ó` + 'tól'
  return w + (isFront(w) ? 'től' : 'tól')
}

/** Mara → Marával, Ivan → Ivannal, Henry → Henryvel, Jim → Jimmel. */
export function ins(name: string): string {
  const art = withArticle(name, ins)
  if (art) return art
  const { head, word } = target(name)
  if (isLetterName(word)) return `${head}${word}-szel`
  return head + insWord(word)
}

function insWord(w: string): string {
  const l = w.toLowerCase()
  const last = l[l.length - 1]!
  const front = isFront(w)
  const sfx = front ? 'el' : 'al'
  // királ + lyal: a háromszoros „l” helyett az „ly” megkettőződik, ha a szó hátul képzett (Éjkirállyal)
  if (HU_LY.test(l) && !front) return `${w.slice(0, -1)}ly` + 'al'
  if (last === 'a') return `${w.slice(0, -1)}á` + (front ? 'vel' : 'val')
  if (last === 'e') return `${w.slice(0, -1)}é` + 'vel'
  if (last === 'o') return `${w.slice(0, -1)}ó` + (front ? 'vel' : 'val')
  if (VOWELS.includes(last)) return w + (front ? 'vel' : 'val')
  if (last === 'x') return `${w}sz${sfx}`
  // -s + val/vel → -sszal/-sszel (Perselusszal, Tesszel: a dupla „ss” után nem lesz háromszoros s); -z → -zzal/-zzel (Lizzel)
  if (last === 's') return `${l.endsWith('ss') ? w.slice(0, -1) : w}sz${sfx}`
  if (last === 'z') return `${w}z${sfx}`
  // a már kétszeres mássalhangzóra végződő név (Emmett) nem duplázódik tovább: Emmettel
  return l.length > 1 && l[l.length - 2] === last ? `${w}${sfx}` : `${w}${last}${sfx}`
}

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/** 2 → ketten, 3 → hárman … (a „hányan voltak" alak) */
export const together = (n: number): string => ['', 'egyedül', 'ketten', 'hárman', 'négyen', 'öten', 'hatan', 'heten', 'nyolcan', 'kilencen', 'tízen'][n] ?? `${n}-en`
export const count = (n: number): string => (['', 'egy', 'két', 'három', 'négy'][n] ?? String(n))
