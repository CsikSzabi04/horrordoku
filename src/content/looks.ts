// Az Esemény-mód karaktereinek megjelenése (eredeti, stilizált portrék — NEM a játékok hivatalos művészete).
// Egy bejegyzés = egy karakter (azonosító: a pálya JSON-jának `characters[].id`-ja). A rajzolást az `EventPortrait` végzi.
// Ha valaki saját képet tesz a `src/assets/portraits/<id>.png|jpg|webp` helyre, az elsőbbséget kap (lásd Portrait.tsx).

export type Hair = 'short' | 'side' | 'slick' | 'bald' | 'long' | 'bob' | 'pony' | 'bun' | 'curly' | 'mohawk' | 'afro' | 'wild'
export type Facial = 'beard' | 'stubble' | 'mustache' | 'goatee' | 'longbeard'
export type Outfit = 'tee' | 'jacket' | 'suit' | 'uniform' | 'hoodie' | 'labcoat' | 'dress' | 'turtle' | 'coveralls' | 'vest' | 'priest' | 'straitjacket'
export type Hat = 'cap' | 'fedora' | 'beanie' | 'police' | 'hardhat' | 'bandana' | 'headband' | 'crown' | 'wizard'
export type Extra = 'scar' | 'blood' | 'headset' | 'camera' | 'goggles' | 'visor' | 'ghost' | 'grabpack' | 'stitches' | 'lamp' | 'shades' | 'horns' | 'eyepatch' | 'bolt'
export type CreatureId =
  | 'brumi' | 'aranyBrumi' | 'csibi' | 'roko' | 'nyuszi' | 'marionette' | 'olelo' | 'csokos' | 'dobos' | 'hosszulabu' | 'kutyanap'
  | 'surur' | 'urleny' | 'wendigo' | 'vadasz' | 'ivan' | 'piramis' | 'nurse' | 'liar' | 'csapdas' | 'diver'
  | 'lidero' | 'fagykiraly' | 'kerek' | 'lich' | 'kattogo' | 'nevtelen' | 'fin' | 'dzsaki' | 'bimbo' | 'madarember' | 'csippento' | 'fenekcsomo' | 'gocsi' | 'pottyos' | 'macskanap'

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
  scarf?: string // sál színe
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

const FN = '#4a2c2e' // Éjszakai Pizzéria
const PP = '#33306a' // Játékgyár
const RE = '#33414f' // Resident Evil
const AL = '#1f3f3c' // Zarya-állomás
const UD = '#28385a' // Feketefa
const DS = '#1c3442' // Vesta
const OL = '#3a4136' // Sziklatető
const SH = '#52524f' // Silent Hill
const DB = '#43262a' // A Sötét Kapu
const AW = '#26402f' // Fényhegy
const ST = '#2d2542' // Napfény Bevásárlóközpont
const GT = '#2b3440' // Hóerőd
const RM = '#244a3a' // Portál-garázs
const VD = '#3d2f3a' // Holdvölgy
const AT = '#2a4a66' // Mesevilág
const TW = '#2f3d33' // Esőerdő-város
const WD = '#3d3a2c' // Sáncváros
const TL = '#33382c' // Karantén-zóna
const HPW = '#3a2d45' // Varázsiskola

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

  // ---------- Éjszakai Pizzéria ----------
  brumi: C(FN, 'brumi'),
  csibi: C(FN, 'csibi'),
  nyuszi: C(FN, 'nyuszi'),
  'a-babu': C(FN, 'marionette'),
  roko: C(FN, 'roko'),
  'arany-brumi': C(FN, 'aranyBrumi'),
  'kiss-marton': H(FN, { skin: PALE, hair: '#6c4026', style: 'short', top: '#374e87', outfit: 'uniform', trim: '#e0e0e0', hat: 'police', hatColor: '#303e6d' }),
  'varga-ferenc': H(FN, { skin: '#d9c0cf', hair: '#1d130c', style: 'side', top: '#55327f', outfit: 'uniform', trim: '#281443', extra: 'stitches' }),

  // ---------- Játékgyár ----------
  'olelo-leny': C(PP, 'olelo'),
  'csokos-mici': C(PP, 'csokos'),
  'dobos-nyuszi': C(PP, 'dobos'),
  'hosszulabu-anyu': C(PP, 'hosszulabu'),
  kutyanap: C(PP, 'kutyanap'),
  'a-latogato': H(PP, { skin: TAN, hair: '#2a1c12', style: 'short', top: '#585858', outfit: 'hoodie', extra: 'grabpack' }),

  // ---------- Vörös Város ----------
  'a-sotet-ur': C(RE, 'surur'),
  'bodor-marcell': H(RE, { skin: DARK, hair: '#141414', style: 'short', facial: 'stubble', top: '#1e2a43', outfit: 'uniform', trim: '#a38320', extra: 'blood', big: true }),
  'biro-csenge': H(RE, { skin: PALE, hair: '#e2c68f', style: 'pony', top: '#e399ac', outfit: 'vest', trim: '#f2ede4', kid: true }),
  'hegedus-klara': H(RE, { skin: PALE, hair: '#804322', style: 'pony', top: '#9a2e23', outfit: 'jacket', trim: '#d9ccb1', glasses: true }),
  'lin-adel': H(RE, { skin: '#f3dcc4', hair: '#2d2d2d', style: 'bob', top: '#dc1c38', outfit: 'turtle', trim: '#462c2c' }),
  'biro-anett': H(RE, { skin: PALE, hair: '#d9b155', style: 'bob', top: '#cbd8e1', outfit: 'labcoat', trim: '#9a4165' }),
  'banfi-bruno': H(RE, { skin: TAN, hair: '#1e130b', style: 'slick', facial: 'mustache', glasses: true, top: '#1e2a43', outfit: 'suit', trim: '#641313', big: true }),

  // ---------- Zarya-állomás ----------
  'antal-anita': H(AL, { skin: PALE, hair: '#5b3c23', style: 'bob', top: '#3b70ac', outfit: 'jacket', trim: '#ebebeb', extra: 'goggles' }),
  'toth-nora': H(AL, { skin: BROWN, hair: '#2d2d2d', style: 'bun', top: '#d88c4a', outfit: 'uniform', trim: '#f2ede4', extra: 'headset' }),
  sos: H(AL, { skin: '#c9ced3', style: 'bald', top: '#c1c1c1', outfit: 'uniform', trim: '#40464d', extra: 'visor', scarf: '#c0392b' }),
  rokus: H(AL, { skin: TAN, hair: '#2d2d2d', style: 'slick', glasses: true, top: '#d88c4a', outfit: 'coveralls', trim: '#f2ede4' }),
  akos: H(AL, { skin: '#e5bb98', hair: '#b88250', style: 'short', facial: 'stubble', top: '#6a747f', outfit: 'coveralls', hat: 'cap', hatColor: '#4e5561', big: true }),
  veres: H(AL, { skin: '#caa27f', style: 'bald', facial: 'goatee', top: '#1d242e', outfit: 'suit', trim: '#c1c1c1' }),
  'az-urleny': C(AL, 'urleny'),

  // ---------- Feketefa ----------
  mate: H(UD, { skin: DARK, hair: '#141414', style: 'short', top: '#3a476c', outfit: 'hoodie' }),
  mihaly: H(UD, { skin: PALE, hair: '#6c4026', style: 'side', top: '#8b5337', outfit: 'jacket', trim: '#f2ede4', hat: 'beanie', hatColor: '#2a7a4a' }),
  emese: H(UD, { skin: '#f3d6bd', hair: '#d0a245', style: 'pony', top: '#ce322c', outfit: 'tee', scarf: '#c0392b' }),
  gergo: H(UD, { skin: PALE, hair: '#2d2d2d', style: 'long', top: '#73894a', outfit: 'hoodie' }),
  krisztian: H(UD, { skin: TAN, hair: '#28180e', style: 'short', glasses: true, top: '#3c5b86', outfit: 'tee' }),
  julia: H(UD, { skin: PALE, hair: '#1d130c', style: 'long', top: '#9a4165', outfit: 'tee' }),
  'a-hegyi-szellem': C(UD, 'wendigo'),

  // ---------- Vesta ----------
  'nikolett-beran': H(DS, { skin: '#e8c8aa', hair: '#1e130b', style: 'bun', top: '#2e5783', outfit: 'uniform', trim: '#b2b2b2' }),
  'hubert-tamas': H(DS, { skin: '#e5c19e', style: 'bald', facial: 'goatee', top: '#a35e23', outfit: 'coveralls', trim: '#d9ccb1', hat: 'hardhat', hatColor: '#d0a115' }),
  'eszter-lakatos': H(DS, { skin: BROWN, hair: '#28180e', style: 'bob', top: '#c08c25', outfit: 'jacket', trim: '#26292f' }),
  'zoltan-hamar': H(DS, { skin: '#6d4529', hair: '#2d2d2d', style: 'short', facial: 'stubble', top: '#d88c4a', outfit: 'coveralls', trim: '#f2ede4' }),
  'ivan-kovacs': C(DS, 'ivan'),
  'csaba-mester': H(DS, { skin: '#e5c8aa', hair: '#787878', style: 'side', glasses: true, top: '#cbd8e1', outfit: 'labcoat', trim: '#2e5783' }),
  'tibor-kun': H(DS, { skin: TAN, hair: '#1d130c', style: 'short', top: '#26292f', outfit: 'tee', extra: 'headset' }),
  'a-vadasz': C(DS, 'vadasz'),

  // ---------- Sziklatető ----------
  'rudolf-tarnai': H(OL, { skin: TAN, hair: '#e6e6e6', style: 'slick', top: '#3a404d', outfit: 'suit', trim: '#ebebeb' }),
  'vajk-pal': H(OL, { skin: PALE, hair: '#4a3120', style: 'side', glasses: true, top: '#6b855c', outfit: 'jacket', trim: '#e8e4d6' }),
  'atya-marton': H(OL, { skin: '#e0b793', hair: '#838383', style: 'side', facial: 'beard', top: '#121217', outfit: 'priest', trim: '#e1e1d6' }),
  'elemer-gulyas': H(OL, { skin: '#d9cdbd', hair: '#2d2d2d', style: 'slick', top: '#f2ede3', outfit: 'suit', trim: '#9f2837', extra: 'stitches' }),
  'dr-vargha': H(OL, { skin: TAN, hair: '#a6a6a6', style: 'side', glasses: true, top: '#e5ecf0', outfit: 'labcoat', trim: '#94a1aa' }),
  'jeno-balogh': H(OL, { skin: TAN, hair: '#4a3120', style: 'short', facial: 'stubble', top: '#997149', outfit: 'jacket', trim: '#dbd5c4' }),
  'kristof-vadas': H(OL, { skin: '#bfae9a', style: 'bald', top: '#81817d', outfit: 'straitjacket', trim: '#51514f', extra: 'scar', big: true }),
  'milan-ungvari': H(OL, { skin: '#e8c4a0', hair: '#2d2d2d', style: 'short', top: '#4a6588', outfit: 'jacket', trim: '#e0e0e0', extra: 'camera', hat: 'beanie', hatColor: '#2a7a4a' }),

  // ---------- A Köd Városa ----------
  'sandor-szeles': H(SH, { skin: '#e8c8aa', hair: '#7d502b', style: 'side', top: '#869949', outfit: 'jacket', trim: '#e8e4d6' }),
  'anna-oroszi': H(SH, { skin: '#e9cdb4', hair: '#1d130c', style: 'long', top: '#21344a', outfit: 'dress', extra: 'scar' }),
  lujza: H(SH, { skin: PALE, hair: '#8e542d', style: 'pony', top: '#d18bb1', outfit: 'dress', kid: true }),
  mara: H(SH, { skin: '#e4ecf2', hair: '#1d130c', style: 'long', top: '#c1cfde', outfit: 'dress', extra: 'ghost' }),
  'ede-dombi': H(SH, { skin: '#e4bd9a', hair: '#5b3c23', style: 'short', top: '#dad3bd', outfit: 'tee', extra: 'blood', big: true }),
  'a-piramisfeju': C(SH, 'piramis'),
  'a-lampasfeju-apolono': C(SH, 'nurse'),
  'a-hazug-alak': C(SH, 'liar'),

  // ---------- A Sötét Kapu ----------
  'a-csapdas': C(DB, 'csapdas'),
  'margo-tamas': H(DB, { skin: PALE, hair: '#462715', style: 'pony', top: '#dc2649', outfit: 'jacket', trim: '#26292f' }),
  'nelli-karolyi': H(DB, { skin: '#e8c3a3', hair: '#33caca', style: 'pony', top: '#41414d', outfit: 'hoodie' }),
  'denes-feher': H(DB, { skin: PALE, hair: '#4a3120', style: 'short', glasses: true, top: '#7996b8', outfit: 'jacket', trim: '#f2ede4' }),
  'hung-mihal': H(DB, { skin: '#f0d2b4', hair: '#2e2e2e', style: 'short', top: '#c26a9f', outfit: 'jacket', trim: '#3f3f48' }),
  'klaudia-morvai': H(DB, { skin: DARK, hair: '#2d2d2d', style: 'afro', top: '#61a75b', outfit: 'jacket', trim: '#f2ede4' }),
  'david-kiraly': H(DB, { skin: '#e5bb98', hair: '#7a5432', style: 'short', facial: 'stubble', top: '#2f3339', outfit: 'tee', extra: 'scar', big: true }),
  'jakab-pal': H(DB, { skin: PALE, hair: '#141414', style: 'slick', facial: 'stubble', top: '#3d4d2a', outfit: 'jacket', trim: '#c8bc9a' }),
  'kalman-szuts': H(DB, { skin: '#f0d4b8', hair: '#4a3120', style: 'side', top: '#997149', outfit: 'jacket', trim: '#f2ede4', extra: 'blood' }),

  // ---------- Fényhegy ----------
  'attila-vago': H(AW, { skin: '#e9c9a8', hair: '#1e130b', style: 'side', facial: 'stubble', top: '#5b432b', outfit: 'jacket', trim: '#b7ab8c' }),
  'barna-vincze': H(AW, { skin: '#e4bd9a', hair: '#4a3120', style: 'curly', facial: 'goatee', top: '#dab645', outfit: 'tee', big: true }),
  'dr-emil-hofer': H(AW, { skin: '#e3c8ae', hair: '#b8b8b8', style: 'slick', glasses: true, top: '#1e2a43', outfit: 'suit', trim: '#641313' }),
  'tamas-zsolnai': C(AW, 'diver'),
  'tibor-andrasfi': H(AW, { skin: '#e0b793', hair: '#cfcfcf', style: 'bald', facial: 'longbeard', top: '#842e2e', outfit: 'vest', trim: '#bb8a6b', hat: 'cap', hatColor: '#4a351d', big: true }),
  'odon-andrasfi': H(AW, { skin: '#e0b793', hair: '#cfcfcf', style: 'wild', facial: 'longbeard', top: '#3e546d', outfit: 'vest', trim: '#bb8a6b', big: true, glasses: true }),
  'cintia-szovo': H(AW, { skin: '#e5c8aa', hair: '#d4d4d4', style: 'bun', top: '#835b97', outfit: 'dress', extra: 'lamp' }),
  'patrik-meszar': H(AW, { skin: '#e3c1a0', hair: '#919191', style: 'long', top: '#2f2f38', outfit: 'jacket', trim: '#333', extra: 'shades' }),
  'ilona-vago': H(AW, { skin: '#f3d4bc', hair: '#d0a245', style: 'long', top: '#6d9eca', outfit: 'dress' }),
  'sara-toro': H(AW, { skin: '#e9c9a8', hair: '#4a3120', style: 'pony', top: '#a49269', outfit: 'uniform', trim: '#dab645', hat: 'police', hatColor: '#89774a' }),
  // ---------- tartalék szereplők a korábbi világokból (a generátor a készletből választ) ----------
  'pottyos-hernyo': C(PP, 'pottyos'),
  macskanap: C(PP, 'macskanap'),
  'babika-rozsi': H(PP, { skin: '#f6ebe2', hair: '#4a3120', style: 'bun', top: '#f1c5dd', outfit: 'dress', kid: true }),
  'lazar-leo': H(RE, { skin: PALE, hair: '#4b3420', style: 'side', top: '#2c396a', outfit: 'uniform', trim: '#b2b2b2', scarf: '#c0392b' }),
  meszaros: H(AL, { skin: '#d9b48e', hair: '#a6a6a6', style: 'side', facial: 'goatee', top: '#d88c4a', outfit: 'coveralls', trim: '#f2ede4' }),
  dani: H(UD, { skin: '#e9cdb4', hair: '#8b603c', style: 'short', top: '#6487ba', outfit: 'tee', kid: true }),
  szabi: H(TL, { skin: TAN, hair: '#2a1c12', style: 'short', top: '#6a7a4a', outfit: 'tee', kid: true }),
  agnes: H(UD, { skin: '#e9cdb4', hair: '#5b3c23', style: 'bob', glasses: true, top: '#a27091', outfit: 'tee' }),
  'kinga-dezso': H(DS, { skin: DARK, hair: '#2d2d2d', style: 'bob', top: '#4d85c0', outfit: 'uniform', trim: '#e0e0e0' }),
  'bence-marton': H(DS, { skin: TAN, hair: '#4b3420', style: 'short', top: '#40464d', outfit: 'coveralls', trim: '#d9ccb1' }),
  marianna: H(SH, { skin: '#f3dcc4', hair: '#dfca7b', style: 'long', top: '#9a3323', outfit: 'dress' }),
  'rozsa-csikos': H(AW, { skin: '#e9c9a8', hair: '#c86936', style: 'bun', top: '#48aa83', outfit: 'dress' }),

  // ---------- Napfény Bevásárlóközpont ----------
  nyolc: H(ST, { skin: '#f3dcc4', hair: '#58351e', style: 'bob', top: '#df7b9c', outfit: 'dress', kid: true }),
  'matyas-palfi': H(ST, { skin: PALE, hair: '#2d2d2d', style: 'short', top: '#be4a4a', outfit: 'jacket', trim: '#f2ede4', kid: true }),
  'dezso-hunyadi': H(ST, { skin: PALE, hair: '#b69162', style: 'short', top: '#369c5f', outfit: 'tee', hat: 'cap', hatColor: '#369c5f', kid: true }),
  'lorant-sarkany': H(ST, { skin: DARK, hair: '#2d2d2d', style: 'short', top: '#61764c', outfit: 'jacket', trim: '#f2ede4', hat: 'bandana', hatColor: '#d55144', kid: true }),
  'vilmos-balint': H(ST, { skin: PALE, hair: '#4b3420', style: 'side', top: '#3c5b86', outfit: 'jacket', trim: '#d9ccb1', kid: true }),
  'mariann-majer': H(ST, { skin: PALE, hair: '#d55844', style: 'long', top: '#edcd59', outfit: 'tee', kid: true }),
  'istvan-halasz': H(ST, { skin: TAN, hair: '#1e130b', style: 'side', top: '#122854', outfit: 'uniform', trim: '#d1d1d1' }),
  'rita-berki': H(ST, { skin: PALE, hair: '#e2c68f', style: 'bob', top: '#224ca0', outfit: 'uniform', trim: '#ebebeb' }),
  'jeno-kertesz': H(ST, { skin: TAN, hair: '#1e130b', style: 'short', facial: 'mustache', top: '#c3641d', outfit: 'tee', big: true }),
  'erika-sarosi': H(ST, { skin: DARK, hair: '#2d2d2d', style: 'afro', top: '#d18bb1', outfit: 'tee', kid: true }),
  'a-liderc': C(ST, 'lidero'),

  // ---------- Hóerőd ----------
  'jon-hovari': H(GT, { skin: PALE, hair: '#141414', style: 'curly', facial: 'stubble', top: '#121217', outfit: 'jacket', trim: '#73736b' }),
  'dalma-tuzi': H(GT, { skin: '#f3dcc4', hair: '#eeeee8', style: 'long', top: '#3f3f4b', outfit: 'dress' }),
  'tamas-rendes': H(GT, { skin: PALE, hair: '#e9d39f', style: 'side', facial: 'beard', top: '#9c3636', outfit: 'vest', trim: '#dab645', extra: 'scar', kid: true }),
  'aliz-szurke': H(GT, { skin: PALE, hair: '#28180e', style: 'bob', top: '#475360', outfit: 'jacket', trim: '#c1c1c1', kid: true }),
  'sarolta-hideg': H(GT, { skin: '#f3dcc4', hair: '#c86936', style: 'long', top: '#4d85c0', outfit: 'dress' }),
  'cecilia-aranyi': H(GT, { skin: '#f3dcc4', hair: '#d7b155', style: 'bob', top: '#73131f', outfit: 'dress', hat: 'crown' }),
  'jeno-aranykez': H(GT, { skin: PALE, hair: '#e9d39f', style: 'slick', facial: 'stubble', top: '#dab645', outfit: 'uniform', trim: '#9c3636' }),
  'balint-fagyos': H(GT, { skin: PALE, hair: '#6c4026', style: 'side', top: '#6a717b', outfit: 'tee', kid: true }),
  'samu-tarlos': H(GT, { skin: PALE, hair: '#6c4026', style: 'short', top: '#3f3f48', outfit: 'jacket', trim: '#a0a09a', big: true }),
  'a-fagykiraly': C(GT, 'fagykiraly'),

  // ---------- Portál-garázs ----------
  'rikard-santa': H(RM, { skin: '#e8d2bd', hair: '#83c2e1', style: 'wild', top: '#cbd8e1', outfit: 'labcoat', trim: '#2e5783' }),
  'murci-szmit': H(RM, { skin: PALE, hair: '#8b603c', style: 'short', top: '#f5d46f', outfit: 'tee', kid: true }),
  'zsanett-szmit': H(RM, { skin: PALE, hair: '#c3641d', style: 'long', top: '#df7b9c', outfit: 'tee' }),
  'bea-szmit': H(RM, { skin: PALE, hair: '#e9d39f', style: 'bob', top: '#b1cbe2', outfit: 'jacket', trim: '#f2ede4' }),
  'jerzsi-szmit': H(RM, { skin: PALE, hair: '#392413', style: 'side', top: '#577557', outfit: 'tee' }),
  'a-madarember': C(RM, 'madarember'),
  csippento: C(RM, 'csippento'),
  'mr-fenekcsomo': C(RM, 'fenekcsomo'),
  'gonosz-murci': H(RM, { skin: PALE, hair: '#2d2319', style: 'short', top: '#efba19', outfit: 'tee', extra: 'eyepatch', kid: true, glasses: true }),
  'mr-kerek': C(RM, 'kerek'),

  // ---------- Holdvölgy ----------
  'ella-gyongyosi': H(VD, { skin: '#f0d8c8', hair: '#28180e', style: 'long', top: '#d9ccb1', outfit: 'tee', scarf: '#c0392b' }),
  'szabolcs-sarvari': H(VD, { skin: '#eee0d4', hair: '#8b603c', style: 'side', top: '#61764c', outfit: 'jacket', trim: '#e8e4d6' }),
  'daniel-sarvari': H(VD, { skin: '#eee0d4', hair: '#2d2d2d', style: 'side', facial: 'stubble', top: '#2a2a33', outfit: 'jacket', trim: '#4f4f5a' }),
  'bogi-bertalan': H(VD, { skin: DARK, hair: '#141414', style: 'long', top: '#b74985', outfit: 'tee' }),
  'karola-fabian': H(VD, { skin: '#f3dcc4', hair: '#e9d39f', style: 'long', top: '#b1cbe2', outfit: 'tee' }),
  'mark-denes': H(VD, { skin: PALE, hair: '#81623b', style: 'short', top: '#3d4d2a', outfit: 'tee' }),
  'jeromos-gyongyosi': H(VD, { skin: PALE, hair: '#5b3c23', style: 'short', top: '#59616b', outfit: 'hoodie' }),
  'alfred-sos': H(VD, { skin: TAN, hair: '#8b603c', style: 'short', facial: 'stubble', top: '#997149', outfit: 'jacket', trim: '#dbd5c4' }),
  'tamas-lukacs': H(VD, { skin: TAN, hair: '#2d2d2d', style: 'short', top: '#3f3f48', outfit: 'jacket', trim: '#a0a09a', hat: 'beanie', hatColor: '#2a7a4a' }),
  'kata-pasztor': H(VD, { skin: '#f3dcc4', hair: '#1e130b', style: 'long', top: '#45111b', outfit: 'dress' }),

  // ---------- Mesevilág ----------
  fin: C(AT, 'fin'),
  dzsaki: C(AT, 'dzsaki'),
  'szaloncukor-hercegno': H(AT, { skin: '#f4a6c8', hair: '#eb679e', style: 'long', top: '#eb679e', outfit: 'dress', hat: 'crown', glasses: true }),
  marcella: H(AT, { skin: '#a9b4c2', hair: '#121217', style: 'long', top: '#671f2b', outfit: 'tee', scarf: '#c0392b' }),
  hokiraly: H(AT, { skin: '#9fd0f0', hair: '#badeff', style: 'bald', facial: 'longbeard', top: '#3c6490', outfit: 'dress', hat: 'crown', big: true }),
  bimbo: C(AT, 'bimbo'),
  'gocsortos-hercegno': C(AT, 'gocsi'),
  'a-lich': C(AT, 'lich'),

  // ---------- Esőerdő-város ----------
  'bella-lenkei': H(TW, { skin: '#f0d8c8', hair: '#28180e', style: 'long', top: '#2e5783', outfit: 'jacket', trim: '#c1c1c1' }),
  'ede-kollar': H(TW, { skin: '#e6e2e0', hair: '#ad7135', style: 'wild', top: '#3f3f48', outfit: 'jacket', trim: '#a0a09a' }),
  'jakob-fekete': H(TW, { skin: '#a8744a', hair: '#2d2d2d', style: 'long', top: '#885f4a', outfit: 'tee', big: true }),
  'aliz-kollar': H(TW, { skin: '#e6e2e0', hair: '#2d2d2d', style: 'long', top: '#d18bb1', outfit: 'dress' }),
  'karoly-kollar': H(TW, { skin: '#e6e2e0', hair: '#e3d29e', style: 'slick', top: '#e5ecf0', outfit: 'labcoat', trim: '#4d85c0' }),
  'peter-lenkei': H(TW, { skin: TAN, hair: '#4b3420', style: 'short', facial: 'mustache', top: '#4d432a', outfit: 'uniform', trim: '#a38320', hat: 'police', hatColor: '#2c2618', glasses: true }),
  'rozalia-hajdu': H(TW, { skin: '#e6e2e0', hair: '#d7b155', style: 'long', top: '#8a1224', outfit: 'dress' }),
  'jonas-hajdu': H(TW, { skin: '#e6e2e0', hair: '#e3d29e', style: 'side', top: '#515151', outfit: 'jacket', trim: '#a0a09a', extra: 'scar' }),
  'gabor-sas': H(TW, { skin: '#e6e2e0', hair: '#6a512c', style: 'slick', top: '#1f1717', outfit: 'jacket', trim: '#4f3737' }),

  // ---------- Sáncváros ----------
  'rudi-gorbe': H(WD, { skin: TAN, hair: '#8b603c', style: 'short', facial: 'stubble', top: '#a49269', outfit: 'uniform', trim: '#dab645', hat: 'fedora', hatColor: '#aa8348' }),
  'mihaela-szep': H(WD, { skin: DARK, hair: '#2d2d2d', style: 'long', top: '#515151', outfit: 'jacket', trim: '#818181' }),
  'denes-deak': H(WD, { skin: TAN, hair: '#1e130b', style: 'long', facial: 'stubble', top: '#302924', outfit: 'vest', trim: '#545454' }),
  'kamilla-pelle': H(WD, { skin: PALE, hair: '#d4d4d4', style: 'bob', top: '#9f9183', outfit: 'jacket', trim: '#e8e4d6' }),
  'gyula-reti': H(WD, { skin: '#f0d2b4', hair: '#141414', style: 'short', top: '#3c5b86', outfit: 'tee', hat: 'cap', hatColor: '#26292f' }),
  'magdolna-zold': H(WD, { skin: PALE, hair: '#4b3420', style: 'long', top: '#9a3323', outfit: 'tee' }),
  'nemes-noel': H(WD, { skin: TAN, hair: '#232323', style: 'slick', facial: 'beard', top: '#121217', outfit: 'jacket', trim: '#9a3323', big: true, scarf: '#c0392b' }),
  'kornel-gorbe': H(WD, { skin: PALE, hair: '#4b3420', style: 'long', top: '#505037', outfit: 'tee', hat: 'cap', hatColor: '#6a512c', extra: 'eyepatch', kid: true }),
  'a-fonok': H(WD, { skin: TAN, hair: '#1e130b', style: 'side', facial: 'mustache', top: '#4d432a', outfit: 'suit', trim: '#c1c1c1', extra: 'eyepatch' }),

  // ---------- Karantén-zóna ----------
  'jozsef-muller': H(TL, { skin: TAN, hair: '#545454', style: 'short', facial: 'beard', top: '#672b1f', outfit: 'jacket', trim: '#c8bc9a', big: true }),
  'ella-szucs': H(TL, { skin: PALE, hair: '#67371f', style: 'pony', top: '#9a3323', outfit: 'jacket', trim: '#151518', kid: true }),
  tesza: H(TL, { skin: '#caa27f', hair: '#141414', style: 'pony', top: '#303026', outfit: 'jacket', trim: '#73736b' }),
  'tomi-muller': H(TL, { skin: TAN, hair: '#4b3420', style: 'short', facial: 'stubble', top: '#577557', outfit: 'jacket', trim: '#c8bc9a', hat: 'cap', hatColor: '#4c412a' }),
  'marcsi-makai': H(TL, { skin: DARK, hair: '#141414', style: 'afro', top: '#263026', outfit: 'uniform', trim: '#73736b' }),
  bela: H(TL, { skin: TAN, hair: '#828282', style: 'bald', facial: 'goatee', top: '#4e644e', outfit: 'jacket', trim: '#a0a09a', big: true }),
  hektor: H(TL, { skin: DARK, hair: '#141414', style: 'short', facial: 'stubble', top: '#515145', outfit: 'jacket', trim: '#c8bc9a' }),
  renata: H(TL, { skin: DARK, hair: '#141414', style: 'long', top: '#232323', outfit: 'jacket', trim: '#535353', kid: true }),
  'abigel-andrasy': H(TL, { skin: '#eac9a4', hair: '#d0a245', style: 'pony', top: '#263026', outfit: 'tee', big: true }),
  'a-kattogo': C(TL, 'kattogo'),

  // ---------- Varázsiskola ----------
  'hugo-pakozdi': H(HPW, { skin: PALE, hair: '#2d2d2d', style: 'wild', glasses: true, top: '#a02222', outfit: 'jacket', trim: '#dab645', extra: 'bolt' }),
  'hermina-gazdag': H(HPW, { skin: '#f0d0b0', hair: '#392413', style: 'long', top: '#151518', outfit: 'jacket', trim: '#791414' }),
  'remi-vasvari': H(HPW, { skin: PALE, hair: '#d55844', style: 'short', top: '#3f3f48', outfit: 'jacket', trim: '#c72020' }),
  'albert-dombo': H(HPW, { skin: '#f0d8c0', hair: '#ebebeb', style: 'long', facial: 'longbeard', glasses: true, top: '#61378b', outfit: 'dress', hat: 'wizard', hatColor: '#61378b' }),
  'perec-pitvar': H(HPW, { skin: '#d8c3a8', hair: '#2a2a33', style: 'long', top: '#2a2a33', outfit: 'priest', trim: '#2a2a33' }),
  'gyuri-bozontos': H(HPW, { skin: '#d9ad86', hair: '#1d130c', style: 'wild', facial: 'longbeard', top: '#4b3420', outfit: 'vest', trim: '#6a512c', big: true }),
  'dorian-galambos': H(HPW, { skin: '#f3ece6', hair: '#f4f0e1', style: 'slick', top: '#285a41', outfit: 'jacket', trim: '#e0e0e0' }),
  'nandor-hosszuszar': H(HPW, { skin: PALE, hair: '#4b3420', style: 'short', top: '#151518', outfit: 'jacket', trim: '#791414' }),
  'lujza-szerelmes': H(HPW, { skin: '#f3dcc4', hair: '#d5c077', style: 'long', top: '#2e5783', outfit: 'dress' }),
  'gina-vasvari': H(HPW, { skin: PALE, hair: '#d55844', style: 'long', top: '#3f3f48', outfit: 'jacket', trim: '#c72020' }),
  'minerva-kopjas': H(HPW, { skin: '#e9d0b6', hair: '#232323', style: 'bun', glasses: true, top: '#192d19', outfit: 'dress', hat: 'wizard', hatColor: '#192d19' }),
  'a-nevtelen-ur': C(HPW, 'nevtelen'),
}
