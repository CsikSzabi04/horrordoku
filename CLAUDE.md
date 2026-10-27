@AGENTS.md

Claude Code: a fenti útmutató (és az abban hivatkozott docs/ fájlok) kötelező olvasmány. **Nincs külön munkakönyvtár:** mindent a fő mappában (`D:\Projectss\HorrorDoku`) dolgozol, commit csak a végén, ha a felhasználó kéri. Első lépés: a saját feladat-táblád (`docs/tasks/`) és a másik AI outboxának (`docs/handoff/`) átnézése.

## Játékképernyő-elrendezés — MINDEN játékban, MINDEN pályán ugyanaz (felhasználói döntés, 2026-10-25)

Mint a murdoku.com: **három oszlop**, balról jobbra.

1. **Bal oszlop:** felül a **logó** és a **vissza-nyíl**; alatta a pálya címe + a bevezető szöveg (szorosan egymás alatt); alatta a **karakterek** (arckép + alatta a színes nyomkártya).
2. **Középső (a legnagyobb) oszlop:** a **térkép**.
3. **Jobb szélső, keskenyebb oszlop (eszközök), fentről lefelé:** ✕ (kizár); radír (csak a 🧽 jel, nyomva tartva: teljes törlés); **Visszavonás** (egyedül, nincs „újra" és nyíl gomb); lent **Tipp**, **Feladom**, **Beküldés**, **Hogyan kell játszani** egymás alatt. Nincs „?", megosztás és mentés gomb (a mentés automatikus).

**A bal oszlop alján** (a görgethető kártyák alatt, mindig látszik, vékony vonallal elválasztva): balra az **idő**, a **🌙 sötét mód** és a **Magyar / English váltó**, jobbra a **beállítások** és a **hang** (`GameFooter`). Keskeny képernyőn ez a sáv a cím alá kerül. Cél: ne legyen olyan az elrendezés, mint a murdoku.com-on.

A közös keret a `src/components/GameFrame.tsx` — **új játékmód (Együtt, Gyilkos stb.) is ezt használja**, nem épít saját elrendezést. **Kinézet:** a Klasszikus **alapból sötét** (fekete oldal, sötét lapok, mint az app többi része). A fejlécben a **🌙 gomb világos módra** vált: ilyenkor az **oldal háttere is fehér**, a három oszlop fehér lap vékony fekete szegéllyel (a Klasszikus listán ugyanígy). A **Klasszikus** „normális" murdoku-kinézetű (hétköznapi helyszínek és nevek, rajzolt arcképek, nincs horror); az Esemény/Random/co-op mindig sötét, horror-témájú — de a három oszlop ugyanaz.

**Mindenhol ugyanaz a viselkedés:** egy karakter kiválasztása után a mezőre koppintás csak a **kezdőbetűjét** teszi le (jegyzet); a karakter **~1 mp nyomva tartásra** kerül le, a mező körül **megtelő gyűrű** jelzi. A pálya betöltésekor a térkép darabjai és a kártyák **fentről zuhannak le** (a Nyugodt mód ezt kikapcsolja).

