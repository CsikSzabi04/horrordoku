# AI-A — „A játék"

## Indító-prompt (másold be az AI-nak)

> Te vagy **AI-A** a NIGHTDOKU projektben (horror-gyilkossági logikai rejtvényjáték, webes játék (Vite + React), GitHub: `CsikSzabi04/horrordoku`; a saját munkakönyvtáradat a `bash scripts/ai-setup.sh A` hozza létre (klónozni nem kell), lásd AGENTS.md).
> Rajtad kívül **AI-B** dolgozik a repón párhuzamosan. Olvasd el sorrendben: `AGENTS.md`, `docs/AI_SPLIT.md`, `docs/CONTRACTS.md`, ezt a fájlt, `docs/tasks/A.md`, `docs/HANDOFF.md` (+ a másik AI outboxa: `docs/handoff/B.md`, és `docs/handoff/PLANNER.md`), végül a `NIGHTDOKU_jatekterv.md`-t.
> **Első lépés:** `bash scripts/ai-setup.sh A` — ez létrehozza a saját `.work/A` munkakönyvtáradat; innentől **csak ott dolgozz** (a fő mappába ne írj), és `bash scripts/ai-sync.sh pull` után kezdj. Az első feladatod **A0**. Csak a saját útvonalaidra írj (AI_SPLIT.md 3. fejezet). Ne írj felhős szolgáltatásba összekötőn keresztül. Dolgozz kis, tesztelt lépésekben; a végén frissítsd a saját feladat-táblád (`docs/tasks/A.md`) és, ha kell, az outboxod (`docs/handoff/A.md`), majd `bash scripts/ai-sync.sh push`.

## Küldetés

Te építed azt, amit a játékos *játszik*: a webes vázat (Vite), a szabálymotort, a táblát, a helyi mentést és a három egyjátékos módot (Klasszikus, Esemény, Random) a hanggal, jumpscare-rel és a **pályák tartalmával**. **A felhőt nem ismered** — csak a `CloudService` interfészt, amihez `NullCloud` van, így minden offline működik.

## Tulajdonolt útvonalak

`electron/**` · `src/app/**` · `src/ui/**` · `src/i18n/**` · `src/engine/**` · `src/components/**` · `src/storage/**` · `src/screens/{menu,classic,event,random,game}/**` · `puzzles/**` · `src/content/**` · `assets/**` · gyökér-konfigok (`package.json`, `vite.config.*`, `tsconfig*`, `eslint*`, `electron-builder*`) · `.github/workflows/ci.yml`.
**Közös:** `src/shared/**`, `docs/CONTRACTS.md` (7. fejezet szerint). **Nem a tied:** `src/cloud/**`, `src/coop/**`, `supabase/**`, `web/**`, `src/screens/{login,profile,friends,collection,settings,lobby,coop}/**` (ezekhez A1-ben csak üres csonkot hozol létre).

## Feladatok (sorrendben)

### A0 — Webes alap ✅ *(kész)*
- Vite + React + TypeScript (strict) váz; `npm run dev` → localhost; `vitest`, `eslint`, `prettier`, `typecheck`; CI. *(Az Electron-os első változat törölve — v0.4: web először; az asztali csomag később, GDD 16.5.)*

### A1 — Közös típusok, UI-készlet, app-váz
- A `docs/CONTRACTS.md` blokkjai **szó szerint** `src/shared/*.ts`-be (base, puzzle, board, storage, cloud, room, fx, boardController). `CONTRACT_VERSION` exportálva.
- `src/cloud/index.ts` *csonk*: exportálja a `CloudService` típust és egy `NullCloud` példányt (**B ezt átveszi és kitölti** — te csak azért hozod létre, hogy fordítson).
- UI-készlet (`src/ui/`): design tokenek a [web/public/index.html](../../web/public/index.html) paletta- és betűkészletéből (Cinzel + Special Elite, vér-vörös, csont-fehér), komponensek: `Button`, `Panel/Dossier`, `Tabs`, `Toast`, `Modal`, `Chip`, `Avatar`, `ProgressBar`; Nyugodt mód támogatással.
- App-váz: útvonal-tábla `src/app/routes.ts`, főmenü (GDD 14.1), állapot-sor (☁/📴/👤). **Csonk-képernyők B-nek:** `src/screens/{login,profile,friends,collection,settings,lobby,coop}/index.tsx` üres komponensek, a menüből elérhetők. Ezektől kezdve B tulajdona.
- i18n-váz (`src/i18n/hu.ts`), első kulcsok.
- A GDD 20.1 JSON-példáját igazítsd a `Puzzle` szerződéshez.
- **Kész, ha:** `npm run dev` főmenüt mutat, a csonk-képernyők megnyílnak, a típusok fordulnak. → HANDOFF: „A1 kész: típusok + UI-készlet — B3 indulhat".

### A2 — `StorageService` (helyi mentés)
- A `CONTRACTS.md` 4. fejezete szerint, **böngészős tárolón** (localStorage; kulcsok: `nd:v1:<scope>:<név>`): séma-verzió, másodpéldány (`…:bak`) és `…:corrupt` sérülés ellen, kvóta-hiba és tiltott tároló kezelése (memóriában fut tovább + figyelmeztetés), több fül (`storage` esemény), export / import (JSON-fájl), **`scope`** (`guest` / `u_<id8>`), debounce-olt mentés (3 mp, `visibilitychange`/`pagehide`-kor azonnal), méretkeret (tipikusan < 100 KB, 4 MB plafon), `onChange`, `SyncOp`-ok a `recordRun/putSession/addUnlock/patchSettings`-ból, `applyMerged` (SyncOp nélkül). A `photosensitive` beállítás változásakor az `nd_calm` kulcsot (a Home is ezt olvassa) és a `html.calm` osztályt is állítja — így B9 Nyugodt mód-kapcsolója azonnal érvényesül.
- **Kész, ha:** egység-tesztek: sérült fájl visszaállítása, párhuzamos írás, scope-váltás, `applyMerged` nem generál sort, méretplafon. → HANDOFF: „A2 kész — B2 indulhat".

### A3 — Szabálymotor, megoldó, generátor
- `src/engine/`: `rules.ts` (alapszabály + **Erő-szabályok** GDD 7.1), `board.ts` (a `BoardEngine`, CONTRACTS 3.), `solver.ts` (backtracking, **pontosan 1 megoldás** ellenőrzés, nehézség-becslés), `generator.ts` (seedelt `mulberry32`, verziózott, GDD 19.2 mind a 9 szabálya, 20.3).
- **Kész, ha:** az „Éjféli Mise" (GDD 9) pontosan 1 megoldással igazolt; **1000 seedre** minden nehézségen érvényes + pontosan 1 megoldású a generált pálya (property-teszt); a determinizmus teszt (azonos seed → azonos pálya); `npm run validate:puzzles` fut a katalógusra.

### A4 — Tábla és játékképernyő
- `src/components/Board/**`, `SuspectCard`, `Toolbar`, `Tutorial` (6 lépés, GDD 14.5), játékképernyő (GDD 14.3): lerakás/jegyzet/X/radír/visszavonás, tipp-rendszer (3 szint), időmérő (csak játék közben), beküldés, ütközés-jelzés, nagyítás, Lerakás↔Jegyzet kapcsoló.
- **`BoardController` megvalósítása** (CONTRACTS 8.) — `applyRemote`, `onLocalOp`, `setPeers`, `setPeerCursor`, `applyFx`, `setClock`, `setLives`, `onSubmitRequest`, `showSubmitResult`. A hatásokat (`Fx`) *megjeleníti*, de a logikájukat nem tudja.
- Automatikus mentés indulásnál azonnal + 3 mp (GDD 19.5), a megoldás/feladás `recordRun`-t hív.
- **Kész, ha:** az e2e (puppeteer + Brave) füstteszt végigjátssza az Éjféli Misét; a `BoardController`-hez van egység-teszt (`applyRemote` nem sugároz vissza). → HANDOFF: „A4 kész — `BoardController` él, B5 indulhat".

### A5 — Klasszikus mód: 10 pálya
- A GDD 8. fejezet 10 pályája `puzzles/classic/*.json` (+ 2 bónusz `puzzles/bonus/`), **mindegyik a megoldóval igazolva**, kézzel írt magyar nyom-szöveggel; kampány-menü (fejezetek, „lezárt dosszié" borítékok, 14.2), fejezet-végi panelek, történet-szövegek, bónusz-feloldás.
- Sorrend: előbb a 1–3. pálya (**G1-hez ennyi kell**), a többi utána.
- **Kész, ha:** `npm run validate:puzzles` zöld mind a 10-re; végigjátszható; a pályaválasztó mutatja a legjobb időt és a tipp nélküli arany koponyát.

### A6 — Random mód felület és Folytatás
- GDD 14.8, 19.1–19.6: „Új véletlen ügy" (nehézség + téma), ügykód megadása/megosztása, Napi ügy (dátum-seed), **Folytatás-lista** (≤ 3 random + megkezdett katalógus-pályák, mutatja: cím, nehézség, idő, mikor/melyik gépen), Elvetem (feladott futás a naplóba), 30 napos lejárat, az indulás pillanatában azonnali mentés, az óra csak aktív ablaknál jár (60 mp tétlenség után áll).
- A „melyik gépen" információ a `SessionState`-ben `meta.deviceName`-ként utazhat → **ha kell, szerződés-bővítés** (opcionális mező, HANDOFF).
- Karakter-„szerzés": az első szereplés `addUnlock('character', id)`.
- **Kész, ha:** kilépés/összeomlás után a félbehagyott ügy pontosan ott folytatható (tesztelve az oldal újratöltésével).

### A7 — Jumpscare, hang, zene *(a motor-oldal; a Beállítások képernyő: B9)*
- GDD 12 (fázisok, véletlen késleltetés 0,5–6 mp, 3–5 változat/világ, kamu-jumpscare, arany jumpscare), 13 (rétegzett zene, hangeffektek, Howler.js). A modulok a `StorageService.getSettings()` értékeit olvassák (jumpscare-mód, hangerő-plafon, `photosensitive`, rázkódás, Streamer mód) — **a kapcsolók képernyőjét (Beállítások) B építi (B9)**. Színvak-mód, nagy betű, képernyőolvasó a kártyákhoz (a játékképernyő része). *A Klasszikus módban nincs jumpscare (v0.4).*
- **Kész, ha:** minden jumpscare-mód működik és kikapcsolható; a Nyugodt mód nem villog; a hangerő-plafon sosem hágható át (egység-teszt a hangerő-számításra).

### A8 — Esemény mód: 10 pálya *(a Gyűjtemény képernyő: B10)*
- GDD 10–11: 10 pálya `puzzles/event/*.json` a világ-szabályokkal (kamerák, zárt ajtók, mozgásérzékelő, vákuum, éjjellátó…), világonkénti téma/zene/jumpscare. A karakter-adatlapokat (`name`, `race`, `source`, `bio`) a `content` API-n át add át (CONTRACTS 10.) — ebből építi B a Gyűjteményt; a megszerzést (`addUnlock`) te hívod.
- **Jogi:** a nyilvános kiadásig a valódi franchise-nevek **belső munkaneveknek** számítanak; a pálya-adatban a megjelenítendő név mezője legyen cserélhető (GDD 21, paródia-nevek).
- **Kész, ha:** mind a 10 pálya validált és végigjátszható.

### A9 — Keményítés
- Teljesítmény (10×10 tábla animációkkal), e2e-tesztek, élesítés B-vel (B8), első indítás: életkor- és fotoszenzitív figyelmeztetés.

## Amire B-től számíthatsz (és mikor)

> **Nem kell rájuk várnod.** A Klasszikus, az Esemény és a Random felhő nélkül (`NullCloud`) teljes; amit B ad (belépés, szinkron, profil, gyűjtemény, beállítások), az csak *hozzáad*.

| Mit | Mikor | Hogyan használod |
|---|---|---|
| `CloudService` valódi megvalósítása | B1 után | A `src/cloud/index.ts` exportja átáll `NullCloud`-ról — **te nem módosítasz semmit** |
| Szinkron a felhővel | B2 után | A `StorageService.onChange`-et B figyeli; te csak a `StorageService`-be írsz |
| Új katalógus-pályák | B2 után | `StorageService.getCachedPuzzles()` — a pályabetöltőd olvassa a *csomagolt + cache* pályákat, a nagyobb `rev` nyer |
| Belépés / Profil / Barátok / Gyűjtemény / Beállítások / Lobby képernyők | B3, B4, B9, B10 után | A csonkok helyére B teszi a kész képernyőket; a menü már hivatkozik rájuk |
| Co-op overlay | B5 után | B a `BoardController`-en át csatlakozik a te játékképernyődhöz |

## Amit B-nek ígérsz

- Az A1 óta a `src/shared/**` típusok stabilak (a szerződés-folyamaton kívül nem változnak).
- A `StorageService` minden írása **atomikus**, és az `onChange` mindig tüzel.
- A `BoardController` **nem sugároz vissza** a távoli műveleteket; a `BoardEngine.apply` tiszta függvény.

## Buktatók

- A **Nyugodt mód** és a `prefers-reduced-motion` mindig érvényesüljön — minden új animációnál.
- Ne importálj `@supabase/*`-ot és ne hívj hálózatot. Ha kéne valami a felhőből, szerződés-kérés a HANDOFF-ban.
- A böngészős tároló csak adatot tart (nincs benne kép/hang; kvóta ~5 MB).
- A pálya-JSON-ok megoldásokat tartalmaznak: a repó láthatósága döntésre vár (AI_SPLIT 9.2) — a `puzzles/` mappát tartsd külön, könnyen kiemelhetően.
- Headless teszt: **Brave** + `puppeteer-core` (az Edge indítása ezen a gépen elhasal).
- **A Klasszikus mód sima Murdoku:** nincs Erő-szabály, világ-szabály, kiterjesztett nyom, jumpscare — a motor ezeket külön, opcionális modulként kezeli, és a `classic` pálya nem aktiválhatja őket (CONTRACTS 2.). Ne szivárogjon be.
