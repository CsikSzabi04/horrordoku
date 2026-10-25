# 🩸 NIGHTDOKU — *Ahol a sudoku vért ont*

> **Játéktervezési dokumentum (GDD) — v0.3**
> Horror-gyilkossági logikai rejtvényjáték **letölthető, önálló ablakos asztali alkalmazásként** (először Windowsra): 5 játékmód (Klasszikus, Esemény, Random, Co-op Együtt, Co-op Gyilkos), offline is játszható; a mentések a játék mappájának `memory` almappájába kerülnek, a fiók, a profil, a barátok és a felhős mentés pedig Supabase-ben van.
> Inspiráció: Manuel Garand *Murdoku* könyvei és a murdoku.com online változata.

---

## Tartalomjegyzék

1. [Az ötlet egy mondatban](#1-az-ötlet-egy-mondatban)
2. [Mit veszünk át a Murdokuból (alapmechanika)](#2-mit-veszünk-át-a-murdokuból-alapmechanika)
3. [Mitől lesz más és jobb](#3-mitől-lesz-más-és-jobb)
4. [Játékmódok áttekintése](#4-játékmódok-áttekintése)
5. [KLASSZIKUS MÓD — Hollowmere ügyei](#5-klasszikus-mód--hollowmere-ügyei)
6. [A Hollowmere-univerzum lore-ja](#6-a-hollowmere-univerzum-lore-ja)
7. [Karakterek, erők és fajok](#7-karakterek-erők-és-fajok)
8. [A 10 pálya (Klasszikus mód)](#8-a-10-pálya-klasszikus-mód)
9. [Kidolgozott mintapálya megoldással](#9-kidolgozott-mintapálya-megoldással)
10. [ESEMÉNY MÓD — „Rémálom-archívum"](#10-esemény-mód--rémálom-archívum)
11. [Az Esemény mód 10 világa](#11-az-esemény-mód-10-világa)
12. [Jumpscare-rendszer](#12-jumpscare-rendszer)
13. [Zene és hangdizájn](#13-zene-és-hangdizájn)
14. [UI / UX — képernyőről képernyőre](#14-ui--ux--képernyőről-képernyőre)
15. [Saját extra ötletek](#15-saját-extra-ötletek)
16. [Technikai terv](#16-technikai-terv)
17. [Helyi mentés — a `memory` mappa](#17-helyi-mentés--a-memory-mappa)
18. [Fiók, profil és felhő (Supabase)](#18-fiók-profil-és-felhő-supabase)
19. [Random mód és a szabálykövető generátor](#19-random-mód-és-a-szabálykövető-generátor)
20. [Pályaformátum (JSON) és pályagenerátor](#20-pályaformátum-json-és-pályagenerátor)
21. [Jogi megjegyzés az Esemény módhoz és a Random módhoz](#21-jogi-megjegyzés-az-esemény-módhoz-és-a-random-módhoz)
22. [Co-op módok — „Együtt" és „Gyilkos"](#22-co-op-módok--együtt-és-gyilkos)
23. [Barátok, profil-keresés és játékon belüli chat](#23-barátok-profil-keresés-és-játékon-belüli-chat)
24. [Kiadás és üzemeltetés: GitHub, Vercel, keep-alive](#24-kiadás-és-üzemeltetés-github-vercel-keep-alive)
25. [Ütemterv (roadmap)](#25-ütemterv-roadmap)

---

## 1. Az ötlet egy mondatban

**Egy Murdoku-szerű, rácsos gyilkossági logikai rejtvény, csak sötétebb: a gyanúsítottak vámpírok, démonok, boszorkányok és szellemek, akiknek a természetfeletti képességei maguk is a rejtvény szabályaivá válnak — egy külön módban pedig a legismertebb horror-játékok világában kell kinyomozni, ki ölte meg a főgonoszt, és ha elrontod, a gonosz az arcodba ugrik — barátokkal közösen is nyomozhatsz, vagy gyilkosként szabotálhatod őket.**

---

## 2. Mit veszünk át a Murdokuból (alapmechanika)

A képernyőképek alapján a Murdoku magja ez — ezt **1:1-ben megtartjuk**, mert ez működik:

### 2.1 A tábla
- **N×N-es rács** (6×6-tól 10×10-ig), amely **helyiségekre** van osztva vastag falakkal (pl. Hálószoba, Konyha, Ebédlő, Veranda, Előkert).
- A mezőkön **tárgyak** vannak: szék, szőnyeg, doboz, növény, bokor, asztal, ágy stb.
- Bizonyos tárgyak **„foglaltak"** — rájuk nem állhat senki (pl. bokor, asztal, ágy), másokon lehet állni/ülni (szék, szőnyeg).

### 2.2 A szereplők
- N darab karakter: **N−1 gyanúsított + 1 áldozat**.
- Minden karakterhez tartozik **egy nyom-kártya** („He was beside the box." / „She was sitting in a chair." / „She was the only person on a carpet.").
- Az áldozat kártyája mindig: **„Egyedül volt a gyilkossal."** → abban a helyiségben, ahol az áldozat van, pontosan egy gyanúsított tartózkodik: ő a gyilkos.

### 2.3 Szabályok
1. **Soronként és oszloponként pontosan egy karakter.** Ha lerakod valakit, a sorát és oszlopát automatikusan X-ek töltik ki.
2. **„Mellette" (beside)** = közvetlenül balra, jobbra, fent vagy lent **ÉS ugyanabban a helyiségben** (falon át nem számít).
3. Minden nyomnak teljesülnie kell; a megoldás **egyértelmű**.

### 2.4 Kezelés
- Karakter **kiválasztása** a bal oldali listában (kattintás).
- **Nyomva tartás** a mezőn = karakter lerakása (nagy betű jelenik meg).
- **Rövid koppintás** = csak ceruzás jegyzet (kis betű).
- Jobb oldali **eszköztár**: ❌ X-elés eszköz, 🧽 radír (nyomva tartva mindent töröl), ↩️ Visszavonás, 💡 Tipp, ✅ Beküldés (csak ha mindenki lent van), „Hogyan játssz", ❓ súgó, ↗ megosztás, 🖼 kép mentése, 🔇 hang, ⚙ beállítások.
- **6 lépéses bemutató** az első pályán (Üdv, nyomozó → Nyomok → Soronként egy → „Mellette" jelentése → Lerakás → Oldd meg az ügyet).
- **Időmérő** a bal felső sarokban.

### 2.5 Pályaválasztó
- „Válassz egy rejtvényt" képernyő, **nehézségi szűrők**: Mind / Nagyon könnyű / Könnyű / Közepes / Nehéz / Szakértő.
- **Rendezés** (nehézség, dátum), „Nem kiadottak elrejtése".
- A pályák **lezárt borítékok** („CASE AVAILABLE — CLICK TO REVEAL"), amelyek kattintásra kinyílnak és megmutatják a térképet, a nevet, a nehézséget és a méretet.
- Bejelentkezés Google-lel (haladás mentése), vagy „Nem kell, maradok kijelentkezve".
- Nyelvválasztó, sötét mód, „X puzzle / Y megoldva" számláló.

> **A Murdoku gyenge pontja**, amit javítunk: kevés online pálya (41 db, alfa), egyszerű, „Cluedo-szerű" hangulat, nincs történet, nincs tét. Nálunk minden pálya egy történet része, és a karaktereknek saját életük van.

---

## 3. Mitől lesz más és jobb

| Murdoku | NIGHTDOKU |
|---|---|
| Hétköznapi gyanúsítottak (Alexander, Bella…) | Vámpírok, démonok, boszorkányok, vérfarkasok, szellemek — saját lore-ral |
| Csak tárgy- és helyiség-nyomok | **Erő-szabályok**: a karakter faja módosítja a szabályokat (pl. szellem átlát a falon) |
| Nincs következmény | **Jumpscare** rossz megoldásnál (kikapcsolható) |
| Csendes | Pályánként saját **atmoszférikus zene és hangeffektek** |
| Önálló pályák | **Kampány**: a pályák egy összefüggő rejtélyt bontanak ki |
| ~41 pálya | Indulásra **10 kézzel készült klasszikus + 10 horror-játékos Esemény-pálya + végtelen Random mód**, folyamatos bővítés |
| — | **Esemény mód**: ismert horror-játékok világai és karakterei |
| Böngészős; a haladás csak Google-bejelentkezéssel mentődik | **Letölthető alkalmazás**: helyi mentés a `memory` mappában, fiók + **profil oldal** + felhős szinkron (Supabase), offline is játszható |
| Kevés, rögzített pálya | Előre megírt pályák **+ végtelen Random mód** (seedelt, szabálykövető generátor, félbehagyva is folytatható) |
| Egyedül játszható | **Co-op módok**: közös tábla + chat (*Együtt*), és egy „Among Us"-szerű *Gyilkos* mód |

---

## 4. Játékmódok áttekintése

A NIGHTDOKU **öt fő játékmóddal** indul — a főmenüben ez az öt kártya:

```
┌──────────────────────────────────────────────────────────────────┐
│                       🩸  NIGHTDOKU  🩸                           │
├──────────────────────────────────────────────────────────────────┤
│  🕯️  KLASSZIKUS     — 10 előre megírt pálya (Hollowmere)           │
│  🎬  ESEMÉNY        — 10 pálya ismert horror-játékok világaiból     │
│  🎲  RANDOM         — végtelen, véletlen ügyek; bárhol folytatható  │
│  🤝  CO-OP: EGYÜTT  — közös tábla, közös chat (2–4 játékos)         │
│  🔪  CO-OP: GYILKOS — „Among Us"-szerű: egy játékos a gyilkos       │
└──────────────────────────────────────────────────────────────────┘
```

| Mód | Pályák | Játékosok | Mentés | Részletek |
|---|---|---|---|---|
| 🕯️ **Klasszikus** | 10 előre megírt (+ bónuszügyek) | 1 | helyben + felhő | 5., 8., 9. fejezet |
| 🎬 **Esemény** | 10 előre megírt, horror-játékokból | 1 | helyben + felhő | 10–11. fejezet |
| 🎲 **Random** | végtelen, seedelt generátorból | 1 | helyben + felhő, **félbehagyva is folytatható** | 19. fejezet |
| 🤝 **Co-op: Együtt** | bármelyik pálya (katalógus vagy random) | 2–4 | a szoba állapota a felhőben | 22. fejezet |
| 🔪 **Co-op: Gyilkos** | bármelyik pálya | 3–6 (kettővel is megy) | a szoba állapota a felhőben | 22. fejezet |

- **Klasszikus:** a Hollowmere-kampány, kézzel tervezett pályákkal és történettel.
- **Esemény:** minden pálya egy híres horror**játék** világa; a gyanúsítottak a játék karakterei közül vannak válogatva, az áldozat pedig a játék ikonikus főgonosza.
- **Random:** semmi nincs előre megírva — minden ügy véletlen (de a szabályoknak megfelelő, tehát mindig kivihető). A Hollowmere mellett a horror-játékok világaiból is húz karaktereket és helyszíneket, és az új karakterek bekerülnek a gyűjteményedbe. Minden a felhőbe mentődik, a félbehagyott ügy pedig bármelyik gépen folytatható.
- **Co-op: Együtt:** ketten (vagy többen) ugyanazt a táblát látjátok és szerkeszthetitek, a másik lerakását is el lehet vinni; játékon belüli chat.
- **Co-op: Gyilkos:** egy játékos titokban a **gyilkos** — ő is velünk nyomoz, de három titkos szabotázs-képességgel hátráltatja a többieket.
- A két co-op mód barátokkal játszható: profil-keresés, barátkérés, meghívás (23. fejezet).

**Későbbi kiegészítők:** *Napi ügy* (a Random mód napi, mindenkinek azonos változata — 19.6), *Éjféli roham* (időre, egymás után 5 pálya), *Szerkesztő* (saját pálya készítése és megosztása).

---

## 5. KLASSZIKUS MÓD — Hollowmere ügyei

A Klasszikus mód **szinte pontosan úgy játszik, mint a Murdoku** (ugyanaz a rács, ugyanazok a gombok, ugyanaz az X-elés), de:

- **10 pálya** indulásra, utána új pályák érkeznek a Supabase-ből (app-frissítés nélkül).
- Minden pálya egy **„ügyirat"** (borítékos megjelenítés megmarad, de viaszpecsétes, vérfoltos dossziéként).
- A pályák **fejezetekbe** rendeződnek; minden fejezet végén egy rövid képregény-panel mutatja, mi derült ki.
- Nehézségtől függően bekapcsolnak az **Erő-szabályok** (lásd 7.2) — a „Nagyon könnyű" pályákon még nincsenek, a „Szakértő" szinten akár 3 is aktív.

### 5.1 Nehézségi szintek

| Szint | Méret | Karakterek | Erő-szabályok | Becsült idő |
|---|---|---|---|---|
| 🟢 Nagyon könnyű („Gyertyafény") | 6×6 | 6 | 0 | 2–4 perc |
| 🟡 Könnyű („Alkony") | 6×6 / 7×7 | 6–7 | 0–1 | 4–8 perc |
| 🟠 Közepes („Éjfél") | 7×7 / 8×8 | 7–8 | 1 | 8–15 perc |
| 🔴 Nehéz („Holdfogyatkozás") | 8×8 / 9×9 | 8–9 | 2 | 15–25 perc |
| ⚫ Szakértő („Pokol kapuja") | 9×9 / 10×10 | 9–10 | 2–3 | 25+ perc |

### 5.2 Nyomtípusok (a Murdokuéi + újak)

**Átvett nyomok:**
- „X egy **[tárgyon]** volt." (széken, szőnyegen)
- „X a **[helyiségben]** volt."
- „X **[tárgy] mellett** volt."
- „X volt az **egyetlen** [tárgyon]."
- „X **vagy** [A] **vagy** [B] mellett volt."

**Új nyomok:**
- „X **nem** volt a [helyiségben]." (negatív nyom)
- „X **egy sorban** volt Y-nal… nem, az lehetetlen — X **Y-tól balra** volt." (relatív irány)
- „X **átlósan** volt Y mellett." (átló — csak közepestől)
- „X és Y **ugyanabban a helyiségben** volt."
- „X egy **sarokmezőn** volt."
- „X **[N] mezőre** volt a gyertyától." (távolság, csak szakértő)
- „X helyiségében **senki más** nem volt."

---

## 6. A Hollowmere-univerzum lore-ja

### 6.1 A város

**Hollowmere** egy ködbe burkolt kisváros valahol a Kárpátok lábánál, ahol 1888 óta **minden száz évben egyszer** „elvékonyodik a Fátyol" — az élők és a holtak világa közti határ. Ilyenkor a lények, akik egyébként rejtőzködnek, kénytelenek egy fedél alá húzódni a **Vörös Hold** elől, amely minden természetfeletti lényt megőrjít, aki a szabad ég alatt marad.

Most, **2026 októberében** újra eljött a Vörös Hold éjszakája. Egyetlen éjszaka alatt **tizenkét gyilkosság** történik a városban — és valaki **mindegyik helyszínen** ott volt. *(A fő történetben tíz ügyet oldasz meg; a másik kettő aktája a Rend archívumában lappang — ezek a bónuszügyek.)*

### 6.2 A nyomozó (a játékos)

Te vagy **„a Kilencedik Szem"** — egy halandó, aki gyerekkorában egy démoni átok következtében **látja az elmúlt órák visszhangjait**. Amikor egy tetthelyre lépsz, a halottak emlékeiből foszlányok (a nyomkártyák) jelennek meg előtted. A szellemek nem hazudnak — de csak töredékeket mutatnak.

A **Hollowmere-i Éjjeli Rend** (egy titkos, emberekből és „szelíd" lényekből álló szövetség) kér fel, hogy derítsd ki, ki áll a gyilkosságok mögött, mielőtt felkel a Nap, és a Fátyol végleg bezárul — vagy végleg megnyílik.

### 6.3 A nagy rejtély (kampány-ív)

- **I. fejezet – „Az első vér" (pálya 1–3):** Egyszerű, elszigeteltnek tűnő gyilkosságok. Minden áldozatnál egy fekete varjútoll.
- **II. fejezet – „A Rend árulója" (pálya 4–7):** Kiderül, hogy az áldozatok mind a Rend tagjai voltak. Valaki belülről dolgozik.
- **III. fejezet – „A Hold gyermeke" (pálya 8–10):** A gyilkosok mind ugyanannak a lénynek a **megszállottjai** voltak: **Malachar, a Varjúherceg**, egy démon, aki a 12 áldozat lelkéből akarja újjáépíteni a testét. A 10. pályán **maga a Varjúherceg** az áldozat — és a gyilkos az, akire a legkevésbé számítottál.

---

## 7. Karakterek, erők és fajok

### 7.1 Fajok és Erő-szabályaik

Az Erő-szabály a NIGHTDOKU legfontosabb újítása: **a karakter faja megváltoztatja, hogy hova állhat, és hogyan értelmezendő a nyoma.** A pálya elején mindig ki van írva, mely szabályok aktívak (ikonnal a karakterkártyán).

| Faj | Ikon | Erő-szabály a rácson |
|---|---|---|
| 🧛 **Vámpír** | denevér | **Nem állhat holdfényes / ablak melletti mezőn** (ezek világos csíkkal jelölve). Nem lehet tükör mellett. |
| 👻 **Szellem** | lebegő lepel | **A „mellette" rá falon át is érvényes** (átlát a falon). Állhat „foglalt" tárgyon is (átlebeg rajta). |
| 😈 **Démon** | szarv | **Megszállás:** egy másik karakter nyoma valójában az övé — a pálya jelzi, hogy „egy nyom hazudik", és a démon nyoma mondja meg, melyik. |
| 🐺 **Vérfarkas** | karmok | **Nem lehet beltéri, zárt helyiségben**, ha a Hold „fent van" (pálya-állapot); csak udvar, kert, erdő mezőkön. |
| 🧙 **Boszorkány** | üst | **Pentagramma-mezők**: csak ő állhat rajtuk; mindenki más kerüli. |
| 🧟 **Élőhalott (ghoul)** | csont | **Nem lehet szomszédos (8 irányban sem) élő emberrel** — érzik a szagát. |
| 🦇 **Halandó ember** | gyertya | Nincs külön szabály — a „normál" Murdoku-szereplő. |
| 🕷️ **Alakváltó** | maszk | **Két kártyája van**, és a játékosnak kell eldöntenie, melyik az igazi alakja (csak szakértő). |

### 7.2 A visszatérő szereplőgárda

> A karakterek „képként": minden szereplőhöz itt egy rövid vizuális leírás + egy **képgenerálási prompt**, amivel egységes stílusú portrék készíthetők (a Murdoku lapos, egyszerű, arc nélküli stílusát sötétebb színpalettával és vastagabb, „karcos" körvonallal javaslom).

---

#### 🧛 VLAD DRĂGULESCU — „A Grófnő Fia"
```
     ▄▄▄▄▄
    █ ▀ ▀ █      Faj: Vámpír (414 éves)
    █  ▼  █      Foglalkozás: Hollowmere régiségkereskedője
     ▀▄▄▄▀       Jellem: elegáns, ironikus, végtelenül unott
    ▄█▀█▀█▄      Szín: bordó, fekete, ezüst
```
**Lore:** Egy erdélyi grófnő elhagyott gyermeke, akit 1612-ben változtattak át. Évszázadokig menekült a vadászok elől, mígnem Hollowmere-ben letelepedett, és egy régiségboltot nyitott, ahol „megtisztult" lelkek emléktárgyait gyűjti. Kizárólag állati vért iszik — legalábbis ezt állítja. A Rend egyik alapító tagja, de sosem bíztak benne teljesen.

**Erő:** Vámpír-szabály. **Különleges:** egyes pályákon *denevérré változik* → egy mezőt átugorhat a sor/oszlop-szabályban (csak egy pályán, mint csavar).

**Képprompt:** *flat vector portrait, Murdoku-style puzzle card, pale aristocratic young man with slicked black hair, high Victorian collar, burgundy background, faceless minimal features, thick dark outlines, muted gothic palette*

---

#### 🌒 MORRIGAN ASHVALE — „A Varjúk Úrnője"
```
     ╭───╮
    ╱ ◉ ◉ ╲      Faj: Boszorkány (emberi kor: 34)
    │  ‿  │      Foglalkozás: gyógyfüves bolt tulajdonosa
     ╲___╱       Jellem: kedves, anyáskodó… túlságosan is
    ▓▓▓▓▓▓▓      Szín: sötétzöld, mohaszín, fekete toll
```
**Lore:** Egy kilencgenerációs boszorkánydinasztia utolsó tagja. Állítólag a varjak beszélnek hozzá. A város fele hozzá jár gyógyteáért, a másik fele messze elkerüli a házát. Az anyját a Rend vádolta meg és űzte el 30 évvel ezelőtt.

**Erő:** Boszorkány-szabály (pentagramma-mezők). **Titka:** ő a kampány egyik fő gyanúsítottja — a varjútollak miatt.

**Képprompt:** *flat vector portrait, witch with long wild auburn hair and a black crow feather tucked behind ear, dark green shawl, moss-green background, faceless minimal, thick outlines*

---

#### 👻 SILAS GREY — „A Tizenharmadik Lakó"
```
     .-""-.
    /  ◌ ◌ \     Faj: Szellem (†1931)
    |   o  |     Foglalkozás: egykori házmester
    |      |     Jellem: magányos, pletykás, félénk
    \/\/\/\/     Szín: halvány kék, áttetsző szürke
```
**Lore:** 1931-ben esett le a Blackwood-kúria lépcsőjén — vagy meglökték. Azóta a házban kísért, és mindent lát, ami a falakon belül történik. Ő a nyomozó leghasznosabb szövetségese, de csak akkor beszél, ha előbb te segítesz neki: meg kell oldani a saját halálának rejtélyét (bónusz-pálya).

**Erő:** Szellem-szabály (falon át „mellette", foglalt tárgyon is állhat).

**Képprompt:** *flat vector portrait, translucent ghost of a 1930s janitor with flat cap and suspenders, pale blue glow, faded grey background, faceless, semi-transparent body fading at the bottom*

---

#### 😈 LILITH VANE — „Az Alkuszlány"
```
    ▲     ▲
    █▀▀▀▀▀█      Faj: Démon (alsóbb rendű, „kereskedő")
    █ ◆ ◆ █      Foglalkozás: a „Crossroads" bár tulajdonosa
    █  ▬  █      Jellem: bájos, szarkasztikus, sosem hazudik egyenesen
     ▀▀▀▀▀       Szín: karmazsin, arany, füstszürke
```
**Lore:** Lilith **alkukat köt**: bármit megad, egy apró árért cserébe. A fél város tartozik neki valamivel. Démon létére meglepően szigorúan tartja magát a szerződésekhez — ami azt jelenti, hogy ha valaki megszegi az alkut, az ő joga behajtani a tartozást.

**Erő:** Démon-szabály (megszállás: egy nyom hazudik). **Csavar:** egyes pályákon Lilith kártyája így kezdődik: „Amit mondok, igaz. A csapos hazudik." — logikai „hazug-igazmondó" réteg.

**Képprompt:** *flat vector portrait, elegant woman with small curved horns, sleek black bob haircut, crimson dress with gold details, smoky grey background, faceless minimal, thick outlines*

---

#### 🐺 EZEKIEL THORNE — „Az Erdész"
```
     /\_/\
    ( ◕ ◕ )      Faj: Vérfarkas
     > ▼ <       Foglalkozás: Hollowmere vadőre
    /|   |\      Jellem: zárkózott, becsületes, dühkitörésekre hajlamos
                 Szín: barna, rozsdavörös, fenyőzöld
```
**Lore:** Egy medvecsapdában ébredt fel 19 évesen, véres kézzel, egy farkastámadás után. Azóta minden teliholdkor a hegyekbe menekül. A Vörös Hold éjszakáján azonban nem tud elmenni — és nem emlékszik, mit tett az éjszaka első felében.

**Erő:** Vérfarkas-szabály (csak kültéri mezők, ha a Hold fent van).

**Képprompt:** *flat vector portrait, rugged bearded forest ranger with flannel shirt, subtle wolf ears hidden in messy brown hair, pine green background, faceless minimal, thick outlines*

---

#### 🕯️ ÁBEL KÓRÓDI — „A Rend Írnoka" (az első áldozat)
**Lore:** Az Éjjeli Rend levéltárosa, aki mindent feljegyzett. Az utolsó naplóbejegyzése: *„Megtaláltam a tizenharmadik nevet."* A kampányon végig keressük, mit talált.

---

#### További szereplők a későbbi pályákra

| Név | Faj | Egy mondat |
|---|---|---|
| **Sister Agatha** | Halandó (apáca, ördögűző) | A Rend legkeményebb tagja, aki a lényeket „javítható bűnösöknek" tartja. |
| **Rook** | Alakváltó | Senki sem tudja, hogy néz ki valójában — talán ő maga sem. |
| **Dr. Henrietta Moss** | Élőhalott (ghoul) | A városi halottkém, aki szó szerint a munkájából él. |
| **Pip & Poppy Hale** | Szellemikrek | Két gyerekszellem, akik mindig együtt jelennek meg (közös kártya, 2 mező). |
| **Bram Kessler** | Halandó (vámpírvadász) | Vlad halálos ellensége, aki karóval érkezett a városba. |
| **Old Tobias** | Halandó? | A temetőőr, aki 200 éve ugyanúgy néz ki. |
| **Seraphine** | Bukott angyal | Az egyetlen, aki ismeri Malachar valódi nevét. |
| **Malachar, a Varjúherceg** | Főúr-démon | A kampány főgonosza. A 10. pálya áldozata. |

---

## 8. A 10 pálya (Klasszikus mód)

> Mind a 10 pálya kézzel tervezett, **előre megírt megoldással** (a pálya JSON-jában benne van, ki hol volt), és egyértelműségre ellenőrizve (lásd 20. fejezet). A pályák az alkalmazással együtt települnek (offline is játszhatók), a Supabase `puzzles` táblájában pedig azért is ott vannak, hogy új pályák app-frissítés nélkül érkezhessenek (17–18. fejezet).
>
> **Miért 10?** A fő történetben tíz ügyet oldasz meg. Az eredeti tervből két ügy („Utolsó Pohár", „Az Elsüllyedt Malom") **bónuszügy** lett — a lore-ban ezek a Rend archívumának „hiányzó aktái", így a 12 gyilkosságból 10 a fő sztori, 2 pedig feloldható extra. Minden Erő-szabály továbbra is a fő történetben kap bevezetést.

| # | Pálya | Méret | Nehézség | Új Erő-szabály | Azonosító |
|---|---|---|---|---|---|
| 1 | Éjféli Mise | 6×6 | 🟢 Nagyon könnyű | — (bemutató) | `classic-01-midnight-mass` |
| 2 | Gyógytea | 6×6 | 🟡 Könnyű | Boszorkány | `classic-02-herbal-tea` |
| 3 | Holdfény-galéria | 7×7 | 🟡 Könnyű | Vámpír | `classic-03-moonlight-gallery` |
| 4 | A Blackwood-kúria | 7×7 | 🟠 Közepes | Szellem | `classic-04-blackwood-manor` |
| 5 | Vadászház | 8×8 | 🟠 Közepes | Vérfarkas | `classic-05-hunting-lodge` |
| 6 | Hideg Asztal | 8×8 | 🟠 Közepes | Élőhalott | `classic-06-cold-table` |
| 7 | Alku a keresztútnál | 8×8 | 🔴 Nehéz | Démon | `classic-07-crossroads-deal` |
| 8 | Tükrök Terme | 9×9 | 🔴 Nehéz | Alakváltó | `classic-08-hall-of-mirrors` |
| 9 | A Rend Levéltára | 10×10 | ⚫ Szakértő | — (Démon + Szellem + Boszorkány együtt) | `classic-09-order-archive` |
| 10 | Vörös Hold | 10×10 | ⚫ Szakértő | — (mind) | `classic-10-red-moon` |

### I. FEJEZET — „Az első vér"

**1. 🟢 „Éjféli Mise" — Szent Bertalan-kápolna (6×6, Nagyon könnyű)**
Helyiségek: Kripta, Sekrestye, Oltár, Harangláb, Temetőkert. Tárgyak: koporsók, padok, gyertyák, sírkövek, szőnyeg, harang.
Áldozat: **Ábel, a Rend írnoka**. Erő-szabályok: nincsenek (bemutató pálya).
→ *Ez a pálya részletesen ki van dolgozva a 9. fejezetben.*

**2. 🟡 „Gyógytea" — Morrigan füvesboltja (6×6, Könnyű)**
Helyiségek: Bolt, Üvegház, Lepárló, Lakás, Kert. Tárgyak: cserepes növények, üst (foglalt), pentagramma-szőnyeg.
Áldozat: a Rend egy fiatal tagja, Mira. **Első Erő-szabály: Boszorkány (pentagramma).**

**3. 🟡 „Holdfény-galéria" — Vlad régiségboltja (7×7, Könnyű)**
Helyiségek: Bemutatóterem, Raktár, Iroda, Pince, Kirakat. Tárgyak: tükrök, páncélok (foglalt), festmények, ládák. A kirakat mezői **holdfényesek**.
Áldozat: egy műgyűjtő. **Erő-szabály: Vámpír (holdfény + tükör).**

### II. FEJEZET — „A Rend árulója"

**4. 🟠 „A Blackwood-kúria" (7×7, Közepes)**
Helyiségek: Előcsarnok, Könyvtár, Ebédlő, Lépcsőház, Cselédszoba, Télikert, Padlás.
Áldozat: a kúria örököse. **Erő-szabály: Szellem** (Silas először játszható gyanúsítottként; a „mellette" falon át is érvényes rá).

**5. 🟠 „Vadászház" — Az erdő mélyén (8×8, Közepes)**
Helyiségek: Nappali, Trófeaterem, Kamra, Veranda, Tisztás, Patak, Fenyves.
Áldozat: Bram Kessler, a vadász. **Erő-szabály: Vérfarkas** (a Hold „fent van" — Ezekiel csak kültéren lehet).

**6. 🟠 „Hideg Asztal" — A városi hullaház (8×8, Közepes)**
Helyiségek: Boncterem, Hűtőkamra, Iroda, Várószoba, Rakodó, Krematórium.
Áldozat: egy ápoló. **Erő-szabály: Élőhalott** (Dr. Moss nem lehet szomszédos élővel, 8 irányban sem).

**7. 🔴 „Alku a keresztútnál" (8×8, Nehéz)**
Helyszín: négy út kereszteződése egy kihalt benzinkúttal, motellel, kukoricással és egy kápolnaromokkal.
Áldozat: Sister Agatha. **Erő-szabályok: Démon (egy nyom hazudik) + Vámpír.**

### III. FEJEZET — „A Hold gyermeke"

**8. 🔴 „Tükrök Terme" — A vándorcirkusz (9×9, Nehéz)**
Helyiségek: Porond, Tükörlabirintus, Öltözők, Állatketrecek, Jóslósátor, Körhinta.
Áldozat: a cirkuszigazgató. **Erő-szabályok: Alakváltó (két kártya) + Vámpír (tükrök mindenhol).**

**9. ⚫ „A Rend Levéltára" (10×10, Szakértő)**
Helyiségek: Olvasóterem, Tiltott szekció, Térképterem, Óratorony, Titkos átjáró, Kerengő, Kút.
Áldozat: Seraphine, a bukott angyal. **Erő-szabályok: Démon + Szellem + Boszorkány.**
Itt találja meg a játékos Ábel naplójában a „tizenharmadik nevet".

**10. ⚫ „Vörös Hold" — A Varjúherceg trónterme (10×10, Szakértő)**
A Fátyol túloldala: egy kifordított, lebegő katedrális, ahol a helyiségek a korábbi 9 pálya egy-egy darabjából állnak össze.
Áldozat: **Malachar, a Varjúherceg**. Gyanúsítottak: a kampány összes túlélője.
**Erő-szabályok: mind a 7 faj szabálya egyszerre — de minden karakterre csak a sajátja.**
A megoldás után jön az igazi befejezés (két végkifejlet attól függően, hány pályát oldottál meg tipp nélkül).

### Bónuszpályák (feloldhatók — nem részei a 10 pályás fő kiadásnak)
- **„Utolsó Pohár" — A Crossroads bár (6×6, Nagyon könnyű)** — *a Rend archívumának hiányzó aktája.* Helyiségek: Söntés, Bokszok, Raktár, Mosdó, Hátsó sikátor. Tárgyak: bárszékek, hordók (foglaltak), biliárdasztal (foglalt), wurlitzer. Áldozat: egy csapos, aki Lilithnek tartozott. Azonosító: `bonus-01-last-call`.
- **„Az Elsüllyedt Malom" (9×9, Nehéz)** — *a Rend archívumának hiányzó aktája.* Helyiségek: Malomkerék, Őrlőterem, Gabonapadlás, Molnárház, Stég, Mocsár, Fűzfás. Áldozat: Old Tobias, a temetőőr (aki tényleg 200 éves volt). Erő-szabályok: Szellem + Vérfarkas. Azonosító: `bonus-02-sunken-mill`.
- **„Silas zuhanása" (1931)** — fekete-fehér, szépia stílusú pálya, Silas halálának rejtélye.
- **„Vlad első éjszakája" (1612)** — erdélyi kastély, gyertyafénnyel, régi magyar/román feliratokkal.
- **„Pip & Poppy babaháza"** — egy mini 5×5-ös pálya egy babaházban, ahol a szereplők játékbabák.

---

## 9. Kidolgozott mintapálya megoldással

### „Éjféli Mise" — 6×6, 🟢 Nagyon könnyű

**Történet:** *Éjfél. A Szent Bertalan-kápolna harangja magától megszólalt. Ábelt, a Rend írnokát a harangláb tövében találták, kezében egy fekete varjútollal. Öten voltak a kápolnában aznap éjjel.*

#### A térkép

Sorok fentről (1–6), oszlopok balról (A–F).

```
        A          B          C          D          E          F
    ┌──────────┬──────────┬──────────────────────────────────────────┐
 1  │ ⚰️ koporsó│          │          │ 🪑 pad    │ 🪑 pad    │          │
    │          KRIPTA      │                 SEKRESTYE                 │
 2  │          │ ⚰️ koporsó│          │          │          │ 🕯️ gyertya│
    │          │          ├──────────┴──────────┬──────────┴──────────┤
 3  │          │          │ 🟥 szőnyeg│ 🟥 szőnyeg│          │ 🪦 sírkő  │
    ├──────────┴──────────┤                     │                     │
 4  │ 🔔 harang │          │ 🟥 szőnyeg│ 🟥 szőnyeg│          │          │
    │                     │       OLTÁR         │     TEMETŐKERT      │
 5  │                     │          │          │ 🪦 sírkő  │          │
    │     HARANGLÁB       ├──────────┴──────────┘                     │
 6  │          │ 🪑 pad    │          │          │ 🌳 fa     │          │
    └──────────┴──────────┴──────────┴─────────────────────────────────┘
```

Helyiség-térkép betűkkel (K = Kripta, S = Sekrestye, O = Oltár, H = Harangláb, T = Temetőkert):

```
     A B C D E F
  1  K K S S S S
  2  K K S S S S
  3  K K O O T T
  4  H H O O T T
  5  H H O O T T
  6  H H H T T T
```

**Foglalt tárgyak (ide senki sem állhat):** 🕯️ gyertya, 🪦 sírkő, 🌳 fa, 🔔 harang.
**Állható tárgyak:** ⚰️ koporsó (rajta fekve/ülve), 🪑 pad, 🟥 szőnyeg.

#### A nyomkártyák

| Szereplő | Nyom |
|---|---|
| 🧛 **Vlad** | „Egy **padon** ült a **Sekrestyében**." |
| 🌒 **Morrigan** | „A **harang mellett** állt." |
| 👻 **Silas** | „Egy **koporsón** pihent." |
| 😈 **Lilith** | „Az **Oltár szőnyegén** térdelt." |
| 🐺 **Ezekiel** | „A **Temetőkertben** volt." |
| 🕯️ **Ábel (áldozat)** | „A **Haranglábban** volt, **egyedül a gyilkosával**." |

#### Megoldás menete

1. **Morrigan** a harang mellett: a harang A4-en van (Harangláb). Ugyanabban a helyiségben szomszédos mezők: **A5** és **B4**. (A3 a Kriptában van — falon át nem számít.)
2. **Ábel** a Haranglábban van, és csak **egy** gyanúsított lehet vele ott. Mivel Morrigan biztosan a Haranglábban van, **Morrigan a gyilkos** — feltéve, hogy senki más nincs ott. (Ellenőrizzük a végén.)
3. **Vlad** a Sekrestye egyik padján: D1 vagy E1 → Vlad az **1. sorban**.
4. **Silas** koporsón: A1 vagy B2. Az 1. sor Vladé → Silas = **B2**.
5. B oszlop foglalt → Morrigan nem lehet B4-en → **Morrigan = A5**.
6. **Lilith** az Oltár szőnyegén: C3, D3, C4, D4. C oszlop még szabad, D is. A 2. és 5. sor foglalt.
7. **Ábel** a Haranglábban: szabad mezők az A, B oszlopon kívül → csak a **6. sor** marad: C6 (H). (A6 és B6 oszlopa foglalt.) → **Ábel = C6**.
8. C oszlop foglalt → **Lilith = D3 vagy D4**. Ekkor Vlad nem lehet D1-en → **Vlad = E1**.
9. **Ezekiel** a Temetőkertben, maradék sor (3 vagy 4) és maradék oszlop (**F**): F3 a sírkő → foglalt → **Ezekiel = F4**. Így **Lilith = D3**.

#### ✅ Megoldás

```
     A  B  C  D  E  F
  1  ·  ·  ·  ·  V  ·      V = Vlad      (E1, pad, Sekrestye)
  2  ·  S  ·  ·  ·  ·      S = Silas     (B2, koporsó, Kripta)
  3  ·  ·  ·  L  ·  ·      L = Lilith    (D3, szőnyeg, Oltár)
  4  ·  ·  ·  ·  ·  E      E = Ezekiel   (F4, Temetőkert)
  5  M  ·  ·  ·  ·  ·      M = Morrigan  (A5, harang mellett, Harangláb)
  6  ·  ·  Á  ·  ·  ·      Á = Ábel      (C6, Harangláb) — áldozat
```

A Haranglábban csak Morrigan és Ábel van. **🩸 A gyilkos: MORRIGAN ASHVALE.**

*(A pálya egyértelműségét egy rövid brute-force szkripttel ellenőriztem: minden lehetséges elrendezés közül pontosan egy teljesíti az összes nyomot.)*

**Utójáték (képregénypanel):** *Morrigan nem tagad. „A Rend elűzte az anyámat. Ábel írta alá a parancsot." — Majd mosolyog: „De a tollat nem én hagytam ott, nyomozó."* → Indul a kampány.

---

## 10. ESEMÉNY MÓD — „Rémálom-archívum"

### 10.1 A koncepció

Az **Esemény mód** (másik nevén a **Rémálom-archívum**) tíz előre megírt pályát tartalmaz, és minden pálya **egy híres horror-játék világa**. A játék karaktereiből válogatjuk a gyanúsítottakat, az **áldozat pedig a játék ikonikus főgonosza** (vagy egy emblematikus szereplője).

> **Példa:** *„Mr. X-et holtan találták a Raccoon City-i rendőrkapitányság könyvtárában. A kalapja mellette hever. Leon, Claire, Ada, Sherry és Annette voltak az épületben."*

A lore-ban: amikor a Fátyol elvékonyodik, nem csak Hollowmere lényei kerülnek át — más világok emlékei is beszivárognak. A **Rémálom-archívum** a Rend titkos gyűjteménye ezekről a „vendég-ügyekről".

### 10.2 Felépítés

- **10 világ × 1 pálya = 10 pálya**, mind kézzel tervezett, előre megírt megoldással (mint a Klasszikus mód pályái; azonosítójuk `event-NN-…`, mód: `event`).
- A sorrend **szabad** — minden pálya az elejétől játszható; a nehézség felfelé halad (2 Könnyű · 3 Közepes · 3 Nehéz · 2 Szakértő).
- Minden világnak saját **színpalettája, tárgykészlete, zenéje, jumpscare-e** és egy **világ-specifikus szabálya** van (mint a Klasszikus mód Erő-szabályai).
- A megoldott pályák **karaktereit** a játékos megkapja a Gyűjteményébe, és a **Random mód** (19. fejezet) is ezekből a karakterekből és helyszínekből dolgozik.
- Mind a 10 megoldása: **„Archivárius"** jelvény + egy arany jumpscare.

### 10.3 Menü — „Játékpolc"

A világok **lemezek / kazetták** formájában jelennek meg egy poros polcon. Kattintásra a lemez „bekerül a lejátszóba" (rövid zúgás, sávos zaj), és megjelenik a világ ügyirata. A megoldott lemezeken piros „LEZÁRVA" pecsét van.

---

## 11. Az Esemény mód 10 világa

> Formátum minden világnál: **helyszín / áldozat / gyanúsítottak / helyiségek / tárgyak / világ-szabály / zene / jumpscare.** A „Gyanúsítottak" a *kiválasztható névsor* — egy N×N-es pályán N−1 gyanúsított + 1 áldozat van, tehát a névsor legalább N−1 fős.

### 11.1 Áttekintés

| # | Játék | Helyszín | Áldozat | Méret · nehézség | Világ-szabály |
|---|---|---|---|---|---|
| 1 | 🐻 Five Nights at Freddy's | Freddy Fazbear's Pizza | William Afton | 6×6 · 🟡 Könnyű | Kamerák |
| 2 | 🧸 Poppy Playtime | Playtime Co. gyár | Huggy Wuggy | 6×6 · 🟡 Könnyű | Fogd meg! |
| 3 | 🧟 Resident Evil (RE2) | Raccoon City rendőrkapitányság | Mr. X | 7×7 · 🟠 Közepes | Zárt ajtók |
| 4 | 👽 Alien: Isolation | Sevastopol állomás | a Xenomorph | 7×7 · 🟠 Közepes | Mozgásérzékelő |
| 5 | 🦌 Until Dawn | Blackwood-hegy, a faház | a Wendigo | 7×7 · 🟠 Közepes | Totem-látomás |
| 6 | 🚀 Dead Space | USG Ishimura | egy Hunter | 8×8 · 🔴 Nehéz | Vákuum |
| 7 | 🔦 Outlast | Mount Massive Menedékház | Chris Walker | 8×8 · 🔴 Nehéz | Éjjellátó |
| 8 | 🌫️ Silent Hill 2 | Brookhaven kórház, Toluca-tó | Pyramid Head | 8×8 · 🔴 Nehéz | A rádió zaja |
| 9 | ☠️ Dead by Daylight | Az Entitás birodalma | a Trapper | 9×9 · ⚫ Szakértő | Generátorok |
| 10 | 🌲 Alan Wake | Bright Falls | Dr. Emil Hartman | 10×10 · ⚫ Szakértő | A Fény és a Sötétség |

> A világlapokon szereplő „3 pálya / világ" és „Végső ügy" ötletek **későbbi bővítés** (11.3); a kiadásban világonként **1 pálya** van. A világ-szabályok javaslatok — a pályák tervezésekor finomodnak.

### 11.2 A világlapok

### 🐻 1. FIVE NIGHTS AT FREDDY'S — „Freddy Fazbear's Pizza"
- **Pálya:** 6×6 · 🟡 Könnyű (`event-01-fnaf`)
- **Helyszín:** pizzéria, éjféltől reggel 6-ig.
- **Áldozat:** **William Afton** (a lila ruhás férfi).
- **Gyanúsítottak:** Freddy, Bonnie, Chica, Foxy, Golden Freddy, Mike Schmidt (az éjjeliőr), a Marionett.
- **Helyiségek:** Színpad, Ebédlő, Pirate Cove, Konyha, Mosdók, Nyugati és Keleti folyosó, Iroda, Biztonsági raktár (Safe Room).
- **Tárgyak:** party-asztalok, pizzasütő, ajándékdoboz, kamerák, ajtógombok, árammérő.
- **Világ-szabály — „Kamerák":** a játékos egyszerre csak **egy helyiséget** lát „élesben" (kamerakép); a többi helyiség nyomai elhalványulnak, amíg át nem kapcsolsz. Áramfogyasztás-mérő = maximális tipp/kamera-váltás szám (csak Nehéz).
- **Zene:** eltorzult zenélődoboz-dallam (saját!), ventilátorzúgás, folyosói léptek.
- **Jumpscare:** az áram elmegy, csak két világító szem… majd egy **animatronika ugrik az arcodba**, gépi sikollyal. (Ez a „legklasszikusabb" jumpscare a listán.)

---

### 🧸 2. POPPY PLAYTIME — „Playtime Co. gyár"
- **Pálya:** 6×6 · 🟡 Könnyű (`event-02-poppy-playtime`)
- **Helyszín:** a Playtime Co. elhagyatott játékgyára.
- **Áldozat:** **Huggy Wuggy.**
- **Gyanúsítottak:** Kissy Missy, Mommy Long Legs, Bunzo Bunny, PJ Pug-a-Pillar, CatNap, DogDay, Poppy, a Látogató (az egykori alkalmazott).
- **Helyiségek:** Előcsarnok, Gyártósor, Játékbolt, Játszószoba, Raktár, Szellőzőrendszer.
- **Tárgyak:** játékdobozok, futószalag (foglalt), kockatorony, hangszóró, zöld kéz-kapcsoló (GrabPack-panel).
- **Világ-szabály — „Fogd meg!":** a GrabPack-panel mellett álló karakter nyoma „két mezőre" is érvényes (légvonalban) — a kéz „odaér".
- **Zene:** torzított zenélődoboz-dallam gyerekkórussal (saját), gépzúgás.
- **Jumpscare:** a futószalagon lassan csúszik egy játékdoboz; kinyílik, és **egy elnyúló, fogas vigyor** ugrik elő.

---

### 🧟 3. RESIDENT EVIL — „Raccoon City Police Department"
- **Pálya:** 7×7 · 🟠 Közepes (`event-03-resident-evil-2`)
- **Helyszín:** az RPD épülete (RE2), 1998. szeptember.
- **Áldozat:** **Mr. X (T-00 Tyrant)** — a kalapja mellette.
- **Gyanúsítottak:** Leon S. Kennedy, Claire Redfield, Ada Wong, Sherry Birkin, Annette Birkin, Marvin Branagh, Chief Brian Irons.
- **Helyiségek:** Főcsarnok, Nyugati iroda, Sötétkamra, Könyvtár, Mentőszoba, Kapitányi iroda, Kiállítóterem (taxidermia), Lőtér, Kutyaketrecek. *(A csatornák és a NEST labor a későbbi bővítéshez maradnak.)*
- **Tárgyak:** írógép (mentés — foglalt), zöld gyógynövény, lőszeres láda, tárolódoboz („item box"), szobrok (foglalt), redőny.
- **Világ-szabály — „Zárt ajtók":** egyes helyiségek közti falakon **kulcsos ajtó** van (pique, gyémánt, kör szimbólum). Ha egy nyom „a pikk ajtó mellett" mondja, a „mellette" az ajtón át **mindkét oldalra** érvényes.
- **Zene:** feszült, mély vonós drón, lassú zongoraakkordok; a mentőszoba-mezők fölé húzott egérrel nyugodt, „biztonságos szoba" téma.
- **Jumpscare:** a sötétből **Mr. X kalapja** gördül be, majd a monitort betöltő Tyrant-arc, nehéz, fémes léptek és egy dübörgő ütés.

---

### 👽 4. ALIEN: ISOLATION — „Sevastopol állomás"
- **Pálya:** 7×7 · 🟠 Közepes (`event-04-alien-isolation`)
- **Helyszín:** a Sevastopol űrállomás (a Seegson-kereskedelmi állomás).
- **Áldozat:** **a Xenomorph.**
- **Gyanúsítottak:** Amanda Ripley, Nina Taylor, Marlow, Waits, Axel, Ricardo, Samuels (android).
- **Helyiségek:** Híd, Orvosi szárny, Hangár, Gépház, Szellőzőrendszer, Légzsilip.
- **Tárgyak:** mozgásérzékelő, lángszóró-szekrény, kártyaolvasó, szellőzőrács, hibernálókapszula.
- **Világ-szabály — „Mozgásérzékelő":** egyes karakterekről nyom helyett csak **távolság-adat** van: „Mozgás 3 mezőre a légzsiliptől."
- **Zene:** üres, lassú űr-ambient, szívverés-szerű pulzus; a pittyegés fokozatosan gyorsul.
- **Jumpscare:** a pittyegés egyre sűrűbb… teljes csend… **a Xenomorph a plafonról lóg alá**, sziszegéssel.

---

### 🦌 5. UNTIL DAWN — „Blackwood-hegy"
- **Pálya:** 7×7 · 🟠 Közepes (`event-05-until-dawn`)
- **Helyszín:** a hegyi faház és a hóval borított környék, egyetlen hosszú éjszaka.
- **Áldozat:** **a Wendigo.**
- **Gyanúsítottak:** Sam, Mike, Jessica, Emily, Matt, Ashley, Chris, Josh.
- **Helyiségek:** Nappali, Konyha, Fürdő, Pince, Hálók, Hóval borított tisztás, Kabinos felvonó.
- **Tárgyak:** totemek (jelölve), kandalló (foglalt), kanapé, szarvas-trófea, fegyverszekrény.
- **Világ-szabály — „Totem-látomás":** a totem mellett álló karakterről egy **elrejtett extra nyom** tárul fel — a pályán eleve van néhány „zárolt" nyom, amit előbb ki kell következtetni, hol áll totem mellett valaki.
- **Zene:** hóvihar-szél, lassú zongora-ambient, szívverés.
- **Jumpscare:** a hó mögül **a Wendigo** ugrik elő, az ablak betörik.

---

### 🚀 6. DEAD SPACE — „USG Ishimura"
- **Pálya:** 8×8 · 🔴 Nehéz (`event-06-dead-space`)
- **Helyszín:** az Ishimura bányászhajó.
- **Áldozat:** **egy Hunter** (a hajón garázdálkodó Necromorph).
- **Gyanúsítottak:** Isaac Clarke, Kendra Daniels, Zach Hammond, Terrence Kyne, Nicole Brennan, Hans Tiedemann, Challus Mercer, Ellie Langford, Benjamin Mathius.
- **Helyiségek:** Híd, Orvosi szárny, Gépház, Gyárterem, Hidroponika, Vákuumos külső szekció.
- **Tárgyak:** sztázis-állomás, mentőpont (foglalt), kinézis-terminál, pad, zárolt ajtó.
- **Világ-szabály — „Vákuum":** a piros (nyomásmentes) helyiségekbe csak **páncélos** (RIG) karakter állhat; a páncél a kártyán ikonnal látszik.
- **Zene:** tompított szívverés, fémes dübörgés, távoli suttogás, űr-csend.
- **Jumpscare:** a mennyezeti szellőző kirobban, **Necromorph-csápok** ragadják meg a képernyőt, gépi sikoly.

---

### 🔦 7. OUTLAST — „Mount Massive Menedékház"
- **Pálya:** 8×8 · 🔴 Nehéz (`event-07-outlast`)
- **Helyszín:** az elhagyott elmegyógyintézet.
- **Áldozat:** **Chris Walker.**
- **Gyanúsítottak:** Miles Upshur, Waylon Park, Richard Trager, Father Martin, Dr. Wernicke, Jeremy Blaire, Eddie Gluskin.
- **Helyiségek:** Fogadócsarnok, Kórterem-szárny, Pincebörtön, Kápolna, Csatorna, Őrszoba, Villamos-terem.
- **Tárgyak:** elemdoboz, ágy (foglalt), kerekesszék, szekrény (elbújás), generátorkapcsoló.
- **Világ-szabály — „Éjjellátó":** a tábla sötét, csak a kurzor körüli **3×3-as mezők** látszanak (mint a 15. fejezet *Gyertya-mód*ja); az elem fogy → a látótér lassan szűkül, elemdobozok felvételével bővül.
- **Zene:** ipari zaj, lihegés, távoli kiáltás.
- **Jumpscare:** a kamera infravörös képén hirtelen **egy arc** jelenik meg a lencse előtt.

---

### 🌫️ 8. SILENT HILL — „A Köd Városa"
- **Pálya:** 8×8 · 🔴 Nehéz (`event-08-silent-hill-2`)
- **Helyszín:** Silent Hill, Brookhaven kórház és Toluca-tó (SH2).
- **Áldozat:** **Pyramid Head**.
- **Gyanúsítottak:** James Sunderland, Maria, Angela Orosco, Eddie Dombrowski, Laura, Mary (levél formájában), a Hazug Alak (Lying Figure), a Buborékfejű Ápolónő (Bubble Head Nurse).
- **Helyiségek:** Kórházi kórterem, Lépcsőház, Wood Side apartman, Bowlingpálya, Tóparti szálló, a „Másik világ" verziói.
- **Tárgyak:** rádió (sistereg), kórházi ágy, kerekesszék, rácsos ablak, varrott babák.
- **Világ-szabály — „A rádió zaja":** a rádió mellett lévő mezőkön a nyomok **torzulnak** — egy szó ki van takarva („Angela egy ███ mellett volt"), amit más nyomokból kell kitalálni.
- **Zene:** ipari zaj, fém koppanások, melankolikus gitár-szerű ambient, rádiósistergés.
- **Jumpscare:** a tábla ködbe borul, a rádió egyre hangosabb… és egy hatalmas **piramis-sisak** villan elő, fém-csikorgás.

---

### ☠️ 9. DEAD BY DAYLIGHT — „Az Entitás birodalma"
- **Pálya:** 9×9 · ⚫ Szakértő (`event-09-dead-by-daylight`)
- **Helyszín:** az Entitás ködös, folyton változó „próbapályája" — egy elhagyott pajta és kukoricás.
- **Áldozat:** **a Trapper.**
- **Gyanúsítottak:** Dwight Fairfield, Meg Thomas, Claudette Morel, Jake Park, Nea Karlsson, Feng Min, David King, Quentin Smith.
- **Helyiségek:** Pajta, Kukoricás, Fészer, Pince, Erdei tisztás, Kapu-terület, Kampó-pince, Ház, Hodály.
- **Tárgyak:** generátorok (jelölve), kampók (foglalt), medkit-láda, paletták, menekülő kapu.
- **Világ-szabály — „Generátorok":** a generátor mellett álló karakter „zajt csap", ezért **a gyilkos nem állhat generátor mellett** (a nyomok a „zajt" vagy a „csendet" adják meg).
- **Zene:** szívverés-ritmus, suttogó mormolás, távoli kampó-csikorgás.
- **Jumpscare:** egy kampó csúszik be a képből, majd **a Trapper álarca** közelről, medvecsapda-csattanással.

---

### 🌲 10. ALAN WAKE — „Bright Falls"
- **Pálya:** 10×10 · ⚫ Szakértő (`event-10-alan-wake`)
- **Helyszín:** Bright Falls és a Cauldron-tó környéke, éjszaka.
- **Áldozat:** **Dr. Emil Hartman.**
- **Gyanúsítottak:** Alan Wake, Alice Wake, Barry Wheeler, Sarah Breaker, Rose Marigold, Thomas Zane, Odin Anderson, Tor Anderson, Cynthia Weaver, Pat Maine.
- **Helyiségek:** Fűrésztelep, Vendégház, Rádióállomás, Rendőrség, Erdei ösvény, Tóparti stég, Zane kunyhója, Elme-kórház.
- **Tárgyak:** elemlámpa-töltő (jelölve), írógép (foglalt), rádió, ládák, villanyoszlop, kávéfőző.
- **Világ-szabály — „A Fény és a Sötétség":** a tábla két részre oszlik: **fényes** és **sötét** mezőkre (a villanyoszlopok és elemlámpa-töltők körül fény van). A **Birtokolt** (a Sötétség által megszállt) karakter csak sötét mezőn állhat; a nyomok megmondják, kik a Birtokoltak.
- **Zene:** csendes, ropogós erdei zaj, lassú gitár-ambient, szél a fenyők közt.
- **Jumpscare:** a sötétből egy **árnyalak** rohan a képernyő felé, miközben az elemlámpa-fény villog és kialszik.

---

### 11.3 Filmes világok és további játékok — későbbi bővítés és a Random mód készlete

> A korábbi tervben szereplő filmes világok (és a 3 pálya / világ, valamint a „Végső ügy" ötlet) **nem részei** a 10 pályás Esemény módnak. Megmaradnak **későbbi bővítésnek**, és a **Random mód** készletét bővíthetik (19.4).

### 🔦 STRANGER THINGS — „Starcourt Mall"
- **Helyszín:** Starcourt bevásárlóközpont, Hawkins, 1985. július 4. (3. évad).
- **Áldozat:** **Vecna (Henry Creel)** — vagy a Mind Flayer egy darabja (2. pálya), 3. pályán a Demogorgon a Hawkins Labban.
- **Gyanúsítottak:** Eleven, Mike, Dustin, Lucas, Will, Max, Steve, Robin, Hopper, Erica (pályánként 6–8 válogatva).
- **Helyiségek:** Scoops Ahoy fagyizó, Food court, Mozi, Gyp-ruha bolt, Szökőkút, Szolgálati folyosó, Titkos orosz labor (lift).
- **Tárgyak:** fagyispult (foglalt), arcade-gép, mozis szék, szökőkút (foglalt), karácsonyi égősor-mezők, walkie-talkie.
- **Világ-szabály — „A Fejjel Lefelé világ":** a tábla **két rétegből** áll (normál + Upside Down). Egy gombnyomással átfordul. Eleven az egyetlen, aki bármelyik rétegen lehet; a nyomok utalhatnak a „túloldali" tárgyakra.
- **Zene:** pulzáló 80-as évekbeli analóg szintetizátor, arpeggio, retro mall-muzak torzítva.
- **Jumpscare:** villogó égősor-mezők, a rács **megreped**, és a falon kitárt karral felugrik **Vecna**, mélyülő óraketyegés és egy torz, gyermeki sikoly.

---

### 🔪 SCREAM — „Woodsboro házibuli"
- **Helyszín:** Stu Macher háza, Woodsboro, a buli éjszakája.
- **Áldozat:** **Ghostface** (egy maszkos holttest — a pálya végén kiderül, ki volt a maszk alatt).
- **Gyanúsítottak:** Sidney Prescott, Gale Weathers, Dewey Riley, Randy Meeks, Tatum, Billy Loomis, Stu Macher.
- **Helyiségek:** Nappali (TV-vel), Konyha, Garázs, Emeleti hálók, Pince, Kert, Kocsibeálló.
- **Tárgyak:** vezetékes telefon, kanapé, TV (foglalt), sörös hűtő, garázskapu-gomb, popcorn-tál.
- **Világ-szabály — „A szabályok":** Randy mindig közli a horrorfilm szabályait. Pályánként **egy** „horror-klisé" nyom: pl. „Aki azt mondta, hogy *rögtön visszajövök*, egyedül volt egy helyiségben."
- **Zene:** baljós, staccato vonósok; csengő telefon rendszeresen.
- **Jumpscare:** megcsörren a telefon (egy csengés), csend… majd **Ghostface maszkja** közelről, élesen elhúzott vonós „szúrás" hanggal.

---

### 🏕️ FRIDAY THE 13TH — „Camp Crystal Lake"
- **Helyszín:** Crystal Lake tábor, péntek 13., éjjel.
- **Áldozat:** **Jason Voorhees** (2. pálya: Pamela Voorhees, 1. film).
- **Gyanúsítottak:** tábori segítők: Alice, Tommy Jarvis, Chris, Ginny, Crazy Ralph, Paul, Ned.
- **Helyiségek:** Kabinok (A–D), Ebédlő, Csónakház, Stég, Tó, Erdő, Generátorház.
- **Tárgyak:** emeletes ágy, kenu, tűzrakóhely (foglalt), generátor, telefonfülke, vadászkunyhó.
- **Világ-szabály — „Ki-ki-ki, ma-ma-ma":** az áramot a Generátorház adja. Ha valaki a generátor mellett van, a kabinok „világosak" → a sötét mezőkre vonatkozó nyomok csak ekkor érvényesek.
- **Zene:** suttogó, visszhangos ritmikus motívum, tücsökciripelés, tóvíz csobbanás.
- **Jumpscare:** a tó felszíne nyugodt… majd **Jason kitör a vízből**, hokimaszkkal, fröccsenő víz hanggal.

---

### 🎃 HALLOWEEN — „Haddonfield, 1978"
- **Helyszín:** Haddonfield, Illinois, Halloween éjszakája.
- **Áldozat:** **Michael Myers**.
- **Gyanúsítottak:** Laurie Strode, Dr. Loomis, Annie, Lynda, Tommy Doyle, Lindsey, Sheriff Brackett.
- **Helyiségek:** A Doyle-ház (Nappali, Konyha, Hálószoba, Szekrény!), az utca, a Myers-ház, a Wallace-ház.
- **Tárgyak:** tökök (foglalt), kanapé, gardrób, telefon, kés-állvány, ruhaszárító kötél.
- **Világ-szabály — „The Shape":** egy gyanúsított **maszkot** visel — a kártyáján nincs név, csak „Az Alak". Ki kell következtetni, ki ő.
- **Zene:** hidegrázós 5/4-es zongora-ostinato hangulat, lassú szintetizátor-felfutás.
- **Jumpscare:** egy szekrényajtó résnyire nyílik a tábla közepén… **fehér maszk** a sötétben, mély szinti-akkord.

---

### 🔥 A NIGHTMARE ON ELM STREET — „1428 Elm Street"
- **Helyszín:** a Thompson-ház — és az álmok világa.
- **Áldozat:** **Freddy Krueger**.
- **Gyanúsítottak:** Nancy Thompson, Glen, Tina, Rod, Marge Thompson, Lt. Thompson, Kristen (3. pálya).
- **Helyiségek:** Nancy szobája, Fürdőszoba, Pince, Kazánház (álom), Iskolai folyosó (álom), Börtöncella.
- **Tárgyak:** ágy (foglalt), kád, kávéfőző („ne aludj el!"), kazán (foglalt), ugrókötél.
- **Világ-szabály — „Ébren vagy alszol?":** minden karakter vagy **ébren**, vagy **alszik**. Alvó karakterek csak álom-helyiségekben lehetnek. Egy nyom megmondja, hány ember alszik.
- **Zene:** gyerekmondóka-szerű dallam (saját szerzésű!), kazánzúgás, csilingelés.
- **Jumpscare:** egy kés-karmos kesztyű **végighúzódik a képernyőn**, fémes csikorgás, majd Freddy égett arca és nevetés.

---

### 🪓 THE SHINING — „Overlook Hotel"
- **Helyszín:** Overlook Hotel, Colorado, a hóvihar alatt.
- **Áldozat:** **Jack Torrance**.
- **Gyanúsítottak:** Wendy Torrance, Danny, Dick Hallorann, Lloyd a csapos, Delbert Grady, a 237-es szoba hölgye, a Grady-ikrek (közös kártya).
- **Helyiségek:** Arany Bálterem (bár), Konyha, 237-es szoba, Hosszú folyosó (hatszöges szőnyeg!), Sövénylabirintus, Írószoba.
- **Tárgyak:** írógép (foglalt), bárpult, triciklimező, kád, hótakaró.
- **Világ-szabály — „A ragyogás":** Danny és Hallorann **telepatikusan** kapcsolatban vannak: a nyomuk a másikra vonatkozik (Danny kártyája mondja meg, hol volt Hallorann és fordítva).
- **Zene:** rémisztő, alacsony vonós clusterek, 1920-as évekbeli bálterem-tánczene távolról, torzítva.
- **Jumpscare:** a folyosó egyik mezőjén felbukkan két egyforma alak — közeledés nélkül — majd hirtelen **egy ajtón áttörő baltafej**, faszilánk-reccsenés.

---

### 🎈 IT — „Derry"
- **Helyszín:** Derry, Maine — a Neibolt Street-i ház és a csatornák.
- **Áldozat:** **Pennywise**.
- **Gyanúsítottak:** a Vesztesek Klubja: Bill, Beverly, Richie, Eddie, Ben, Mike, Stan; + Henry Bowers.
- **Helyiségek:** Neibolt-ház (Konyha, Fürdő, Pince, Kút), Barrens, Csatornák, Ciszterna.
- **Tárgyak:** kút (foglalt), lufi, papírhajó, hűtő, porcelánbaba, piros lufi-mezők.
- **Világ-szabály — „Félelem":** minden Vesztesnek van egy **félelem-tárgya** (pl. Eddie: gyógyszeres üveg; Richie: bohócok; Stan: festmény). Senki nem állhat a saját félelem-tárgya mellett.
- **Zene:** cirkuszi kintorna lassítva, gyerekkórus-szerű dúdolás (saját), vízcsöpögés.
- **Jumpscare:** egy piros lufi lassan lebeg fel a tábla aljáról… **kidurran**, és **Pennywise** röhögve, fogakkal közelít.

---

### ⛓️ SAW — „A Játék"
- **Helyszín:** egy lepusztult ipari fürdőszoba és a körülötte lévő csapdatermek.
- **Áldozat:** **Jigsaw (John Kramer)**.
- **Gyanúsítottak:** Dr. Lawrence Gordon, Adam, Amanda Young, Detective Tapp, Mark Hoffman, Zep.
- **Helyiségek:** A Fürdőszoba, Kazánterem, Tűteli gödör, Raktár, Folyosó, Megfigyelő szoba.
- **Tárgyak:** kád, lánc (horgony-mezők), magnetofon, Billy-báb tricikliven (foglalt), vasfűrész.
- **Világ-szabály — „Láncok":** két karakter **egymáshoz van láncolva** — csak szomszédos (8 irányban) mezőkön lehetnek. A magnetofon üzenete mindig egy extra nyom, de rejtvény formájában („Az élni akaró a víz mellett áll…").
- **Zene:** ipari zúgás, pulzáló elektronikus téma, magnetofonsercegés.
- **Jumpscare:** a magnetofon bekapcsol: „Szeretnék játszani egy játékot…" → hirtelen **Billy, a báb** pörögve közeledik a tricikliven, csikorgó kerekekkel és éles nevetéssel.

---

### 👽 ALIEN — „USCSS Nostromo"
- **Helyszín:** a Nostromo vontatóhajó, a mélyűrben.
- **Áldozat:** **a Xenomorph** (vagy az android Ash — 2. pálya).
- **Gyanúsítottak:** Ellen Ripley, Dallas, Kane, Lambert, Parker, Brett, Ash, Jones, a macska (igen, gyanúsított).
- **Helyiségek:** Híd, Étkező, Gépház, Hibernálókamra, Légzsilip, Szellőzőrendszer, Mother számítógépterem.
- **Tárgyak:** hibernálókapszula, lángszóró, mozgásérzékelő, ételasztal, szellőzőrács, önmegsemmisítő kar.
- **Világ-szabály — „Mozgásérzékelő":** a nyomok helyett egyes karakterekről csak **távolság-adat** van: „Mozgás 3 mezőre a légzsiliptől."
- **Zene:** lassú, üres űr-ambient, szívverés-szerű pulzus, a mozgásérzékelő pittyegése gyorsul.
- **Jumpscare:** a pittyegés egyre sűrűbb… teljes csend… **a Xenomorph a plafonról lóg alá**, sziszegéssel.

### Későbbi bővítések (ötletlista)
Hereditary · The Conjuring (Annabelle) · Evil Dead · Poltergeist · The Ring (Samara a kútból) · Outlast 2 · Little Nightmares · Layers of Fear · Amnesia · The Evil Within · Phasmophobia · Chucky · Hellraiser · The Texas Chainsaw Massacre · Wednesday · Supernatural · The Walking Dead · Bloodborne · Dracula (Bram Stoker — közkincs, licencmentesen is használható!) · Frankenstein (közkincs) · Lovecraft / Cthulhu (közkincs).

---

## 12. Jumpscare-rendszer

### 12.1 Mikor jön?
- **Csak rossz beküldésnél** (SUBMIT után, ha a megoldás hibás).
- **Véletlenszerű időzítéssel**: a hibás beküldés után nem azonnal jön, hanem **0,5–6 másodperc** véletlenszerű késleltetéssel, miközben a képernyőn látszólag ártalmatlan dolog történik (pl. a „Hibás megoldás" felirat lassan elhalványul, a zene elcsendesedik). Így nem lehet felkészülni rá.
- **Nem mindig ugyanaz:** világonként **3–5 változat** (különböző kép, hang, irány: alulról, oldalról, a rácsból, teljes képernyő), sorsolva. Néha „kamu jumpscare" is van (felépíti a feszültséget, majd semmi — és csak a következő hibánál csap le).
- **Ritkasági rendszer:** egy kis eséllyel (≈5%) egy **„arany" jumpscare** jön — egy hosszabb, különleges animáció, amit a gyűjteményben is feloldasz.

### 12.2 Felépítése (fázisok)
```
[1] Csend / feszültség   →  zene lehalkul, alacsony drón, enyhe képzaj
[2] Előjel (opcionális)  →  villogó lámpa, ketyegés, telefoncsörgés, pittyegés
[3] CSAPÁS (0,3–0,8 s)   →  teljes képernyős kép + hangos stinger-hang + képrázkódás
[4] Lecsengés (1–2 s)    →  a gonosz eltűnik, piros vignetta, szívdobogás
[5] Visszatérés          →  „Próbáld újra, nyomozó…" + a rács változatlanul ott marad
```

### 12.3 Klasszikus mód jumpscare-jei
A Klasszikus módban is van, a saját lényekkel: Vlad denevérfelhőből tör elő; Lilith szeme izzik fel a sötétben; Silas az üveg mögül néz ki; Ezekiel farkasüvöltéssel ugrik; Malachar varjúraj formájában borítja be a képernyőt.

### 12.4 Biztonsági és kényelmi beállítások (kötelező!)
| Beállítás | Opciók |
|---|---|
| Jumpscare | Be / Csak hang / Csak kép / „Lágy" (nincs villanás, halkabb) / Ki |
| Hangerő-plafon | A jumpscare sosem lehet hangosabb a beállított maximumnál |
| Villogás | **Fotoszenzitív mód**: nincs gyors villogás (epilepszia-figyelmeztetés az első indításkor) |
| Képrázkódás | Be / Ki |
| Korhatár | 16+ jelzés az Esemény módnál, a Random módnál és a co-op chatnél; első indításkor figyelmeztetés |
| „Streamer mód" | Jumpscare előtt 1 mp-es halk jelzés, hogy a reakció jól mutasson kamerán 😄 |

---

## 13. Zene és hangdizájn

### 13.1 Rétegzett, dinamikus zene
Minden pálya zenéje **3 rétegből** áll, ami a játék állása szerint változik:
1. **Alap-ambient** (mindig szól) — a helyszín hangulata.
2. **Feszültség-réteg** — erősödik, ahogy egyre több karaktert raksz le.
3. **Csúcs-réteg** — az utolsó karakternél és a SUBMIT gomb fölött.

Megoldáskor egy rövid **„ügy lezárva"** fanfár (sötét, de felszabadító); rossz megoldásnál a zene elhal → jumpscare.

### 13.2 Hangeffektek
| Akció | Hang |
|---|---|
| Karakter kiválasztása | régi fénykép zizzenése |
| Nyomva tartás (lerakás) | erősödő szívverés → a betű „becsapódik" egy kalapácsütéssel |
| Ceruzás jegyzet | körömsercegés papíron |
| X-elés | karcolás fán / tollvonás |
| Radír (nyomva tartás) | egyre erősödő suttogás, majd szél fúj át |
| Visszavonás | visszafelé lejátszott hang |
| Tipp | gyertya meggyulladása |
| Helyes megoldás | harangszó + varjúszárny-csapkodás |

### 13.3 Klasszikus mód — pályánkénti zene
| Pálya | Zenei hangulat |
|---|---|
| Éjféli Mise | orgona-drón, távoli gregorián-szerű kórus |
| Utolsó Pohár | lassú, torzított blues/jazz zongora, esőkopogás |
| Gyógytea | népies, modális furulya/hegedű, buborékoló üst |
| Holdfény-galéria | barokk csembaló, ketyegő antik órák |
| Blackwood-kúria | régi gramofon-keringő, recsegő padló |
| Vadászház | mély dobok, farkasüvöltés távolról |
| Hideg Asztal | steril elektronikus zúgás, hűtőgép-búgás |
| Alku a keresztútnál | délvidéki mocsári slide-gitár, tücskök |
| Elsüllyedt Malom | víz alatti, tompított zongora |
| Tükrök Terme | eltorzult kintorna, gyerekkacagás visszhangja |
| A Rend Levéltára | óraketyegés + vonósnégyes |
| Vörös Hold | teljes kórus és orgona, epikus „final boss" téma |

### 13.4 Esemény mód zenéje
**Fontos:** az Esemény módban **nem az eredeti játék- vagy filmzenéket** használjuk (azok jogvédettek), hanem **saját, „-szerű" kompozíciókat**, amelyek a világ hangulatát idézik (pl. torzított zenélődoboz a Poppy Playtime-hoz, ipari zaj az Outlasthoz). A 11. fejezetben leírt hangulatok ezt a célt szolgálják. Forrás lehet: saját szerzés, AI-zenegenerátor jogtiszta kimenete, vagy licencmentes horror-hangkönyvtár (pl. Freesound CC0, Pixabay Audio).

---

## 14. UI / UX — képernyőről képernyőre

### 14.1 Főképernyő
- Sötét, ködös háttér; középen a **NIGHTDOKU** logó, ahol az „O" egy vörös hold, és egy csepp vér csorog le a „D" betűről (a Murdoku-logó „O"-jára utalva, ahol egy nagyító van).
- Gombok (a főmenü kártyái): **Klasszikus**, **Esemény**, **Random**, **Együtt**, **Gyilkos**; mellettük **Folytatás** (ha van félbehagyott ügy), **Barátok**, **Profil**, **Gyűjtemény**, **Beállítások**.
- Jobb felső: **profil-chip** (avatár + becenév; kijelentkezve „Bejelentkezés" gomb — lásd 14.6–14.7), nyelv (magyar / angol / német…), **sötét / „vérhold" téma** váltó.
- Bal alsó sarok: szinkron-állapot — ☁ *Mentve a felhőbe* / 📴 *Offline — helyben mentve* / 👤 *Vendég — csak ezen a gépen*.

### 14.2 Pályaválasztó
- A Murdokuhoz hasonlóan **borítékok** — nálunk **viaszpecsétes dossziék** („ÜGY ELÉRHETŐ — KATTINTS A FELNYITÁSHOZ"). Felnyitáskor papírzizegés, és előcsúszik a térkép kicsinyített képe, a cím, a méret és a nehézség.
- Szűrők: Mind / Gyertyafény / Alkony / Éjfél / Holdfogyatkozás / Pokol kapuja.
- Rendezés: Nehézség / Fejezet / Megjelenés dátuma / Legjobb idő.
- Megoldott pályán: **piros „LEZÁRVA" pecsét**, a legjobb idő és hány tippet használtál (0 tipp = ⭐ arany koponya).

### 14.3 Játékképernyő (mint a Murdoku, kiegészítve)
```
┌──────────────────┬─────────────────────────────────┬──────────┐
│ ← NIGHTDOKU      │                                 │ Eszközök │
│ Éjféli Mise 6×6  │                                 │  [ ✖ ]   │
│ 🕐 0:42  💀 0    │                                 │  [ 🧽 ]  │
│                  │           A  R Á C S            │  [ ↩ ]   │
│ GYANÚSÍTOTTAK    │                                 │          │
│ ┌────┐ ┌────┐    │       (helyiségek, tárgyak,     │          │
│ │Vlad│ │Morr│    │        holdfény-csíkok,         │          │
│ └────┘ └────┘    │        pentagrammák)            │  [ 💡 ]  │
│ [nyom] [nyom]    │                                 │ [BEKÜLD] │
│ ...              │                                 │ [SÚGÓ]   │
│ ┌──────┐         │                                 │ ? ↗ 🖼   │
│ │ÁLDOZ.│         │                                 │ 🔇  ⚙    │
│ └──────┘         │                                 │          │
│ AKTÍV ERŐK: 🧛👻 │                                 │          │
└──────────────────┴─────────────────────────────────┴──────────┘
```
Újdonságok a Murdokuhoz képest:
- **Aktív Erők** sáv a bal alsó részen, ikonokkal; rákattintva elmagyarázza a szabályt.
- **Nyom-kártya „kihúzása"**: ha egy nyom teljesült, a kártya halványan áthúzódik (opcionális segítség, kikapcsolható).
- **Ütközés-jelzés**: ha két karakter ugyanabban a sorban van (hibás lerakás), a mezők vörösen lüktetnek (csak könnyű szinteken).
- **Jegyzet-mód kapcsoló**: mobilon nehéz a nyomva tartás vs. koppintás → egy kapcsoló is legyen: „Lerakás" ↔ „Jegyzet".
- **Nagyítás** nagy (10×10) pályákhoz mobilon.

### 14.4 Tipp-rendszer (3 szint)
1. **Halvány tipp:** „Nézd meg Silas nyomát."
2. **Közepes tipp:** kiemeli azokat a mezőket, ahol Silas lehet.
3. **Erős tipp:** lerakja Silast a helyére.
Minden tipp egy „💀 szellemérmébe" kerül — a játék során szerzel érméket (napi ügy, hibátlan megoldás).

### 14.5 Bemutató (6 lépés, mint a Murdokuban, horror-hangulatban)
1. **„Üdv, Kilencedik Szem"** — „Gyilkosság történt. A halottak emlékei megmutatják, ki hol volt."
2. **„Visszhangok"** — a nyomkártyák bemutatása.
3. **„Egy lélek soronként és oszloponként"** — animált 4×4-es példa az automatikus X-ekkel.
4. **„Mit jelent a *mellette*"** — fel/le/balra/jobbra, ugyanabban a helyiségben.
5. **„A lélek elhelyezése"** — nyomva tartás vs. koppintás.
6. **„Zárd le az ügyet"** — „Ha mindenki a helyén van, nyomd meg a BEKÜLDÉS gombot. És imádkozz, hogy igazad legyen…" 👁️

### 14.6 Bejelentkezés / regisztráció (nem kötelező)

```
┌──────────────────────────────────────────────┐
│        🩸  NIGHTDOKU — Nyomozói akta          │
│                                              │
│  Becenév   [ Kilencedik_Szem               ] │
│  E-mail    [ nyomozo@pelda.hu              ] │
│  Jelszó    [ ••••••••                      ] │
│                                              │
│  [  Belépés  ]   [  Regisztráció  ]          │
│  Elfelejtett jelszó?                         │
│                                              │
│  ───────────────── vagy ─────────────────    │
│  [ Játék vendégként — csak ezen a gépen ]    │
└──────────────────────────────────────────────┘
```

- **A belépés nem kötelező.** Vendégként minden játszható, csak nincs felhős mentés, profil-szinkron és ranglista.
- **E-mail + jelszó** (Supabase Auth, lásd 18.2). A **becenév egyedi** (3–16 karakter, kis/nagybetű nélkül megkülönböztetve); a szabad-e ellenőrzés a „Regisztráció" gomb *előtt* fut le.
- Első belépéskor, ha a gépen van vendég-haladás: *„Átvigyem a fiókodba?"* → igen esetén a 17.5 összefésülési szabályai szerint kerül át.
- **Bejelentkezve maradás:** a munkamenet-token titkosítva a gépen van (17.4), így újraindításkor automatikusan belép. A Profil → Fiók oldalon van **Kijelentkezés**.
- Google/Discord belépés későbbi bővítés (asztali appnál böngészős átirányítás kell hozzá — nem az első verzió).

### 14.7 Profil oldal

Külön oldal (főmenü → **Profil**, vagy a jobb felső profil-chipre kattintva). Kijelentkezve vendég-profilt mutat, felül „Lépj be, hogy a haladásod a felhőbe is mentődjön" sávval.

```
┌────────────────────────────────────────────────────────────────┐
│ ← Vissza                                        [ Szerkesztés ]│
│  ┌──────┐  KILENCEDIK_SZEM        Rang: Éjjeli Őr              │
│  │  🧛  │  Csatlakozott: 2026-10-25                            │
│  │avatár│  XP  ████████████░░░  1 240 / 1 500                  │
│  └──────┘  💀 12 szellemérme   🔥 7 napos széria (rekord: 9)    │
├────────────────────────────────────────────────────────────────┤
│ [Áttekintés] [Ügyek] [Gyűjtemény] [Eredmények] [Fiók]          │
├───────────────────────────────┬────────────────────────────────┤
│ STATISZTIKA                   │ KAMPÁNY                        │
│ Megoldott ügy:          23    │ I.   Az első vér     ███ 3/3   │
│ Tipp nélkül (⭐):        9    │ II.  A Rend árulója  ██░░ 2/4  │
│ Kapott jumpscare:       14    │ III. A Hold gyermeke ░░░ 0/3   │
│ Összes játékidő:   6 ó 12 p   │ Esemény: 3 / 10 · Napi: 11     │
│ Leggyorsabb 6×6:      1:42    │ Co-op: 8 játék · 3 gyilkos-győz.│
├───────────────────────────────┴────────────────────────────────┤
│ UTOLSÓ JÁTÉKOK   Éjféli Mise ✔ 2:34 ⭐ · Véletlen ügy ✔ 6:52 … │
└────────────────────────────────────────────────────────────────┘
```

| Fül | Tartalom |
|---|---|
| **Áttekintés** | rang, XP-sáv, szellemérmék, széria, statisztika, kampány-sávok, utolsó 5 játék |
| **Ügyek** | minden megoldott / félbehagyott pálya: legjobb idő, tippek, kapott jumpscare-ek; szűrők (fejezet, nehézség, mód) |
| **Gyűjtemény** | feloldott karakterek (bestiárium), bűnügyi napló, arany jumpscare-ek, skinek |
| **Eredmények** | jelvények (pl. „Tipp nélkül ×10", „Archivárius — mind a 10 Esemény-pálya", „7 éjszaka egymás után") |
| **Fiók** | becenév / avatár / jelszó csere, **adatexport (JSON)**, szinkron-állapot, helyi adatok kezelése, **fiók törlése** |

- **Avatár** = egy feloldott karakter portréja (nem feltöltött kép → nincs tárhely- és moderációs gond).
- **Rangok (XP alapján):** Újonc nyomozó (0) → Éjjeli Őr (500) → Hollowmere-i Nyomozó (1 500) → Vérhold-vadász (4 000) → **A Kilencedik Szem** (10 000). A rangot a program az XP-ből számolja, nem tároljuk külön.
- **XP pályánként:** 🟢 50 · 🟡 100 · 🟠 200 · 🔴 350 · ⚫ 600; tipp nélkül +25%. A véletlen ügyekért napi 5 megoldás után csökkentett XP jár (hogy ne lehessen vele „farmolni").
- A profil minden adata a felhőből jön / oda megy — a pontos forrás a 18.5 táblázatban van.

### 14.8 Random mód képernyő — és a „Folytatás"

```
┌────────────────────────────────────────────────────────────────────┐
│ 🎲 RANDOM — „Minden éjjel új ügy"                          ← Menü   │
├────────────────────────────────────────────────────────────────────┤
│ FOLYTATÁS  (félbehagyott ügyek)                                    │
│  ▶ Rémálom-keverék · Nehéz 8×8   ⏱ 14:32  utoljára: 12 perce      │
│                                          [ Folytatás ] [ Elvetem ] │
│  ▶ Freddy pizzériája · Könnyű 6×6 ⏱ 03:10  utoljára: tegnap       │
│                                          [ Folytatás ] [ Elvetem ] │
├────────────────────────────────────────────────────────────────────┤
│ ÚJ ÜGY   Nehézség [ Gyertyafény | Alkony | Éjfél | Holdfogy. | Pokol ]│
│          Téma     [ Véletlen ▾ ]     Ügykód: [ ________ ] [ Játék ] │
│          [ 🎲 Új véletlen ügy ]                                     │
├────────────────────────────────────────────────────────────────────┤
│ 🌙 NAPI ÜGY    ma: Közepes 7×7 · nincs megoldva · 🔥 7 napos széria  │
└────────────────────────────────────────────────────────────────────┘
```

- A **Folytatás** lista a félbehagyott ügyeket mutatja: cím / téma, nehézség, eltelt idő, és hogy mikor és *melyik gépen* játszottál utoljára — a felhős mentés miatt másik gépen is folytatható. A szabályokat a 19.5 írja le.
- A főmenüben is megjelenik egy **„Folytatás"** gomb, ha van félbehagyott ügy (egy kattintás a legutóbbihoz).
- Az **Ügykód** mezővel egy barátod pályáját játszhatod (19.3).

### 14.9 Barátok

```
┌────────────────────────────────────────────────────────────────────┐
│ 👥 BARÁTOK                                                  ← Menü  │
│ Keresés: [ kilenc____ ] 🔍                                          │
│   ▸ Kilencedik_Szem · Éjjeli Őr          [ + Barátnak jelöl ]      │
│   ▸ Kilenc_Élet     · Újonc              [ + Barátnak jelöl ]      │
├────────────────────────────────────────────────────────────────────┤
│ KÉRÉSEK (1)    Vlad_Drag   [ ✔ Elfogad ] [ ✖ Elutasít ]             │
├────────────────────────────────────────────────────────────────────┤
│ BARÁTLISTA (3)                                                     │
│   🟢 Anna     Hollowmere-i Nyomozó   játékban: Együtt   [ Meghív ] │
│   🟢 Bence    Éjjeli Őr              a menüben          [ Meghív ] │
│   ⚫ Csilla   Vérhold-vadász         utoljára: tegnap              │
└────────────────────────────────────────────────────────────────────┘
```

- **Keresés** becenév-előtag alapján (legalább 2 karakter); a találatnál avatár, becenév és rang látszik. Részletek és adatvédelem: 23. fejezet.
- Az online jelző elrejthető (Beállítások → *Láthatatlan mód*).

### 14.10 Lobby (Együtt és Gyilkos mód)

```
┌────────────────────────────────────────────────────────────────────┐
│ 🤝 EGYÜTT — Szoba-kód: 7F3K92   [ Másol ]                [ Kilép ]  │
│ Pálya: Éjféli Mise (Klasszikus)  [ Módosít ]   Időkorlát: nincs     │
├────────────────────────────────────────────────────────────────────┤
│ JÁTÉKOSOK (2/4)                                                    │
│   👑 Kilencedik_Szem  (host)   ✔ kész                               │
│   🧛 Anna                      ✔ kész                               │
│   [ + Barát meghívása ]    [ üres hely ]    [ üres hely ]          │
├────────────────────────────────────────────────────────────────────┤
│ CHAT   Anna: kezdhetünk?                                           │
│        [ üzenet… ]                              [ ▶ INDÍTÁS ]       │
└────────────────────────────────────────────────────────────────────┘
```

- A host választja a **pályát** (katalógus-pálya, Random ügy nehézséggel és témával, vagy Ügykód) és a mód szabályait (22. fejezet).
- A **Gyilkos mód** lobbyja ugyanilyen, kiegészítve a beállításokkal (képességek, életek, névvel mutatott lerakások). A szerepet **indításkor** sorsolja a szerver — a lobbyban senki sem tudja, ki lesz a gyilkos.

### 14.11 Co-op játékképernyő

```
┌──────────────────┬─────────────────────────────────┬───────────────┐
│ GYANÚSÍTOTTAK    │      A RÁCS (közös)             │ JÁTÉKOSOK     │
│ nyomkártyák      │   ● Anna kurzora (kék)          │ ● Te (zöld)   │
│  …               │   ● Bence kurzora (narancs)     │ ● Anna        │
│                  │   (a lerakott betűn apró        │ ● Bence       │
│ ⏱ 12:40  ♥ ♥ ♡  │    színes pont: ki rakta)       │ [Gyűlés 1/1]  │
│ 🔪 KÉPESSÉGEK    │                                 │───────────────│
│ (csak a gyilkos  │                                 │ CHAT          │
│  látja)          │                                 │ Anna: B4-en?  │
│ [⏱][✍][🕳]       │                                 │ [ üzenet… ]   │
└──────────────────┴─────────────────────────────────┴───────────────┘
```

- **Közös tábla:** mindenki kurzora látszik, saját színnel; a lerakott karakteren apró, a lerakó színével azonos pont jelzi, ki tette oda (a Gyilkos módban ez alapból **ki van kapcsolva**, lásd 22.3).
- **Chat** a jobb oldalon, csak a szobában élő játékosok látják (23.4). Van egy **„Mutasd" ping**: egy mezőre mutatva mindenkinek felvillan.
- **Bal alsó:** az óra és az életek (♥); a Gyilkos módban a gyilkosnak itt jelenik meg a **képességsáv** (három gomb hűtéssel), a többieknek ez a hely üres.
- A **Gyűlés** gomb csak a Gyilkos módban van.

---

## 15. Saját extra ötletek

1. **🕯️ Gyertya-mód:** a tábla sötét, csak egy gyertyafény-kör világítja meg az egered/ujjad körül. Csak a megvilágított mezőkön látod a tárgyakat (nehezített, hangulatos variáns).
2. **⏳ Napfelkelte-óra:** opcionális időkorlát; ahogy fogy az idő, a háttér egyre világosabb lesz (jön a Nap) — vámpír-gyanúsítottak „elégnek", ha nem oldod meg időben.
3. **📖 Bűnügyi napló:** minden megoldott pálya után egy rövid szöveges „ügyirat" kerül a naplóba (a karakter vallomása, egy lore-darab). Összegyűjthető, újraolvasható.
4. **🎭 Karakter-gyűjtemény (bestiárium):** minden karakter kártyája feloldható, a lore-jával, a statisztikáival („3-szor volt gyilkos, 5-ször ártatlan"), és az alternatív ruháival (Halloween-skin, karácsonyi skin).
5. **👥 Kooperatív módok:** ✅ *a tervbe beépítve — lásd a 22. fejezetet* (Együtt + Gyilkos mód, Supabase Realtime).
6. **⚔️ Párbaj:** két játékos ugyanazt a pályát kapja, aki előbb megoldja, nyer. A vesztes kapja a jumpscare-t. 😈
7. **🌙 Napi ügy + ranglista:** minden nap éjfélkor (Budapest idő szerint) új generált pálya, globális és baráti ranglista, sorozatszámláló („7 éjszaka egymás után").
8. **🔍 „Hazug" pályák:** pontosan egy gyanúsított hazudik — ki kell találni, ki, és hol volt valójában.
9. **🏚️ Változó tábla:** szakértő pályákon a tábla félidőben **megváltozik** (egy fal leomlik, egy ajtó kinyílik), és két „idősík" nyomait kell összeegyeztetni.
10. **📼 Found footage megjelenítés:** az Esemény módban egy opcionális VHS-szűrő (képzaj, dátumbélyeg a sarokban: „OCT 31 1978 23:47").
11. **🧩 Pályaszerkesztő + automatikus ellenőrzés:** a közösség saját pályákat készíthet; a szerkesztő azonnal ellenőrzi, hogy egyértelmű-e a megoldás, és megmutatja a becsült nehézséget.
12. **🎃 Szezonális események:** Halloween (október), Péntek 13-ák, Walpurgis-éj (április 30.) — különleges pályák és skinek.
13. **🗣️ Szinkronizált vallomások:** megoldás után a gyilkos egy rövid, hangalámondásos vallomást tesz (AI-hang vagy szinkronszínész).
14. **♿ Akadálymentesség:** színvak-mód (a helyiségek mintázattal is megkülönböztethetők, nem csak színnel), képernyőolvasó-támogatás a nyomkártyákhoz, nagy betűs mód.

---

## 16. Technikai terv

### 16.1 Javasolt stack
| Réteg | Technológia | Miért |
|---|---|---|
| Alkalmazás-héj | **Electron** (először Windows; macOS/Linux ugyanabból a kódból) | letölthető, **saját, önálló ablakban** fut (nem böngészőben), offline működik, eléri a fájlrendszert a `memory` mappához (16.5). Alternatíva: Tauri (kisebb telepítő, de Rust-tudás kell) |
| Frontend | **React + TypeScript + Vite** | gyors fejlesztés; a Next.js itt felesleges, mert nincs szerveroldali renderelés |
| Tábla renderelés | **HTML Canvas / PixiJS** (vagy SVG kisebb pályákhoz) | sima animációk, jumpscare-effektek |
| Animáció | Framer Motion (UI), GSAP (jumpscare) | |
| Hang | **Howler.js** | rétegzett zene, crossfade, hangerő-plafon |
| Helyi mentés | **JSON-fájlok a `memory` mappában** | kicsi, olvasható, atomikusan írható (17. fejezet) |
| Felhő / Auth / Realtime | **Supabase** (e-mail + jelszó, Postgres, RLS, Realtime a co-op módokhoz) | fiók, profil, mentések, pályák, barátok, szobák, ranglista (18., 22–23. fejezet) |
| Terjesztés és üzemeltetés | GitHub (forráskód, kiadások) + **Vercel** (`web/`: letöltőoldal és napi keep-alive) | zip / portable `.exe`, később telepítő + automatikus frissítés (24. fejezet) |
| Mobil | később, külön döntés | a React-kód nagy része Capacitorral újrahasznosítható |
| Pályagenerátor | TypeScript, **az appban fut** (offline), seedelt és verziózott | 19. fejezet |

### 16.2 Alapelvek

1. **Offline-first:** minden változás előbb a gépen lévő `memory` mappába kerül (17. fejezet); a felhő másolat és kiegészítés, nem előfeltétel. Belépés nélkül és internet nélkül is minden játszható.
2. **Az app sosem beszél közvetlenül a Postgres-szel.** Nincs benne adatbázis-jelszó vagy „connection string" — csak a Supabase HTTPS API-ja, **a publikus (publishable) kulccsal**; a védelmet az adatbázis sor-szintű szabályai (RLS, 18.4) adják. A titkos kulcsok soha nem kerülhetnek a letölthető programba, mert onnan bárki kinyerheti őket.
3. **Az előre megírt pályák az app részei** (offline is megvannak), a `puzzles` táblában pedig azért is ott vannak, hogy új pályák **app-frissítés nélkül** érkezhessenek (így a későbbi pálya-bővítések nem igényelnek új kiadást).
4. **A véletlen pályákból csak a seed mentődik** (kb. 20 byte), nem a teljes pálya — a generátor determinisztikus (19. fejezet). Ettől marad apró a `memory` mappa és az adatbázis is.
5. **Egy közös tábla = egy szoba:** a co-op módok a Supabase Realtime-ra épülnek (privát csatornák, RLS); a titkos információt (a gyilkos kiléte) csak a szerver ismeri (22.3).
6. **A titkok nem kerülnek a repóba:** a kliensbe csak a publikus kulcs jut; a GitHub / Vercel / keep-alive rendje a 24. fejezetben van.

### 16.3 Adatbázis és helyi fájlok

- **Helyi fájlok** (JSON, `memory` mappa): a **17. fejezetben**.
- **Felhő** (Supabase / Postgres): a táblák, a jogosultságok és a szükséges adatok a **18. fejezetben**.

### 16.4 Mappastruktúra (a forráskód)
```
nightdoku/
├─ electron/
│  ├─ main.ts              # ablak, a memory mappa kezelése, safeStorage (token)
│  └─ preload.ts           # biztonságos híd a felület és a fájlkezelés között
├─ src/                    # React-felület
│  ├─ screens/             # főmenü, pályaválasztó, játék, Random + Folytatás, profil, barátok, lobby, bejelentkezés
│  ├─ components/
│  │  ├─ Board/            # rács, mezők, falak, tárgyak
│  │  ├─ SuspectCard/
│  │  ├─ Toolbar/
│  │  ├─ Tutorial/
│  │  └─ Jumpscare/
│  ├─ engine/
│  │  ├─ rules.ts          # alapszabályok + Erő-szabályok
│  │  ├─ solver.ts         # megoldó / egyértelműség-ellenőrző
│  │  └─ generator.ts      # seedelt, verziózott generátor (Random mód, napi ügy)
│  ├─ storage/
│  │  ├─ memory.ts         # memory mappa: atomikus olvasás/írás, .bak, séma-verzió
│  │  └─ sync.ts           # szinkron-sor + összefésülés a Supabase-szel (17.5)
│  ├─ cloud/supabase.ts    # kliens (csak Project URL + publishable key)
│  └─ coop/                # szoba-kliens: Realtime-csatornák, műveletek, chat, képességek (22. fejezet)
├─ puzzles/                # az előre megírt pályák (a csomag része)
│  ├─ classic/*.json
│  ├─ event/*.json          # az Esemény-mód 10 pályája
│  └─ bonus/*.json
├─ assets/
│  ├─ portraits/           # karakterportrék (SVG/PNG)
│  ├─ tiles/               # tárgy-sprite-ok
│  ├─ audio/music/<world>/
│  └─ audio/jumpscares/<world>/
├─ supabase/migrations/    # 0001_init.sql, 0002_social.sql, … — az adatbázis-séma (18.4)
├─ web/                    # Vercel: napi keep-alive (api/keepalive.js) + letöltőoldal (24. fejezet)
├─ .env.example            # a környezeti változók mintája (a .env NINCS a gitben)
└─ .gitignore
```

### 16.5 Az alkalmazás saját ablaka

A játék **önálló, natív ablakban** nyílik meg — nem böngészőben és nem lapon —, ahogy az `ADVANCED_USE`-ban lévő programod is (saját `.exe`, saját ablak).

- **Ablak:** Electron `BrowserWindow`, saját ikon és tálcaikon, cím: *NIGHTDOKU*, minimális méret 1100×700, **F11** teljes képernyő. Az ablak mérete és helye megmarad (`settings.json`).
- **Nincs böngészőfelület:** se címsor, se lapok, se „vissza" gomb; a menü, a játék és a jumpscare is az ablakon belül fut.
- **Egy példány:** a második indítás nem nyit új programot, hanem az első ablakot hozza előre (`requestSingleInstanceLock`) — kivéve, ha külön adatmappát kap (lásd az utolsó pontot).
- **Indítás:** dupla kattintás a `NIGHTDOKU.exe`-n; nem kell szerver, nem kell böngésző. Fejlesztéskor az `npm run dev` ugyanígy Electron-ablakot nyit (a Vite fejlesztői szerver csak a tartalmát szolgálja ki).
- **Egyedi címsor:** az első verzióban a rendszer ablakkerete marad (stabilabb); később lehet keret nélküli ablak saját sötét címsorral és ✕ / — / ▢ gombokkal.
- **Biztonság:** `contextIsolation: true`, `nodeIntegration: false`; a fájlkezelés (a `memory` mappa, a titkosított token) csak a `preload.ts` által kiajánlott szűk API-n keresztül érhető el.
- **Helyi co-op-teszt egy gépen:** a `NIGHTDOKU.exe --memory=./memory-b` kapcsolóval egy második példány külön `memory` mappával indul, így két ablakkal két játékos is kipróbálható egyedül.

---

## 17. Helyi mentés — a `memory` mappa

> A NIGHTDOKU **letölthető alkalmazás**, ezért **minden először a saját gépre mentődik**. A felhő (18. fejezet) ennek a másolata és kiegészítése — így internet nélkül is minden működik, és a haladás akkor sem vész el, ha a szerver épp nem elérhető.

### 17.1 Hol van és mi van benne

A `memory` mappa **az alkalmazás mappájában** jön létre (ugyanott, ahová a játékot letöltöd / kicsomagolod). Az app **csak ebbe a mappába ír**, máshova semmit.

```
NIGHTDOKU/                         ← a letöltött mappa
├─ NIGHTDOKU.exe
├─ resources/ …                    (maga az app + az előre megírt pályák — csak olvasható)
└─ memory/                         ← az EGYETLEN írható mappa
   ├─ settings.json                hang, jumpscare-mód, akadálymentesség, nyelv, téma
   ├─ guest/                       vendég-adatok (ha nem vagy belépve)
   └─ u_3f9a12bc/                  a belépett fiók adatai (a felhasználó-azonosító első 8 jegye)
      ├─ profile.json              profil-pillanatkép: becenév, avatár, XP, szellemérmék, széria
      ├─ progress.json             pályánkénti eredmény + az utolsó 20 véletlen futás
      ├─ session.json              a félbehagyott játék(ok): lerakott karakterek, X-ek, jegyzetek, óra
      ├─ unlocks.json              feloldott karakterek, napló, jelvények, skinek
      ├─ sync-queue.json           még fel nem töltött változások (offline időszakra)
      ├─ auth.bin                  titkosított bejelentkezési token (17.4)
      └─ cache/                    csak ha kell: később érkezett új pályák, az aktuális esemény
```

- **Fájlformátum: JSON.** Jegyzettömbbel is megnyitható és javítható, nagyon kicsi, és nem kell hozzá semmilyen extra program. Adatbázis-fájl (SQLite) ekkora adatmennyiséghez felesleges.
- Minden `*.json` mellett ott van az előző jó állapota `*.json.bak` néven.
- Minden fájl első mezője a séma-verzió (`"v": 1`), hogy egy későbbi frissítés biztonságosan átalakíthassa a régi mentéseket.
- A `settings.json` **gépfüggő** (hangerő, jumpscare-mód stb.), de belépve a `user_settings` táblába is szinkronizálódik (18.4), hogy új gépen ugyanazt kapd.

### 17.2 Méretkeret — nagyon kevés tárhely

| Mi | Becsült méret |
|---|---|
| `settings` + `profile` + `unlocks` | ~ 5 KB |
| `progress` (48 klasszikus pálya + az utolsó 20 véletlen futás) | ~ 20 KB |
| `session` (legfeljebb ~3 random ügy + a megkezdett pályák) | ~ 1 KB / játék |
| `cache/` (új pályák ~2 KB/db + az aktuális esemény) | ≤ 500 KB |
| **Összesen, tipikusan** | **< 100 KB** *(kemény plafon: 5 MB, fölötte takarítás)* |

Hogyan marad ennyire kicsi:
- A mappába **csak adat** kerül — soha kép, hang, portré vagy animáció (azok az app mappájában vannak, csak olvasható módon).
- Az előre megírt pályák **az appban** vannak, nem a `memory` mappában. A `cache/` csak azt tartalmazza, ami az app kiadása *után* érkezett (új pályák, aktuális esemény); a régi, megoldott cache-elemeket a program törli.
- Napi / véletlen / esemény-ügyből **csak a seed** mentődik, nem a teljes pálya (19.3).
- A futás-történetből helyben csak az **utolsó 20** marad; a teljes napló a felhőben van.
- A tábla-állapot tömör: a lerakott karakterek `{ "vlad": "E1" }`, az X-ek egyetlen szövegként (`"A1,A2,C5"`) — nem mezőnkénti objektumlista.
- Az automatikus mentés **nem minden kattintásnál** fut: 3 mp-es késleltetéssel, ablakváltáskor és kilépéskor.
- A `sync-queue.json` bejegyzése feltöltés után azonnal törlődik; egy pályára mindig csak a legutolsó állapot marad benne.

### 17.3 Példa fájlok

**`progress.json`**
```json
{
  "v": 1,
  "updatedAt": "2026-10-25T21:14:03Z",
  "puzzles": {
    "classic-01-midnight-mass": { "solved": true,  "bestMs": 154000, "hints": 0, "wrongSubmits": 1, "firstSolvedAt": "2026-10-25T20:50:10Z" },
    "classic-02-herbal-tea":    { "solved": false, "wrongSubmits": 0 }
  },
  "recentRuns": [
    { "id": "6c1f…", "ref": "gen:1:2:7F3K92", "kind": "random", "solved": true, "ms": 412000, "hints": 1, "wrongSubmits": 0, "at": "2026-10-25T21:10:00Z" }
  ]
}
```

**`session.json`** (félbehagyott játékok — ügykódonként egy bejegyzés; legfeljebb 3 random ügy + a megkezdett katalógus-pályák, lásd 19.5)
```json
{
  "v": 1,
  "sessions": {
    "classic-02-herbal-tea": {
      "elapsedMs": 183000,
      "hintsUsed": 0,
      "placed": { "vlad": "E1", "silas": "B2", "lilith": "D3" },
      "marks": "A1,A2,C5",
      "notes": { "C4": ["morrigan", "lilith"], "D4": ["lilith"] },
      "updatedAt": "2026-10-25T21:19:44Z"
    },
    "gen:1:2:7F3K92": {
      "elapsedMs": 412000,
      "hintsUsed": 1,
      "placed": { "leon": "B3" },
      "marks": "",
      "notes": {},
      "meta": { "title": "Rémálom-keverék", "difficulty": 2, "size": 6, "startedAt": "2026-10-25T21:02:10Z" },
      "updatedAt": "2026-10-25T21:09:01Z"
    }
  }
}
```

### 17.4 Megbízhatóság és biztonság

- **Atomikus írás:** a program előbb egy ideiglenes fájlba ír, az előző állapotot `.bak`-ba másolja, majd átnevezi az újat — kilépés vagy áramszünet közben sem csonkulhat meg a mentés.
- **Sérült fájl esetén:** automatikusan a `.bak`-ot tölti be; ha az is sérült, a felhőből tölti vissza (belépve), egyébként tiszta lappal indul, de **nem töröl** semmit — a sérült fájlt `*.corrupt` néven félreteszi.
- **A bejelentkezési token nem sima szövegként van a mappában:** az Electron `safeStorage`-ével titkosítva (`auth.bin`; Windowson a felhasználói fiókhoz kötött titkosítás). Ha a `memory` mappát bezipped és elküldöd valakinek, a token nála nem használható.
- **Írható-e a mappa?** Ha az app olyan helyen van, ahová a program nem írhat (pl. `Program Files`), automatikusan a `%APPDATA%\NIGHTDOKU\memory` mappát használja, és szól erről. *Portable `.exe` esetén* (electron-builder `portable`) a program ideiglenes mappába csomagolja ki magát, ezért a `memory` helyét a `PORTABLE_EXECUTABLE_DIR` környezeti változóból kell venni — különben kilépéskor minden mentés elveszne.
- **Több fiók egy gépen:** mindenkinek külön almappája van (`u_xxxxxxxx`), a vendég-adatok is külön (`guest/`), így nem keverednek.
- **Beállítások → Adatok:** „Mentés exportálása" (a mappa egyetlen fájlba), „Helyi adatok törlése" (megerősítéssel), és a mappa megnyitása a Fájlkezelőben.

### 17.5 Szinkron-szabályok (offline-first)

1. **Minden írás először a `memory` mappába megy.**
2. Belépve és internettel: háttérben feltölti a Supabase-be (`upsert`); a futás-naplóban a bejegyzések **kliens oldalon generált azonosítót** kapnak, így a megismételt feltöltés nem hoz létre duplikátumot.
3. Internet nélkül a változás a `sync-queue.json`-ba kerül, és induláskor / a hálózat visszatértekor feltöltődik.
4. Induláskor a program letölti a felhős állapotot és **összefésüli** a helyivel — nem felülír:

| Adat | Összefésülés |
|---|---|
| `solved` | ha bárhol megoldott → megoldott |
| `bestMs` | a kisebb érték |
| `hints` | a legjobb idejű futáshoz tartozó érték |
| `wrongSubmits` | a nagyobb érték |
| félbehagyott játék (`session` / `saves`) | amelyik `updatedAt`-je újabb |
| beállítások, becenév, avatár | az újabb `updatedAt` nyer |
| XP, szellemérmék, széria | az újabb `updatedAt` nyer *(egyjátékos játék; két gépen, offline módon párhuzamosan játszva kis eltérés előfordulhat — ezt vállaljuk)* |
| feloldások (`unlocks`) | a két halmaz egyesítése |

5. **Vendég → fiók:** a vendég-adatok ugyanezekkel a szabályokkal olvadnak a fiókba (a vendég a „másik gép").
6. A felületen mindig látszik az állapot: ☁ *Mentve a felhőbe* / 📴 *Offline — helyben mentve* / 👤 *Vendég — csak ezen a gépen* (14.1).

---

## 18. Fiók, profil és felhő (Supabase)

> A felhő a **fiókot, a profilt és minden mentést** tartja, hogy új gépen is folytatható legyen; ide kerülnek az előre megírt pályák, a barátok, a co-op szobák és a ranglisták is. Nem kell nagy rendszer: egy Supabase-projekt (Auth + Postgres + Realtime) elég.

### 18.1 Mi kerül a felhőbe

| Adat | Tábla | Migráció | Miért a felhőben |
|---|---|---|---|
| Profil: becenév, avatár, XP, szellemérmék, széria | `profiles` | 0001 | profil oldal, nevek a ranglistán, barát-keresés |
| Beállítások | `user_settings` | 0001 | új gépen is ugyanaz |
| **Előre megírt pályák** (megoldással): klasszikus, esemény, bónusz | `puzzles` | 0001 | új pályák app-frissítés nélkül; egyetlen hiteles forrás |
| Eredmények pályánként (megoldva, legjobb idő, tippek) | `progress` | 0001 | haladás, profil „Ügyek" fül |
| **Félbehagyott játékok** (random is) | `saves` | 0001 | folytatás bármelyik gépen (19.5) |
| **Minden lejátszott / feladott futás** naplója (co-op szereppel és győzelemmel) | `runs` | 0001 | statisztika, profil, széria |
| Napi ranglista | `leaderboard` | 0001 | versengés |
| Feloldott tartalmak (karakter, napló, jumpscare, skin, jelvény) | `unlocks` | 0001 | gyűjtemény, bestiárium |
| Barátságok és kérések | `friendships` | 0002 | barátlista, meghívás |
| Co-op szobák, tagok, közös tábla-állapot | `rooms`, `room_members` | 0002 | együtt-játék, újracsatlakozás |
| Szobán belüli chat | `room_messages` | 0002 | csak a játékban élő chat (23.4); a szobával együtt törlődik |
| Szoba-meghívók | `room_invites` | 0002 | „X meghívott" értesítés |
| Titkos szerepek, képesség-állapot, nyilvános profil-kártya | `room_roles`, … | 0003 *(terv)* | Gyilkos mód (22.3), barát-profil előnézet (23.1) |

### 18.2 Bejelentkezés

- **Supabase Auth, e-mail + jelszó.** Regisztrációkor egy adatbázis-trigger automatikusan létrehozza a `profiles` és `user_settings` sort.
- A **becenév** a regisztrációs adatokkal együtt megy (`username`), egyediségét előtte a `username_available()` függvény ellenőrzi (kis/nagybetű nélkül).
- Fejlesztés alatt a Supabase-ben (*Authentication → Providers → Email*) a **„Confirm email" kikapcsolható** — a beépített levélküldőnek nagyon alacsony a limitje. Élesben saját SMTP kell (egyébként a visszaigazoló levelek nem érkeznek meg, és új regisztrálók órás keretbe ütköznek).
- Elfelejtett jelszó: Supabase jelszó-visszaállító e-mail.
- A munkamenet a gépen **titkosítva** marad meg (17.4), így az app újraindításkor automatikusan belép.

### 18.3 A Supabase-projekt és a kulcsok

- **Projekt:** *HorrorDoku* — ez egy **második** Supabase-fiók projektje (az első fiók ingyenes kerete betelt). Project URL: `https://mgmmrejyxdjjduxcwksv.supabase.co`.
- A kliens a **publishable key**-jel (`sb_publishable_…`) azonosítja magát. Ez **publikus**: a csomagolt programba kerül, a védelmet az RLS adja.
- A kulcs és az URL a **`.env`** fájlban él (nincs a gitben; a minta a `.env.example`), a Vercelen pedig a projekt környezeti változói közt.

| Érték | Hova kerülhet | Megjegyzés |
|---|---|---|
| Project URL | játék, Vercel, repó (publikus) | nem titok |
| **Publishable key** (`sb_publishable_…`) | játék, Vercel | publikus; **csak** `apikey` fejlécben használd (az új kulcs nem JWT) |
| **Secret / `service_role` kulcs** | **sehova** a kliensbe vagy a repóba | megkerüli az RLS-t |
| **Adatbázis-jelszó, connection string** (`postgresql://…`) | **sehova** a kliensbe vagy a repóba | az app nem használja; csak a helyi `supabase` CLI-nek kellhet |
| JWT secret | **sehova** | |

> **Melyik mintát kell választani a Supabase „Connect" ablakában?** A *Framework* listában **nincs Electron** (a lista: Next.js, React Router, **React**, Nuxt, Vue, SvelteKit, Solid, Astro, Refine, TanStack Start, Flask, .NET, Expo, Flutter, Ionic, Swift, Android Kotlin) — és nem is kell, mert a játék felülete egy **React + Vite** alkalmazás, az Electron csak az ablakot adja köré. Válaszd a **React** mintát: ez a sima `@supabase/supabase-js` kliens, ugyanazokkal a változónevekkel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`), mint a `.env`-ünk. A **Next.js** minta (`@supabase/ssr`, `next/headers`, middleware) szerveroldali Next.js-hez való, a játékban nem használjuk.
>
> ```ts
> // src/cloud/supabase.ts — a Supabase React-mintája + a tokenmentés
> import { createClient } from '@supabase/supabase-js'
>
> export const supabase = createClient(
>   import.meta.env.VITE_SUPABASE_URL,
>   import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
>   { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
>             storage: safeStorageAdapter } },   // SAJÁT kód, nem Supabase-beépített: a token a titkosított auth.bin-be megy (17.4)
> )
> ```
>
> A `storage` opció a `supabase-js` hivatalos beállítása (egy `getItem` / `setItem` / `removeItem` objektumot vár); a `safeStorageAdapter` a mi kis segédünk, ami ezeket az Electron `safeStorage`-ére köti. Nélküle a kliens a böngésző `localStorage`-ába menti a tokent, ami az Electron-ablakban titkosítatlan fájlként a felhasználói profil-mappába kerülne.

### 18.4 Séma és migrációk

A séma **forrása az SQL-fájl**, nem ez a dokumentum — így nem csúszhat szét. A fájlok a `supabase/migrations/` mappában vannak, sorszámozva:

| Fájl | Tartalom | Állapot |
|---|---|---|
| `0001_init.sql` | profil, beállítások, pályák, haladás, mentés, futás-napló, ranglista, feloldások, regisztráció-trigger, `username_available()`, `ping()` (keep-alive), RLS | kész, tesztelt |
| `0002_social.sql` | barátok (`send_friend_request`, `respond_friend_request`, `remove_friend`, `my_friends` nézet), szobák (`create_room`, `join_room`, `leave_room`, `start_room`, `save_room_state`, `invite_friend`), chat, meghívók, takarítás (`cleanup_old_rooms`), RLS | kész, tesztelt |
| `0003_killer.sql` | *(a Gyilkos mód megvalósításakor)* `room_roles`, szerepsorsolás az `start_room`-ban, `use_ability()`, a privát Realtime-csatornák jogosultságai, nyilvános profil-kártya | terv: 22.3, 23.5 |

Alapelvek:
- **Minden táblán be van kapcsolva az RLS.** A kliens csak a saját sorait éri el; a barátság, szoba és meghívó írása **kizárólag a függvényeken** keresztül megy (hogy ne lehessen hamisítani).
- **Alkalmazott migrációt nem szerkesztünk** — változtatás = új fájl (0004, …).
- A `puzzles` és `events`-jellegű katalógus-adatokba a kliens nem írhat; oda a fejlesztő visz fel adatot.
- **Tesztelve:** a 0001–0002 migrációt egy helyi Postgres-ben (PGlite, Supabase-szerepekkel) lefuttattam és 56 ellenőrzéssel teszteltem — jogosultságok (más sorához nem fér hozzá), regisztráció-trigger, barát-folyamat, szoba-folyamat, chat, takarítás, Realtime-publikáció.

### 18.5 A profil adatai — honnan jön mi

| Profil-elem (14.7) | Forrás |
|---|---|
| Becenév, avatár, XP, szellemérmék, széria | `profiles` |
| Megoldott ügyek, tipp nélküliek, kapott jumpscare-ek, játékidő, co-op játékok, győzelmek gyilkosként / nyomozóként | `profile_stats` nézet (a `runs`-ból) |
| Kampány-sávok (fejezetenként) | `progress` ⨝ `puzzles.chapter` |
| Legjobb idők, „Ügyek" fül | `progress` |
| Folytatható ügyek | `saves` |
| Utolsó játékok | `runs` (az utolsó 5) |
| Gyűjtemény, jelvények | `unlocks` |
| Barátok, kérések | `my_friends` nézet |
| **Adatexport** | az összes fenti tábla a saját sorokra → egyetlen JSON-fájl |
| **Fiók törlése** | Supabase *edge function* (az `auth.users` sort kliensből nem lehet törölni); az `on delete cascade` ezután minden saját sort töröl |

### 18.6 Biztonság és üzemeltetés

- **RLS minden táblán**; a publikus kulccsal csak a saját sorok és a kiadott katalógus érhető el.
- **Csalás:** a játék egyjátékos-szinten bízik a kliensben, így a ranglista elvileg hamisítható. Az első verzióban ezt vállaljuk; ha a ranglista számítani fog, a beküldést egy edge function ellenőrzi (a seedből újragenerálja a pályát és validálja a beküldött rácsot).
- **Szüneteltetés:** az ingyenes csomagú projektet a Supabase felfüggesztheti, ha egy héten át kevés a felhasználói adatbázis-aktivitás. A hivatalos leírás szerint *„néhány adatbázis-kérés naponta"* elég, ezért a Vercelről naponta lefut egy keep-alive hívás (24. fejezet). Offline-first miatt szüneteltetéskor is játszható a játék, csak a belépés és a szinkron áll.
- **Mentés:** az ingyenes csomaghoz **nincs letölthető adatbázis-mentés**. Ezért fontos az adatexport (18.5), és érdemes a `supabase/migrations/` fájlokat és a `puzzles` forrás-JSON-okat a repóban tartani — ezekből a séma és a katalógus újraépíthető.
- A **chat és a szobák** néhány nap után törlődnek (`cleanup_old_rooms`, ütemezve `pg_cron`-nal vagy kézzel).

### 18.7 Üzembe helyezés lépésről lépésre

1. Supabase irányítópult → a **HorrorDoku** projekt (ellenőrizd a címsorban a project-ref-et: `mgmmrejyxdjjduxcwksv`) → **SQL Editor → New query**.
2. Illeszd be a `supabase/migrations/0001_init.sql` teljes tartalmát → **Run**. Várt eredmény: *Success. No rows returned*.
3. Ugyanígy a `0002_social.sql`.
4. *Authentication → Providers → Email*: fejlesztés alatt **Confirm email: ki**.
5. **Ellenőrzés** (a `ping()` függvény él-e):
   ```bash
   curl -s -X POST "https://mgmmrejyxdjjduxcwksv.supabase.co/rest/v1/rpc/ping" \
     -H "apikey: <publishable key>" -H "Content-Type: application/json" -d '{}'
   # várt: {"ok":true,"published_puzzles":0,"at":"..."}
   ```
6. Vercel keep-alive üzembe helyezése: 24. fejezet.
7. A `puzzles` tábla feltöltése később történik, a pályák elkészülte után (`published = false` állapotban vihetők fel, és kiadáskor kapcsolhatók `true`-ra).

---

## 19. Random mód és a szabálykövető generátor

> A Klasszikus (10) és az Esemény (10) mód pályái **előre megírtak**. A **Random módban nincs semmi előre megírva**: minden ügy véletlen — a pálya, a helyszín, a karakterek, a nyomok — de **mindig a szabályoknak megfelelő, tehát kivihető** (egyetlen, logikával megoldható megoldással). Ettől végtelenül újrajátszható.

### 19.1 Mi a Random mód?

- Az „Új véletlen ügy" gombbal indul; a játékos csak a **nehézséget** (és, ha akarja, a témát) választja, minden más véletlen.
- **Téma** (véletlenül sorsolt, vagy kézzel választott):
  - **Hollowmere** — a saját univerzum szereplői és helyszínei;
  - **egy Esemény-világ** (pl. a Freddy-pizzéria, az Ishimura hajó) — a játék karaktereivel és tárgyaival, a világ saját szabályával;
  - **Rémálom-keverék** — 2–3 világ szereplői egy helyszínen („Vlad, Leon és Freddy ugyanabban a kocsmában"). A lore-ban: a Fátyol elvékonyodása más világokból is behúz lényeket.
- A pálya mérete és az Erő-szabályok a **nehézségből** jönnek (5.1), mint a Klasszikus módban.
- Minden eredmény és minden félbehagyott állapot a **felhőbe mentődik** (`runs`, `saves`), a profil statisztikájába is beleszámít.

### 19.2 A generátor kötelező szabályai

A generátor csak olyan pályát adhat ki, amely **mindegyik** feltételt teljesíti:

1. **Soronként és oszloponként pontosan egy karakter** (a megoldás egy permutáció).
2. **Áldozat-szabály:** az áldozat helyiségében pontosan egy gyanúsított tartózkodik — ő a gyilkos.
3. **Minden nyom igaz a generált megoldásra.** A nyomokat a megoldásból vezetjük le, nem fordítva.
4. **A nehézségi szint határain belül marad** (5.1): méret, karakterszám, Erő-szabályok száma.
5. **Az Erő-szabályok (7.1) és a téma világ-szabálya a megoldásra is érvényesek:** foglalt tárgyra senki sem áll (kivéve a szellem), a vámpír nem áll holdfényes mezőn, a ghoul nem szomszédos élővel stb.
6. **Egyértelműség:** a megoldó (20.2) **pontosan 1** megoldást talál. Ha több van, a generátor erősebb nyomot ad vagy cserél; ha 0, új seeddel újrapróbál. Legfeljebb ~200 próbálkozás után új alaprajzot sorsol. *Így a pálya mindig kivihető.*
7. **Nehézség-becslés** (20.3, 6. lépés): a kapott pálya a kért szintbe esik, különben újrapróbál. A könnyebb szinteken a pálya tiszta logikával, tippelés nélkül is megoldható.
8. **Nincs duplikált nyom**, és a téma összefüggő (a nyomok és tárgyak a világhoz illenek).
9. **Determinizmus:** ugyanaz a (generátor-verzió, seed, paraméterek) mindig **ugyanazt a pályát** adja. Ezért a generátort **verziózzuk**, és a régi verziók a kódban megmaradnak — egy későbbi javítás nem törheti meg a régi seeddel mentett játékokat.

### 19.3 Seed és ügykód

- Az **ügykód** a pálya teljes azonosítója, pl. `gen:1:2:7F3K92` = *generátor v1 · nehézség 2 · seed `7F3K92`*. (A témát a seed tartalmazza.) Ez kerül a `runs.puzzle_ref` és `saves.puzzle_ref` mezőbe, a helyi `progress.json`-ba, és ezt lehet barátnak elküldeni.
- A seed **seedelhető PRNG-ből** jön (pl. mulberry32) — **nem** `Math.random()`, mert az nem reprodukálható. A seed kezdeti értékét `crypto.getRandomValues` adja.
- Mivel a pálya a seedből bármikor újraállítható, **nem tároljuk le** — se helyben, se a felhőben. Ez tartja a `memory` mappát és az adatbázist aprónak.
- A generátor **az appban fut** (TypeScript), nem a szerveren — így internet nélkül is van új ügy.

### 19.4 Készlet és „szerzés"

A Random mód a következő forrásokból dolgozik:

| Forrás | Mi kerül a készletbe | Mikor elérhető |
|---|---|---|
| **Hollowmere** | a szereplőgárda (7.2), a klasszikus pályák helyszín-sablonai és tárgyai | induláskor |
| **Az Esemény mód 10 világa** | a játékok karakterei, tárgyai, helyszín-sablonai, világ-szabályai (11. fejezet) | induláskor (a portrék elkészültével fokozatosan) |
| **Filmes világok** | a későbbi bővítés karakterei (11.3) | később |

- A **karakter-készlet** annyi, ahány kész portré van — ezért fokozatosan nő. Ami nincs kész, azt a generátor ki sem sorsolja.
- A játékokból érkezett karakterek alapértelmezetten **Halandók** (nincs külön Erő-szabályuk); ahol a lény természete egyértelmű (android, szellem-szerű alak), ezt a karakter-adatlap `race` mezője rögzíti.
- **„Szerzés":** amikor egy karakter először szerepel egy pályádon, **bekerül a Gyűjteményedbe** (`unlocks`, `kind = 'character'`), a forrás-játék jelölésével. A helyszín-sablonok és az új tárgyak is „megszerezhetők" (`kind = 'journal'`).

### 19.5 Félbehagyás és folytatás

A félbehagyott ügy **soha nem veszhet el**, és bármelyik gépen folytatható. A szabályok:

1. **Az induláskor azonnal mentünk:** amint a játékos új ügyet indít, a `session` helyben és a `saves` sor a felhőben (seed + `meta`) azonnal létrejön. Ha a program ezután összeomlik, legalább a pálya visszaállítható.
2. **Automatikus mentés:** helyben **3 mp** késleltetéssel (17.2); a felhőbe **15 mp** késleltetéssel, ablak-elrejtéskor, kilépéskor, és amikor a hálózat visszatér. Offline a `sync-queue.json` őrzi a változást.
3. **Mit mentünk:** az ügykód (seed + paraméterek), a **tábla állapota** (lerakott karakterek, X-ek, jegyzetek), az eltelt idő, a felhasznált tippek, a hibás beküldések száma, és a `meta` (cím/téma, nehézség, méret, indulás ideje).
4. **Az óra csak játék közben jár:** ha az ablak háttérbe kerül vagy 60 mp-ig nincs bevitel, az idő megáll — így a félbehagyott ügy nem „romlik el".
5. **Folytatás lista** (14.8): legfeljebb **3 félbehagyott random ügy** + a megkezdett klasszikus / esemény pályák, legutóbbi elöl; mutatja a címet/témát, a nehézséget, az eltelt időt és hogy mikor és melyik gépen játszottál utoljára. *Folytatás* / *Elvetem*.
6. **Elvetés:** a mentés törlődik, a `runs` naplóba pedig egy „feladott" futás kerül (`solved = false`).
7. **Lejárat:** 30 napnál régebbi félbehagyott random ügyet a program az induláskor felajánlja elvetésre.
8. **Két gépen ütközés:** az újabb `updatedAt` nyer (17.5); a felülírt állapot a helyi `*.bak` fájlban megmarad.
9. **Megoldás után:** a `saves` sor törlődik, a `runs`-ba bekerül az eredmény, a `progress`/`unlocks`/XP frissül.

### 19.6 Napi ügy

A **Napi ügy** a Random mód mindenkinek azonos változata: a **seed a dátum** (Europe/Budapest), tehát nem kell naponta adatbázis-sort feltölteni. Ranglista: `leaderboard` (`daily:YYYY-MM-DD`), széria a profilban.

- A dátumot online a szerver ideje adja (Supabase `now()`); offline az eszköz órája — az így játszott napi ügy játszható, de ranglistára csak szinkron után, a szerver szerinti napon kerülhet.

### 19.7 Jutalmak és visszaélés-védelem

- Megoldás után **szellemérme + XP** jár (14.7).
- Napi 5 véletlen ügy fölött az XP csökken, hogy ne lehessen „farmolni".
- *Később:* időzített **szezonális kihívások** (Halloween, Péntek 13., Walpurgis-éj) — ugyanezzel a géppel, egy `events` táblából vezérelve; az első verzióban nincs.

---

## 20. Pályaformátum (JSON) és pályagenerátor

### 20.1 A mintapálya JSON-ban

> Ugyanez a JSON kerül az app `puzzles/` mappájába **és** a Supabase `puzzles.data` mezőjébe (18.4). A `solution` mező az előre megírt megoldás — hogy ki hol volt. A katalógus-pályák `mode` értéke `classic`, `event` vagy `bonus`; az Esemény-pályákon a karakterek `source` mezője a forrás-játékot jelöli (pl. `{ "game": "resident-evil-2" }`).

```json
{
  "id": "classic-01-midnight-mass",
  "title": "Éjféli Mise",
  "size": 6,
  "difficulty": 1,
  "rooms": {
    "K": "Kripta", "S": "Sekrestye", "O": "Oltár",
    "H": "Harangláb", "T": "Temetőkert"
  },
  "layout": [
    "KKSSSS",
    "KKSSSS",
    "KKOOTT",
    "HHOOTT",
    "HHOOTT",
    "HHHTTT"
  ],
  "objects": [
    { "type": "coffin", "at": "A1" }, { "type": "coffin", "at": "B2" },
    { "type": "bench",  "at": "D1" }, { "type": "bench",  "at": "E1" },
    { "type": "bench",  "at": "B6" }, { "type": "candle", "at": "F2", "blocking": true },
    { "type": "carpet", "at": ["C3","D3","C4","D4"] },
    { "type": "grave",  "at": "F3", "blocking": true },
    { "type": "grave",  "at": "E5", "blocking": true },
    { "type": "tree",   "at": "E6", "blocking": true },
    { "type": "bell",   "at": "A4", "blocking": true }
  ],
  "characters": [
    { "id": "vlad",     "race": "vampire", "clue": { "on": "bench", "room": "S" } },
    { "id": "morrigan", "race": "witch",   "clue": { "beside": "bell" } },
    { "id": "silas",    "race": "ghost",   "clue": { "on": "coffin" } },
    { "id": "lilith",   "race": "demon",   "clue": { "on": "carpet", "room": "O" } },
    { "id": "ezekiel",  "race": "werewolf","clue": { "room": "T" } },
    { "id": "abel",     "race": "human",   "victim": true, "clue": { "room": "H" } }
  ],
  "activePowers": [],
  "solution": {
    "vlad": "E1", "silas": "B2", "lilith": "D3",
    "ezekiel": "F4", "morrigan": "A5", "abel": "C6"
  },
  "murderer": "morrigan"
}
```

### 20.2 Megoldó / egyértelműség-ellenőrző (algoritmus)
1. Sorold fel az összes **permutációt** (minden sorban egy karakter, minden oszlopban egy) — 6×6-nál 720 cellaelrendezés × 720 karakter-hozzárendelés, ez gyors; 8×8 felett **backtracking** szükséges (soronként haladva, nyomokkal metszve).
2. Szűrd ki, ahol egy karakter foglalt tárgyon áll (kivéve szellem).
3. Ellenőrizd a nyomokat és az aktív Erő-szabályokat.
4. Ellenőrizd az áldozat-szabályt: az áldozat helyiségében pontosan egy gyanúsított.
5. **Pontosan 1 megoldás** → érvényes pálya. 0 → ellentmondásos. 2+ → kell még nyom.

### 20.3 Generátor (Random módhoz és napi ügyhöz — a kötelező szabályokat lásd a 19.2-ben)
1. Válassz egy **helyiség-sablont** (kézzel rajzolt alaprajzok könyvtárából).
2. Szórj szét tárgyakat a sablon szabályai szerint.
3. Sorsolj egy érvényes megoldást (egy karakter/sor/oszlop, áldozat-feltétellel).
4. Minden karakterhez sorsolj egy rá igaz nyomot (a legspecifikusabbtól a legkevésbé specifikusig).
5. Futtasd a megoldót. Ha több megoldás van, **cserélj le egy gyenge nyomot erősebbre**; ha egyértelmű, próbálj nyomokat **gyengíteni**, amíg egyértelmű marad (ettől lesz „szép" a pálya).
6. **Nehézség-becslés:** hány logikai lépés kell, és van-e olyan lépés, ami csak kizárással (próbálgatással) jön ki.

---

## 21. Jogi megjegyzés az Esemény módhoz és a Random módhoz

Az Esemény módban és a Random mód készletében szereplő karakterek, nevek és helyszínek (Five Nights at Freddy's – Scott Cawthon; Poppy Playtime – Mob Entertainment; Resident Evil – Capcom; Alien – a 20th Century Studios / Disney, a játék: Alien: Isolation – Sega; Until Dawn – Sony Interactive Entertainment / Supermassive Games; Dead Space – Electronic Arts; Outlast – Red Barrels; Silent Hill – Konami; Dead by Daylight – Behaviour Interactive; Alan Wake – Remedy Entertainment; a későbbi filmes világok – a megfelelő film- és kiadóstúdiók) **mind jogvédettek**.

- **Saját, nem kereskedelmi rajongói projektként** (pl. barátoknak, portfólióba) ez a koncepció rendben van tervezésre és prototípusnak.
- **Nyilvános, pénzt hozó** kiadáshoz minden franchise-hoz **licenc** kellene — ez irreális egy indie projektnél.
- **Javasolt megoldás:** a nyilvános verzióban az Esemény-világok és a Random-készlet idegen karakterei **„inspirált" paródia-változatokban** jelennek meg saját nevekkel és dizájnnal (pl. „Raccoon City" → „Racoon Hollow", Mr. X → „a Kalapos Óriás"; „Freddy Fazbear's Pizza" → „Medve Pizzéria", Huggy Wuggy → „Ölelő Öcsi"). A rajongók így is felismerik, de nem sérül a szerzői jog.
- A **közkincs** horror (Drakula, Frankenstein, Lovecraft, Poe, Sherlock-kori viktoriánus horror) **szabadon használható** — ezekből érdemes a nyilvános Esemény-világok egy részét építeni.
- Zene: **soha ne az eredeti játék- vagy filmzenét** használd, csak saját vagy jogtiszta hangokat.

---

## 22. Co-op módok — „Együtt" és „Gyilkos"

> Két közös mód, ugyanarra az alapra építve: egy **szoba**, egy **közös tábla**, **játékon belüli chat**. Az *Együtt* mód csapatjáték; a *Gyilkos* mód „Among Us"-szerű: egy játékos titokban a gyilkos, és szabotálja a többieket.

### 22.1 Közös alapok

- **Szoba:** a host létrehoz egy szobát (6 jegyű kód), a többiek **kóddal** vagy **barát-meghívással** csatlakoznak (23.3); a lobby a 14.10 szerint néz ki. Együtt: 2–4 játékos, Gyilkos: 3–6 (kettővel is megy, lásd 22.3).
- **Pálya:** bármelyik katalógus-pálya (Klasszikus / Esemény), vagy Random ügy nehézséggel és témával, vagy Ügykód. A pálya mindenkinél **ugyanabból az azonosítóból áll elő** (`puzzle_ref`), így a táblát nem kell átküldeni.
- **Szinkron (Supabase Realtime):** a játékosok egy **privát Broadcast-csatornán** (`room:<id>`) küldik egymásnak a műveleteket: `place`, `unplace`, `move`, `mark`, `note`, `erase`, `ping`, `cursor`. Minden művelet `{ op, by, seq, cell, … }`.
  - **Ütközés:** cellánként a nagyobb `seq` győz (azonosnál a `by` azonosító dönt). A sor/oszlop szerinti automatikus X-ek mindig a lerakásokból **újraszámolódnak**, ezért nem kell külön szinkronizálni őket.
  - **Pillanatkép:** a változások után 2 mp-es késleltetéssel a `save_room_state(room, rev, state)` függvény menti a tábla állapotát (verzió-ellenőrzéssel); az újracsatlakozó ezt tölti le, majd az azóta érkezett műveleteket játssza rá.
  - **Kurzorok:** ~10 Hz-en mennek, nem mentjük őket.
  - **Megszakadt kapcsolat:** 2 perc türelmi idő a visszatérésre; a host kiesésekor a `leave_room` az első tagot teszi host-tá.
- **Ellenőrzés:** a beküldés helyességét a kliens ellenőrzi (nála van a pálya és a megoldás); az eredményt a szoba rögzíti.
- **Jumpscare:** rossz beküldésnél **mindenkinek egyszerre** (közös seed és időzítés) — a reakciók a móka része (*Streamer mód*, 12.4).
- **Napló:** minden tag külön `runs` sort kap (`kind = together | killer`, `room_id`, `role`, `won`) — így a profil statisztikájába is beleszámít.
- **Chat:** csak a szobában él (23.4).

### 22.2 Együtt mód

- **Cél:** közösen megoldani az ügyet. Nincs titkos szerep.
- **Közös tábla, közös jogok:** mindenki rakhat le karaktert, X-elhet, jegyzetelhet — **és elviheti / áthelyezheti a másik lerakását is**. A lerakott betűn apró, a legutóbbi kezelő színével azonos pont látszik; a chat opcionális rendszerüzenete: *„Anna áthelyezte Vladot: E1 → D1."*
- **Visszavonás:** mindenki csak a *saját* utolsó műveletét vonhatja vissza; mások lerakását át kell helyezni.
- **Kiemelés:** egy sort, oszlopot vagy helyiséget „lefoglalhatsz" egy zászlóval (*„ezt én nézem"*) — segítség a munkamegosztáshoz, nem kötelező.
- **Beküldés:** bármelyik tag kezdeményezheti; a többiek **10 mp-ig** megerősítik (többség elég), ha senki sem tiltakozik, megy.
- **Tippek:** a szobának közös tippkerete van (játékosonként 3). Az „arany koponya" (tipp nélküli megoldás) csak akkor jár, ha senki sem használt tippet.
- **Időkorlát:** opcionális (a host állítja be).
- **Jutalom:** XP minden tagnak, kooperatív bónusszal (+10%).

### 22.3 Gyilkos mód

**Szerepek.** Egy **gyilkos** (6+ játékosnál opcionálisan kettő) és a többi **nyomozó**. A szerepet **indításkor a szerver sorsolja**, és csak az érintettnek mondja meg (`room_roles`, a sorhoz csak a tulajdonosa fér hozzá). A lobbyban senki sem tudja, ki lesz a gyilkos.

**Cél.**
- *Nyomozók:* közösen megoldani az ügyet az **idő** és az **életek** elfogyása előtt — és kideríteni, ki közülük a gyilkos.
- *Gyilkos:* megakadályozni ezt — időhúzással, félrevezetéssel, a közös munka elrontásával — **úgy, hogy közben nem lepleződik le**. A gyilkos *is nyomoz*: ugyanazt a táblát látja, ugyanúgy lerakhat, ugyanúgy beszélhet a chatben. Csak ő „hazudhat".

**Menet.**
1. **Szerepkártya** (3 mp): *„TE VAGY A GYILKOS 🔪 — csak te látod"* / *„Nyomozó vagy. Egyikőtök a gyilkos…"*
2. **Nyomozás:** közös tábla + chat; a gyilkos a képességeit (hűtéssel) bármikor használhatja.
3. **Beküldés:** a többség jóváhagyása kell (15 mp). Helyes beküldés → *Epilógus* (lent). Helytelen → a csapat egy életet (♥) veszít és mindenki megkapja a jumpscare-t; ha elfogy a három élet, a gyilkos nyer.
4. **Gyűlés:** bármikor kezdeményezhető (korlátozva, lásd lent).
5. **Végkifejlet:** kiderül a gyilkos személye, és mindenki látja a **képesség-naplót** („Időcsavar ×2, Szövegcsere ×3, Eltüntetés ×1") — hogy mit tett, mikor.

**A gyilkos három titkos képessége** (alapértékek; a lobbyban állíthatók):

| Képesség | Mit csinál | Hatás | Hűtés | Korlát | Mit lát a csapat |
|---|---|---|---|---|---|
| ⏱️ **Időcsavar** | a hátralévő időből **20 mp-et lop** — vagy 10 mp-re **háromszoros sebességre** gyorsítja az órát (a gyilkos választ) | azonnali / 10 mp | 90 mp | 3× / játék | semmilyen üzenetet — csak az óra viselkedik furcsán |
| ✍️ **Szövegcsere** | egy nyomkártya szövegét átírja egy **hihető, de hamis** változatra (tárgy / helyiség / irány kicserélve) | **5 mp** | 45 mp | – | **semmi értesítést** — senki sem kap jelzést, a kártya szövege egyszerűen más 5 mp-ig, aztán visszaáll |
| 🕳️ **Eltüntetés** | egy tárgyat eltüntet a tábláról | **8 mp** | 60 mp | – | a tárgy eltűnik, majd visszatér (a ki-tette nem látszik) |

- **Időcsavar.** A hátralévő időt a **szerver** számolja (*kezdés + időkorlát − büntetések*), így mindenkinél egyszerre „ugrik". Időkorlát nélküli játékban nem elérhető.
- **Szövegcsere.** A hamis szöveget a gyilkos kliense állítja elő a nyom módosításával; a szerver csak az érvényességet és a hűtést ellenőrzi. **Nincs felugró értesítés és nincs chat-üzenet.** *(Lobby-opció: „Árulkodó jel" — a kártya 0,2 mp-re megvillan; alapból **ki van kapcsolva**, mert a mód lényege, hogy nincs értesítés.)* A nyomozók ellenszere a megfigyelés és az egyeztetés: *„nálad mit ír a Vlad-kártya?"*
- **Eltüntetés — csapda-mező.** Amíg a tárgy „nincs ott", a mező szabadnak látszik, ezért a nyomozók ráhelyezhetnek karaktert vagy jegyzetet (*„itt volt valaki"*). **Amikor a tárgy visszatér, minden, ami a mezőn volt, törlődik, és a mező újra zárolt** — oda többé nem lehet rakni. A törölt lerakás miatt a sor/oszlop X-ei is újraszámolódnak, így a gyilkos elvesztegetteti a csapat munkáját és eltorzítja a következtetéseiket. *A pálya megoldása nem változik — csak a kép.*
- **Közös korlátok:** egyszerre csak egy képesség lehet hatásban, a képességek között **10 mp közös hűtés** van (hogy ne lehessen spamelni).

**A nyomozók eszközei (ellenjáték).**
- 🔎 **Szimat:** nyomozónként 1 db. *„Használt valaki képességet az elmúlt 30 mp-ben?"* → **igen / nem az egész szobának**, a használó nevének megnevezése nélkül.
- 🗳️ **Gyűlés:** nyomozónként 1 szavazás-kezdeményezés (játékonként összesen max. 2). 30 mp vita (chat), majd szavazás.
  - Ha a többség **a gyilkosra** szavaz: **leleplezve** — a képességei kikapcsolnak, a csapat +60 mp időt kap, a játék folytatódik (a gyilkos játszhat tovább, de lebukva).
  - Ha **ártatlanra**: ő 45 mp-re **néma** (nem rakhat, de chatelhet), a gyilkos hűtései pedig 20 mp-cel gyorsabban telnek.
- **Névtelen lerakások:** a Gyilkos módban a lerakás-pont **alapból nem látszik** (nem tudni, ki mit rakott), így a gyilkos észrevétlenül „elronthat" — a nyomozók a chatben és logikával derítik ki. Lobby-opció: *Névvel mutatott lerakások* (könnyebb).
- **Kurzorok:** látszanak — ez az okfejtés alapja (*„miért vitted el az én betűmet?"*).

**Győzelmi feltételek.**
- **Nyomozók teljes győzelme:** a csapat helyesen beküldi a megoldást, **és az Epilógus-szavazáson** (a megoldás után, 20 mp-ben) **kitalálják, ki volt a gyilkos**.
- **Döntetlen:** helyes megoldás, de az Epilógusban rossz játékost neveznek meg — a gyilkos „megúszta".
- **Gyilkos győzelme:** lejár az idő, vagy elfogy a három élet.
- A `runs.won` értéke teljes győzelemnél `true` a nyerő oldalnak, vereségnél `false`, döntetlennél `null`.

**Szerveroldali hitelesség (a csalás ellen).**
- **Szerep:** `room_roles` (RLS: csak a saját sor), a kiosztás a `start_room` Gyilkos-módú változatában történik (0003).
- **Képességek:** a gyilkos kliense nem „küld hatást", hanem a `use_ability(room, ability, payload)` szerverfüggvényt hívja. A szerver ellenőrzi: *a hívó a gyilkos-e, letelt-e a hűtés, elfogyott-e a korlát, érvényes-e a cél* — majd a **`realtime.send(...)`** függvénnyel a `room:<id>:fx` privát csatornára küldi a hatás-eseményt (típus, cél, időtartam, `serverTime`) — **a hívó azonosítója nélkül**. A kliensek ezen a csatornán csak **olvashatnak**, így a hálózati forgalomból sem fejthető vissza, ki a gyilkos.
- **Idő, szavazás, életek:** a szerver rögzíti és számolja; a kliensek csak megjelenítik.
- **Lerakások:** a közös csatornán mennek, bárki küldhet — ezért a gyilkos „hibás" lerakásai a normál játékmenet részei, nem csalás.

**Beállítások** (`rooms.settings`, a lobbyban állíthatók):

| Beállítás | Alapérték |
|---|---|
| `timeLimit` | nehézség szerint: 8 / 12 / 18 / 25 / 35 perc |
| `lives` | 3 |
| `killerCount` | 1 (6+ játékosnál 2 választható) |
| `abilities` | mind a három bekapcsolva |
| `cooldownScale` | 1,0 (0,5 = könnyebb nyomozóknak, 2,0 = nehezebb) |
| `showPlacers` | ki (névtelen lerakások) |
| `telltale` | ki (árulkodó jel) |
| `meetings` | 2 / játék |
| `sniffPerDetective` | 1 |

**Szélső esetek.**
- **2 játékos:** 1 gyilkos + 1 nyomozó — itt a gyilkos kiléte nyilvános, a mód „szabotőr-párbaj"; Gyűlés és Epilógus nincs.
- **A gyilkos lecsatlakozik** (60 mp-nél tovább): a játék folytatódik képességek nélkül, a gyilkos `won = null`.
- **Nyomozó lecsatlakozik:** a többségi szabályok az aktív játékosokra számítanak.
- **A host lecsatlakozik:** a szerep nem változik, a host-jog átszáll (22.1).
- **Chat:** mindenki számára nyilvános; a gyilkos nem kap privát csatornát.

**Későbbi képességek (ötletek).** *Arc-csere* (két karakterkártya portréja 5 mp-re felcserélődik) · *Köd* (egy helyiség 6 mp-re elhomályosul) · *Hamis kurzor* (a kurzorod egy másik játékos színében látszik 8 mp-ig) · *Zárolás* (egy cellát 10 mp-re zárol) · *Néma chat* (egy játékos üzenete 10 mp-ig nem jut el mindenkihez — csalásnak tűnhet, alaposan tesztelendő).

### 22.4 Statisztika és jutalom

- A profil mutatja: *co-op játékok*, *győzelmek gyilkosként*, *győzelmek nyomozóként* (a `profile_stats` nézetből, 18.5).
- Jelvény-ötletek: **Hibátlan gyilkos** (nyerj úgy, hogy egyszer sem lepleznek le) · **Éles szem** (azonosítsd a gyilkost az első Gyűlésen) · **Csapatjátékos** (10 Együtt-ügy) · **Árnyék** (5 győzelem gyilkosként).
- XP: az Együtt mód a sima XP +10%-át adja; a Gyilkos módban a győztes oldal duplát kap.

### 22.5 Moderáció és biztonság

- A chatben **Jelentés** és **Némítás** gomb van; a host **kidobhat** egy játékost a szobából.
- A Gyilkos módban a gyilkos azonosítója sosem kerül a közös csatornákra a játék végéig.
- A szobák néhány nap után törlődnek a chattel együtt (`cleanup_old_rooms`).
- A játék **16+** jelzésű (12.4); a chat-szűrő (csúnya szavak) későbbi bővítés.

---

## 23. Barátok, profil-keresés és játékon belüli chat

> A co-op módokhoz meg kell találni egymást: ehhez profil-keresés és barátlista kell. A **chat viszont csak a játékban** (szobában) létezik — nincs külön üzenetküldő, nincs globális chat.

### 23.1 Profil-keresés

- A **Barátok** oldalon (14.9) becenév-előtag szerint keresel: legalább 2 karakter, kis/nagybetű nélkül megkülönböztetve, legfeljebb 20 találat; a gépelés 300 ms-os késleltetéssel indítja a keresést.
- A találatnál **avatár, becenév és rang** látszik. Az e-mail-cím **soha** nem látszik senkinek.
- A becenév kereshetőségét a `profiles` olvasási szabálya adja (bejelentkezettek láthatják a profilneveket). Egy „Nem kereshető vagyok" kapcsoló és a másik profil előnézete (statisztikával) a **0003** migrációban jön (`public_profile(uuid)` függvény, `profiles.searchable`).

### 23.2 Barátok

- **Barátkérés:** `send_friend_request(user)`; ha a másik fél már kért minket, a kérés **automatikusan elfogadódik**. **Elfogadás / elutasítás:** `respond_friend_request(user, accept)` — csak a *címzett* teheti. **Törlés / visszavonás:** `remove_friend(user)`.
- A kérések a Realtime-on át **élőben** megérkeznek (értesítés a profil-chipen).
- **Online-állapot** (egyszerű változat, 0003): a belépett app percenként-kétpercenként frissít egy `last_seen` mezőt; a barát „online", ha ez 3 percnél frissebb. A *Láthatatlan mód* kikapcsolja a frissítést. (Globális Presence-csatornát szándékosan nem használunk: az mindenkinek megmutatná, ki van fent.)
- Korlát: legfeljebb 100 barát.
- *Később:* tiltás (blokkolás) és barát-ajánló.

### 23.3 Meghívás és csatlakozás

- A lobbyban a **„+ Barát meghívása"** a barátlistából választ (`invite_friend` — csak elfogadott barátot lehet meghívni, és csak szoba-tag hívhat).
- A meghívott a Realtime-on át értesítést kap: *„Anna meghívott: Együtt — Éjféli Mise [Csatlakozás]"*. Az elutasítás törli a meghívót.
- Meghívás nélkül is belép bárki a **kóddal** (`join_room`) — de csak **lobby** állapotú, nem teli szobába; elindult játékba nem lehet belépni.

### 23.4 Chat (csak a játékban)

- A chat a **szobához tartozik**: amíg a szoba él, a tagok látják, utána nem. Nincs privát üzenet, nincs globális chat.
- **Küldés = a `room_messages` táblába írás** (legfeljebb 300 karakter); a többi tag a Realtime `postgres_changes`-en át kapja meg, ezért az RLS vele együtt érvényes: csak a szoba tagja olvashatja és írhatja.
- A chat a szobával együtt törlődik (`on delete cascade`, régi szobák takarítása — 18.6).
- A kliens **sebesség-korlát**: legfeljebb 1 üzenet 0,7 mp-enként; a szerveroldali korlát később jön.
- **Jelentés / Némítás** gomb minden üzenetnél (22.5). A némítás helyi (a jelentés tárolása a 0003-ban).
- Rendszerüzenetek: belépés, kilépés, áthelyezés (opcionális), életvesztés, Gyűlés.

### 23.5 Realtime — technikai terv

| Csatorna / forrás | Mire | Ki írhat | Ki olvashat |
|---|---|---|---|
| `postgres_changes`: `rooms`, `room_members`, `room_messages`, `room_invites`, `friendships` | lobby-állapot, chat, meghívók, barátkérések | függvényeken át / a chatre a tagok | csak akinek az RLS engedi |
| Broadcast `room:<id>` (privát) | játék-műveletek, kurzorok, ping | a szoba tagjai | a szoba tagjai |
| Broadcast `room:<id>:fx` (privát) | a gyilkos hatás-eseményei | **csak a szerver** (`realtime.send`) | a szoba tagjai |

A privát csatornák jogosultságát a `realtime.messages` táblán RLS adja (**0003 terv** — a 0003 megírásakor a Supabase aktuális dokumentációja szerint ellenőrizendő):

```sql
-- csak a szoba tagjai olvashatnak a room:<uuid> és room:<uuid>:fx csatornákon
create policy "room channels: members read" on realtime.messages
  for select to authenticated
  using (
    case when (select realtime.topic()) ~ '^room:[0-9a-f-]{36}(:fx)?$'
         then public.is_room_member(split_part((select realtime.topic()), ':', 2)::uuid)
         else false end
  );

-- írni csak az alap csatornára (az :fx csatornára csak a szerver ír)
create policy "room channels: members write" on realtime.messages
  for insert to authenticated
  with check (
    case when (select realtime.topic()) ~ '^room:[0-9a-f-]{36}$'
         then public.is_room_member(split_part((select realtime.topic()), ':', 2)::uuid)
         else false end
  );
```

A kliens a csatornát `supabase.channel('room:<id>', { config: { private: true } })` módon nyitja. **Limitek:** az ingyenes csomag Realtime-keretei (egyidejű kapcsolatok, üzenet/mp) korlátosak — a „Realtime limits" oldal szerint kell méretezni; kis játékosszámra elég, nagyobb forgalomnál a Pro csomag kell.

---

## 24. Kiadás és üzemeltetés: GitHub, Vercel, keep-alive

> A projekt GitHubra kerül, a `web/` mappa pedig a Vercelre — ott fut a **napi keep-alive**, ami megakadályozza, hogy az ingyenes Supabase-projekt egy hét inaktivitás után szüneteljen.

### 24.1 Repó-szerkezet és mi kerülhet GitHubra

```
HorrorDoku/
├─ NIGHTDOKU_jatekterv.md
├─ .gitignore                 # a titkokat, a memory/ mappát, a build-kimeneteket kizárja
├─ .env.example               # a környezeti változók MINTÁJA (értékek nélkül) — ez mehet a repóba
├─ .env                       # a valódi értékek — NINCS a gitben
├─ supabase/migrations/       # 0001_init.sql, 0002_social.sql, … (a séma forrása)
├─ web/                       # a Vercel-projekt gyökere
│  ├─ api/keepalive.js        # napi keep-alive függvény
│  ├─ public/index.html       # letöltőoldal (egyelőre helyőrző)
│  └─ vercel.json             # a napi cron
└─ (később) electron/, src/, puzzles/, assets/ …   # a játék (16.4)
```

- **Repóba mehet:** a migrációk, a `web/` mappa, a `.env.example`, a játék forráskódja. A Project URL és a **publishable key publikus** érték, de a `.env`-be tesszük, hogy a repó cserélhető kulccsal is működjön.
- **Soha nem mehet a repóba:** `.env`, a secret / `service_role` kulcs, az adatbázis-jelszó, a `CRON_SECRET`, a `memory/` mappa (játékos-adatok).
- **A pálya-JSON-ok a megoldásokat is tartalmazzák.** Nyilvános repóban ezek spoilerek: tartsd a repót **privátban**, vagy a `puzzles/` mappát külön privát repóban / a Supabase `puzzles` táblájában.

### 24.2 A Vercel-projekt

1. Vercel → **Add New → Project** → importáld a GitHub-repót.
2. **Root Directory:** `web`; **Framework Preset:** *Other*.
3. **Environment Variables** (Production): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CRON_SECRET` (hosszú, véletlen szöveg — pl. `openssl rand -hex 32`).
4. **Deploy.** A `vercel.json` cronja ezután megjelenik a *Settings → Cron Jobs* alatt.
5. **Kipróbálás:** a Cron Jobs oldalon *Run*, vagy a CLI-ből `vercel crons run /api/keepalive`. Siker esetén a Vercel naplóban `{"ok":true,"ping":{…}}` látszik.

### 24.3 A keep-alive működése

- A `web/vercel.json` naponta egyszer (`17 6 * * *`, vagyis **06:17 UTC**) hívja az `/api/keepalive` végpontot. A Vercel a `CRON_SECRET`-et automatikusan `Authorization: Bearer …` fejlécként küldi, a függvény pedig mindenki mást **401-gyel** elutasít.
- A függvény a Supabase `rpc/ping` végpontját hívja a **publishable key**-jel (csak `apikey` fejlécben). A `public.ping()` egy valódi táblát olvas (`puzzles`), így a hívás tényleges adatbázis-aktivitás.
- **Hibakezelés:** ha a Supabase nem 2xx-et ad, a függvény **502-t** ad vissza, így a Vercel naplóban és a cron-előzményekben látszik a hiba. Ellenőrizd időnként a Vercel *Logs / Cron Jobs* oldalát.
- A Vercel **Hobby** csomagján a cron legfeljebb **naponta egyszer** futhat, és a futás időpontja a megadott órán belül tolódhat — a napi ping pontosan erre elég (a Supabase szerint *„néhány kérés naponta"* elegendő).
- **Hobby = nem kereskedelmi:** a Vercel Hobby csomag személyes, nem kereskedelmi használatra való. Ha a játék később bevételt hoz, ezt át kell gondolni (Pro csomag, vagy a keep-alive áthelyezése).
- **Tartalék:** egy ütemezett GitHub Actions workflow is küldhet pinget; de a GitHub a nyilvános repók ütemezett futásait 60 nap inaktivitás után leállítja, ezért a Vercel-cron az elsődleges.

### 24.4 A játék kiadása

- **Build:** az Electron-csomag (portable `.exe` + zip) a `release/` mappába kerül (a `.gitignore` kizárja), a nyilvános letöltés a **GitHub Releases**-ről megy. A `web/public/index.html` letöltőoldal erre mutat.
- A `memory` mappa **a letöltött mappában** jön létre (17. fejezet); portable `.exe`-nél a `PORTABLE_EXECUTABLE_DIR` a kiindulópont.
- **Aláíratlan `.exe`:** a Windows SmartScreen az első indításkor „ismeretlen kiadó" figyelmeztetést mutat. Kódaláírás-tanúsítvány költséges, ezért az első verzióban ezt vállaljuk, és a letöltőoldalon jelezzük.
- **Frissítés:** egyelőre kézi (új kiadás letöltése); az automatikus frissítés (`electron-updater`, GitHub Releases) később jön. Az új pályák ettől függetlenül a Supabase-ből érkeznek.

### 24.5 Migrációk kezelése

- Most: a fájlok tartalmát a Supabase **SQL Editor**ába kell beilleszteni (18.7).
- Később: a `supabase` CLI-vel (`supabase db push`). A CLI-nek az **adatbázis-jelszó** és a hozzáférési token kell — ezek **csak a saját gépeden** legyenek, soha ne a repóban.
- Alkalmazott migrációt nem szerkesztünk: változtatás = új fájl.

### 24.6 Ellenőrzőlista az első `git push` előtt

- [ ] `git status` nem mutatja a `.env` fájlt (a `.gitignore` kizárja).
- [ ] Nincs a kódban a secret / `service_role` kulcs, adatbázis-jelszó, connection string.
- [ ] A `.env.example` csak helyőrzőket tartalmaz.
- [ ] A repó **privát**, vagy a pálya-megoldások nincsenek benne (24.1).
- [ ] A Vercelen a `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` és `CRON_SECRET` be van állítva, a Root Directory `web`.
- [ ] A 0001 és 0002 migráció le van futtatva a **HorrorDoku** projekten (18.7), és a `ping` válaszol.

---

## 25. Ütemterv (roadmap)

| Fázis | Időtartam | Tartalom |
|---|---|---|
| **0. Prototípus** | 2 hét | Electron-ablak (saját, önálló ablak), 6×6 rács, lerakás, X-elés, nyomok, beküldés, 1 pálya (Éjféli Mise); `memory` mappa (settings, progress, session) |
| **1. Alfa** | +4 hét | A 10 Klasszikus pálya, bemutató, Erő-szabályok, megoldó/ellenőrző, alap hangok; **seedelt generátor v1 + Random mód egyjátékosban** (helyi mentés és **folytatás**) |
| **2. Béta** | +4 hét | **Supabase-fiók (e-mail + jelszó), profil oldal, felhős szinkron, a Random folytatása a felhőből** (0001), jumpscare-rendszer + beállítások, rétegzett zene, az Esemény mód első 4 világa; **Vercel keep-alive üzemben** |
| **3. Co-op: Együtt** | +4 hét | Barátok, profil-keresés, meghívások, lobby, szobán belüli chat (0002); az **Együtt** mód közös táblával |
| **4. Co-op: Gyilkos** | +3 hét | Titkos szerepek, a három képesség, Gyűlés / Szimat / Epilógus, szerveroldali hitelesítés (0003), egyensúly-tesztek |
| **5. 1.0 kiadás** | +4 hét | Mind a 10 Esemény-pálya, napi ügy + ranglista, bestiárium, **portable / zip build GitHub Releases-en + letöltőoldal** |
| **6. Bővítések** | folyamatos | Pályaszerkesztő, párbaj, szezonális kihívások, filmes világok, automatikus frissítés, mobil app, ranglista-ellenőrzés (edge function) |

---

> *„A halottak nem hazudnak, nyomozó. Csak nem mondanak el mindent."*
> — Silas Grey, a Tizenharmadik Lakó

🩸 **NIGHTDOKU** — *Vége? Soha.*
