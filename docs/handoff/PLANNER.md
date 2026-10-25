# Tervező és felhasználó üzenetei

> **Az AI-k ezt a fájlt csak olvassák.** A felhasználó (vagy a tervező) ide írja a döntéseit és a kéréseit; az AI-k a saját outboxukban válaszolnak rá.
> Formátum és szabályok: [../HANDOFF.md](../HANDOFF.md). ID-k: `P-001`, `P-002`, …

## P-001 · 2026-10-25 · → A, B · INFO · A projekt állapota és a rajt
- **Kész:** GDD v0.3 · Supabase-migrációk `0001`, `0002` (a felhasználó lefuttatta a HorrorDoku projekten, `ping()` él) · `supabase/tests` (56/56 zöld) · `web/` landing + keep-alive · `.gitignore`, `.env.example` · a két AI munkaleírása.
- **Nincs még:** játék-kód. Az **A0** az első feladat; B addig a B0-t és a B1 tiszta moduljait viheti.
- **A két AI határa:** [AI_SPLIT.md](../AI_SPLIT.md); a közös nyelv: [CONTRACTS.md](../CONTRACTS.md). Ami ott nincs, azt kérdezd meg az outboxodban.
- **Figyelem — az eszközökhöz csatlakoztatott Supabase- és Vercel-összekötők a felhasználó MÁSIK, éles fiókjára mutatnak.** Semmit ne írj rajtuk át. Lásd AGENTS.md 2. pont.
- **Munkakönyvtár:** az első lépésed `bash scripts/ai-setup.sh A` (vagy `B`) — ez létrehozza a saját `.work/<A|B>` mappádat; klónozni nem kell.

## P-002 · 2026-10-25 · → felhasználó · DECISION · Nyitott kérdések
Az [AI_SPLIT.md](../AI_SPLIT.md) 9. fejezetében 6 nyitott kérdés van (repó láthatósága, portrék forrása, franchise-nevek, Vercel Hobby, nyelvek, merge-módszer). A munka nem áll meg miattuk, de a **G1 előtt** érdemes az 1–3. pontot eldönteni.

## P-003 · 2026-10-25 · → felhasználó · REQUEST · Vercel beállítás (U1, U2)
A `horrordoku.vercel.app` 404-et ad: valószínűleg a Root Directory nincs `web`-re állítva. Lépések: [../TASKS.md](../TASKS.md) U1–U3. Utána B0 ellenőrzi kívülről.

## P-004 · 2026-10-25 · → A, B · INFO · FELHASZNÁLÓI DÖNTÉS — web először; a Klasszikus sima Murdoku
A felhasználó döntése (A-nak mondta, A rögzítette; GDD „v0.4 — döntések"):
1. **Web először.** Nincs Electron / `memory` mappa / híd / `.exe` — `npm run dev` → localhost, élesben Vercel. Az asztali csomag *később*, ugyanabból a kódból.
2. **A Klasszikus mód sima Murdoku-másolat** (murdoku.com): nincs Erő-szabály, világ-szabály, kiterjesztett nyom, jumpscare. 10 pálya, csak a karakterek/történetek témásak. Az extrák az **Esemény** (világ-szabályok), a **Random** (Erők kapcsolható, alapból ki) és a co-op módokban vannak.
3. Ami változik a munkamegosztásban: lásd A-003 (A outbox).

## P-005 · 2026-10-25 · → A, B · INFO · FELHASZNÁLÓI DÖNTÉS — új felosztás (v0.5)
- **AI-A:** Klasszikus (sima Murdoku), Esemény, Random — és ami ehhez kell (motor, tábla, helyi mentés, jumpscare/hang, pályák). **AI-A semmire nem vár AI-B-re.**
- **AI-B:** **Bejelentkezés, Profil, Barátok, Gyűjtemény, Beállítások**, valamint az **Együtt** és a **Gyilkos** mód (+ felhő, szinkron, adatbázis, élesítés).
- Változások: a `collection` és `settings` képernyő B-é (új feladatok: **B9, B10**); A7 csak a jumpscare/hang/zene motor; A8 csak az Esemény-pályák. Részletek: AGENTS.md „Ki mit csinál", AI_SPLIT.md, a két feladatleírás és tábla.
