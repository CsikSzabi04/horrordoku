# NIGHTDOKU — útmutató AI-ügynököknek

Ezen a repón **két AI** dolgozik párhuzamosan: **AI-A** (a játék) és **AI-B** (felhő, társas módok, kiadás).

> **v0.4 döntés: web először.** A játék Vite + React webalkalmazás (`npm run dev` → localhost); nincs Electron, `memory` mappa, híd — az asztali csomag később jön. A **Klasszikus mód sima Murdoku** (nincs Erő-szabály, jumpscare, extra), az extrák az Esemény/Random/co-op módokban vannak. Lásd a GDD „v0.4 — döntések" részét.

## Munkamód (felhasználói döntés, 2026-10-25) — minden a fő mappában

- **Mindent a fő mappába írsz:** `D:\Projectss\HorrorDoku`. **Nincs `git worktree`, nincs `.work/…`, nincs külön dev-szerver más mappából** — a felhasználó a fő mappában futtatja az `npm run dev`-et, és ott akarja látni a változást.
- **A két AI egy mappában dolgozik**, ezért a **tulajdonlási táblát** (alább) szigorúan tartsd: csak a saját fájljaidat szerkeszd; közös fájlnál (`package.json`, `App.tsx`, `docs/CONTRACTS.md`) kicsi, célzott módosítás, és szólj a HANDOFF-ban.
- **Nem commitolsz és nem pusholsz folyamatosan.** A commit egyetlen dolog: amikor a felhasználó azt mondja, hogy mindennel kész vagyunk (vagy kifejezetten kéri). Addig a munka a munkafában marad; a haladást a feladat-tábla (`docs/tasks/`) és a kimenő levelek (`docs/handoff/`) rögzítik.
- A `scripts/ai-setup.sh` / `ai-sync.sh` a régi, worktree-s módhoz való — **ne használd**.

## Játékképernyő-elrendezés — MINDEN játékban, MINDEN pályán ugyanaz (felhasználói döntés, 2026-10-25)

Mint a murdoku.com: **három oszlop**, balról jobbra.

1. **Bal oszlop:** felül a **logó**, a **vissza-nyíl**, a **Magyar / English váltó** és az **idő**; alatta a pálya címe + a bevezető szöveg; alatta a **karakterek** (arckép + alatta a színes nyomkártya).
2. **Középső (a legnagyobb) oszlop:** a **térkép**.
3. **Jobb szélső, keskenyebb oszlop (eszközök):** ✕ (kizár), radír (nyomva tartva: teljes törlés), **visszavonás**, újra, **tipp**, **beküldés**, „hogyan kell játszani", ?, megosztás, **mentés**, **hang**, beállítások.

A közös keret a `src/components/GameFrame.tsx` — **új játékmód (Együtt, Gyilkos stb.) is ezt használja**, nem épít saját elrendezést. **Kinézet:** a Klasszikus **alapból sötét** (fekete oldal, sötét lapok, mint az app többi része). A fejlécben a **🌙 gomb világos módra** vált: ilyenkor az **oldal háttere is fehér**, a három oszlop fehér lap vékony fekete szegéllyel (a Klasszikus listán ugyanígy). A **Klasszikus** „normális" murdoku-kinézetű (hétköznapi helyszínek és nevek, rajzolt arcképek, nincs horror); az Esemény/Random/co-op mindig sötét, horror-témájú — de a három oszlop ugyanaz.

**Mindenhol ugyanaz a viselkedés:** egy karakter kiválasztása után a mezőre koppintás csak a **kezdőbetűjét** teszi le (jegyzet); a karakter **~1 mp nyomva tartásra** kerül le, a mező körül **megtelő gyűrű** jelzi. A pálya betöltésekor a térkép darabjai és a kártyák **fentről zuhannak le** (a Nyugodt mód ezt kikapcsolja).

## Ki mit csinál (v0.5 — felhasználói döntés)

| | **AI-A — a játék** | **AI-B — fiók, társas módok, kiadás** |
|---|---|---|
| **Módok** | **Klasszikus** (sima Murdoku), **Esemény**, **Random** | **Együtt**, **Gyilkos** |
| **Képernyők** | Home, főmenü, pályaválasztók, játékképernyő | **Bejelentkezés, Profil, Barátok, Gyűjtemény, Beállítások**, Lobby, co-op overlay |
| **Alap** | motor, tábla, helyi mentés, jumpscare / hang / zene, a pályák tartalma | felhő (Supabase), szinkron, adatbázis, webes élesítés |

**AI-A sosem vár AI-B-re:** a három egyjátékos mód felhő nélkül (`NullCloud`) teljes; amit B ad (belépés, szinkron, profil, gyűjtemény, beállítások), az csak *hozzáad*. **AI-B** az A2 (`StorageService`), A3 (motor) és A4 (tábla) után kapcsolódik: a Beállítások és a Gyűjtemény a `StorageService`-re és a `content` API-ra, az Együtt/Gyilkos a `BoardController`-re épül. Részletek: [docs/AI_SPLIT.md](docs/AI_SPLIT.md).

## Olvasd el (a saját munkakönyvtáradban), sorrendben

1. [docs/AI_SPLIT.md](docs/AI_SPLIT.md) — ki mit csinál, ki melyik mappát szerkesztheti, a munkafolyamat
2. [docs/CONTRACTS.md](docs/CONTRACTS.md) — a közös szerződések (típusok, interfészek); ezekre építesz
3. a saját feladatlistád: [docs/briefs/AI-A.md](docs/briefs/AI-A.md) **vagy** [docs/briefs/AI-B.md](docs/briefs/AI-B.md)
4. a feladat-táblád: [docs/tasks/A.md](docs/tasks/A.md) vagy [docs/tasks/B.md](docs/tasks/B.md) (+ az áttekintő: [docs/TASKS.md](docs/TASKS.md)), és az **üzenőfal**: [docs/HANDOFF.md](docs/HANDOFF.md) — a *másik AI* outboxa (`docs/handoff/A.md` / `B.md`) és a `docs/handoff/PLANNER.md` neked szóló, még nem megválaszolt üzenetei
5. [NIGHTDOKU_jatekterv.md](NIGHTDOKU_jatekterv.md) — a játéktervezési dokumentum (GDD): **a termék igazsága**

## Nem alku tárgya

1. **Csak a saját mappáidba írj** (AI_SPLIT.md, 3. fejezet). A másik AI területén talált hibát az **outboxodba** (`docs/handoff/<A|B>.md`) írd, ne javítsd.
2. **Soha ne írj felhős szolgáltatásba összekötőn / MCP-n keresztül.** Az AI-eszközökhöz csatlakoztatott Supabase- és Vercel-összekötő a felhasználó
   *másik, éles* fiókjára mutat — **nem** erre a projektre. Séma-változás = új `supabase/migrations/NNNN_*.sql` fájl + teszt; a felhasználó futtatja a
   **HorrorDoku** projekt SQL Editorában (project-ref: `mgmmrejyxdjjduxcwksv`). Dokumentáció-keresés (olvasás) rendben van.
3. **Titok nem kerül a repóba.** A kliensben csak a publikus Supabase URL és a `sb_publishable_…` kulcs használható (`.env`, gitignore-olt).
   Secret / `service_role` kulcs, adatbázis-jelszó, connection string, `CRON_SECRET` soha — se kódban, se dokumentumban, se commitban.
4. **A szerződések szentek.** A `docs/CONTRACTS.md`-t és a `src/shared/` alatti fájlokat csak a HANDOFF-ban egyeztetett módon változtasd (AI_SPLIT.md, 7. fejezet).
5. **Zöld teszttel zársz le** (commit előtt): `npm test` (és ahol releváns: `npm run test:sql`, `npm run test:e2e`) hibátlan, `typecheck` és `lint` tiszta.
6. **Ne találj ki követelményt.** Ha a GDD és a szerződés nem mond valamit, kérdezz a HANDOFF-ban (`DECISION`), ne találgass hosszú munkát rá.
7. **Kimenő műveletek csak a felhasználó jóváhagyásával:** nyilvános kiadás, Vercel-beállítás, éles adatbázis-írás, force-push, repó-láthatóság.
8. **Mindent a fő mappába írsz, commit csak a végén** (lásd „Munkamód"). A `docs/handoff/PLANNER.md`-t csak olvasod.

9. **Minden pálya játszható — ez kritikus.** Nyom csak olyan tárgyra / helyiségre / szereplőre utalhat, ami tényleg ott van a pályán, a szöveg ki is mondja, a megoldás pontosan egy, és a játékos által LÁTOTT információból is megoldható (kitakart nyomnál is). Ezt a `src/engine/audit.test.ts` ellenőrzi egy FÜGGETLEN referencia-értelmezővel (`src/engine/reference.ts`) a teljes katalógusra és Random-mintákra (`npm run audit`). Új tárgyat, nyomfajtát vagy világ-szabályt a `reference.ts`-ben, a `text.ts`-ben és a `Legend`-ben is fel kell venni; **minden tárgynak egyedi jele** van (a `vocab.test.ts` ellenőrzi, és csak Unicode ≤ 12 emoji lehet — az újabbak Windows 10-en üres négyzetként jelennek meg; ahol az emoji nem azt ábrázolja, aminek a neve — pl. a torta nem „party-asztal" —, rajzolt SVG jel kell: `components/drawn.tsx` / `ObjectIcon.tsx`; a `FAITHFUL` lista csak a tényleg találó emojikat tartalmazza, és a teszt új tárgyat jóváhagyás nélkül nem enged be). A térkép a tárgy nevét a mezőre is kiírja. Pálya módosítása után: `AUTHOR=1 npx vitest run src/content/author.test.ts`, majd `npm run validate:puzzles` és `npm run audit`.

## Konvenciók

- **Nyelv:** kód, azonosítók, commit-üzenetek angolul; a játékos által látott szöveg **magyar**, i18n-kulcsokkal (`src/i18n/hu.ts`).
- **Commit:** Conventional Commits (`feat(engine): …`, `fix(cloud): …`, `docs(tasks): …`), a törzs végén a sor: `Agent: AI-A` vagy `Agent: AI-B`.
- **Környezet:** Windows 10, Git Bash + PowerShell, Node 24, Python 3.12. Headless böngészős teszthez a **Brave** működik
  (`C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`) `puppeteer-core`-ral; az Edge indítása ezen a gépen elhasal.
- **Akadálymentesség:** a *Nyugodt mód* / `prefers-reduced-motion` mindig érvényesül; a jumpscare alapból ki van kapcsolva; nincs 3 Hz-nél gyakoribb villogás.
- **Kész = Definition of Done:** működik a GDD szerint · van teszt · a GDD érintett fejezete naprakész · nincs titok · a saját feladat-táblád (`docs/tasks/<A|B>.md`) frissítve · az i18n-szövegek kulcsból jönnek.
