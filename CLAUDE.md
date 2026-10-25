@AGENTS.md

Claude Code: a fenti útmutató (és az abban hivatkozott docs/ fájlok) kötelező olvasmány. **Nincs külön munkakönyvtár:** mindent a fő mappában (`D:\Projectss\HorrorDoku`) dolgozol, commit csak a végén, ha a felhasználó kéri. Első lépés: a saját feladat-táblád (`docs/tasks/`) és a másik AI outboxának (`docs/handoff/`) átnézése.

## Játékképernyő-elrendezés — MINDEN játékban, MINDEN pályán ugyanaz (felhasználói döntés, 2026-10-25)

Mint a murdoku.com: **három oszlop**, balról jobbra.

1. **Bal oszlop:** felül a **logó**, a **vissza-nyíl**, a **Magyar / English váltó** és az **idő**; alatta a pálya címe + a bevezető szöveg; alatta a **karakterek** (arckép + alatta a színes nyomkártya).
2. **Középső (a legnagyobb) oszlop:** a **térkép**.
3. **Jobb szélső, keskenyebb oszlop (eszközök):** ✕ (kizár), radír (nyomva tartva: teljes törlés), **visszavonás**, újra, **tipp**, **beküldés**, „hogyan kell játszani", ?, megosztás, **mentés**, **hang**, beállítások.

A közös keret a `src/components/GameFrame.tsx` — **új játékmód (Együtt, Gyilkos stb.) is ezt használja**, nem épít saját elrendezést. **Kinézet:** az oldal háttere **fekete** (mint az app többi része), a három oszlop **fehér lap**, rajta a játék. A fejlécben egy **🌙 sötét mód** gomb a lapokat is sötétre váltja (ugyanaz a kinézet, fekete háttérrel). A **Klasszikus** „normális" murdoku-kinézetű (hétköznapi helyszínek és nevek, rajzolt arcképek, nincs horror); az Esemény/Random/co-op mindig sötét, horror-témájú — de a három oszlop ugyanaz.

**Mindenhol ugyanaz a viselkedés:** egy karakter kiválasztása után a mezőre koppintás csak a **kezdőbetűjét** teszi le (jegyzet); a karakter **~1 mp nyomva tartásra** kerül le, a mező körül **megtelő gyűrű** jelzi. A pálya betöltésekor a térkép darabjai és a kártyák **fentről zuhannak le** (a Nyugodt mód ezt kikapcsolja).

