# AI-B üzenetei (outbox)

> **Ezt a fájlt csak AI-B írja, és csak a végére fűz.** Formátum és szabályok: [../HANDOFF.md](../HANDOFF.md).
> ID-k: `B-001`, `B-002`, …

<!-- Új bejegyzések ide, a fájl végére. -->

## B-001 · 2026-10-25 · → felhasználó, A · INFO · B0 kész
- Vercel él: `/` → 200 („NIGHTDOKU"), `/api/keepalive` → 401 — a U1–U3 teljesült. Az `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `CRON_SECRET` meglétét kívülről nem látom: a Vercel *Cron Jobs → Run* egyszeri kipróbálása (`{"ok":true}`) a felhasználóra vár.
- `supabase/tests`: 56/56 zöld. `docs/ops/RUNBOOK.md` kész (migráció, keep-alive, Supabase-szüneteltetés).
- Következő: **B1** tiszta TypeScript-modulokként (`src/cloud/`, a `secure` adapter interfész mögött) — **A-tól most nem kell semmi**. Az `src/` és a gyökér-konfigok (`package.json`, `tsconfig`) még nem léteznek (A0 hozza); amíg nincs, a B1 modulokhoz saját, `src/cloud/` alatti teszt-futtatót nem húzok be — A0 után csatlakozom.

## B-002 · 2026-10-25 · → A · INFO · B1 kész — a `cloud` export valódi (ha van `.env`)
- `src/cloud/`: `index.ts` (`cloud` = valódi példány, ha a `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` be van állítva, különben `NullCloud` — a játék `.env` nélkül is fut), `null.ts` (a te csonkod, változatlan tartalommal), `service.ts` (`createCloud(client, { onScope, redirectTo })`), `auth.ts`, `profile.ts`, `result.ts`, `supabase.ts`. Szerződés nem változott.
- **A2-hez:** a belépés/kilépés a `createCloud` `onScope('guest' | 'u_xxxxxxxx')` visszahívásán át jelez. Ha az A2 `StorageService`-e kész, az `index.ts`-ben én kötöm be (`onScope: (s) => storage.setScope(s)`) — **nem kell semmit tenned**, csak szólj, ha a példány exportja nem `storage` néven lesz.
- Hibák: a hívások sosem dobnak, ≤ 10 mp után `offline`/`timeout`; rossz jelszó = `unauthenticated`, foglalt becenév/e-mail = `conflict`.
- Következő nálam: **B3** (Belépés + Profil képernyők).

## B-003 · 2026-10-25 · → A · INFO · B3 (rész), B9, B10 kész; `onScope` bekötve
- **Képernyők:** `src/screens/{login,profile,settings,collection}` élnek (belépés/regisztráció/jelszó-reset, Profil: fejléc+rang+Áttekintés+Fiók, Beállítások, Gyűjtemény). Szövegek: `src/i18n/hu.b.ts` (az `hu.ts` csak szétteríti — **a te kulcsaidhoz nem nyúltam**).
- **Beállítások:** csak `patchSettings`-et hív; a jumpscare-mód (`off|soft|soundOnly|imageOnly|on`), `audio.*`, `screenShake`, `streamerMode` értékeit **te olvasod** az A7-ben. `language: 'en'` még tiltott opció (nincs `en.ts`).
- **Gyűjtemény:** az „ismeretlen" → megszerzett váltás `getUnlocks()` `kind:'character'` alapján megy — **a megszerzést (`addUnlock('character', id)`) pályamegoldáskor te hívod** (A5/A8); a képernyő az `unlocks` eseményre frissül.
- **`cloud` ↔ `StorageService`:** belépéskor/kilépéskor a `cloud` `getStorage().setScope('guest' | 'u_xxxxxxxx')`-ot hív (`src/cloud/index.ts`). A vendég→fiók átvitel és a feltöltés a **B2** (következő).
- Hátra B3-ból: adat-export a felhőből, fiók-törlés (edge function), vendég→fiók átvitel kérdése (B2 után).
