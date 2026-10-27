# AI-B — feladat-tábla

> **Ezt a fájlt csak AI-B szerkeszti.** Jelölések: ⬜ TODO · 🟨 FOLYAMATBAN · ✅ KÉSZ · ⛔ BLOKKOLT · 👤 a felhasználóra vár
> Kezdéskor 🟨-ra állítod és pusholod (`bash scripts/ai-sync.sh push`), hogy a másik lássa; kész állapotban ✅ + commit-hash.
> Részletek: [briefs/AI-B.md](../briefs/AI-B.md) · függőségi gráf: [AI_SPLIT.md](../AI_SPLIT.md) 4. fejezet · a másik tábla: [A.md](A.md)

| ID | Feladat | Függ | Állapot | Commit / megjegyzés |
|---|---|---|---|---|
| B0 | Infra: SQL-tesztek a repóban, Vercel-ellenőrzés, RUNBOOK | — | ✅ | SQL-tesztek 56/56 · RUNBOOK: `4d31799` ([ops/RUNBOOK.md](../ops/RUNBOOK.md)) · Vercel: `/` → 200 + „NIGHTDOKU", `/api/keepalive` → 401 (ellenőrizve 2026-10-25) |
| B1 | Felhő-alap + belépés (`CloudService`, `auth`, `profile`) | B0, A0 | ✅ | `b4205fa` · 15 egység-teszt · éles projekten csak olvasó próba (`username_available`, `ping` ok) · regisztráció-próba a B3 képernyőn |
| B2 | Szinkron-motor (`merge`, `sync`, `catalog`) | B1, A2 | ✅ | `src/cloud/{merge,rows,sync,catalog}.ts` · tulajdonság-tesztek (kommutatív/idempotens/asszociatív), kétgépes konvergencia-teszt valódi `StorageService`-szel, offline/FK-hiba/vendég→fiók/katalógus · **a felhőn élőben még nem próbáltuk** (kézi próba: 👤) |
| B3 | Belépés / Profil / Fiók képernyők | B1, A1 | ✅ | belépés/regisztráció/jelszó-reset + vendég→fiók átvitel kérdése, Profil (rang, Áttekintés, Fiók), felhős adat-export, fiók-törlés (`supabase/functions/delete-account` — **telepítés: 👤**) |
| B4 | Barátok, lobby, szoba-szolgáltatás, chat | B1, A1 | ✅ | `friends/rooms/roomSession.ts`, Barátok + Lobby képernyő; **tartós szobák** (saját/mások, nyitás-zárás, törlés, követés, statisztika) · **`0003_invites.sql`, `0005_rooms.sql`** (👤 futtatni) · Realtime élő próbája: 👤 (két böngészőablak) |
| B5 | Együtt mód (Realtime-protokoll, overlay) | B4, A3, A4 | 🟨 | kész: Broadcast-szinkron (`game/coop.ts`, teszt), `CoopGame`, `CoopPanel`, közös beküldés + tippkeret, meghívó-belépés (A írta a felhasználó kérésére, lásd handoff A-016) · hátra: lerakó-pont, zászló, Mutasd-ping, időkorlát, XP-bónusz, privát csatorna + RLS |
| B6 | Gyilkos mód (`0007`, képességek, Gyűlés/Epilógus) | B5, A7 | ⛔ | B5 és A7 után |
| B7 | Ranglista, online-állapot, nyilvános profil, moderáció (`0004`) | B2 | ✅ | **`0004_extras.sql`** (👤 futtatni; SQL-tesztek 88/88) · `leaderboard/presence.ts`, `publicProfile`, chat-jelentés/némítás, online-pont, barát-limit |
| B9 | **Beállítások képernyő** (hang, jumpscare-mód, Nyugodt mód, nyelv, adat-export/import/törlés) | A1, A2 | ✅ | `c77da2f` · böngészős próba: Nyugodt mód + jumpscare-mód perzisztens, törlés-megerősítés, export/import |
| B10 | **Gyűjtemény / bestiárium képernyő** (`content` API + unlocks) | A1, A2 | ✅ | `c77da2f` · 6 ismeretlen kártya, számláló, szűrők; az unlock-felfedés A addUnlock-jára vár |
| B8 | Webes élesítés (Vercel a gyökérből, keep-alive áthelyezés, deploy-ellenőrzés) | A8, B6 | 🟨 | kész a repóban: `api/keepalive.js` (ESM) + `vercel.json` a gyökérben, `vite build` ellenőrizve (`/` + `/play/`), RUNBOOK · hátra: 👤 Vercel Root Directory `web` → `.` (+ env-változók), a `web/` mappa törlése (az AI-nak nincs jogosultsága törölni) |

> **Javasolt sorrend (v0.5):** B1 → B3 (belépés/profil) → B9 (beállítások) → B10 (gyűjtemény) → B4 (barátok, lobby, chat) → B2 (szinkron) → B5 (Együtt) → B6 (Gyilkos) → B7 → B8. A B9/B10 csak az A2-t várja, a B5/B6 az A3/A4-et.
