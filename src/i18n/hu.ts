import { huB } from './hu.b'

// Magyar szövegek. Minden, amit a játékos lát, kulcsból jön (később: en.ts). Az AI-B kulcsai a `hu.b.ts`-ben vannak.
export const hu = {
  ...huB,
  'app.tagline': 'Ahol a sudoku vért ont.',
  'menu.classic': 'Klasszikus',
  'menu.classic.sub': '100 előre megírt pálya · sima Murdoku',
  'menu.event': 'Esemény',
  'menu.event.sub': '19 világ × 5 ügy híres horror-játékokból és -sorozatokból',
  'menu.random': 'Random',
  'menu.random.sub': 'végtelen, véletlen ügyek · bárhol folytatható',
  'menu.together': 'Együtt',
  'menu.together.sub': 'közös tábla és chat · 2–4 játékos',
  'menu.killer': 'Gyilkos',
  'menu.killer.sub': 'egyikőtök áruló · 3–6 játékos',
  'menu.home': 'Főoldal',
  'menu.continue': 'Folytatás',
  'menu.friends': 'Barátok',
  'menu.profile': 'Profil',
  'menu.collection': 'Gyűjtemény',
  'menu.settings': 'Beállítások',
  'status.guest': 'Vendég — csak ezen a gépen',
  'status.offline': 'Offline — helyben mentve',
  'status.idle': 'Mentve a felhőbe',
  'status.syncing': 'Szinkron…',
  'status.error': 'Szinkron-hiba',
  'common.back': 'Vissza',
  'common.soon': 'Hamarosan',
  'memory.fallback': 'Az app mappája nem írható — tartalék mentési mappát használunk.',
} as const

export type I18nKey = keyof typeof hu
