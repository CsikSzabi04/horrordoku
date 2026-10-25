// Az Esemény-mód karaktereinek megjelenése (eredeti, stilizált portrék — NEM a játékok hivatalos művészete).
// Egy bejegyzés = egy karakter (azonosító: a pálya JSON-jának `characters[].id`-ja). A rajzolást az `EventPortrait` végzi.
// Ha valaki saját képet tesz a `src/assets/portraits/<id>.png|jpg|webp` helyre, az elsőbbséget kap (lásd Portrait.tsx).

export type Hair = 'short' | 'side' | 'slick' | 'bald' | 'long' | 'bob' | 'pony' | 'bun' | 'curly' | 'mohawk' | 'afro' | 'wild'
export type Facial = 'beard' | 'stubble' | 'mustache' | 'goatee' | 'longbeard'
export type Outfit = 'tee' | 'jacket' | 'suit' | 'uniform' | 'hoodie' | 'labcoat' | 'dress' | 'turtle' | 'coveralls' | 'vest' | 'priest' | 'straitjacket'
export type Hat = 'cap' | 'fedora' | 'beanie' | 'police' | 'hardhat' | 'bandana' | 'headband' | 'crown' | 'wizard'
export type Extra = 'scar' | 'blood' | 'headset' | 'camera' | 'goggles' | 'visor' | 'ghost' | 'grabpack' | 'stitches' | 'lamp' | 'shades' | 'horns' | 'eyepatch' | 'bolt'
export type CreatureId =
  | 'freddy' | 'goldenFreddy' | 'chica' | 'foxy' | 'bonnie' | 'marionette' | 'huggy' | 'kissy' | 'bunzo' | 'mommy' | 'dogday'
  | 'mrx' | 'xeno' | 'wendigo' | 'hunter' | 'isaac' | 'pyramid' | 'nurse' | 'liar' | 'trapper' | 'diver'
  | 'vecna' | 'nightking' | 'meeseeks' | 'lich' | 'clicker' | 'voldemort' | 'finn' | 'jake' | 'bmo' | 'birdperson' | 'squanchy' | 'poopy' | 'lsp' | 'pug' | 'catnap'

export interface HumanLook {
  k: 'h'
  bg: string
  skin: string
  hair?: string
  style?: Hair
  facial?: Facial
  glasses?: boolean
  top: string // ruha fő színe
  outfit?: Outfit
  trim?: string // gallér / nyakkendő / alatta lévő ing színe
  hat?: Hat
  hatColor?: string
  extra?: Extra
  big?: boolean // vállas, nagydarab
  kid?: boolean // gyerek: nagyobb fej, kisebb váll
}
export interface CreatureLook {
  k: 'c'
  bg: string
  c: CreatureId
}
export type Look = HumanLook | CreatureLook

const FN = '#4a2c2e' // Five Nights at Freddy's
const PP = '#33306a' // Poppy Playtime
const RE = '#33414f' // Resident Evil
const AL = '#1f3f3c' // Alien: Isolation
const UD = '#28385a' // Until Dawn
const DS = '#1c3442' // Dead Space
const OL = '#3a4136' // Outlast
const SH = '#52524f' // Silent Hill
const DB = '#43262a' // Dead by Daylight
const AW = '#26402f' // Alan Wake
const ST = '#2d2542' // Stranger Things
const GT = '#2b3440' // Game of Thrones
const RM = '#244a3a' // Rick and Morty
const VD = '#3d2f3a' // The Vampire Diaries
const AT = '#2a4a66' // Kalandra fel! (Adventure Time)
const TW = '#2f3d33' // Alkonyat (Twilight)
const WD = '#3d3a2c' // The Walking Dead
const TL = '#33382c' // The Last of Us
const HPW = '#3a2d45' // Harry Potter

const H = (bg: string, o: Omit<HumanLook, 'k' | 'bg'>): HumanLook => ({ k: 'h', bg, ...o })
const C = (bg: string, c: CreatureId): CreatureLook => ({ k: 'c', bg, c })

const HM = '#3a2a45' // Hollowmere
const PALE = '#f0d0b0'
const TAN = '#e3bd9b'
const BROWN = '#c58f67'
const DARK = '#7a4a30'

export const LOOKS: Record<string, Look> = {
  // ---------- Hollowmere (a Random mód és a Gyűjtemény szereplői) ----------
  vlad: H(HM, { skin: '#e9e4ea', hair: '#15151a', style: 'slick', top: '#2a1a33', outfit: 'jacket', trim: '#8b1a1a' }),
  morrigan: H(HM, { skin: PALE, hair: '#a4562c', style: 'long', top: '#3f5a3a', outfit: 'dress' }),
  silas: H(HM, { skin: '#d8e4ee', hair: '#8f8f8f', style: 'short', top: '#6b7480', outfit: 'vest', trim: '#e8e0d0', hat: 'cap', hatColor: '#555a62', extra: 'ghost' }),
  lilith: H(HM, { skin: '#c9503a', hair: '#15151a', style: 'long', top: '#1a1216', outfit: 'dress', extra: 'horns' }),
  ezekiel: H(HM, { skin: '#d9ad86', hair: '#6b4c2a', style: 'wild', facial: 'beard', top: '#a63a3a', outfit: 'vest', trim: '#c9a38a', big: true }),
  abel: H(HM, { skin: TAN, hair: '#8f8f8f', style: 'bald', glasses: true, top: '#5a4a3a', outfit: 'jacket', trim: '#d8d0b8' }),

  // ---------- Five Nights at Freddy's ----------
  freddy: C(FN, 'freddy'),
  chica: C(FN, 'chica'),
  bonnie: C(FN, 'bonnie'),
  'a-marionett': C(FN, 'marionette'),
  foxy: C(FN, 'foxy'),
  'golden-freddy': C(FN, 'goldenFreddy'),
  'mike-schmidt': H(FN, { skin: PALE, hair: '#4a2c1a', style: 'short', top: '#2a3b66', outfit: 'uniform', trim: '#c9c9c9', hat: 'police', hatColor: '#222c4d' }),
  'william-afton': H(FN, { skin: '#d9c0cf', hair: '#2a1c12', style: 'side', top: '#6b3fa0', outfit: 'uniform', trim: '#3d1f66', extra: 'stitches' }),

  // ---------- Poppy Playtime ----------
  'huggy-wuggy': C(PP, 'huggy'),
  'kissy-missy': C(PP, 'kissy'),
  'bunzo-bunny': C(PP, 'bunzo'),
  'mommy-long-legs': C(PP, 'mommy'),
  dogday: C(PP, 'dogday'),
  'a-latogato': H(PP, { skin: TAN, hair: '#2a1c12', style: 'short', top: '#585858', outfit: 'hoodie', extra: 'grabpack' }),

  // ---------- Resident Evil 2 ----------
  'mr-x': C(RE, 'mrx'),
  'marvin-branagh': H(RE, { skin: DARK, hair: '#161616', style: 'short', facial: 'stubble', top: '#2c3e63', outfit: 'uniform', trim: '#c9a228', extra: 'blood', big: true }),
  'sherry-birkin': H(RE, { skin: PALE, hair: '#d9b46a', style: 'pony', top: '#d9758f', outfit: 'vest', trim: '#e8e0d0', kid: true }),
  'claire-redfield': H(RE, { skin: PALE, hair: '#a4562c', style: 'pony', top: '#c0392b', outfit: 'jacket', trim: '#e8e0d0' }),
  'ada-wong': H(RE, { skin: '#f3dcc4', hair: '#161616', style: 'bob', top: '#b3172e', outfit: 'turtle', trim: '#2a1a1a' }),
  'annette-birkin': H(RE, { skin: PALE, hair: '#e1c27a', style: 'bob', top: '#e8eef2', outfit: 'labcoat', trim: '#b6537b' }),
  'brian-irons': H(RE, { skin: TAN, hair: '#3a2616', style: 'slick', facial: 'mustache', glasses: true, top: '#2c3e63', outfit: 'suit', trim: '#8b1a1a', big: true }),

  // ---------- Alien: Isolation ----------
  'amanda-ripley': H(AL, { skin: PALE, hair: '#3a2616', style: 'bob', top: '#2f5a8a', outfit: 'jacket', trim: '#d8d8d8', extra: 'goggles' }),
  'nina-taylor': H(AL, { skin: BROWN, hair: '#161616', style: 'bun', top: '#c9742b', outfit: 'uniform', trim: '#e8e0d0', extra: 'headset' }),
  samuels: H(AL, { skin: '#c9ced3', style: 'bald', top: '#d8d8d8', outfit: 'uniform', trim: '#555d66', extra: 'visor' }),
  ricardo: H(AL, { skin: TAN, hair: '#161616', style: 'slick', glasses: true, top: '#c9742b', outfit: 'coveralls', trim: '#e8e0d0' }),
  axel: H(AL, { skin: '#e5bb98', hair: '#9b6b3f', style: 'short', facial: 'stubble', top: '#555d66', outfit: 'coveralls', hat: 'cap', hatColor: '#3a3f48', big: true }),
  waits: H(AL, { skin: '#caa27f', style: 'bald', facial: 'goatee', top: '#2f3a4a', outfit: 'suit', trim: '#d8d8d8' }),
  'a-xenomorph': C(AL, 'xeno'),

  // ---------- Until Dawn ----------
  matt: H(UD, { skin: DARK, hair: '#161616', style: 'short', top: '#4a5a8a', outfit: 'hoodie' }),
  mike: H(UD, { skin: PALE, hair: '#4a2c1a', style: 'side', top: '#6a3f2a', outfit: 'jacket', trim: '#e8e0d0' }),
  emily: H(UD, { skin: '#f3d6bd', hair: '#d9b46a', style: 'pony', top: '#d9544f', outfit: 'tee' }),
  josh: H(UD, { skin: PALE, hair: '#161616', style: 'long', top: '#5a6b3a', outfit: 'hoodie' }),
  chris: H(UD, { skin: TAN, hair: '#4a2c1a', style: 'short', glasses: true, top: '#4a70a6', outfit: 'tee' }),
  jessica: H(UD, { skin: PALE, hair: '#2a1c12', style: 'long', top: '#b6537b', outfit: 'tee' }),
  'a-wendigo': C(UD, 'wendigo'),

  // ---------- Dead Space ----------
  'nicole-brennan': H(DS, { skin: '#e8c8aa', hair: '#3a2616', style: 'bun', top: '#3a6ea5', outfit: 'uniform', trim: '#c9c9c9' }),
  'hans-tiedemann': H(DS, { skin: '#e5c19e', style: 'bald', facial: 'goatee', top: '#c9742b', outfit: 'coveralls', trim: '#e8e0d0', hat: 'hardhat', hatColor: '#e9b92a' }),
  'ellie-langford': H(DS, { skin: BROWN, hair: '#4a2c1a', style: 'bob', top: '#d9a43a', outfit: 'jacket', trim: '#3a3f48' }),
  'zach-hammond': H(DS, { skin: '#6d4529', hair: '#161616', style: 'short', facial: 'stubble', top: '#c9742b', outfit: 'coveralls', trim: '#e8e0d0' }),
  'isaac-clarke': C(DS, 'isaac'),
  'challus-mercer': H(DS, { skin: '#e5c8aa', hair: '#8f8f8f', style: 'side', glasses: true, top: '#e8eef2', outfit: 'labcoat', trim: '#3a6ea5' }),
  'terrence-kyne': H(DS, { skin: TAN, hair: '#2a1c12', style: 'short', top: '#3a3f48', outfit: 'tee', extra: 'headset' }),
  'a-hunter': C(DS, 'hunter'),

  // ---------- Outlast ----------
  'richard-trager': H(OL, { skin: TAN, hair: '#cfcfcf', style: 'slick', top: '#262a33', outfit: 'suit', trim: '#d8d8d8' }),
  'waylon-park': H(OL, { skin: PALE, hair: '#2a1c12', style: 'side', glasses: true, top: '#556a49', outfit: 'jacket', trim: '#d8d0b8' }),
  'father-martin': H(OL, { skin: '#e0b793', hair: '#9a9a9a', style: 'side', facial: 'beard', top: '#15151a', outfit: 'priest', trim: '#f4f4f0' }),
  'eddie-gluskin': H(OL, { skin: '#d9cdbd', hair: '#161616', style: 'slick', top: '#f1ece2', outfit: 'suit', trim: '#7a1f2a', extra: 'stitches' }),
  'dr-wernicke': H(OL, { skin: TAN, hair: '#8f8f8f', style: 'side', glasses: true, top: '#e8eef2', outfit: 'labcoat', trim: '#7a8a96' }),
  'jeremy-blaire': H(OL, { skin: TAN, hair: '#2a1c12', style: 'short', facial: 'stubble', top: '#7a5a3a', outfit: 'jacket', trim: '#c9c0a8' }),
  'chris-walker': H(OL, { skin: '#bfae9a', style: 'bald', top: '#6a6a66', outfit: 'straitjacket', trim: '#3a3a38', extra: 'scar', big: true }),
  'miles-upshur': H(OL, { skin: '#e8c4a0', hair: '#161616', style: 'short', top: '#3a4f6a', outfit: 'jacket', trim: '#c9c9c9', extra: 'camera' }),

  // ---------- Silent Hill 2 ----------
  'james-sunderland': H(SH, { skin: '#e8c8aa', hair: '#5b3a1f', style: 'side', top: '#6b7a3a', outfit: 'jacket', trim: '#d8d0b8' }),
  'angela-orosco': H(SH, { skin: '#e9cdb4', hair: '#2a1c12', style: 'long', top: '#2f4a6a', outfit: 'dress', extra: 'scar' }),
  laura: H(SH, { skin: PALE, hair: '#6b3f22', style: 'pony', top: '#c46a9b', outfit: 'dress', kid: true }),
  mary: H(SH, { skin: '#e4ecf2', hair: '#2a1c12', style: 'long', top: '#dfe6ee', outfit: 'dress', extra: 'ghost' }),
  'eddie-dombrowski': H(SH, { skin: '#e4bd9a', hair: '#3a2616', style: 'short', top: '#c9c0a0', outfit: 'tee', extra: 'blood', big: true }),
  'pyramid-head': C(SH, 'pyramid'),
  'a-buborekfeju-apolono': C(SH, 'nurse'),
  'a-hazug-alak': C(SH, 'liar'),

  // ---------- Dead by Daylight ----------
  'a-trapper': C(DB, 'trapper'),
  'meg-thomas': H(DB, { skin: PALE, hair: '#6a3b1f', style: 'pony', top: '#e24d6a', outfit: 'jacket', trim: '#3a3f48' }),
  'nea-karlsson': H(DB, { skin: '#e8c3a3', hair: '#2aa5a5', style: 'mohawk', top: '#2c2c34', outfit: 'hoodie' }),
  'dwight-fairfield': H(DB, { skin: PALE, hair: '#2a1c12', style: 'short', glasses: true, top: '#5b7fa8', outfit: 'jacket', trim: '#e8e0d0' }),
  'feng-min': H(DB, { skin: '#f0d2b4', hair: '#171717', style: 'pony', top: '#b44a8a', outfit: 'jacket', trim: '#2a2a30' }),
  'claudette-morel': H(DB, { skin: DARK, hair: '#161616', style: 'afro', top: '#4f8a4a', outfit: 'jacket', trim: '#e8e0d0' }),
  'david-king': H(DB, { skin: '#e5bb98', hair: '#9b6b3f', style: 'short', facial: 'stubble', top: '#444a52', outfit: 'tee', extra: 'scar', big: true }),
  'jake-park': H(DB, { skin: PALE, hair: '#171717', style: 'slick', facial: 'stubble', top: '#556b3a', outfit: 'jacket', trim: '#d8d0b8' }),
  'quentin-smith': H(DB, { skin: '#f0d4b8', hair: '#2a1c12', style: 'side', top: '#7a5a3a', outfit: 'jacket', trim: '#e8e0d0', extra: 'blood' }),

  // ---------- Alan Wake ----------
  'alan-wake': H(AW, { skin: '#e9c9a8', hair: '#3a2616', style: 'side', facial: 'stubble', top: '#7a5a3a', outfit: 'jacket', trim: '#c9c0a8' }),
  'barry-wheeler': H(AW, { skin: '#e4bd9a', hair: '#2a1c12', style: 'curly', facial: 'goatee', top: '#c9a228', outfit: 'tee', big: true }),
  'dr-emil-hartman': H(AW, { skin: '#e3c8ae', hair: '#cfcfcf', style: 'slick', glasses: true, top: '#2c3e63', outfit: 'suit', trim: '#8b1a1a' }),
  'thomas-zane': C(AW, 'diver'),
  'tor-anderson': H(AW, { skin: '#e0b793', hair: '#e6e6e6', style: 'bald', facial: 'longbeard', top: '#a63a3a', outfit: 'vest', trim: '#c9a38a', hat: 'cap', hatColor: '#6b4c2a', big: true }),
  'odin-anderson': H(AW, { skin: '#e0b793', hair: '#e6e6e6', style: 'wild', facial: 'longbeard', top: '#4f6a8a', outfit: 'vest', trim: '#c9a38a', big: true }),
  'cynthia-weaver': H(AW, { skin: '#e5c8aa', hair: '#bdbdbd', style: 'bun', top: '#6a4a7a', outfit: 'dress', extra: 'lamp' }),
  'pat-maine': H(AW, { skin: '#e3c1a0', hair: '#7a7a7a', style: 'long', top: '#1a1a1f', outfit: 'jacket', trim: '#333', extra: 'shades' }),
  'alice-wake': H(AW, { skin: '#f3d4bc', hair: '#d9b46a', style: 'long', top: '#8fb4d6', outfit: 'dress' }),
  'sarah-breaker': H(AW, { skin: '#e9c9a8', hair: '#2a1c12', style: 'pony', top: '#8b7a54', outfit: 'uniform', trim: '#c9a228', hat: 'police', hatColor: '#6b5d3a' }),
  // ---------- tartalék szereplők a korábbi világokból (a generátor a készletből választ) ----------
  'pj-pug-a-pillar': C(PP, 'pug'),
  catnap: C(PP, 'catnap'),
  poppy: H(PP, { skin: '#f6ebe2', hair: '#2a1c12', style: 'bun', top: '#e8a0c8', outfit: 'dress', kid: true }),
  'leon-s-kennedy': H(RE, { skin: PALE, hair: '#6b4a2e', style: 'side', top: '#3a4a8a', outfit: 'uniform', trim: '#c9c9c9' }),
  marlow: H(AL, { skin: '#d9b48e', hair: '#8f8f8f', style: 'side', facial: 'goatee', top: '#c9742b', outfit: 'coveralls', trim: '#e8e0d0' }),
  sam: H(UD, { skin: '#e9cdb4', hair: '#6b4a2e', style: 'short', top: '#4a70a6', outfit: 'tee', kid: true }),
  ashley: H(UD, { skin: '#e9cdb4', hair: '#3a2616', style: 'bob', glasses: true, top: '#8a5a7a', outfit: 'tee' }),
  'kendra-daniels': H(DS, { skin: DARK, hair: '#161616', style: 'short', top: '#3a6ea5', outfit: 'uniform', trim: '#c9c9c9' }),
  'benjamin-mathius': H(DS, { skin: TAN, hair: '#6b4a2e', style: 'short', top: '#555d66', outfit: 'coveralls', trim: '#e8e0d0' }),
  maria: H(SH, { skin: '#f3dcc4', hair: '#e8d9a0', style: 'long', top: '#c0402b', outfit: 'dress' }),
  'rose-marigold': H(AW, { skin: '#e9c9a8', hair: '#a4562c', style: 'bun', top: '#3a8a6a', outfit: 'dress' }),

  // ---------- Stranger Things ----------
  eleven: H(ST, { skin: '#f3dcc4', hair: '#7a4a2a', style: 'short', top: '#e8a0b8', outfit: 'dress', kid: true }),
  'mike-wheeler': H(ST, { skin: PALE, hair: '#161616', style: 'short', top: '#a03a3a', outfit: 'jacket', trim: '#e8e0d0', kid: true }),
  'dustin-henderson': H(ST, { skin: PALE, hair: '#a07a4a', style: 'short', top: '#2a7a4a', outfit: 'tee', hat: 'cap', hatColor: '#2a7a4a', kid: true }),
  'lucas-sinclair': H(ST, { skin: DARK, hair: '#161616', style: 'short', top: '#4a5a3a', outfit: 'jacket', trim: '#e8e0d0', hat: 'bandana', hatColor: '#c0392b', kid: true }),
  'will-byers': H(ST, { skin: PALE, hair: '#6b4a2e', style: 'side', top: '#4a70a6', outfit: 'jacket', trim: '#e8e0d0', kid: true }),
  'max-mayfield': H(ST, { skin: PALE, hair: '#c0402b', style: 'long', top: '#e8c030', outfit: 'tee', kid: true }),
  'steve-harrington': H(ST, { skin: TAN, hair: '#3a2616', style: 'side', top: '#1a3a7a', outfit: 'uniform', trim: '#e8e8e8' }),
  'robin-buckley': H(ST, { skin: PALE, hair: '#d9b46a', style: 'bob', top: '#1a3a7a', outfit: 'uniform', trim: '#e8e8e8' }),
  'jim-hopper': H(ST, { skin: TAN, hair: '#3a2616', style: 'short', facial: 'mustache', top: '#e07a2e', outfit: 'tee', big: true }),
  'erica-sinclair': H(ST, { skin: DARK, hair: '#161616', style: 'afro', top: '#c46a9b', outfit: 'tee', kid: true }),
  vecna: C(ST, 'vecna'),

  // ---------- Game of Thrones ----------
  'jon-snow': H(GT, { skin: PALE, hair: '#161616', style: 'curly', facial: 'stubble', top: '#15151a', outfit: 'jacket', trim: '#8a8a82' }),
  'daenerys-targaryen': H(GT, { skin: '#f3dcc4', hair: '#e8e8e0', style: 'long', top: '#2a2a32', outfit: 'dress' }),
  'tyrion-lannister': H(GT, { skin: PALE, hair: '#e0c27a', style: 'side', facial: 'beard', top: '#7a2a2a', outfit: 'vest', trim: '#c9a228', extra: 'scar', kid: true }),
  'arya-stark': H(GT, { skin: PALE, hair: '#4a2c1a', style: 'short', top: '#5a6a7a', outfit: 'jacket', trim: '#d8d8d8', kid: true }),
  'sansa-stark': H(GT, { skin: '#f3dcc4', hair: '#a4562c', style: 'long', top: '#3a6ea5', outfit: 'dress' }),
  'cersei-lannister': H(GT, { skin: '#f3dcc4', hair: '#e0c27a', style: 'bob', top: '#9a1a2a', outfit: 'dress', hat: 'crown' }),
  'jaime-lannister': H(GT, { skin: PALE, hair: '#e0c27a', style: 'slick', facial: 'stubble', top: '#c9a228', outfit: 'uniform', trim: '#7a2a2a' }),
  'bran-stark': H(GT, { skin: PALE, hair: '#4a2c1a', style: 'side', top: '#555a62', outfit: 'tee', kid: true }),
  'samwell-tarly': H(GT, { skin: PALE, hair: '#4a2c1a', style: 'short', top: '#2a2a30', outfit: 'jacket', trim: '#8a8a82', big: true }),
  'az-ejkiraly': C(GT, 'nightking'),

  // ---------- Rick and Morty ----------
  'rick-sanchez': H(RM, { skin: '#e8d2bd', hair: '#a8d4ea', style: 'wild', top: '#e8eef2', outfit: 'labcoat', trim: '#3a6ea5' }),
  'morty-smith': H(RM, { skin: PALE, hair: '#6b4a2e', style: 'short', top: '#f2c744', outfit: 'tee', kid: true }),
  'summer-smith': H(RM, { skin: PALE, hair: '#e07a2e', style: 'long', top: '#e8a0b8', outfit: 'tee' }),
  'beth-smith': H(RM, { skin: PALE, hair: '#e0c27a', style: 'bob', top: '#8fb4d6', outfit: 'jacket', trim: '#e8e0d0' }),
  'jerry-smith': H(RM, { skin: PALE, hair: '#5b3a1f', style: 'side', top: '#6b8f6b', outfit: 'tee' }),
  birdperson: C(RM, 'birdperson'),
  squanchy: C(RM, 'squanchy'),
  'mr-poopybutthole': C(RM, 'poopy'),
  'evil-morty': H(RM, { skin: PALE, hair: '#4a3a2a', style: 'short', top: '#f2c744', outfit: 'tee', extra: 'eyepatch', kid: true }),
  'mr-meeseeks': C(RM, 'meeseeks'),

  // ---------- The Vampire Diaries ----------
  'elena-gilbert': H(VD, { skin: '#f0d8c8', hair: '#4a2c1a', style: 'long', top: '#e8e0d0', outfit: 'tee' }),
  'stefan-salvatore': H(VD, { skin: '#eee0d4', hair: '#6b4a2e', style: 'side', top: '#4a5a3a', outfit: 'jacket', trim: '#d8d0b8' }),
  'damon-salvatore': H(VD, { skin: '#eee0d4', hair: '#161616', style: 'side', facial: 'stubble', top: '#15151a', outfit: 'jacket', trim: '#3a3a42' }),
  'bonnie-bennett': H(VD, { skin: DARK, hair: '#161616', style: 'curly', top: '#c46a9b', outfit: 'tee' }),
  'caroline-forbes': H(VD, { skin: '#f3dcc4', hair: '#e0c27a', style: 'long', top: '#8fb4d6', outfit: 'tee' }),
  'matt-donovan': H(VD, { skin: PALE, hair: '#a07a4a', style: 'short', top: '#556b3a', outfit: 'tee' }),
  'jeremy-gilbert': H(VD, { skin: PALE, hair: '#3a2616', style: 'short', top: '#444a52', outfit: 'hoodie' }),
  'alaric-saltzman': H(VD, { skin: TAN, hair: '#6b4a2e', style: 'short', facial: 'stubble', top: '#7a5a3a', outfit: 'jacket', trim: '#c9c0a8' }),
  'tyler-lockwood': H(VD, { skin: TAN, hair: '#161616', style: 'short', top: '#2a2a30', outfit: 'jacket', trim: '#8a8a82' }),
  'katherine-pierce': H(VD, { skin: '#f3dcc4', hair: '#3a2616', style: 'curly', top: '#6a1a2a', outfit: 'dress' }),

  // ---------- Kalandra fel! (Adventure Time) ----------
  finn: C(AT, 'finn'),
  jake: C(AT, 'jake'),
  'ragogumi-hercegno': H(AT, { skin: '#f4a6c8', hair: '#f08fb8', style: 'long', top: '#f08fb8', outfit: 'dress', hat: 'crown' }),
  marceline: H(AT, { skin: '#a9b4c2', hair: '#15151a', style: 'long', top: '#8a2a3a', outfit: 'tee' }),
  jegkiraly: H(AT, { skin: '#9fd0f0', hair: '#e8f4ff', style: 'bald', facial: 'longbeard', top: '#4a7ab0', outfit: 'dress', hat: 'crown', big: true }),
  bmo: C(AT, 'bmo'),
  'lumpy-hercegno': C(AT, 'lsp'),
  'a-lich': C(AT, 'lich'),

  // ---------- Alkonyat (Twilight) ----------
  'bella-swan': H(TW, { skin: '#f0d8c8', hair: '#4a2c1a', style: 'long', top: '#3a6ea5', outfit: 'jacket', trim: '#d8d8d8' }),
  'edward-cullen': H(TW, { skin: '#e6e2e0', hair: '#8a5a2a', style: 'wild', top: '#2a2a30', outfit: 'jacket', trim: '#8a8a82' }),
  'jacob-black': H(TW, { skin: '#a8744a', hair: '#161616', style: 'long', top: '#6a4a3a', outfit: 'tee', big: true }),
  'alice-cullen': H(TW, { skin: '#e6e2e0', hair: '#161616', style: 'wild', top: '#c46a9b', outfit: 'dress' }),
  'carlisle-cullen': H(TW, { skin: '#e6e2e0', hair: '#d9c27a', style: 'slick', top: '#e8eef2', outfit: 'labcoat', trim: '#3a6ea5' }),
  'charlie-swan': H(TW, { skin: TAN, hair: '#6b4a2e', style: 'short', facial: 'mustache', top: '#6b5d3a', outfit: 'uniform', trim: '#c9a228', hat: 'police', hatColor: '#4a4028' }),
  'rosalie-hale': H(TW, { skin: '#e6e2e0', hair: '#e0c27a', style: 'long', top: '#b3172e', outfit: 'dress' }),
  'jasper-hale': H(TW, { skin: '#e6e2e0', hair: '#d9c27a', style: 'side', top: '#3a3a3a', outfit: 'jacket', trim: '#8a8a82', extra: 'scar' }),
  james: H(TW, { skin: '#e6e2e0', hair: '#8a6a3a', style: 'slick', top: '#3a2a2a', outfit: 'jacket', trim: '#6a4a4a' }),

  // ---------- The Walking Dead ----------
  'rick-grimes': H(WD, { skin: TAN, hair: '#6b4a2e', style: 'short', facial: 'stubble', top: '#8b7a54', outfit: 'uniform', trim: '#c9a228', hat: 'fedora', hatColor: '#8a6a3a' }),
  michonne: H(WD, { skin: DARK, hair: '#161616', style: 'curly', top: '#3a3a3a', outfit: 'jacket', trim: '#6a6a6a' }),
  'daryl-dixon': H(WD, { skin: TAN, hair: '#3a2616', style: 'long', facial: 'stubble', top: '#4a4038', outfit: 'vest', trim: '#6b6b6b' }),
  'carol-peletier': H(WD, { skin: PALE, hair: '#bdbdbd', style: 'bob', top: '#8a7a6a', outfit: 'jacket', trim: '#d8d0b8' }),
  'glenn-rhee': H(WD, { skin: '#f0d2b4', hair: '#161616', style: 'short', top: '#4a70a6', outfit: 'tee', hat: 'cap', hatColor: '#3a3f48' }),
  'maggie-greene': H(WD, { skin: PALE, hair: '#6b4a2e', style: 'long', top: '#c0402b', outfit: 'tee' }),
  negan: H(WD, { skin: TAN, hair: '#3a3a3a', style: 'slick', facial: 'beard', top: '#15151a', outfit: 'jacket', trim: '#c0402b', big: true }),
  'carl-grimes': H(WD, { skin: PALE, hair: '#6b4a2e', style: 'long', top: '#6b6b4a', outfit: 'tee', hat: 'cap', hatColor: '#8a6a3a', extra: 'eyepatch', kid: true }),
  'a-kormanyzo': H(WD, { skin: TAN, hair: '#3a2616', style: 'side', facial: 'mustache', top: '#6b5d3a', outfit: 'suit', trim: '#d8d8d8', extra: 'eyepatch' }),

  // ---------- The Last of Us ----------
  'joel-miller': H(TL, { skin: TAN, hair: '#6b6b6b', style: 'short', facial: 'beard', top: '#8a3a2a', outfit: 'jacket', trim: '#d8d0b8', big: true }),
  'ellie-williams': H(TL, { skin: PALE, hair: '#8a4a2a', style: 'pony', top: '#c0402b', outfit: 'jacket', trim: '#2a2a30', kid: true }),
  tess: H(TL, { skin: '#caa27f', hair: '#161616', style: 'pony', top: '#4a4a3a', outfit: 'jacket', trim: '#8a8a82' }),
  'tommy-miller': H(TL, { skin: TAN, hair: '#6b4a2e', style: 'short', facial: 'stubble', top: '#6b8f6b', outfit: 'jacket', trim: '#d8d0b8', hat: 'cap', hatColor: '#6a5a3a' }),
  marlene: H(TL, { skin: DARK, hair: '#161616', style: 'afro', top: '#3a4a3a', outfit: 'uniform', trim: '#8a8a82' }),
  bill: H(TL, { skin: TAN, hair: '#6b6b6b', style: 'bald', facial: 'goatee', top: '#3a4a3a', outfit: 'jacket', trim: '#8a8a82', big: true }),
  henry: H(TL, { skin: DARK, hair: '#161616', style: 'short', facial: 'stubble', top: '#6a6a5a', outfit: 'jacket', trim: '#d8d0b8' }),
  riley: H(TL, { skin: DARK, hair: '#161616', style: 'curly', top: '#3a3a3a', outfit: 'jacket', trim: '#6a6a6a', kid: true }),
  'abby-anderson': H(TL, { skin: '#eac9a4', hair: '#d9b46a', style: 'pony', top: '#3a4a3a', outfit: 'tee', big: true }),
  'a-clicker': C(TL, 'clicker'),

  // ---------- Harry Potter ----------
  'harry-potter': H(HPW, { skin: PALE, hair: '#161616', style: 'wild', glasses: true, top: '#7a1a1a', outfit: 'jacket', trim: '#c9a228', extra: 'bolt' }),
  'hermione-granger': H(HPW, { skin: '#f0d0b0', hair: '#5b3a1f', style: 'curly', top: '#2a2a30', outfit: 'jacket', trim: '#a01a1a' }),
  'ron-weasley': H(HPW, { skin: PALE, hair: '#c0402b', style: 'short', top: '#2a2a30', outfit: 'jacket', trim: '#a01a1a' }),
  'albus-dumbledore': H(HPW, { skin: '#f0d8c0', hair: '#e8e8e8', style: 'long', facial: 'longbeard', glasses: true, top: '#4a2a6a', outfit: 'dress', hat: 'wizard', hatColor: '#4a2a6a' }),
  'perselus-piton': H(HPW, { skin: '#d8c3a8', hair: '#15151a', style: 'long', top: '#15151a', outfit: 'priest', trim: '#15151a' }),
  hagrid: H(HPW, { skin: '#d9ad86', hair: '#2a1c12', style: 'wild', facial: 'longbeard', top: '#6b4a2e', outfit: 'vest', trim: '#8a6a3a', big: true }),
  'draco-malfoy': H(HPW, { skin: '#f3ece6', hair: '#e8e0c0', style: 'slick', top: '#1a3a2a', outfit: 'jacket', trim: '#c9c9c9' }),
  'neville-longbottom': H(HPW, { skin: PALE, hair: '#6b4a2e', style: 'short', top: '#2a2a30', outfit: 'jacket', trim: '#a01a1a' }),
  'luna-lovegood': H(HPW, { skin: '#f3dcc4', hair: '#e0d09a', style: 'long', top: '#3a6ea5', outfit: 'dress' }),
  'ginny-weasley': H(HPW, { skin: PALE, hair: '#c0402b', style: 'long', top: '#2a2a30', outfit: 'jacket', trim: '#a01a1a' }),
  'minerva-mcgonagall': H(HPW, { skin: '#e9d0b6', hair: '#3a3a3a', style: 'bun', glasses: true, top: '#2a4a2a', outfit: 'dress', hat: 'wizard', hatColor: '#2a4a2a' }),
  'voldemort-nagyur': C(HPW, 'voldemort'),
}
