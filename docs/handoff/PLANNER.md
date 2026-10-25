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
