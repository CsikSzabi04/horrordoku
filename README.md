# NIGHTDOKU

Horror gyilkossági logikai rejtvényjáték — *„Ahol a sudoku vért ont."* Egy rács, egy gyilkos, pontosan egy megoldás.
Vite + React + TypeScript webalkalmazás (az asztali csomag később jön).

## Játékmódok

| Mód | Mi ez |
|---|---|
| 🕯️ **Klasszikus** | Logikai gyilkossági rejtvény: 100 előre megírt pálya, 5 szint × 20 hétköznapi helyszín (virágbolt, iskola, strand…), nincs horror. |
| 🎬 **Esemény** | 19 világ eredeti horror-történetekből, mindegyikben 5 egymás utáni ügy és egy saját világ-szabály (kamerák, vákuum, éjjellátó, rádió…). 16+ |
| 🎲 **Random** | Végtelen, a gép által összeállított ügyek (mindig egyetlen megoldással), megosztható ügykóddal és napi üggyel. |
| 🤝 **Együtt** | Közös tábla és chat, 2–4 játékos (bejelentkezés kell). |
| 🔪 **Gyilkos** | Egyikőtök áruló, 3–6 játékos (bejelentkezés kell). |

A játék elrendezése: bal oldalt a cím és a karakterek (alul az idő, a nyelv, a sötét mód, a beállítások és a hang), középen a térkép, jobbra az eszközök. Koppintás = kezdőbetű (jegyzet), ~1 mp nyomva tartás = lerakás.
A jumpscare alapból ki van kapcsolva; a *Nyugodt mód* és a `prefers-reduced-motion` mindig érvényesül.

## Futtatás

```bash
npm install
npm run dev        # http://localhost:5173  (Home)  ·  http://localhost:5173/play/  (maga a játék)
```

A felhős funkciókhoz (belépés, barátok, szinkron, közös módok) másold le a `.env.example`-t `.env` néven, és töltsd ki a **publikus** Supabase URL-t és `sb_publishable_…` kulcsot.
Nélküle a három egyjátékos mód (Klasszikus, Esemény, Random) teljes értékűen működik, a mentés a böngészőben (localStorage) történik.
Titkos kulcs (`service_role`, adatbázis-jelszó) **soha** nem kerül a repóba.

## Parancsok

| Parancs | Mit csinál |
|---|---|
| `npm test` | az összes egységteszt (vitest) — motor, pályák, tárolás, felhő |
| `npm run audit` | a teljes pálya-katalógus és Random-minták ellenőrzése egy **független** referencia-értelmezővel: egyetlen megoldás, a nyomok szövege csak a pályán látható dolgokra utal |
| `npm run validate:puzzles` | a `puzzles/**/*.json` fájlok érvényessége |
| `npm run typecheck` · `npm run lint` | típusellenőrzés, ESLint |
| `npm run build` | éles csomag (`dist/`) |
| `npm run e2e` | böngészős végig-tesztek (puppeteer-core + Brave/Chrome; futó `npm run dev` kell; `BRAVE` env a böngésző útvonalához) |

A pályák újragyártása (a generátor determinisztikus, rögzített seedekkel): `AUTHOR=1 npx vitest run src/content/author.test.ts`, utána `npm run validate:puzzles` és `npm run audit`.

## Felépítés

```
src/engine/    a motor: szabályok, megoldó, generátor, nyomszövegek (magyar toldalékokkal), független referencia-értelmező
src/content/   a pálya-katalógus (Klasszikus / Esemény), világok, karakterek
src/components/, src/screens/, src/game/   a felület, a játékképernyő és a játék-állapot
src/storage/   helyi mentés (StorageService), mentett játékok ujjlenyomattal
src/cloud/     Supabase-kliens, szinkron, barátok, lobby (AI-B)
src/fx/        hang, zene, jumpscare
puzzles/       a legyártott pályák (JSON)
supabase/      adatbázis-migrációk (a felhasználó futtatja őket)
docs/          szerződések, feladat-táblák, útmutatók;  NIGHTDOKU_jatekterv.md = a játéktervezési dokumentum
```

Két AI-ügynök dolgozik a repón párhuzamosan (játék / felhő és társas módok) — a szabályok az [AGENTS.md](AGENTS.md)-ben és a [docs/](docs/) mappában vannak.

## Megjegyzés a nevekről

Az Esemény mód világainak és szereplőinek nevei harmadik felek védjegyei; a helyi fejlesztésben a játéktervezési dokumentum szerinti nevek szerepelnek, nyilvános kiadás előtt cserélendők (GDD 21. fejezet).

## Gyorsaság és biztonság

- Az induló csomag ~106 KB (tömörítve): a képernyők külön csomagok, a felhős kliens (Supabase) a főmenü után töltődik, a betűtípusok saját tárhelyről jönnek, a statikus fájlok hosszan gyorsítótárazottak.
- Tartalom-biztonsági szabály (CSP) és biztonsági fejlécek (`vercel.json`, `vite.config.ts`); a hálózatról érkező adatot (társak üzenetei, betöltött mentés) a kliens ellenőrzi; az adatbázis-oldali védelem a `supabase/migrations/` fájlokban (RLS, korlátok, sebességkorlát) — a migrációkat a projekt SQL Editorában kell lefuttatni.

