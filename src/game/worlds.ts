import { EN_RULES, EN_WORLD_RULES, EN_WORLDS } from '../content/en'
import { getLang } from '../i18n/lang'

/** Az Esemény-világok megjelenítési adatai és a világ-szabályok leírása (a szabály logikája az `engine/`-ben van). */
export interface WorldInfo {
  title: string
  emoji: string
  game: string
}
export const WORLDS: Record<string, WorldInfo> = {
  hollowmere: { title: 'Hollowmere', emoji: '🌒', game: 'NIGHTDOKU' },
  'night-pizzeria': { title: 'Teddy Mackó Pizzériája', emoji: '🐻', game: "Five Evenings at Teddy's" },
  'toy-factory': { title: 'Toytime Co. Gyár', emoji: '🧸', game: 'Daisy Toytime' },
  'city-police': { title: 'Lemur Város Rendőrség', emoji: '👮', game: 'Vile Dweller' }, // a menüben rajzolt jelvény (`WorldIcon`); az emoji a tartalék
  'space-station': { title: 'Novastopol Állomás', emoji: '👽', game: 'Outsider: Solitude' },
  'mountain-cabin': { title: 'Wendigo hegy', emoji: '🦌', game: 'Before Daybreak' },
  'deep-ship': { title: 'Kuromura Űrhajó', emoji: '🚀', game: 'Lifeless Void' },
  'summit-shelter': { title: 'Mount Hollow Elmegyógyintézet', emoji: '🔦', game: 'Outlive' },
  'fog-town': { title: 'Hushed Hill Város', emoji: '🌫️', game: 'Hushed Heights' },
  'entity-realm': { title: 'A Jelenlét Birodalma', emoji: '☠️', game: 'Deceased by Daybreak' },
  'lake-town': { title: 'Radiant Falls', emoji: '🌲', game: 'Adam Waken' },
  'sunshine-mall': { title: 'StarPláza', emoji: '🕹️', game: 'Odder Matters' },
  'frost-keep': { title: 'Frosthold Vár', emoji: '🐉', game: 'Contest of Crowns' },
  'portal-garage': { title: 'Őrült tudós garázsa', emoji: '🛸', game: 'Rich and Marty' },
  'moon-town': { title: 'Arcane Falls', emoji: '🩸', game: 'The Bloodsucker Journals' },
  'candy-land': { title: 'Aah Földje', emoji: '🗡️', game: 'Quest Hour' },
  'rain-forest': { title: 'Crossroads Város', emoji: '🐺', game: 'Nightfall' },
  'walled-town': { title: 'Avalon Menedék', emoji: '🧟', game: 'The Wandering Deceased' },
  'spore-zone': { title: 'Sporefield Karanténzóna', emoji: '🍄', game: 'The Remaining Few' },
  'wizard-school': { title: 'Ravenwick Varázslóiskola', emoji: '⚡', game: 'Henry LightningScar' },
}

export interface RuleInfo {
  name: string
  text: string
}
export const RULES: Record<string, RuleInfo> = {
  cameras: { name: 'Kamerák', text: 'Válassz kamerát: az a helyiség kiemelődik, a többi helyiség nyomai elhalványulnak. A „Mind” mindent mutat.' },
  grab: { name: 'Fogd meg!', text: 'A kéz-kapcsoló mellett álló szereplő „mellette" nyoma két mezőre is érvényes, egy sorban vagy oszlopban.' },
  doors: { name: 'Zárt ajtók', text: 'A kulcsos ajtók melletti nyomok az ajtón át, a szomszéd helyiségre is érvényesek.' },
  motion: { name: 'Mozgásérzékelő', text: 'Néhány szereplőről csak távolság-adat van: „A légzsiliptől pontosan 3 mezőre volt." A mezőket lépésekben számold: egy lépés egy mező jobbra, balra, fel, le vagy átlósan — a falak és a tárgyak nem állnak az útba.' },
  totems: { name: 'Totem-látomás', text: 'Aki totem mellé kerül, annak feltárul egy zárolt, extra nyoma.' },
  vacuum: { name: 'Vákuum', text: 'A pirosan jelölt nyomásmentes helyiségekbe csak páncélos (🛡) szereplő állhat.' },
  nightvision: { name: 'Éjjellátó', text: 'A tábla sötét — csak a kurzorod körüli mezők látszanak.' },
  radio: { name: 'A rádió zaja', text: 'A rádió közelében a nyomok torzulnak: egy szó ki van takarva (███) — más nyomokból kell kitalálni.' },
  generators: { name: 'Generátorok', text: 'A generátor mellett álló szereplő zajt csap: a gyilkos nem állhat generátor mellett.' },
  light: { name: 'A Fény és a Sötétség', text: 'A villanyoszlopok és töltők körül fény van. A Birtoltak csak sötét mezőn állhatnak.' },
}

/** A világ saját neve és szövege a (más világokkal közös) szabályhoz — a szabály logikája ugyanaz marad. */
const WORLD_RULES: Record<string, RuleInfo> = {
  'sunshine-mall': { name: 'Árnyoldal', text: 'Az Árnyoldal sötétjében csak a zseblámpád fénye látszik: a tábla sötét, csak a kurzorod körüli mezőket látod.' },
  'frost-keep': { name: 'A Fal', text: 'A Gáton túli, fagyott helyiségekbe (pirossal jelölve) csak páncélos (🛡) szereplő merészkedik.' },
  'portal-garage': { name: 'Portálok', text: 'A portálok melletti nyomok a portálon át, a szomszéd helyiségre is érvényesek.' },
  'moon-town': { name: 'Napfény', text: 'A lámpák és töltők körüli mezők napfényesek. A vámpírok csak árnyékban (sötét mezőn) állhatnak.' },
  'candy-land': { name: 'Térkép', text: 'Néhány szereplőről csak távolság-adat van: „A kardtól pontosan 3 mezőre volt." A mezőket lépésekben számold: egy lépés egy mező jobbra, balra, fel, le vagy átlósan — a falak és a tárgyak nem állnak az útba.' },
  'rain-forest': { name: 'Látomások', text: 'Aki totem mellé kerül, annak feltárul egy látomás: egy zárolt, extra nyoma.' },
  'walled-town': { name: 'Zaj', text: 'A generátor mellett álló szereplő zajt csap, és odacsalja a sétálókat: a gyilkos nem állhat generátor mellett.' },
  'spore-zone': { name: 'Spórák', text: 'A rádió recseg a spóra-ködben: a közelében a nyomok egy szava ki van takarva (███) — más nyomokból kell kitalálni.' },
  'wizard-school': { name: 'Kalandozók Térképe', text: 'Válassz helyiséget: az kiemelődik, a többi helyiség nyomai elhalványulnak. A „Mind” mindent mutat.' },
}

/** A szabály megjelenítési adata az aktuális nyelven: a világ saját szövege, ennek híján az alap-szabályé. */
export const ruleInfo = (world: string, rule: string | undefined): RuleInfo | undefined => {
  if (!rule) return undefined
  if (getLang() === 'en') return EN_WORLD_RULES[world] ?? EN_RULES[rule]
  return WORLD_RULES[world] ?? RULES[rule]
}

/** A világ megjelenítési adata (cím, kiadási név) az aktuális nyelven. */
export const worldInfo = (world: string): WorldInfo | undefined => {
  const hu = WORLDS[world]
  if (!hu) return undefined
  if (getLang() !== 'en') return hu
  const en = EN_WORLDS[world]
  return en ? { ...hu, title: en.title, game: en.game } : hu
}
