# AI-B — „A felhő, a társas módok és a kiadás"

## Indító-prompt (másold be az AI-nak)

> Te vagy **AI-B** a NIGHTDOKU projektben (horror-gyilkossági logikai rejtvényjáték, webes játék (Vite + React), GitHub: `CsikSzabi04/horrordoku`; a saját munkakönyvtáradat a `bash scripts/ai-setup.sh B` hozza létre (klónozni nem kell), lásd AGENTS.md; Supabase-projekt: HorrorDoku, ref `mgmmrejyxdjjduxcwksv`).
> Rajtad kívül **AI-A** dolgozik a repón párhuzamosan. Olvasd el sorrendben: `AGENTS.md`, `docs/AI_SPLIT.md`, `docs/CONTRACTS.md`, ezt a fájlt, `docs/tasks/B.md`, `docs/HANDOFF.md` (+ a másik AI outboxa: `docs/handoff/A.md`, és `docs/handoff/PLANNER.md`), végül a `NIGHTDOKU_jatekterv.md`-t.
> **Első lépés:** `bash scripts/ai-setup.sh B` — ez létrehozza a saját `.work/B` munkakönyvtáradat; innentől **csak ott dolgozz** (a fő mappába ne írj), és `bash scripts/ai-sync.sh pull` után kezdj. Az első feladatod **B0**, majd B1 előkészítése *tiszta TypeScript-modulokként* (nem vársz az AI-A alapjára). Csak a saját útvonalaidra írj (AI_SPLIT.md 3. fejezet). A feladat-táblád: `docs/tasks/B.md`, az outboxod: `docs/handoff/B.md`; a munkád végén `bash scripts/ai-sync.sh push`.
> **Soha ne írj Supabase-be vagy Vercelbe összekötőn/MCP-n keresztül** — az a felhasználó másik, éles fiókja. Séma-változás = új migrációs fájl + SQL-teszt; a felhasználó futtatja az SQL Editorban.

## Küldetés

Te építed azt, amit a játékos *megoszt és szinkronizál*: a fiókot és profilt, a felhős mentést, a barátokat, a szobákat, a chatet és a két co-op módot (**Együtt**, **Gyilkos**), az adatbázist, a weboldalt és a kiadást. **A játék belsejét nem ismered** — a tábla, a motor és a helyi tároló A tulajdona; te a `StorageService`-en és a `BoardController`-en át csatlakozol hozzá.

## Tulajdonolt útvonalak

`src/cloud/**` · `src/coop/**` · `src/screens/{login,profile,friends,collection,settings,lobby,coop}/**` · `supabase/**` · `web/**` · `.github/workflows/release.yml` (és a Vercel/keep-alive üzemeltetés).
**Közös:** `src/shared/**`, `docs/CONTRACTS.md` (7. fejezet szerint). **Nem a tied:** `electron/**`, `src/engine/**`, `src/components/**`, `src/storage/**`, `src/ui/**`, `src/app/**`, `puzzles/**`, gyökér-konfigok — függőséget adhatsz hozzá `chore(deps):` commitban (`git pull --rebase` után), a többit kérd A-tól.

## Állapot a kezdéskor

- Migrációk: `0001_init.sql` és `0002_social.sql` **le vannak futtatva** a HorrorDoku projekten (a felhasználó beillesztette), `ping()` él. SQL-tesztek: `cd supabase/tests && npm install && npm test` → 56/56 zöld.
- `web/` (landing + `api/keepalive.js` + `vercel.json`) feltöltve; **a Vercel gyökérmappa-beállítás (Root Directory = `web`) a felhasználóra vár** (jelenleg 404).
- Nincs még játék-kód (A0 az első).

## Feladatok (sorrendben)

### B0 — Infra és alapok *(most indulhat)*
- Ellenőrizd (olvasva) a repó állapotát, a `supabase/tests` zöld-e; vedd át a `supabase/migrations`-t. **Ne futtass SQL-t felhőben** — ha valami hiányzik, HANDOFF a felhasználónak.
- Kövesd nyomon a Vercel 404-et: a felhasználó beállítása után ellenőrizd kívülről (`curl`): `/` → 200 és tartalmaz „NIGHTDOKU"-t; `/api/keepalive` → 401 (él, de token nélkül zárva). A lépéseket lásd GDD 24.2.
- `web/` rendbetétele, ha kell (404-oldal); `.github/workflows/` terv a kiadáshoz.
- **Kész, ha:** `docs/ops/RUNBOOK.md` (rövid): hogyan futtatunk migrációt, hogyan ellenőrizzük a keep-alive-ot, mi a teendő a Supabase-szüneteltetéskor.

### B1 — Felhő-alap és belépés *(webes: a Supabase-kliens alapértelmezett localStorage-tárolóját használja — nincs `secure` adapter)*
- `src/cloud/`: `supabase.ts` (`@supabase/supabase-js`, `createClient(URL, PUBLISHABLE_KEY)` a `VITE_…` változókból; alapértelmezett localStorage-munkamenet), a `CloudService` **teljes megvalósítása** a CONTRACTS 6. szerint: `auth` (`signUp` előtt `usernameAvailable`, `signIn`, `signOut`, `sendPasswordReset`), `profile` (`get/update/stats` a `profiles` és `profile_stats` alapján), hibakezelés `Result`-tal, időkorlátok (≤ 10 mp), a belépés/kilépés `StorageService.setScope()`-ot hív.
- `NullCloud` (csonk A1-ből) marad a vendég/offline alapértelmezés; a valódi példány csak belépve aktív; az `index.ts` exportja átáll.
- **Kész, ha:** egység-tesztek a hibaágakra (hálózat nélkül, rossz jelszó, foglalt becenév); kézi próba éles projekttel (regisztráció + belépés + kilépés + újraindítás utáni automatikus belépés).

### B2 — Szinkron-motor
- `src/cloud/merge.ts`: a GDD **17.5** összefésülési szabályai **tiszta függvényekként** (solved=VAGY, bestMs=MIN, hints=a legjobb futásé, wrongSubmits=MAX, session/settings/profil: újabb `updatedAt`, unlocks: egyesítés, vendég→fiók). **Tulajdonság-tesztek** (kommutatív/idempotens ahol kell).
- `src/cloud/sync.ts`: `StorageService.onChange` → `getQueue()` → idempotens feltöltés (`upsert` kulcsonként, `runs` kliens-oldali `id`-val `ON CONFLICT DO NOTHING`), siker után `ack`; offline-ban a sor marad; induláskor és hálózat-visszatéréskor `pull` → `merge` → `applyMerged`; `flush()` az `onBeforeQuit`-ben (≤ 2 mp). Állapot: `guest/offline/idle/syncing/error`.
- `catalog.refresh()`: a `puzzles` tábla `rev`-je alapján új/javított pályák → `putCachedPuzzles`.
- **Kész, ha:** szimulált két-gépes teszt (két `StorageService`-példány egy kamu felhővel): offline szerkesztés → összefésülés → konvergencia; az `applyMerged` nem generál végtelen ciklust.

### B3 — Belépés, Profil, Fiók képernyők *(az A1 UI-készletére épül)*
- GDD 14.6 (belépés/regisztráció, vendég-átvitel kérdése), 14.7 (Profil: Áttekintés / Ügyek / Gyűjtemény / Eredmények / Fiók), 18.5 (honnan jön mi), rang- és XP-számítás, adatexport (JSON), fiók törlése (**edge function** — a függvény kódját megírhatod, a telepítést a felhasználó végzi).
- **Kész, ha:** puppeteer-füstteszt: regisztráció → profil megjelenik → kilépés; a Nyugodt mód érvényesül.

### B9 — Beállítások képernyő *(A1 UI-készlet + A2 `StorageService`)*
- GDD 12.4, 14, 17.4: hang (zene / effekt / hangerő-plafon), jumpscare-mód (`on | soundOnly | imageOnly | soft | off`, alap: **ki**), **Nyugodt mód** (`photosensitive`), rázkódás, Streamer mód, nyelv (hu / en), Láthatatlan mód (belépve), **Adatok:** *Mentés exportálása / betöltése / Helyi adatok törlése* (17.4), a belépett fiók gyors-linkjei.
- A képernyő csak a `Settings` objektumot írja (`StorageService.patchSettings`); a jumpscare/hang motort A írja (A7), ami olvassa a beállításokat. A Nyugodt módot az A2 `patchSettings`-e érvényesíti (`nd_calm` + `html.calm`).
- **Kész, ha:** minden kapcsoló perzisztens (újratöltés után ugyanaz); a Nyugodt mód azonnal érvényesül a Home-on és a játékban; az export/import körbe-forog (export → törlés → import = ugyanaz).

### B10 — Gyűjtemény / bestiárium képernyő *(A1 UI-készlet + A2 `getUnlocks` + A `content` API)*
- GDD 14.7 („Gyűjtemény" fül tartalma), 19.4 („szerzés"): megszerzett karakterek kártyái (portré/emoji, név, faj, forrás-játék, leírás), a le nem szerzettek „ismeretlen" sziluettként, szűrés világ / faj szerint, számláló (pl. 6/60); később: bűnügyi napló, arany jumpscare-ek, skinek.
- Adat: `content.characters()` (CONTRACTS 10.; induláskor a 6 Hollowmere-szereplő, A5/A8-cal bővül) + `StorageService.getUnlocks()` (`kind: 'character'`).
- **Kész, ha:** új karakter megszerzésekor (unlock) a kártya felfedődik; üres és teljes állapot rendben.

### B4 — Barátok, lobby, szoba-szolgáltatás, chat
- `FriendsApi` (a `0002` függvényei: `send_friend_request`, `respond_friend_request`, `remove_friend`, `my_friends`), profil-keresés (előtag, min. 2 karakter, 300 ms debounce), Realtime-értesítés a kérésekről; `RoomsApi` (`create_room`, `join_room`, `leave_room`, `start_room`, `invite_friend`), `RoomSession` (tagok, chat a `room_messages` + `postgres_changes`-en, 0,7 mp-es kliens-oldali sebességkorlát); képernyők: Barátok (14.9), Lobby (14.10).
- **Kész, ha:** két böngészőablak (külön profil / inkognitó) barátot jelöl, elfogad, meghív, a másik belép a szobába, chatelnek.

### B5 — Együtt mód
- GDD 22.1–22.2: Broadcast `room:<id>` (privát) protokoll az `OpEnvelope`-pal, Lamport-`seq`, a konfliktus-szabály (CONTRACTS 3.), kurzorok (~10 Hz), 2 mp-es pillanatkép `save_room_state`-tel (verzió-ellenőrzés), újracsatlakozás (`loadState` + az azóta jött műveletek), 2 perc türelmi idő, host-átadás, beküldés-szavazás (10 mp, többség), közös tippkeret, a `runs` napló (`kind='together'`) minden tagnak.
- A játékképernyőhöz a **`BoardController`** (A4) hívásain át csatlakozol: `onLocalOp` → sugárzás; távoli művelet → `applyRemote`; `setPeers`, `setPeerCursor`. Overlay: játékos-sáv, chat-panel, „Mutasd" ping (14.11).
- **A privát csatornák jogosultsága** (`realtime.messages` RLS, GDD 23.5): a **`0007_killer.sql`**-be kerül, és csak akkor igaz, ha a Supabase aktuális dokumentációja szerint ellenőrizted (`search_docs`, csak olvasás).
- **Kész, ha:** két példány ugyanazt a táblát látja, a másik lerakását el lehet vinni, a szétkapcsolt fél visszatér és szinkronba kerül (e2e).

### B6 — Gyilkos mód
- **`0007_killer.sql`** (+ SQL-tesztek a `supabase/tests`-ben): `room_roles` (RLS: csak a saját sor), a `start_room` Gyilkos-módú változata (véletlen szerepsorsolás, a lobbyban senki sem tudja), `use_ability(room, ability, payload)` (szerepellenőrzés, **szerveroldali hűtés és korlát**, `realtime.send` a `room:<id>:fx` privát csatornára **feladó nélkül**), szavazás / Gyűlés / Szimat / Epilógus táblák és függvények, szerveroldali időszámítás (*kezdés + időkorlát − büntetések*), `runs.role/won`, `realtime.messages` RLS.
- Kliens: `KillerSession` (CONTRACTS 7.), képesség-sáv (csak a gyilkosnak), Szimat, Gyűlés, Epilógus, névtelen lerakások (alapból), `Fx` → `BoardController.applyFx`; a három képesség alapértékei és a beállítás-tábla: GDD 22.3.
- **Biztonsági elfogadási feltétel:** a hálózati forgalomból és a kliens-állapotból **nem fejthető vissza**, ki a gyilkos (a teszt: egy nyomozó-kliens `room_roles`-ból sem, `fx`-eseményből sem, Presence-ből sem kap információt).
- **Kész, ha:** 3 példányos kézi/e2e teszt: szerepek titkosak, mindhárom képesség hűtéssel és értesítés nélkül működik, Gyűlés + Epilógus kimenetek (nyomozók / döntetlen / gyilkos) helyesen kerülnek a `runs`-ba.

### B7 — Ranglista, online-állapot, nyilvános profil, moderáció
- Napi ranglista (`leaderboard`), `public_profile(uuid)` függvény (biztonságos statisztika másoknak), `profiles.searchable`, `profiles.last_seen` + „Láthatatlan mód", chat-jelentés (`reports` tábla) és némítás, barát-limit (100). Mind **új migrációban** (`0004_…`) teszttel.

### B8 — Kiadás és üzemeltetés
- **Webes élesítés:** Vercel a repó gyökeréből (Framework: Vite, kimenet `dist/`); az `api/keepalive.js` + `vercel.json` a gyökérbe költözik, a `web/` landing aloldalra; GitHub Actions: build/deploy-ellenőrzés; keep-alive megfigyelés. Ehhez a felhasználónak át kell állítania a Vercel Root Directory-t (`web` → `.`) — előbb kérd a `handoff/PLANNER`-en át. **Az asztali csomag (Electron/Tauri) később, külön feladat.**
- A kiadás előtti ellenőrzőlista: GDD 24.6; a `puzzles/` láthatóságának döntése (AI_SPLIT 9.2); a franchise-nevek cseréje (GDD 21).

## Amire A-tól számíthatsz (és mikor)

| Mit | Mikor | Hogyan használod |
|---|---|---|
| `src/shared/**` típusok, `NullCloud` csonk | A1 után | `import` a szerződés-típusokból; az `index.ts` exportot te veszed át |
| UI-készlet, csonk-képernyők | A1 után | a képernyőket a csonkok helyére építed |
| `StorageService` | **A2** után | a szinkron-motor ezen át olvas/ír |
| `BoardEngine` (`apply/check/autoMarks`) | A3 után | a co-op művelet-ellenőrzés és a beküldés |
| `BoardController` | **A4** után | a co-op overlay és a Gyilkos-hatások csatlakozása |
| Jumpscare / hang | A7 után | a rossz beküldés közös jumpscare-e a `showSubmitResult`-on át |
| `content` API (`src/content`) | **A1-től** (6 Hollowmere-karakter), bővül A5/A8-cal | a Gyűjtemény képernyő (B10) |
| `StorageService` (`getSettings/patchSettings`, `getUnlocks`) | **A2** után | a Beállítások (B9) és a Gyűjtemény (B10), valamint a szinkron (B2) |

## Amit A-nak ígérsz

- A `CloudService` **soha nem blokkolja a játékot**: minden hívás időkorlátos, a hiba `Result`.
- A szinkron **nem módosítja** az A tulajdonában lévő fájlokat, csak a `StorageService`-en át, és az `applyMerged` nem tesz `SyncOp`-ot a sorba.
- A migrációk visszafelé kompatibilisek; törő séma-változás előtt HANDOFF.

## Buktatók

- **Az új Supabase-kulcs (`sb_publishable_…`) nem JWT**: csak az `apikey` fejlécben menjen, `Authorization: Bearer` alatt ne.
- A **PGlite nem a valódi Supabase**: a Realtime csak csonk — a privát csatornák és az `realtime.send` működését éles projekten kell kézzel ellenőrizni, és ezt a HANDOFF-ban kérd a felhasználótól.
- Az alap jogosultságok miatt a valódi Supabase-en az „anon nem lát semmit" üres listát ad (nem tiltást) — a biztonság az RLS-ből jön; **minden új táblán kapcsold be az RLS-t**.
- A free csomag **nem ad letölthető mentést** és 1 hét inaktivitás után szüneteltethet — a keep-alive és az adatexport ezért fontos.
- Chat és Gyilkos-mód: a gyilkos azonosítója **sosem** kerülhet közös csatornára, naplóba vagy `Presence`-be a játék végéig.
- Vercel **Hobby** csomag: nem kereskedelmi használatra való (GDD 24.3).
