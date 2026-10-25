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

