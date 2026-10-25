# AI-B — feladat-tábla

> **Ezt a fájlt csak AI-B szerkeszti.** Jelölések: ⬜ TODO · 🟨 FOLYAMATBAN · ✅ KÉSZ · ⛔ BLOKKOLT · 👤 a felhasználóra vár
> Kezdéskor 🟨-ra állítod és pusholod (`bash scripts/ai-sync.sh push`), hogy a másik lássa; kész állapotban ✅ + commit-hash.
> Részletek: [briefs/AI-B.md](../briefs/AI-B.md) · függőségi gráf: [AI_SPLIT.md](../AI_SPLIT.md) 4. fejezet · a másik tábla: [A.md](A.md)

| ID | Feladat | Függ | Állapot | Commit / megjegyzés |
|---|---|---|---|---|
| B0 | Infra: SQL-tesztek a repóban, Vercel-ellenőrzés, RUNBOOK | — | 🟨 | SQL-tesztek: ✅ (`supabase/tests`, 56/56) · RUNBOOK ⬜ · Vercel Root Directory: 👤 (lásd [TASKS.md](../TASKS.md) U1–U3) |
| B1 | Felhő-alap + belépés (`CloudService`, `auth`, `profile`) | B0, A0 | ⬜ | tiszta modulokként már indulhat |
| B2 | Szinkron-motor (`merge`, `sync`, `catalog`) | B1, A2 | ⬜ | |
| B3 | Belépés / Profil / Fiók képernyők | B1, A1 | ⬜ | |
| B4 | Barátok, lobby, szoba-szolgáltatás, chat | B1, A1 | ⬜ | |
| B5 | Együtt mód (Realtime-protokoll, overlay) | B4, A3, A4 | ⬜ | |
| B6 | Gyilkos mód (`0003`, képességek, Gyűlés/Epilógus) | B5, A7 | ⬜ | |
| B7 | Ranglista, online-állapot, nyilvános profil, moderáció (`0004`) | B2 | ⬜ | |
| B8 | Kiadás (`release.yml`, GitHub Releases, letöltőoldal) | A8, B6 | ⬜ | |
