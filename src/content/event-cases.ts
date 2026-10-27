import type { CastMember } from '../engine/generator'
import type { Difficulty } from '../shared/puzzle'
import type { EventDef } from './events'

/**
 * Az Esemény-világok ügyei: minden világnak 5 egymás utáni ügye van (növekvő méret és nehézség), mindegyiknek saját
 * áldozata, címe és története. Az áldozat a világ szereplő-készletéből (az eredeti áldozat + a gyanúsítottak) kerül ki:
 * az eredeti áldozat ilyenkor gyanúsítottként „beáll” a helyére, így nem kell új szereplő. A történetek helyszín-függetlenek
 * (a pályán csak a kiválasztott helyiségek szerepelnek), a világ szabályát a játék külön kiírja.
 */
export interface EventCase {
  /** Az áldozat neve a világ készletéből; elhagyva az eredeti áldozat. */
  v?: string
  title: string
  story: string
}

/**
 * Az 5 ügy nehézségi lépcsője (minden világban ugyanaz): az 1–2. ügy könnyű és gondolkodtató (kis tábla, kevés „valakitől merre állt” nyom, sok ötletes egyedi nyom:
 * „ő volt az egyetlen, aki széken ült”, „a Konyhában ő volt az egyetlen férfi”, „a Konyhában széken ült” — több székkel), a 3. közepes, a 4–5. már nehéz (nagyobb tábla, több
 * viszonyító és gyenge nyom).
 */
/** A tábla mérete a világ legnagyobb (5.) ügyéhez képest: 5 → a világ nagy méretéig (a törtrész a lépcső). */
const SIZE_RAMP = [0, 0.35, 0.6, 0.8, 1]
/** A megjelenített / generálási nehézség ügyenként (a nagy, 8+ táblás világok eggyel nehezebbről indulnak). */
const TIER_D = [1, 2, 3, 4, 5]
/** Legfeljebb ennyi gyanúsított nyoma viszonyulhat másik szereplőhöz (északra / balra / mellett / egy helyiségben…). */
const TIER_REL = [1, 1, 2, 2, 3]
/** Az „ötletes” (nem sima tárgy / sor) nyomú gyanúsítottak célaránya. */
const TIER_RICH = [0.6, 0.6, 0.6, 0.45, 0.3]
export const CASES_PER_WORLD = 5

/** Világonként (a világ azonosítója szerint) az ügyek — az 1. ügy története a világ bevezetője (lásd `events.ts`). */
export const CASES: Record<string, EventCase[]> = {
  'night-pizzeria': [
    { title: 'Az éjjeliőr műszakja', story: '' },
    { v: 'Miles Schmitt', title: 'Hajnali hat óra', story: 'Miles Schmitt nem lépett ki a pizzéria ajtaján, amikor hajnalban kisütött a nap. A kamerák az egész éjszakát felvették — de egyszerre csak egy szobát mutatnak.' },
    { v: 'A Zsinórmester', title: 'Elnémult zenedoboz', story: 'A zenedoboz elhallgatott, A Zsinórmester pedig mozdulatlanul hever a padlón. Valaki nem húzta fel időben — vagy éppen azért nem.' },
    { v: 'Arany Teddy', title: 'Az aranyszínű árnyék', story: 'Arany Teddy a sötétből bukkant elő, és nem kelt fel többé. Senki sem tudja, ki volt vele utoljára.' },
    { v: 'Rozsdás Róka', title: 'Mögötte a függöny', story: 'Amikor a kamerák újra visszajöttek, Rozsdás Róka már nem mozdult. A fények közben többször is villogtak — valaki a sötétben futott.' },
  ],
  'toy-factory': [
    { title: 'A zöld kéz', story: '' },
    { v: 'Bongó Nyuszi', title: 'Üres dobszó', story: 'Bongó Nyuszi dobja elnémult, ő maga pedig a játékgyár folyosóján fekszik. A szalagok még mindig mennek, mintha mi sem történt volna.' },
    { v: 'Nyújtólábú Anyu', title: 'Hosszú karok', story: 'Nyújtólábú Anyu a karjaival sem érte el, aki végzett vele. A zöld kéz mégis tudott valamit — a gyanúsítottak viszont nem mind.' },
    { v: 'CicaSzundi', title: 'Nappali álom', story: 'CicaSzundi elaludt, de nem ébredt fel többé. A gáz szaga még a szellőzőben lebeg, a játékok pedig hallgatnak.' },
    { v: 'Daisy', title: 'A baba utolsó szava', story: 'Daisy a vitrin mellett fekszik, a gyár pedig egész éjjel zúgott. Valaki elvette a hangját.' },
  ],
  'city-police': [
    { title: 'Y úr kalapja', story: '' },
    { v: 'Bryce Steel', title: 'A kapitány irodája', story: 'Bryce Steel a saját irodájában maradt, a titkos ajtó pedig nyitva áll. A kulcsok mindkét irányba nyitnak — és mindkét irányba figyelnek.' },
    { v: 'Martin Brannick', title: 'Az utolsó rádióüzenet', story: 'Martin Brannick az utolsó üzenetét rádión adta le, aztán csend lett. A rendőrség folyosói éjszaka másként néznek ki.' },
    { v: 'Anita Birkley', title: 'A labor titkai', story: 'Anita Birkley kutatási jegyzetei szétszóródtak a földön. Aki a laborból kijutott, nem mondta el, mit látott.' },
    { v: 'Ava Wei', title: 'A kampós kötél', story: 'Ava Wei kampós kötele a korláton lóg, ő maga viszont a földön fekszik. Senki sem tudja, kinek dolgozott valójában.' },
  ],
  'space-station': [
    { title: 'A szellőző csúszása', story: '' },
    { v: 'Harlow', title: 'Zárt ajtó mögött', story: 'Harlow a rendszerek közt dolgozott, amikor az áram megint kimaradt. A mozgásérzékelő pittyeg, de nevet nem mond.' },
    { v: 'Wade', title: 'Riasztás után', story: 'Wade ott maradt, ahol a riasztás megszólalt. A szállítókocsi még mindig az ajtó előtt áll.' },
    { v: 'Rico', title: 'Késő jelentés', story: 'Rico nem jelentkezett be a műszak végén. A mozgásérzékelő jelzett — csak éppen nem neki.' },
    { v: 'Nora Tailor', title: 'A hívás megszakadt', story: 'Nora Tailor hangja félbeszakadt a rádióban, aztán sisteregni kezdett. A Novastopol Állomás újra hallgat.' },
  ],
  'mountain-cabin': [
    { title: 'Az Agancsos Éhség éjszakája', story: '' },
    { v: 'Emery', title: 'Az első sikoly', story: 'Emery kiabált, de a hegy visszhangot sem küldött. A totemek a kabin körül ugyanúgy állnak, mint reggel.' },
    { v: 'Jessamine', title: 'Zárt kabinajtó', story: 'Jessamine bezárkózott, amikor a fények kialudtak. Reggelre az ajtó nyitva volt — belülről.' },
    { v: 'Matty', title: 'Elmosódott nyomok', story: 'Matty nyomai a hóban a kabinig vezetnek, onnan már nem. A totemek mellett állók többet látnak.' },
    { v: 'Joss', title: 'A rejtett hang', story: 'Joss a kabinban maradt, amikor kialudt a villany. A hajnal közeledik — és vele az igazság.' },
  ],
  'deep-ship': [
    { title: 'Az Üldöző maradt', story: '' },
    { v: 'Tristan Kline', title: 'A néma folyosó', story: 'Tristan Kline holtan maradt, a lámpák pedig még mindig villognak. A nyomásmentes szekciók ajtaja nyitva áll.' },
    { v: 'Henrik Tillmann', title: 'A főmérnök naplója', story: 'Henrik Tillmann naplója félbeszakadt, ő maga a padlón fekszik. Csak a páncélosok mehettek utána.' },
    { v: 'Callum Merrow', title: 'A biztonsági főnök', story: 'Callum Merrow sosem bízott a hajó vezetőiben. Most nem bízhat többé senkiben — a lámpák kialudtak.' },
    { v: 'Benedict Mathers', title: 'A kapitány utolsó parancsa', story: 'Benedict Mathers kiadta az utolsó parancsot, aztán csend lett. A Kuromura Űrhajó szekciói közül néhányba csak páncélosok léphetnek.' },
  ],
  'summit-shelter': [
    { title: 'Elemhiány', story: '' },
    { v: 'Jerome Blake', title: 'A lépcső alján', story: 'Jerome Blake a lépcső alján fekszik, a zseblámpa kezében még világít. A menedékház falai mindent láttak.' },
    { v: 'Marvin atya', title: 'Elnémult harang', story: 'Marvin atya imája félbeszakadt, a padok üresek. A sötétben csak a kurzorod fénye mutat utat.' },
    { v: 'Dr. Werling', title: 'Az orvos jegyzetei', story: 'Dr. Werling jegyzetei szétszórva hevernek a kórterem padlóján. Ki hordta ki a fiókokat?' },
    { v: 'Edwin Glasswick', title: 'Nyitott ajtók', story: 'Edwin Glasswick dolgozószobája mindig zárva volt, most tárva áll. Az elem fogy, a folyosók pedig hosszúak.' },
  ],
  'fog-town': [
    { title: 'Az Obeliszkfejű Hóhér', story: '' },
    { v: 'Edwin Dombro', title: 'A hűtőkamra', story: 'Edwin Dombro a hűtőkamra előtt maradt, a köd pedig bekúszott mögötte. A rádió recseg, a szavak elhalványulnak.' },
    { v: 'A Megtévesztő Alak', title: 'Tükörszoba', story: 'A Megtévesztő Alak sosem mutatta az arcát — most sem látjuk, ki vele végzett. A rádió egyes szavakat kitakar.' },
    { v: 'A Hólyagfejű Ápolónő', title: 'Az éjszakai műszak', story: 'A Hólyagfejű Ápolónő a folyosón állt, amikor a lámpák kialudtak. A köd mindent eltakar, a rádió pedig eltorzítja a nyomokat.' },
    { v: 'Angelica Orsino', title: 'A lépcsőház alja', story: 'Angelica Orsino a lépcsőházban várt valakire, aki sosem jött el. A rádió egy-egy szót kitakar.' },
  ],
  'entity-realm': [
    { title: 'A Hurokmester horgai', story: '' },
    { v: 'Dwayne Fairbrook', title: 'Az első generátor', story: 'Dwayne Fairbrook utoljára a generátornál látták, ahonnan zaj hallatszott. A gyilkos viszont sosem hibázik így.' },
    { v: 'Claudine Moreau', title: 'Gyógyító kéz', story: 'Claudine Moreau elsősegély-csomagja üresen hever mellette. A kukoricás zizeg, a generátorok zúgnak.' },
    { v: 'Davis Crown', title: 'A harcos', story: 'Davis Crown utoljára még nevetett, aztán elnémult. Csak a nyomok maradtak.' },
    { v: 'Quincy Smythe', title: 'Álmok szövete', story: 'Quincy Smythe nem ébredt fel. A Jelenlét Birodalmában a generátorok zaja a legrosszabb tanú.' },
  ],
  'lake-town': [
    { title: 'Az elme-kórház', story: '' },
    { v: 'Woden Anders', title: 'A tó partján', story: 'Woden Anders a Fazék-tó partján maradt. A fény és a sötétség mezői közt a Birtokoltak csak sötétben állhatnak.' },
    { v: 'Benny Wheelwright', title: 'Benny utolsó vicce', story: 'Benny Wheelwright nem nevetett, amikor a lámpák kialudtak. A Birtokoltak csak sötét mezőn állhatnak.' },
    { v: 'Thunder Anders', title: 'A testvér árnyéka', story: 'Thunder Anders a villanyoszlop alatt fekszik, a fény már nem éri el. A Birtokoltak sötétben mozognak.' },
    { v: 'Pete Mayne', title: 'A rádiós hangja', story: 'Pete Mayne hangja elhallgatott. A fény és a sötétség mezői kijelölik, hol állhatott a Birtokolt.' },
  ],
  'sunshine-mall': [
    { title: 'StarPláza, július 4.', story: '' },
    { v: 'Jimmy Hopley', title: 'A rendőrfőnök', story: 'Jimmy Hopley a bevásárlóközpont hátsó folyosóján maradt, mielőtt kialudtak a fények. Az Árnyoldal csak a zseblámpád körül látszik.' },
    { v: 'Stevie Hargrove', title: 'Fagylaltozó', story: 'Stevie Hargrove fagylaltos sapkája a pulton maradt, ő maga eltűnt. Az áramszünetben csak a kurzorod fénye világít.' },
    { v: 'Erin St. Clair', title: 'A játékterem', story: 'Erin St. Clair a játékteremből sosem ment el nyerés nélkül. Ma este mégis elnémultak a gépek.' },
    { v: 'Dusty Hendricks', title: 'A rádióhívás', story: 'Dusty Hendricks utolsó hívása a labor felől érkezett, aztán csend lett. Az Árnyoldal sötétjében csak a zseblámpád fénye marad.' },
  ],
  'frost-keep': [
    { title: 'A Fagykirály', story: '' },
    { v: 'Cerys Goldmere', title: 'A bor és a méreg', story: 'Cerys Goldmere a pohár mellett maradt, amikor a kandallók kialudtak. A Gáton túlra csak páncélos mer menni.' },
    { v: 'Jaimon Goldmere', title: 'Az aranykéz', story: 'Jaimon Goldmere az aranykezével sem tudta megvédeni magát. Az éjszaka hidege mindenre ráfagyott.' },
    { v: 'Tyrian Goldmere', title: 'Tyrian pohara', story: 'Tyrian Goldmere utoljára még a borára koccintott, aztán a pohár kihullott a kezéből. A Gáton túlra csak páncélos merészkedik.' },
    { v: 'Samwin Tarley', title: 'A könyvmoly', story: 'Samwin Tarley könyvei szétszórva hevernek a földön. Aki a Gáton túlra ment, páncélt viselt.' },
  ],
  'portal-garage': [
    { title: 'Nézzrám úr', story: '' },
    { v: 'Gerry Miller', title: 'Gerry kimaradt', story: 'Gerry Miller nem tért vissza, amikor megnyílt a portál. A zöld, kék és narancs portál mindkét irányba lát.' },
    { v: 'Tollember', title: 'A tollember esküvője', story: 'Tollember az Erőd-városból jött, és nem is jutott haza. A portálok mellett állók a szomszéd helyiséget is látják.' },
    { v: 'Gyűrci', title: 'Csattanó!', story: 'Gyűrci gyűrcölt, aztán csend lett. A portálok mindkét oldalra átlátnak.' },
    { v: 'Gonosz Marty', title: 'A szemtelen Marty', story: 'Gonosz Marty az Erőd-város tetején állt, most mégis a padlón fekszik. Egy dimenzióval odébb valaki nagyon nem ezt akarta.' },
  ],
  'moon-town': [
    { title: 'A szüreti fesztivál', story: '' },
    { v: 'Aldric Saltwell', title: 'A tanár pohara', story: 'Aldric Saltwell pohara félig tele maradt a Holdi Kocsmában. A lámpák körül napfény van — a vámpírok csak árnyékban állhatnak.' },
    { v: 'Taylor Lockridge', title: 'Teliholdkor', story: 'Taylor Lockridge a lépcsőn feküdt, amikor kisütött a hold. A napfényes mezőket a vámpírok elkerülik.' },
    { v: 'Jerome Gilmore', title: 'A szellem látogatása', story: 'Jerome Gilmore utoljára a régi házban látták. A lámpák fénykörén kívül minden árnyék.' },
    { v: 'Matty Donnelly', title: 'Az utolsó műszak', story: 'Matty Donnelly a Holdi Kocsma pultja mögött maradt, amikor a lámpák elaludtak. A vámpírok csak árnyékban állhatnak.' },
  ],
  'candy-land': [
    { title: 'A Halhatatlan sírboltja', story: '' },
    { v: 'Hókirály', title: 'A korona nyoma', story: 'A Hókirály koronája a jégen maradt, ő maga eltűnt. A térkép nem mutat mindent — néhány szereplőről csak távolság van.' },
    { v: 'Bütyök hercegnő', title: 'Bütyök, bütyök!', story: 'Bütyök hercegnő a Cukorbirodalom szélén feküdt. A kard és BÍPÓ távolsága árulkodó nyom.' },
    { v: 'Buborékcukor hercegnő', title: 'A laboratórium', story: 'Buborékcukor hercegnő laboratóriumában feldőltek a lombikok. A térkép távolságokat mutat — iránytól függetlenül.' },
    { v: 'Marcelina', title: 'A basszusgitár', story: 'Marcelina basszusgitárja a fűben hever. A kard és BÍPÓ távolsága segít kideríteni, ki járt arra.' },
  ],
  'rain-forest': [
    { title: 'A vámpír-követő', story: '' },
    { v: 'Casper Hales', title: 'Az érzelmek mestere', story: 'Casper Hales a kertben feküdt, amikor leszállt az eső. A totemek mellett Alyssa látomásai feltárulnak.' },
    { v: 'Rosalyn Hales', title: 'Az autók szerelmese', story: 'Rosalyn Hales a kedvenc autója mellett fekszik. A totemek közelében plusz nyom tárul fel.' },
    { v: 'Chaz Heron', title: 'A rendőrfőnök', story: 'Chaz Heron a halászbotjával a tópartra indult. Alyssa látomása szerint nem egyedül ment.' },
    { v: 'Carlyle Callen', title: 'Az orvos', story: 'Carlyle Callen sosem hagyta cserben a betegeit — most nem tudott magán segíteni. A totemek mellett látomások tárulnak fel.' },
  ],
  'walled-town': [
    { title: 'A Helytartó', story: '' },
    { v: 'Neylan', title: 'Lucille', story: 'Neylan baseballütője a földön hever, a szöges drót véres. A generátorok zaja odacsalja a sétálókat — a gyilkos nem állhat mellettük.' },
    { v: 'Karl Granger', title: 'A kalap', story: 'Karl Granger kalapja a verandán maradt. A generátor zaja mindent elárul.' },
    { v: 'Glen Ryu', title: 'A futár', story: 'Glen Ryu a kapuig sosem jutott. A generátorok zaja odavonzza a sétálókat — a gyilkos nem állhat mellettük.' },
    { v: 'Carla Pellet', title: 'Csendes konyha', story: 'Carla Pellet a konyhában fekszik, a tűz még ég. A generátor mellett álló zajt csap.' },
  ],
  'spore-zone': [
    { title: 'A Csattogó', story: '' },
    { v: 'Billy', title: 'A csapdák mestere', story: 'Billy a saját csapdájába sétált. A spórák köde elhomályosítja a rádiót — egy-egy szó kiesik a nyomokból.' },
    { v: 'Hank', title: 'Két testvér', story: 'Hank a kisöccse mellett maradt a szálláson, ahol a rádió még sistergett. A spórák köde kitakarja a nyomok néhány szavát.' },
    { v: 'Marlena', title: 'A Szentjánosbogarak', story: 'Marlena a kórház felé indult, de nem ért oda. A rádió recseg, a szavak elmosódnak.' },
    { v: 'Addie Anders', title: 'Hosszú út', story: 'Addie Anders hosszú útra indult, és nem tért vissza. A spórák köde elnyeli a nyomok néhány szavát.' },
  ],
  'wizard-school': [
    { title: 'A Nagyterem', story: '' },
    { v: 'Drake Malgrave', title: 'A tiltott bájital', story: 'Drake Malgrave a sötét folyosón maradt, amikor kialudtak a fáklyák. A Kalandozók Térképe egyszerre egy helyiséget mutat élesen.' },
    { v: 'Severin Vipera', title: 'A félvér herceg', story: 'Severin Vipera a sötétben fekszik, a térkép pedig hallgat. Válts helyiséget, a többi nyom elhalványul.' },
    { v: 'Haldric', title: 'Nyitott ajtó', story: 'Haldric az ajtó előtt feküdt, a kulcsai mellette. A Kalandozók Térképe csak egy helyiséget mutat élesen.' },
    { v: 'Albin Bumblewick', title: 'A legmagasabb pont', story: 'Albin Bumblewick a legmagasabb pontról hagyta el a kastélyt. A Kalandozók Térképe egyszerre csak egy helyiséget mutat.' },
  ],
}

/**
 * A világok főszereplői (a `cast` nevei szerint): MINDEN ügyben szerepelnek (gyanúsítottként, vagy ők az áldozat) — a gárda nagyobb, mint ahány gyanúsított kell,
 * és a véletlen kiválasztás különben kihagyhatná őket (a Varázs-akadémiából Hugó, a Hóerődből Dalma). Lásd `GenOpts.core`.
 */
const CORE: Record<string, string[]> = {
  'night-pizzeria': ['Teddy Bolyhosmackó', 'Benny Nyuszi', 'Miles Schmitt'],
  'toy-factory': ['Daisy', 'Puszis Mici', 'Nyújtólábú Anyu'],
  'city-police': ['Leo S. Kendrick', 'Clara Redbrook', 'Ava Wei'],
  'space-station': ['Amelia Ridley', 'Nora Tailor'],
  'mountain-cabin': ['Sammy', 'Mick', 'Jessamine'],
  'deep-ship': ['Isaiah Clarkson', 'Kara Danielson'],
  'summit-shelter': ['Milo Upcroft', 'Wade Parks'],
  'fog-town': ['Jamie Sunderwood', 'Marina', 'Angelica Orsino'],
  'entity-realm': ['Dwayne Fairbrook', 'Maggie Thompson', 'Claudine Moreau'],
  'lake-town': ['Adam Waken', 'Alicia Waken'],
  'sunshine-mall': ['Tizenkettő', 'Mick Wheelwright', 'Dusty Hendricks'],
  'frost-keep': ['John Dér', 'Daenara Drakaryn', 'Tyrian Goldmere'],
  'portal-garage': ['Rich Sandrez', 'Marty Miller'],
  'moon-town': ['Elina Gilmore', 'Stephen Salvatori', 'Damian Salvatori'],
  'candy-land': ['Flynn', 'Jax'],
  'rain-forest': ['Belle Heron', 'Edmund Callen', 'Jakob Dark'],
  'walled-town': ['Rich Granger', 'Mishana', 'Darren Dixley'],
  'spore-zone': ['Jonah Millward', 'Ella Williamson'],
  'wizard-school': ['Henry Villámseb', 'Hermina Greenwood', 'Rory Weswick'],
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** Egy világ-definícióból (`ev()` kimenete) a világ 5 egymás utáni ügye: növekvő méret és nehézség, saját áldozat, cím, történet. */
export function expandWorld(base: EventDef): EventDef[] {
  const slug = base.file.replace(/^event-\d+-/, '')
  const cases = CASES[slug]
  if (!cases) throw new Error(`nincsenek ügyek: ${slug}`)
  if (cases.length !== CASES_PER_WORLD) throw new Error(`${slug}: ${CASES_PER_WORLD} ügy kell`)
  const o = base.opts
  const pool: CastMember[] = [o.victim!, ...o.cast!]
  const baseSize = o.size!
  const allRooms = o.rooms!
  return cases.map((c, i) => {
    const victim = c.v ? pool.find((p) => p.name === c.v) : pool[0]
    if (!victim) throw new Error(`${slug}: nincs ilyen szereplő: ${c.v}`)
    // az eredeti áldozat gyanúsítottként a kiválasztott áldozat helyére áll
    const cast = c.v ? o.cast!.map((p) => (p === victim ? pool[0]! : p)) : o.cast!
    const top = clamp(baseSize + 1, 5, Math.min(10, cast.length + 1))
    const size = clamp(Math.round(5 + (top - 5) * SIZE_RAMP[i]!), 5, top)
    const core = (CORE[slug] ?? []).map((nm) => {
      const m = pool.find((p) => p.name === nm)
      if (!m) throw new Error(`${slug}: nincs ilyen főszereplő a gárdában: ${nm}`)
      return m.id
    })
    const vac = new Set(o.vacuum ?? [])
    const keep = Math.min(allRooms.length, clamp(Math.round((allRooms.length * size) / baseSize), 3, allRooms.length))
    // a kevesebb helyiségből a nyomásmentes termek sosem esnek ki; a többit ügyenként más-más sorrendben hagyjuk el
    const droppable = allRooms.filter((r) => !vac.has(r))
    const rot = droppable.map((_, j) => droppable[(j + i * 2) % droppable.length]!)
    const gone = new Set(rot.slice(0, allRooms.length - keep))
    const rooms = allRooms.filter((r) => !gone.has(r))
    const d = clamp(TIER_D[i]! + (base.d >= 4 ? 1 : 0), 1, 5) as Difficulty
    const id = `${base.file}-${i + 1}`
    return {
      file: id,
      seed: `${base.seed}K${i + 1}`,
      d,
      game: base.game,
      opts: { ...o, id, title: c.title, story: c.story || o.story, size, rooms, cast, victim, ...(core.length ? { core } : {}), rich: TIER_RICH[i]!, maxRel: TIER_REL[i]! },
    }
  })
}

