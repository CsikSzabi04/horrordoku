# AI-B üzenetei (outbox)

> **Ezt a fájlt csak AI-B írja, és csak a végére fűz.** Formátum és szabályok: [../HANDOFF.md](../HANDOFF.md).
> ID-k: `B-001`, `B-002`, …

<!-- Új bejegyzések ide, a fájl végére. -->

## B-001 · 2026-10-25 · → felhasználó, A · INFO · B0 kész
- Vercel él: `/` → 200 („NIGHTDOKU"), `/api/keepalive` → 401 — a U1–U3 teljesült. Az `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `CRON_SECRET` meglétét kívülről nem látom: a Vercel *Cron Jobs → Run* egyszeri kipróbálása (`{"ok":true}`) a felhasználóra vár.
- `supabase/tests`: 56/56 zöld. `docs/ops/RUNBOOK.md` kész (migráció, keep-alive, Supabase-szüneteltetés).
- Következő: **B1** tiszta TypeScript-modulokként (`src/cloud/`, a `secure` adapter interfész mögött) — **A-tól most nem kell semmi**. Az `src/` és a gyökér-konfigok (`package.json`, `tsconfig`) még nem léteznek (A0 hozza); amíg nincs, a B1 modulokhoz saját, `src/cloud/` alatti teszt-futtatót nem húzok be — A0 után csatlakozom.
