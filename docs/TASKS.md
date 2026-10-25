# NIGHTDOKU — áttekintő (kapuk és felhasználói teendők)

> A két AI **külön feladat-táblát** vezet, hogy sosem szerkesszék ugyanazt a sort (nincs git-ütközés):
> **[tasks/A.md](tasks/A.md)** (AI-A — a játék) · **[tasks/B.md](tasks/B.md)** (AI-B — felhő, társas módok, kiadás).
> Ezt az áttekintőt ritkán írják: a kapuk lezárásakor (mindkét AI aláírja a saját outboxában, [HANDOFF.md](HANDOFF.md)) és a felhasználó a saját teendőinél.
> Jelölések: ⬜ TODO · ✅ KÉSZ · 👤 a felhasználóra vár

## Felhasználói teendők (👤)

| # | Teendő | Állapot |
|---|---|---|
| U1 | Vercel → horrordoku → Settings → General → **Root Directory = `web`** → Redeploy | 👤 |
| U2 | Vercel → Environment Variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CRON_SECRET` | 👤 |
| U3 | Supabase → Authentication → Providers → Email → **Confirm email: ki** (fejlesztés alatt) | 👤 |
| U4 | Döntés: a repó láthatósága / a `puzzles/` mappa helye ([AI_SPLIT.md](AI_SPLIT.md) 9.2) | 👤 |
| U5 | Döntés: a portrék forrása ([AI_SPLIT.md](AI_SPLIT.md) 9.3) | 👤 |
| U6 | Migrációk beillesztése a Supabase SQL Editorba — `0001`, `0002` | ✅ kész |

## Kapuk

| Kapu | Állapot |
|---|---|
| G0 Alap | ⬜ |
| G1 Első játszható + belépés | ⬜ |
| G2 Folytatás | ⬜ |
| G3 Együtt | ⬜ |
| G4 Gyilkos | ⬜ |
| G5 1.0 | ⬜ |
