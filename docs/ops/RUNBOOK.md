# NIGHTDOKU — üzemeltetési RUNBOOK (rövid)

Projekt: Supabase **HorrorDoku** (ref `mgmmrejyxdjjduxcwksv`) · Vercel: `horrordoku.vercel.app` (Root Directory = `.` — a gyökér a Vite-app: `/` Home, `/play/` játék; a keep-alive az `api/keepalive.js`; régebben a Root Directory `web` volt).
Az AI-k **nem írnak** felhős szolgáltatásba (összekötő/MCP a felhasználó másik, éles fiókját éri) — minden írást a felhasználó végez.

## 1. Migráció futtatása

0. Eddigi migrációk sorrendje: `0001_init` → `0002_social` → `0003_invites` → `0004_extras` (→ később `0005_killer`). Mindig a hiányzókat futtasd, sorban.
1. Új fájl: `supabase/migrations/NNNN_<név>.sql` (sorszám folytatólagos; a már lefuttatott fájlt **soha** ne szerkeszd — új migráció kell).
2. Minden új táblán `enable row level security` + szabályok; a séma-változás mellé teszt kerül a `supabase/tests`-be.
3. Teszt (helyben, PGlite): `cd supabase/tests && npm install && npm test` — hibátlan, különben nem pusholunk.
4. Felhasználó: Supabase → **HorrorDoku** → *SQL Editor* → a fájl tartalmát beilleszti, futtatja (sorrendben, a már futtatottakat kihagyva).
5. Ellenőrzés: `select public.ping();` hibátlan; az érintett táblán a RLS be van kapcsolva (*Table Editor* / *Advisors*).
6. A PGlite nem a valódi Supabase: a Realtime / `realtime.send` / privát csatornák viselkedését éles projekten kézzel kell kipróbálni (HANDOFF-kérés a felhasználónak).

## 2. A keep-alive ellenőrzése

> Az `api/keepalive.js` **ESM** (a gyökér `package.json` `"type": "module"`); a régi `module.exports`-os változat ilyen környezetben `FUNCTION_INVOCATION_FAILED`-et (500) adna. Teszt: `src/cloud/keepalive.test.ts`.

Cél: a Supabase free projekt ne szünetelődjön egy hét inaktivitás után. A Vercel cron naponta egyszer (06:17 UTC) hívja az `/api/keepalive`-ot, ami a `public.ping()`-et futtatja.

| Ellenőrzés | Elvárt | Ha nem |
|---|---|---|
| `curl -s -o /dev/null -w "%{http_code}" https://horrordoku.vercel.app/` | `200`, a törzsben „NIGHTDOKU" | `404` → Vercel *Root Directory* nincs `web`-en (GDD 24.2) |
| `curl -s -o /dev/null -w "%{http_code}" https://horrordoku.vercel.app/api/keepalive` | `401` (él, token nélkül zárva) | `404` → nincs deploy / rossz gyökér; `500` → hiányzik egy env-változó |
| Vercel → *Settings → Cron Jobs* → **Run** | a naplóban `{"ok":true,"ping":{…}}` | `502` → a Supabase nem 2xx-et adott (lásd 3.); `500` → `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` hiányzik; `401` → `CRON_SECRET` nincs beállítva |

Env-változók (Vercel → Production): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`), `CRON_SECRET`. Secret / `service_role` kulcs sehová nem kell.
Időnként (pl. hetente) nézd meg a Vercel *Logs / Cron Jobs* oldalát: a hiba (502) csak ott látszik.

## 2b. Edge function telepítése (fiók-törlés)

`supabase/functions/delete-account` — a felhasználó telepíti (`supabase functions deploy delete-account --project-ref <ref>` vagy Dashboard → Edge Functions). A service role kulcsot a Supabase adja a függvénynek; repóba/kliensbe nem kerülhet. Ellenőrzés: bejelentkezett teszt-fiókkal a Profil → Fiók → „Fiók törlése".

## 3. Ha a Supabase szüneteltette a projektet

Tünet: a keep-alive `502`, a játék felhős hívásai időtúllépéssel `Result`-hibát adnak (a játék offline tovább játszható — a `CloudService` sosem blokkol).

1. Supabase Dashboard → a **HorrorDoku** projekten *Restore project* (a visszaállítási határidőt a Dashboard mutatja — ne várd meg).
2. Visszaállás után: `select public.ping();` az SQL Editorban, majd a Vercel *Cron Jobs → Run* → `{"ok":true}`.
3. A free csomag **nem ad letölthető mentést**: a felhasználói adatról ezért a kliens JSON-exportja (B3) és a helyi `memory/` mappa a másodlagos példány. A pályák (`puzzles`) forrása a repó.
4. Ha a cron nem futott (Vercel-hiba, lejárt deploy), a keep-alive-ot kézzel is meg lehet hívni (*Cron Jobs → Run*); a hét eleje előtt érdemes ellenőrizni.
5. Ismétlődő szüneteltetés esetén: a Vercel Hobby cron időpontja órán belül tolódhat — ez a napi ping-hez elég; a Hobby csomag nem kereskedelmi használatra való (GDD 24.3).
