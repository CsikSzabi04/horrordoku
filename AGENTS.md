# NIGHTDOKU — útmutató AI-ügynököknek

Ezen a repón **két AI** dolgozik párhuzamosan: **AI-A** (a játék) és **AI-B** (felhő, társas módok, kiadás).

> **v0.4 döntés: web először.** A játék Vite + React webalkalmazás (`npm run dev` → localhost); nincs Electron, `memory` mappa, híd — az asztali csomag később jön. A **Klasszikus mód sima Murdoku** (nincs Erő-szabály, jumpscare, extra), az extrák az Esemény/Random/co-op módokban vannak. Lásd a GDD „v0.4 — döntések" részét.

## Első lépés — saját munkakönyvtár (klónozni NEM kell)

```bash
bash scripts/ai-setup.sh A      # ha te vagy AI-A   (AI-B: bash scripts/ai-setup.sh B)
```
Ez létrehoz egy **külön `git worktree`-t a projektmappán belül** (`.work/A` vagy `.work/B`, saját ággal: `ai-a` / `ai-b`), átmásolja a `.env`-et, és kiírja az útját. **Innentől minden fájlművelet, git- és npm-parancs abban a mappában történik** (abszolút úttal vagy `cd`-vel); a fő mappába (`D:\Projectss\HorrorDoku`) **nem írsz**, mert ott a másik AI és a felhasználó dolgozik.

Szinkron a közös `main`-nel: `bash scripts/ai-sync.sh pull` (frissítés) és `bash scripts/ai-sync.sh push` (commitjaid felvitele; force nélkül, ütközésnél újrapróbál). Részletek: [docs/AI_SPLIT.md](docs/AI_SPLIT.md) 6. fejezet.

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
5. **Zöld teszttel pusholsz.** `npm test` (és ahol releváns: `npm run test:sql`, `npm run test:e2e`) hibátlan, `typecheck` és `lint` tiszta.
6. **Ne találj ki követelményt.** Ha a GDD és a szerződés nem mond valamit, kérdezz a HANDOFF-ban (`DECISION`), ne találgass hosszú munkát rá.
7. **Kimenő műveletek csak a felhasználó jóváhagyásával:** nyilvános kiadás, Vercel-beállítás, éles adatbázis-írás, force-push, repó-láthatóság.
8. **A fő mappába nem írsz** — csak a saját `.work/<A|B>` munkakönyvtáradba. A `docs/handoff/PLANNER.md`-t csak olvasod.

## Konvenciók

- **Nyelv:** kód, azonosítók, commit-üzenetek angolul; a játékos által látott szöveg **magyar**, i18n-kulcsokkal (`src/i18n/hu.ts`).
- **Commit:** Conventional Commits (`feat(engine): …`, `fix(cloud): …`, `docs(tasks): …`), a törzs végén a sor: `Agent: AI-A` vagy `Agent: AI-B`.
- **Környezet:** Windows 10, Git Bash + PowerShell, Node 24, Python 3.12. Headless böngészős teszthez a **Brave** működik
  (`C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`) `puppeteer-core`-ral; az Edge indítása ezen a gépen elhasal.
- **Akadálymentesség:** a *Nyugodt mód* / `prefers-reduced-motion` mindig érvényesül; a jumpscare alapból ki van kapcsolva; nincs 3 Hz-nél gyakoribb villogás.
- **Kész = Definition of Done:** működik a GDD szerint · van teszt · a GDD érintett fejezete naprakész · nincs titok · a saját feladat-táblád (`docs/tasks/<A|B>.md`) frissítve · az i18n-szövegek kulcsból jönnek.
