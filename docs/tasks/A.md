# AI-A — feladat-tábla

> **Ezt a fájlt csak AI-A szerkeszti.** Jelölések: ⬜ TODO · 🟨 FOLYAMATBAN · ✅ KÉSZ · ⛔ BLOKKOLT
> Kezdéskor 🟨-ra állítod és pusholod (`bash scripts/ai-sync.sh push`), hogy a másik lássa; kész állapotban ✅ + commit-hash.
> Részletek: [briefs/AI-A.md](../briefs/AI-A.md) · függőségi gráf: [AI_SPLIT.md](../AI_SPLIT.md) 4. fejezet · a másik tábla: [B.md](B.md)

| ID | Feladat | Függ | Állapot | Commit / megjegyzés |
|---|---|---|---|---|
| A0 | Webes alap (Vite+React+TS), CI, `npm run dev` | — | ✅ | az Electron-os első változat törölve (v0.4: web először) |
| A1 | Közös típusok (`src/shared`), UI-készlet, app-váz, csonk-képernyők, i18n | A0 | ✅ | A1 commit · `src/shared/*` = CONTRACTS szó szerint · `src/ui` · `src/app` · `NullCloud` csonk |
| A2 | `StorageService` (helyi mentés, scope, SyncOp) | A1 | ✅ | `src/storage` · 15 teszt · `getStorage()` |
| A3 | Szabálymotor, megoldó, generátor | A1 | ✅ | `src/engine/`; 1000 seed × 5 nehézség egyértelmű (`GEN_N=1000 npx vitest run src/engine`); `npm run validate:puzzles` |
| A4 | Tábla + játékképernyő + `BoardController` | A2, A3 | ✅ | `src/components/`, `src/game/` (`createBoardController`), `src/screens/game`; 3 szintű tipp, visszavonás, autosave, bemutató; e2e: `scripts/e2e/classic.mjs` |
| A5 | Klasszikus mód: 10 pálya (+2 bónusz), kampány-menü | A4 | ✅ | `puzzles/classic/` **100 pálya (5 szint × 20, 30 hétköznapi helyszín)** + `puzzles/bonus/` (2), `src/screens/classic` (szint-fülek, rendezés, elrejtés); adat: `src/content/classic.ts`, generálás: `src/content/author.test.ts`, lista: `classic-index.json` (lusta betöltés) |
| A6 | Random mód felület, Folytatás, napi ügy | A4 | ✅ | `src/screens/random`; ügykód (`3-7F3K92`), napi ügy, ≤3 Folytatás + 30 napos lejárat, Elvetem, karakter-szerzés; e2e: `random.mjs` |
| A7 | Jumpscare, hang, zene (motor-oldal; a Beállítások képernyő: B9) | A4 | ✅ | `src/fx/`: procedurális hang (WebAudio), jumpscare-terv (0,5–6 mp, kamu/arany, módok, nyugodt mód), hangerő-plafon teszt. **Háttérzene nincs** (valaki kivette a `useFx`-ből — szándékos). Klasszikusban nincs jumpscare |
| A8 | Esemény mód: 19 világ × 5 ügy (95 pálya, sorban, mentéssel) + világ-szabályok (a Gyűjtemény képernyő: B10) | A5 | ✅ | `puzzles/event/` (95: `event-NN-<világ>-K`), `src/content/events.ts` + `event-cases.ts` (ügyenként áldozat / cím / történet), `event-index.json`, `src/screens/event` (világok → 5 ügy sorban); mentés-ujjlenyomat `meta.fp`; 10 világ-szabály (kamerák, fogd meg, zárt ajtók, mozgásérzékelő, totem, vákuum, éjjellátó, rádió, generátorok, fény/sötét); e2e: `events.mjs`. **A franchise-nevek védjegyek — kiadás előtt csere (GDD 21)** |
| A9 | Keményítés, e2e, élesítés (B8-cal) | A8, B8 | ⬜ | |
| A10 | Asztali csomag (Electron/Tauri) — **később** | A9 | ⬜ | v0.4: nem most |
