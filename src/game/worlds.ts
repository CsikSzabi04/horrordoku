/** Az Esemény-világok megjelenítési adatai és a világ-szabályok leírása (a szabály logikája az `engine/`-ben van). */
export interface WorldInfo {
  title: string
  emoji: string
  game: string
}
export const WORLDS: Record<string, WorldInfo> = {
  hollowmere: { title: 'Hollowmere', emoji: '🌒', game: 'NIGHTDOKU' },
  fnaf: { title: 'Freddy Fazbear Pizzériája', emoji: '🐻', game: "Five Nights at Freddy's" },
  'poppy-playtime': { title: 'Playtime Co. gyár', emoji: '🧸', game: 'Poppy Playtime' },
  'resident-evil': { title: 'Raccoon City Police Department', emoji: '🧟', game: 'Resident Evil' },
  'alien-isolation': { title: 'Sevastopol állomás', emoji: '👽', game: 'Alien: Isolation' },
  'until-dawn': { title: 'Blackwood-hegy', emoji: '🦌', game: 'Until Dawn' },
  'dead-space': { title: 'USG Ishimura', emoji: '🚀', game: 'Dead Space' },
  outlast: { title: 'Mount Massive Menedékház', emoji: '🔦', game: 'Outlast' },
  'silent-hill': { title: 'A Köd Városa', emoji: '🌫️', game: 'Silent Hill' },
  'dead-by-daylight': { title: 'Az Entitás birodalma', emoji: '☠️', game: 'Dead by Daylight' },
  'alan-wake': { title: 'Bright Falls', emoji: '🌲', game: 'Alan Wake' },
  'stranger-things': { title: 'Starcourt Mall', emoji: '🕹️', game: 'Stranger Things' },
  'game-of-thrones': { title: 'Winterfell', emoji: '🐉', game: 'Game of Thrones' },
  'rick-and-morty': { title: 'A Smith-ház garázsa', emoji: '🛸', game: 'Rick and Morty' },
  'vampire-diaries': { title: 'Mystic Falls', emoji: '🧛', game: 'The Vampire Diaries' },
  'adventure-time': { title: 'Ooo Földje', emoji: '🗡️', game: 'Kalandra fel! (Adventure Time)' },
  twilight: { title: 'Forks', emoji: '🐺', game: 'Alkonyat (Twilight)' },
  'walking-dead': { title: 'Alexandria', emoji: '🩸', game: 'The Walking Dead' },
  'last-of-us': { title: 'Karantén-zóna', emoji: '🍄', game: 'The Last of Us' },
  'harry-potter': { title: 'Roxfort', emoji: '⚡', game: 'Harry Potter' },
}

export interface RuleInfo {
  name: string
  text: string
}
export const RULES: Record<string, RuleInfo> = {
  cameras: { name: 'Kamerák', text: 'Válassz kamerát: az a helyiség kiemelődik, a többi helyiség nyomai elhalványulnak. A „Mind” mindent mutat.' },
  grab: { name: 'Fogd meg!', text: 'A kéz-kapcsoló mellett álló szereplő „mellette" nyoma két mezőre is érvényes, egy sorban vagy oszlopban.' },
  doors: { name: 'Zárt ajtók', text: 'A kulcsos ajtók melletti nyomok az ajtón át, a szomszéd helyiségre is érvényesek.' },
  motion: { name: 'Mozgásérzékelő', text: 'Néhány szereplőről csak távolság-adat van: „Mozgás 3 mezőre a légzsiliptől." (légvonal-lépésekben, sor+oszlop)' },
  totems: { name: 'Totem-látomás', text: 'Aki totem mellé kerül, annak feltárul egy zárolt, extra nyoma.' },
  vacuum: { name: 'Vákuum', text: 'A pirosan jelölt nyomásmentes helyiségekbe csak páncélos (🛡) szereplő állhat.' },
  nightvision: { name: 'Éjjellátó', text: 'A tábla sötét — csak a kurzorod körüli mezők látszanak.' },
  radio: { name: 'A rádió zaja', text: 'A rádió közelében a nyomok torzulnak: egy szó ki van takarva (███) — más nyomokból kell kitalálni.' },
  generators: { name: 'Generátorok', text: 'A generátor mellett álló szereplő zajt csap: a gyilkos nem állhat generátor mellett.' },
  light: { name: 'A Fény és a Sötétség', text: 'A villanyoszlopok és töltők körül fény van. A Birtoltak csak sötét mezőn állhatnak.' },
}

/** A világ saját neve és szövege a (más világokkal közös) szabályhoz — a szabály logikája ugyanaz marad. */
const WORLD_RULES: Record<string, RuleInfo> = {
  'stranger-things': { name: 'Fejjel lefelé', text: 'A Fordított Világ sötétjében csak a zseblámpád fénye látszik: a tábla sötét, csak a kurzorod körüli mezőket látod.' },
  'game-of-thrones': { name: 'A Fal', text: 'A Falon túli, fagyott helyiségekbe (pirossal jelölve) csak páncélos (🛡) szereplő merészkedik.' },
  'rick-and-morty': { name: 'Portálok', text: 'A portálok melletti nyomok a portálon át, a szomszéd helyiségre is érvényesek.' },
  'vampire-diaries': { name: 'Napfény', text: 'A lámpák és töltők körüli mezők napfényesek. A vámpírok csak árnyékban (sötét mezőn) állhatnak.' },
  'adventure-time': { name: 'Térkép', text: 'Néhány szereplőről csak távolság-adat van: „3 mezőre a kardtól." (légvonalban, sor + oszlop)' },
  twilight: { name: 'Alice látomásai', text: 'Aki totem mellé kerül, annak feltárul Alice egy látomása: egy zárolt, extra nyoma.' },
  'walking-dead': { name: 'Zaj', text: 'A generátor mellett álló szereplő zajt csap, és odacsalja a sétálókat: a gyilkos nem állhat generátor mellett.' },
  'last-of-us': { name: 'Spórák', text: 'A rádió recseg a spóra-ködben: a közelében a nyomok egy szava ki van takarva (███) — más nyomokból kell kitalálni.' },
  'harry-potter': { name: 'Tekergők Térképe', text: 'Válassz helyiséget: az kiemelődik, a többi helyiség nyomai elhalványulnak. A „Mind” mindent mutat.' },
}

/** A szabály megjelenítési adata: a világ saját szövege, ennek híján az alap-szabályé. */
export const ruleInfo = (world: string, rule: string | undefined): RuleInfo | undefined => (rule ? (WORLD_RULES[world] ?? RULES[rule]) : undefined)
