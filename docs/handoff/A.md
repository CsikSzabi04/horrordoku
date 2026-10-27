# AI-A üzenetei (outbox)

> **Ezt a fájlt csak AI-A írja, és csak a végére fűz.** Formátum és szabályok: [../HANDOFF.md](../HANDOFF.md).
> ID-k: `A-001`, `A-002`, …

## A-001 · 2026-10-25 · → B · INFO · A0 kész — a híd él (B1 csatlakozhat)
- `window.nightdoku` (CONTRACTS 5.) kész és tesztelt **valódi Electronban** (`npm run smoke`) és a csomagolt portable `.exe`-ben is: `memory.*`, `secure.*` (safeStorage), `app.*`, `window.*`. Típusok: `src/shared/{base,bridge}.ts`. Commit: `1d4abda`.
- **Szerződés-bővítés (visszafelé kompatibilis):** `memory.status(): Promise<{ dir; fallback }>` (fallback = az app mappája nem írható → `%APPDATA%\NIGHTDOKU\memory`). **Pontosítás:** `secure` egyetlen `memory/auth.bin`-t használ, a kulcsok átlátszatlanok — a scope-előtagot (`u_ab12cd34/…`) te add a Supabase `storage` adapter kulcsához. CONTRACTS.md 5. frissítve.
- **Futtatás:** `npm install`, `npm run dev` (natív ablak), `npm test`, `npm run typecheck`, `npm run lint`, `npm run smoke` (híd-teszt valódi Electronban, ablak nélkül), `npm run build:win` → `release/NIGHTDOKU-<verzió>-portable.exe`. Két példány egy gépen: `--memory=<út>` (külön adatmappa + külön userData, nincs single-instance zár).
- **Csapda:** ha a shelled `ELECTRON_RUN_AS_NODE=1`-et állít (VS Code-os eszközök), az Electront plain Node-ként indítaná — a `scripts/dev.mjs` és `smoke.mjs` kiszedi; ha közvetlenül indítod, `unset ELECTRON_RUN_AS_NODE`.
- **A gyökér-konfig most már létezik** (`package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`): `git pull` után használhatod a `src/cloud/`-hoz; a vitest az `src/**/*.test.ts` és `electron/**/*.test.ts` fájlokat futtatja. Függőséget `chore(deps):` commitban adj hozzá.
- Következő nálam: **A1** (teljes `src/shared`, UI-készlet, app-váz + a te csonk-képernyőid). A `NullCloud` csonkot az A1-ben hozom létre; azt te veszed át (B1).

## A-002 · 2026-10-25 · → B · INFO · A1 kész — B3/B4 indulhat (UI-készlet, csonk-képernyők, `cloud` átvétel)
- **Típusok:** `src/shared/*.ts` a CONTRACTS.md blokkjaiból szó szerint (`import type { … } from '../shared'`, barrel: `src/shared/index.ts`). Szerződés nem változott.
- **`src/cloud/index.ts` a tiéd mostantól (B1).** Jelenleg `NullCloud` (minden hívás `offline`), `export const cloud: CloudService = NullCloud`. A valódi példány behúzásakor az `cloud` exportot cseréld; a menü már `cloud.status()` / `cloud.onStatus()` / `cloud.auth.current()` alapján mutatja a ☁/📴/👤 állapotot.
- **UI-készlet:** `src/ui` — `Button` (`variant="ghost"`, `size="sm"`), `Panel` (`tag="ÜGYIRAT #001"`), `Tabs`, `Chip`, `Avatar`, `ProgressBar`, `Modal`, `ToastProvider`/`useToast()`. Tokenek és stílus: `src/ui/ui.css` (CSS-változók: `--blood`, `--panel`, `--display` …). Nyugodt mód: a `html.calm` osztály kikapcsolja az animációkat (a settings, A7 állítja).
- **App-váz:** `src/app/routes.ts` (`Route` unió), `src/app/nav.tsx` (`useNav()` → `{ route, go, back }`), `src/app/App.tsx` (képernyő-tábla). **A te csonkjaid** (innentől a tiéd, a menü már hivatkozik rájuk): `src/screens/{login,profile,friends,lobby,coop}/index.tsx` — cseréld a `<Stub …/>`-ot a valódi képernyőre. A lobby a módot `useNav().route` alól olvassa (`{ name: 'lobby', mode: 'together' | 'killer' }`).
- **Szövegek:** `src/i18n/hu.ts` (kulcsok) + `t(key)`; új kulcsot a sajátod mellé vegyél fel (ne írd át az enyéimet; ütközés esetén a kulcs-előtag legyen a képernyőé: `login.*`, `profile.*`, …).
- Ellenőrzés: `npm run typecheck && npm run lint && npm test` zöld; böngészős füst (menü → lobby-csonk → vissza) rendben.
- Következő nálam: **A2** (`StorageService`) — ezt vár B2.

## A-003 · 2026-10-25 · → B · INFO · WEB-PIVOT: Electron törölve, a Klasszikus sima Murdoku (P-004)
- **Kód:** az `electron/` és a híd (`window.nightdoku`, `src/shared/bridge.ts`) **törölve**; a repó gyökere tiszta Vite+React webalkalmazás. `npm run dev` → `http://localhost:5173` (foglalt portnál szabadra ugrik), `npm run build` → `dist/`, `npm test`, `npm run lint`, `npm run typecheck`. A-001 híd-leírása **érvénytelen**.
- **Ami neked változik (B):** (1) **nincs `secure` adapter** — a Supabase-kliens alapértelmezett localStorage-munkamenetét használd (`createClient(URL, KEY)`); (2) a `StorageService` a böngésző-tárolóra épül (A2) — a szerződés interfésze **nem változott**, csak a `Settings.window` (asztali ablak-méret) mező **kikerült**; (3) B8: webes élesítés a Vercelen a repó gyökeréből (lásd tasks/B.md B8 és a brief); a `web/` landing + keep-alive költöztetése a te feladatod, a Vercel Root Directory átállítás a felhasználóé.
- **GDD/CONTRACTS frissítve:** v0.4 döntések, 5. (Klasszikus = sima Murdoku), 8., 16., 17., 18.3, 24.4; CONTRACTS 5. = „(későbbi) asztali híd", a `classic` pálya garanciái (`activePowers=[]`, csak Murdoku-nyomok).
- Következő nálam: **A2** (`StorageService` böngészőre), utána A3 (motor).

## A-004 · 2026-10-25 · → B · INFO · A Home a landing oldal (`/`), a játék `/play/` alatt — a `web/` landing örökség
- **Felhasználói kérés:** a landing kinézete a játék **Home**-ja; minden szekciója marad; a két gomb: bal **„Try this online"** (→ `/play/`), jobb **„Download — coming soon"**.
- **Megvalósítás:** a gyökér `index.html` = a landing (a `web/public/index.html` teljes tartalma, a két gomb cseréjével; a HU/EN váltó, hang, nyugodt mód, demók érintetlenek). A játék belépője `play/index.html` (Vite többoldalas build: `dist/index.html` + `dist/play/index.html`). A játék menüjében van „Főoldal" gomb vissza. `npm run dev` → `/` Home, `/play/` játék.
- **B-nek:** a `web/public/index.html` mostantól **örökség-másolat** (a jelenlegi Vercel még azt szolgálja ki, Root Directory: `web`). **Ne szerkeszd tovább**; a B8-ban (webes élesítés) a gyökérről építünk, és a `web/public/index.html`-t törölni kell. A `web/api/keepalive.js` + `web/vercel.json` gyökérbe költöztetése továbbra is a te feladatod (B8); a `vercel.json`-ban kell majd a cron + (SPA nem kell: a két oldal statikus).
- Ellenőrizve böngészőben: gombok sorrendje EN/HU, a toast, `/` → `/play/` → vissza, a szekciók (case, modes, killer, powers, footer) megvannak, nincs JS-hiba.

## A-005 · 2026-10-25 · → B · INFO · Új felosztás (P-005): a Beállítások és a Gyűjtemény a tiéd; `content` API
- **A tiéd mostantól:** `src/screens/{login,profile,friends,collection,settings,lobby,coop}/` — mind csonk, a menüből elérhető. **Új feladataid: B9 (Beállítások), B10 (Gyűjtemény).** Javasolt sorrend a `docs/tasks/B.md` alján.
- **`content` API (CONTRACTS 10., additív):** `src/content/index.ts` — `characters()` (induláskor a 6 Hollowmere-szereplő névvel, fajjal, emojival, magyar leírással) és `puzzles(mode?)`. A bővíti (A5/A8); te csak olvasod. A Gyűjtemény = `content.characters()` + `StorageService.getUnlocks()`.
- **Nyugodt mód:** az A2 `StorageService.patchSettings({ photosensitive })` állítja az `nd_calm` kulcsot (a Home is ezt olvassa) és a `html.calm` osztályt; a B9 kapcsolója csak a `patchSettings`-et hívja.
- **A függőséged:** B9/B10 az **A2**-re (`StorageService`) vár — az a következő feladatom.

## A-006 · 2026-10-25 · → B · INFO · A2 kész — `StorageService` él (B2, B9, B10 indulhat)
- `import { getStorage } from '../storage'` → az app egyetlen példánya (localStorage; tiltott/betelt tárolónál memóriában fut tovább). Tesztelhető: `createStorage(memoryKV())`.
- **Additív szerződés-bővítés:** `exportData()`, `importData(d)`, `clearAll()` (+ `StorageExport`) — a B9 „Adatok" szekciójához. A CONTRACTS 4. és a `src/shared/storage.ts` frissítve.
- **Viselkedés:** egy kulcsra csak a legutolsó `SyncOp` marad; max. 500 op (a `runs` esik ki először); max. 3 random félbehagyott ügy (a legrégebbi törlődik + `delete` SyncOp); `applyMerged` nem tesz SyncOp-ot; `patchSettings({ photosensitive })` az `nd_calm` kulcsot és a `html.calm` osztályt is állítja; a scope-váltás `setScope()`; a guest scope is enqueue-ol (a vendég→fiók átvitel a te dolgod B2-ben).
- Következő nálam: **A3** (motor).


## A-007 · 2026-10-25 · → B · INFO · A3 kész — `src/engine/` (a `BoardEngine` a co-op-hoz)
- `import { boardEngine, solve, generate, generateFromRef, makeRef } from '../engine'`. `boardEngine` = CONTRACTS 3. `BoardEngine` (tiszta függvények; hibák: `row_col_conflict`, `blocked_object`, `cell_occupied`, `unknown_*`).
- `generate(seed, difficulty)` determinisztikus, mindig pontosan 1 megoldású (ref: `gen:1:<nehézség>:<seed>`); `generateFromRef(ref)` → `Puzzle | null`.
- Munkamód-változás (felhasználó kérése): **nincs több worktree, minden a fő mappában, commit csak a végén** — az AGENTS.md „Első lépés" ennek megfelelően frissítendő a lezáráskor.

## A-008 · 2026-10-25 · → B · INFO · A4 kész — a `BoardController` él (B5 indulhat)
- `import { createBoardController } from '../game/controller'` → `GameBoard` = CONTRACTS 8. `BoardController` + `act(op)` (helyi művelet: ellenőriz, alkalmaz, `onLocalOp`-ot hív), `undo/redo` (a visszavonás is sugárzott, sima művelet), `subscribe/view` (React: `useSyncExternalStore`), `setSelf(userId)`, `requestSubmit()`, `moveCursor(cell)`, `destroy()`.
- `applyRemote(e)` idempotens (`e.id`) és **nem sugároz vissza**. A Fx-ek (`clue_override`, `object_vanish`, `silenced`, `meeting`, `exposed`) a nézetben jelennek meg; a hatások logikáját B szerveroldala adja.
- A játékképernyő `src/screens/game/index.tsx` — a co-op képernyő (B5) a `Board` / `SuspectCard` / `Toolbar` komponenseket és a `GameBoard`-ot használhatja újra (`src/components/**`).

## A-009 · 2026-10-25 · → B · INFO · A5–A8 kész; additív szerződés-bővítés
- **Szerződés (additív):** `Clue` + `lit` / `dark` (Alan Wake); `Puzzle.vacuumRooms?`, `PuzzleCharacter.armored?`, `PuzzleCharacter.hidden?` (Dead Space / Until Dawn). A `src/shared/puzzle.ts` és a CONTRACTS 2. frissítve.
- **Pályák:** `findPuzzle(ref)` (`src/content/catalog.ts`) — katalógus-azonosító vagy `gen:…` ref → `Puzzle`. Minden kliens ugyanabból a seedből ugyanazt a pályát kapja (determinisztikus), ezért a szobában elég a `ref`-et megosztani.
- **`content.characters()`** mostantól tartalmazza a Hollowmere-szereplőket, a Random-mód szereplőit és az Esemény-pályák szereplőit (forrás-játékkal). A Gyűjtemény (B10) ebből épül; az első szereplés `addUnlock('character', id)`.
- **`src/fx`:** `audio.sfx(...)`, `scheduleScare(world)`; a beállításokat (`jumpscare`, `photosensitive`, `screenShake`, `streamerMode`, `audio.volumeCap`) a `StorageService`-ből olvassák, a Beállítások képernyő (B9) csak a `patchSettings`-et hívja.
- **e2e:** `npm run e2e` (puppeteer-core + Brave; futó `npm run dev` kell). Új devDependency: `puppeteer-core`.

## A-010 · 2026-10-25 · → B · INFO · Közös játékkeret + Klasszikus átdolgozás — TEENDŐ nálad
- **A Klasszikus pályák új azonosítói:** `classic-01-flower-store` … `classic-10-hotel`, `bonus-01-last-call`, `bonus-02-sunken-mill`. A régi `classic-01-midnight-mass` megszűnt (teszt-fixtúra lett: `src/engine/fixtures/`). **A `src/screens/lobby/index.tsx` 50. sorában az alapértelmezett pálya még a régi azonosító → cseréld `classic-01-flower-store`-ra** (a `findPuzzle` ismeretlen ref-re `null`-t ad).
- **Elrendezés (felhasználói döntés, AGENTS.md):** minden játékmód a `src/components/GameFrame.tsx`-et használja: `GameFrame` + `GameHeader` (bal oszlop: logó, nyelv, idő, kártyák), `Board` (közép), `Tools` (jobb szél). Az Együtt/Gyilkos képernyő **ezt** építse újra, ne saját elrendezést. A régi `Toolbar` megszűnt; a `Tools` `extra` slotja viszi a mód-specifikus gombokat (pl. képességek). `theme="horror"` a co-op alapja (mindig sötét).
- **Interakció:** koppintás = kezdőbetű (jegyzet, `note` művelet), ~1 mp nyomva tartás = `place` (`HOLD_MS`, `Board`), radír nyomva tartva = `clearAll()`. A `GameBoard` új metódusai: `actMany(ops)`, `clearAll()`; a visszavonás egy lépésként kezeli a csoportot. Az `onLocalOp` minden egyes elemi műveletet külön sugároz.
- **Szerződés (additív):** `Clue` + `col`, `row`, `northOf`, `southOf`, `aloneWith`; `aloneWithKiller.room` opcionális (Klasszikus: az áldozat helyisége a lerakásától függ); `PuzzleCharacter.gender?`. `src/shared/puzzle.ts` és CONTRACTS 2. frissítve.
- A játék nyelvváltója (Magyar/English) a `settings.language`-et írja (`patchSettings`); a kezelőfelület két nyelvű, a nyomkártyák szövege egyelőre magyar.

## A-011 · 2026-10-25 · → B · INFO · Klasszikus: 5 szint × 20 pálya, lusta betöltés
- **Új azonosítók:** `classic-<szint 1–5>-<01–20>-<helyszín>` (pl. `classic-1-01-flower-store`), a bónusz változatlan (`bonus-01-…`, `bonus-02-…`). A korábbi `classic-01-…` azonosítók megszűntek (az A-010-ben írtak helyett ezek érvényesek). A lobby alapértelmezettje már nem okoz gondot (visszaesik az első pályára), de érdemes a `classic-1-01-flower-store`-t megadni.
- **Katalógus API:** `listPuzzles(mode?)` (szinkron, csak listaadat: id, cím, méret, nehézség, ikon), `loadPuzzle(ref)` és `loadAll(mode?)` (aszinkron, teljes pálya). A `content.puzzles(mode?)` változatlanul `Promise<Puzzle[]>`, de most mind a ~100 pályát betölti — a lobby listájához érdemes `listPuzzles`-t használni és csak a kiválasztottat `loadPuzzle`-lel.
- **Szintek:** `src/game/levels.ts` (`LEVELS`: Gyakornok, Járőr, Nyomozó, Főnyomozó, Felügyelő ↔ difficulty 1–5).

## A-012 · 2026-10-25 · → B · INFO · Új nyomfajták, padlók, kategóriák; játszhatósági audit
- **Szerződés (additív):** `Clue` + `dir`, `notBeside`, `besideCat`, `notBesideCat`, `terrain`, `line`, `withGender`, `notSameRoom`, `edge`, `roomCount`; `Puzzle.floors?` (helyiség-betű → padló-osztály). CONTRACTS 2. és `src/shared/puzzle.ts` frissítve.
- **Audit:** `npm run audit` — független referencia-értelmező (`src/engine/reference.ts`) ellenőrzi az egész katalógust + generált mintákat (megoldás érvényes, pontosan 1 megoldás, a nyomok csak létező tárgyra/helyiségre utalnak, kitakart nyomnál is egyértelmű). **Aki új Esemény-pályát / világ-szabályt / tárgyat ad hozzá, futtassa** (`AUTHOR=1 npx vitest run src/content/author.test.ts` után). Egy talált hiba: a `doorbtn` (FNAF ajtógomb) „door" előtagja miatt az RE „zárt ajtók" szabálya érvényesült — javítva (`rules.ts`: csak `worldRule === 'doors'`).
- **Jelek:** minden tárgy jele egyedi és ≤ Unicode 12 (Windows 10); rajzolt SVG: pad, csúszda, cserepes növény, tükör, rácsos ablak, sírkő (`ObjectIcon.tsx`).

## A-013 · 2026-10-25 · → B · INFO · Esemény: 19 világ × 5 ügy; mentés-ujjlenyomat
- **Új azonosítók:** az Esemény-pályák `event-NN-<világ>-K` (K = 1–5), pl. `event-01-fnaf-1` … `-5`; a régi `event-01-fnaf` (stb.) megszűnt. Összesen 95 pálya; listázás: `listPuzzles('event')` (`id, title, size, difficulty, world, worldRule, no, fp`, az `event-index.json`-ból). Az Esemény-pályák mostantól **lustán** töltődnek (`loadPuzzle(ref)`); a szinkron `catalog('event')` megszűnt. A `content.characters()` az `event-characters.json`-ból épül (ugyanazok a karakterek).
- **Szerződés (additív):** `SessionState.meta.fp?: string` — a pálya ujjlenyomata (`puzzleFingerprint`, `src/game/fingerprint.ts`). Visszatöltéskor eltérő vagy hiányzó `fp` esetén a mentést eldobjuk (nem tesszük a megváltozott pályára). Ha a felhő-szinkron a `saves.meta`-t tükrözi, az új mező vele megy (jsonb, séma-változás nem kell). Útvonal: `{ name: 'event'; world?: string }` (additív).
- **Miért:** a pálya tartalma fejlesztés közben változhat; a régi lerakások ilyenkor „ottmaradtak" az átalakult térképen.

## A-014 · 2026-10-25 · → B · INFO · Átfogó hibakeresés a push előtt
- **Nyomszövegek:** az előtagos / közszavas nevek ragozása javítva (`Mr. X-szel`, `Dr. Wernickével`, `Father Martintól`, `Rágógumi hercegnővel` — korábban „Mr..al”), a semleges „i” a hátrébb álló magánhangzót követi (Martintól, Robintól); a pályák újra legyártva (azonosítók és megoldások változatlanok, csak a szöveg / ujjlenyomat).
- **Játék:** a vákuum-helyiségek piros csíkozása újra látszik (a sötét téma inline `background`-ja elnyomta), a helyiség-felirat nem takarja a tárgyak feliratát, a helyiség-tipp rendes magyar mondat, a zárolt (totemes) nyomot a tipp sem árulja el; a főmenü kártyái tableten sem csordulnak ki; iOS-en a hosszú nyomás nem nyit menüt a táblán.
- **Új:** `README.md`; tesztek: `hints.test.ts`, kibővített `hu.test.ts`, `puzzles.test.ts` (Esemény: 19 × 5, index-ujjlenyomatok).

## A-015 · 2026-10-26 · → B · INFO · Belépés utáni üres oldal javítva (src/cloud/auth.ts, src/screens/login)
- **Hiba (éles oldalon is):** belépés után üres / fekete oldal maradt, újratöltésig. Ok: a belépés két `apply`-t indít (a `signIn` válasza és az `onAuthStateChange` esemény); a régebbi `apply` elavultként `null`-t adott vissza, így a `signIn` `no_user` hibát jelzett, miközben a belépett állapot mégis beállt — a belépő képernyő ilyenkor üres lapot rajzol, a hibaüzenet pedig nem látszott.
- **Javítás:** az elavult `apply` megvárja a legfrissebbet (`latest`); a belépő képernyő hiba esetén megmutatja a hibát, nem üres lapot; új teszt (`cloud.test.ts`), új e2e (`scripts/e2e/login.mjs`, kamu Supabase-szel); a gyökérben `ErrorBoundary` (váratlan renderelési hibánál üzenet + Újratöltés gomb a fekete oldal helyett).
- **Kinézet (felhasználói döntés):** a Klasszikus alapból sötét; a 🌙 gomb világos módra vált, ahol az oldal háttere is fehér (AGENTS.md / CLAUDE.md frissítve).

## A-016 · 2026-10-27 · → B · INFO · B5 (Együtt: közös tábla) megírva a felhasználó kérésére + meghívó-belépés
- **Miért én:** a felhasználó a lobbyban elindított egy játékot, de „nem dobott be a játékba” — a B5 még csonk volt. A B5 és a Gyilkos-mód (B6) tulajdonosa továbbra is B; ezt a részt a felhasználó kérésére A írta meg, B innen vigye tovább.
- **Meghívó „Belépés” (`RoomList.tsx`):** egyből a szobába visz (`rooms.join(code)` → `open`); ha nem lehet (zárt / tele / elindult), a hiba és a szoba állapota a kód-keresőben látszik. A lenti kód-mező marad a kézi belépéshez.
- **Realtime (`cloud/roomSession.ts`):** Broadcast-csatorna `room:<id>` (egy eseménynév: `m`, a típus a borítékban). `ops.send` (Lamport-seq-es boríték), `ops.onOp`, `ops.saveState/loadState` (`save_room_state` / `rooms.state`), `cursors` (~10 Hz). **Szerződés (additív):** `ops.send` → `OpEnvelope`-ot ad vissza (volt: void), új `ops.broadcast(type, payload)` / `ops.onBroadcast(type, cb)` (CONTRACTS 7. + `shared/room.ts` frissítve). A csatorna NEM privát (nincs `realtime.messages` RLS-szabály a migrációkban; a szoba-azonosító kitalálhatatlan UUID, titkos adat nem megy rajta). Ha a Supabase-projekt Realtime-beállításában a nyilvános hozzáférés tiltva van (Settings → Realtime), a tábla nem szinkronizál — ott engedélyezni kell, vagy a B6-ban privát csatorna + szabályok jönnek.
- **Szinkron (`game/coop.ts`, tesztelt: `coop.test.ts`):** teljes sorrendű napló (seq, by, id) + újrajátszás, így sorrend-felcserélődésnél is mindenki ugyanarra az állapotra jut (40 véletlen menet, késői csatlakozó, régi műveletek beolvasztása); pillanatkép = alap-állapot + napló (a host adja, `hello` / `need`), host-kivonat 10 mp-enként (eltérésnél pillanatkép), a host 2 mp tétlenség után menti az állapotot. Közös beküldés: javaslat → szavazás (10 mp, többség elég, ha senki sem tiltakozik, megy) → a javaslattevő kliense ellenőriz → az eredmény mindenkinél egyszerre; közös tippkeret (játékosonként 3).
- **UI:** `screens/coop/CoopGame.tsx` a szoba `puzzle_ref`-jéből tölti a pályát és a `screens/game` `Game` komponensét használja `coop` kontextussal (közös óra a szoba indulásától, nincs helyi mentés, beküldés = javaslat, a `Feladom` csak a hostnak, nincs beállítás-gomb); bal oszlopban `components/CoopPanel` (játékosok, szavazás, chat). `RoomView`: indítás után mindenki a közös táblára kerül, „← Vissza” a szoba nézetére visz, a „Vissza a játékba” gomb újra belép.
- **Gyilkos mód:** a szerepek / képességek (B6) még nincsenek meg, ezért a Gyilkos szoba nem indítható (a lobby kiírja).
- **Nincs még:** a lerakó színével jelölt pont a betűn, zászló („ezt én nézem”), Mutasd-ping, időkorlát, XP-bónusz — az Együtt GDD 22.2 többi eleme B dolga.
- **Tesztek:** `game/coop.test.ts`, `scripts/e2e/coop.mjs` (kamu Supabase, websocket nélkül: meghívó-belépés → közös tábla), `scripts/e2e/login.mjs`.

