# AI-B — feladat-tábla

> **Ezt a fájlt csak AI-B szerkeszti.** Jelölések: ⬜ TODO · 🟨 FOLYAMATBAN · ✅ KÉSZ · ⛔ BLOKKOLT · 👤 a felhasználóra vár
> Kezdéskor 🟨-ra állítod és pusholod (`bash scripts/ai-sync.sh push`), hogy a másik lássa; kész állapotban ✅ + commit-hash.
> Részletek: [briefs/AI-B.md](../briefs/AI-B.md) · függőségi gráf: [AI_SPLIT.md](../AI_SPLIT.md) 4. fejezet · a másik tábla: [A.md](A.md)

| ID | Feladat | Függ | Állapot | Commit / megjegyzés |
|---|---|---|---|---|
| B0 | Infra: SQL-tesztek a repóban, Vercel-ellenőrzés, RUNBOOK | — | ✅ | SQL-tesztek 56/56 · RUNBOOK: `4d31799` ([ops/RUNBOOK.md](../ops/RUNBOOK.md)) · Vercel: `/` → 200 + „NIGHTDOKU", `/api/keepalive` → 401 (ellenőrizve 2026-10-25) |
| B1 | Felhő-alap + belépés (`CloudService`, `auth`, `profile`) | B0, A0 | ✅ | `b4205fa` · 15 egység-teszt · éles projekten csak olvasó próba (`username_available`, `ping` ok) · regisztráció-próba a B3 képernyőn |
| B2 | Szinkron-motor (`merge`, `sync`, `catalog`) | B1, A2 | ⬜ | |
| B3 | Belépés / Profil / Fiók képernyők | B1, A1 | 🟨 | `48b17fb` — kész: belépés/regisztráció/jelszó-reset, Profil (fejléc, rang, Áttekintés, Fiók: becenév/avatár/kilépés), böngészős füstteszt · hátra: adat-export, fiók-törlés (edge function), vendég→fiók átvitel (A2 után) |
| B4 | Barátok, lobby, szoba-szolgáltatás, chat | B1, A1 | ⬜ | |
| B5 | Együtt mód (Realtime-protokoll, overlay) | B4, A3, A4 | ⬜ | |
| B6 | Gyilkos mód (`0003`, képességek, Gyűlés/Epilógus) | B5, A7 | ⬜ | |
| B7 | Ranglista, online-állapot, nyilvános profil, moderáció (`0004`) | B2 | ⬜ | |
| B9 | **Beállítások képernyő** (hang, jumpscare-mód, Nyugodt mód, nyelv, adat-export/import/törlés) | A1, A2 | ⬜ | A2 után indulhat |
| B10 | **Gyűjtemény / bestiárium képernyő** (`content` API + unlocks) | A1, A2 | ⬜ | A2 után indulhat |
| B8 | Webes élesítés (Vercel a gyökérből, keep-alive áthelyezés, deploy-ellenőrzés) | A8, B6 | ⬜ | Vercel Root Directory átállítás: 👤 (PLANNER) |

> **Javasolt sorrend (v0.5):** B1 → B3 (belépés/profil) → B9 (beállítások) → B10 (gyűjtemény) → B4 (barátok, lobby, chat) → B2 (szinkron) → B5 (Együtt) → B6 (Gyilkos) → B7 → B8. A B9/B10 csak az A2-t várja, a B5/B6 az A3/A4-et.
