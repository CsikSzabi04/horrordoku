# Franchise-csere és jogi óvintézkedések (NIGHTDOKU)

Ez a dokumentum rögzíti, mi lett a játékban a franchise-ok (filmek, játékok, sorozatok, könyvek) neveiből és karaktereiből. A kiadás előtt így lehet ellenőrizni, hogy nincs-e maradék.

**Alapelv:** a játék sem név, sem karakter, sem helyszín, sem szöveg szintjén nem utal valódi franchise-ra. A szabály-mechanikák (nyomfajták, rácsos logika, „ki hol állt") szabadon használhatók, mert ötlet, nem védett kifejezés. A kitalált nevek mind eredetiek.

**Nem jogi tanács.** Ez munkadokumentum. A kiadás előtt magyar szerzői jogi / védjegyes ügyvédnek érdemes átnézni.

---

## 1. Világok (Esemény-mód, 19 világ)

A világ azonosítója (a `puzzles/event/*.json` fájlnevében és a `world` mezőben) is megváltozott.

| Régi azonosító | Új azonosító | Eredeti (franchise) | Új cím (játékban) | Új forrás-felirat |
|---|---|---|---|---|
| `fnaf` | `night-pizzeria` | Five Nights at Freddy's | Mackó Pizzéria | Éjszakai Pizzéria |
| `poppy-playtime` | `toy-factory` | Poppy Playtime | Játékgyár Rt. | Játékgyár |
| `resident-evil` | `city-police` | Resident Evil | Vörös Város Rendőrkapitányság | Vörös Város |
| `alien-isolation` | `space-station` | Alien: Isolation | Zarya állomás | Zarya-állomás |
| `until-dawn` | `mountain-cabin` | Until Dawn | Feketefa-hegy | Feketefa |
| `dead-space` | `deep-ship` | Dead Space | Vesta űrhajó | Vesta |
| `outlast` | `summit-shelter` | Outlast | Sziklatető Menedékház | Sziklatető |
| `silent-hill` | `fog-town` | Silent Hill | A Köd Városa | A Köd Városa |
| `dead-by-daylight` | `entity-realm` | Dead by Daylight | A Sötét Kapu birodalma | A Sötét Kapu |
| `alan-wake` | `lake-town` | Alan Wake | Fényhegy | Fényhegy |
| `stranger-things` | `sunshine-mall` | Stranger Things | Napfény Bevásárlóközpont | Napfény Bevásárlóközpont |
| `game-of-thrones` | `frost-keep` | Game of Thrones | Hóerőd | Hóerőd |
| `rick-and-morty` | `portal-garage` | Rick and Morty | A Kovács-ház garázsa | Portál-garázs |
| `vampire-diaries` | `moon-town` | The Vampire Diaries | Holdvölgy | Holdvölgy |
| `adventure-time` | `candy-land` | Kalandra fel! (Adventure Time) | Mesevilág | Mesevilág |
| `twilight` | `rain-forest` | Alkonyat (Twilight) | Esőerdő-város | Esőerdő-város |
| `walking-dead` | `walled-town` | The Walking Dead | Sáncváros | Sáncváros |
| `last-of-us` | `spore-zone` | The Last of Us | Karantén-zóna | Karantén-zóna |
| `harry-potter` | `wizard-school` | Harry Potter | Varázs-akadémia | Varázsiskola |

A `hollowmere` (NIGHTDOKU saját világa) változatlan.

---

## 2. Szereplők

> **Frissítés (2026-10-27):** a megjelenített szereplő-nevek a **9. fejezet** szerint változtak (felismerhető, enyhén módosított nevek). Az alábbi táblázat az előző, teljesen eredeti névkészletet rögzíti.

A szereplő-azonosító (`id`) a névből (slug) készül, ezért változott a `looks.ts` kulcsa is. A figura-kulcsok (a rajzoló belső azonosítói, pl. `brumi`, `lidero`) szintén átneveződtek.

### Éjszakai Pizzéria (`night-pizzeria`)
| Eredeti | Új |
|---|---|
| Freddy | Brumi (figura) |
| Bonnie | Nyuszi (figura) |
| Chica | Csibi (figura) |
| Foxy | Rókó (figura) |
| Golden Freddy | Arany Brumi (figura) |
| A Marionett | A Bábu (figura) |
| Mike Schmidt | Kiss Márton |
| William Afton (áldozat) | Varga Ferenc |

### Játékgyár (`toy-factory`)
| Eredeti | Új |
|---|---|
| Kissy Missy | Csókos Mici (figura) |
| Mommy Long Legs | Hosszúlábú Anyu (figura) |
| Bunzo Bunny | Dobos Nyuszi (figura) |
| PJ Pug-a-Pillar | Pöttyös Hernyó (figura) |
| CatNap | Macskanap (figura) |
| DogDay | Kutyanap (figura) |
| Poppy | Bábika Rózsi |
| Huggy Wuggy (áldozat) | Ölelő Lény (figura) |

### Vörös Város (`city-police`)
| Eredeti | Új |
|---|---|
| Leon S. Kennedy | Lázár Leó |
| Claire Redfield | Hegedűs Klára |
| Ada Wong | Lin Adél |
| Sherry Birkin | Bíró Csenge |
| Annette Birkin | Bíró Anett |
| Marvin Branagh | Bodor Marcell |
| Brian Irons | Bánfi Brúnó |
| Mr. X (áldozat) | A Sötét Úr (figura) |

### Zarya állomás (`space-station`)
| Eredeti | Új |
|---|---|
| Amanda Ripley | Antal Anita |
| Nina Taylor | Tóth Nóra |
| Marlow | Mészáros |
| Waits | Veres |
| Axel | Ákos |
| Ricardo | Rókus |
| Samuels | Sós |
| A Xenomorph (áldozat) | Az Űrlény (figura) |

### Feketefa-hegy (`mountain-cabin`)
| Eredeti | Új |
|---|---|
| Sam | Dani |
| Mike | Mihály |
| Jessica | Júlia |
| Emily | Emese |
| Matt | Máté |
| Ashley | Ágnes |
| Chris | Krisztián |
| Josh | Gergő |
| A Wendigo (áldozat) | A Hegyi Szellem (figura) |

### Vesta űrhajó (`deep-ship`)
| Eredeti | Új |
|---|---|
| Isaac Clarke | Ivan Kovács |
| Kendra Daniels | Kinga Dezső |
| Zach Hammond | Zoltán Hamar |
| Terrence Kyne | Tibor Kún |
| Nicole Brennan | Nikolett Berán |
| Hans Tiedemann | Hubert Tamás |
| Challus Mercer | Csaba Mester |
| Ellie Langford | Eszter Lakatos |
| Benjamin Mathius | Bence Marton |
| A Hunter (áldozat) | A Vadász (figura) |

### Sziklatető (`summit-shelter`)
| Eredeti | Új |
|---|---|
| Miles Upshur | Milán Ungvári |
| Waylon Park | Vajk Pál |
| Richard Trager | Rudolf Tarnai |
| Father Martin | Atya Márton |
| Dr. Wernicke | Dr. Vargha |
| Jeremy Blaire | Jenő Balogh |
| Eddie Gluskin | Elemér Gulyás |
| Chris Walker (áldozat) | Kristóf Vadas |

### A Köd Városa (`fog-town`)
| Eredeti | Új |
|---|---|
| James Sunderland | Sándor Szeles |
| Maria | Marianna |
| Angela Orosco | Anna Oroszi |
| Laura | Lujza |
| Mary | Mara |
| Eddie Dombrowski | Ede Dombi |
| A Buborékfejű Ápolónő | A Lámpásfejű Ápolónő (figura) |
| Pyramid Head (áldozat) | A Piramisfejű (figura) |
| A Hazug Alak | változatlan (saját név) |

### A Sötét Kapu birodalma (`entity-realm`)
| Eredeti | Új |
|---|---|
| Dwight Fairfield | Dénes Fehér |
| Meg Thomas | Margó Tamás |
| Claudette Morel | Klaudia Morvai |
| Jake Park | Jakab Pál |
| Nea Karlsson | Nelli Károlyi |
| Feng Min | Hung Mihál |
| David King | Dávid Király |
| Quentin Smith | Kálmán Szűts |
| A Trapper (áldozat) | A Csapdás (figura) |

### Fényhegy (`lake-town`)
| Eredeti | Új |
|---|---|
| Alan Wake | Attila Vágó |
| Alice Wake | Ilona Vágó |
| Barry Wheeler | Barna Vincze |
| Sarah Breaker | Sára Törő |
| Rose Marigold | Rózsa Csíkos |
| Thomas Zane | Tamás Zsolnai |
| Odin Anderson | Ödön Andrásfi |
| Tor Anderson | Tibor Andrásfi |
| Cynthia Weaver | Cintia Szövő |
| Pat Maine | Patrik Mészár |
| Dr. Emil Hartman (áldozat) | Dr. Emil Hofer |

### Napfény Bevásárlóközpont (`sunshine-mall`)
| Eredeti | Új |
|---|---|
| Eleven | Nyolc |
| Mike Wheeler | Mátyás Pálfi |
| Dustin Henderson | Dezső Hunyadi |
| Lucas Sinclair | Lóránt Sárkány |
| Will Byers | Vilmos Bálint |
| Max Mayfield | Mariann Majer |
| Steve Harrington | István Halász |
| Robin Buckley | Rita Berki |
| Jim Hopper | Jenő Kertész |
| Erica Sinclair | Erika Sárosi |
| Vecna (áldozat) | A Lidérc (figura) |

### Hóerőd (`frost-keep`)
| Eredeti | Új |
|---|---|
| Jon Snow | Jon Hóvári |
| Daenerys Targaryen | Dalma Tűzi |
| Tyrion Lannister | Tamás Rendes |
| Arya Stark | Aliz Szürke |
| Sansa Stark | Sarolta Hideg |
| Cersei Lannister | Cecília Aranyi |
| Jaime Lannister | Jenő Aranykéz |
| Bran Stark | Bálint Fagyos |
| Samwell Tarly | Samu Tarlós |
| Az Éjkirály (áldozat) | A Fagykirály (figura) |

### Portál-garázs (`portal-garage`)
| Eredeti | Új |
|---|---|
| Rick Sanchez | Rikárd Sánta |
| Morty Smith | Murci Szmit |
| Summer Smith | Zsanett Szmit |
| Beth Smith | Bea Szmit |
| Jerry Smith | Jerzsi Szmit |
| Birdperson | A Madárember (figura) |
| Squanchy | Csippentő (figura) |
| Mr. Poopybutthole | Mr. Fenékcsomó (figura) |
| Evil Morty | Gonosz Murci |
| Mr. Meeseeks (áldozat) | Mr. Kérek (figura) |

### Holdvölgy (`moon-town`)
| Eredeti | Új |
|---|---|
| Elena Gilbert | Ella Gyöngyösi |
| Stefan Salvatore | Szabolcs Sárvári |
| Damon Salvatore | Dániel Sárvári |
| Bonnie Bennett | Bogi Bertalan |
| Caroline Forbes | Karola Fábián |
| Matt Donovan | Márk Dénes |
| Jeremy Gilbert | Jeromos Gyöngyösi |
| Alaric Saltzman | Alfréd Sós |
| Tyler Lockwood | Tamás Lukács |
| Katherine Pierce (áldozat) | Kata Pásztor |

### Mesevilág (`candy-land`)
| Eredeti | Új |
|---|---|
| Finn | Fin |
| Jake | Dzsaki |
| Rágógumi hercegnő | Szaloncukor hercegnő |
| Marceline | Marcella |
| Jégkirály | Hókirály |
| BMO | Bimbó (figura) |
| Lumpy hercegnő | Göcsörtös hercegnő |
| A Lich (áldozat) | változatlan (fantasy-fogalom) |

### Esőerdő-város (`rain-forest`)
| Eredeti | Új |
|---|---|
| Bella Swan | Bella Lenkei |
| Edward Cullen | Ede Kollár |
| Jacob Black | Jákob Fekete |
| Alice Cullen | Alíz Kollár |
| Carlisle Cullen | Károly Kollár |
| Charlie Swan | Péter Lenkei |
| Rosalie Hale | Rozália Hajdú |
| Jasper Hale | Jónás Hajdú |
| James (áldozat) | Gábor Sas |

### Sáncváros (`walled-town`)
| Eredeti | Új |
|---|---|
| Rick Grimes | Rudi Görbe |
| Michonne | Mihaela Szép |
| Daryl Dixon | Dénes Deák |
| Carol Peletier | Kamilla Pelle |
| Glenn Rhee | Gyula Réti |
| Maggie Greene | Magdolna Zöld |
| Negan | Nemes Noel |
| Carl Grimes | Kornél Görbe |
| A Kormányzó (áldozat) | A Főnök |

### Karantén-zóna (`spore-zone`)
| Eredeti | Új |
|---|---|
| Joel Miller | József Müller |
| Ellie Williams | Ella Szűcs |
| Tess | Tesza |
| Tommy Miller | Tomi Müller |
| Marlene | Marcsi Makai |
| Bill | Béla |
| Henry | Hektor |
| Sam (TLoU) | Szabi |
| Riley | Renáta |
| Abby Anderson | Abigél Andrásy |
| A Clicker (áldozat) | A Kattogó (figura) |

### Varázs-akadémia (`wizard-school`)
| Eredeti | Új |
|---|---|
| Harry Potter | Hugó Pákozdi |
| Hermione Granger | Hermina Gazdag |
| Ron Weasley | Rémi Vasvári |
| Albus Dumbledore | Albert Dombó |
| Perselus Piton | Perec Pitvar |
| Hagrid | Gyuri Bozontos |
| Draco Malfoy | Dorián Galambos |
| Neville Longbottom | Nándor Hosszúszár |
| Luna Lovegood | Lujza Szerelmes |
| Ginny Weasley | Gina Vasvári |
| Minerva McGonagall | Minerva Kopjás |
| Voldemort nagyúr (áldozat) | A Névtelen Úr (figura) |

---

## 3. Helyiségek

| Eredeti | Új | Világ |
|---|---|---|
| Pirate Cove | Kalóz-öböl | Éjszakai Pizzéria |
| Scoops Ahoy | Fagylaltozó | Napfény Bevásárlóközpont |
| Food court | Étterem-udvar | Napfény Bevásárlóközpont |
| Morty szobája | Murci szobája | Portál-garázs |
| Citadella | Erőd-város | Portál-garázs |
| Mystic Grill | Holdi Kocsma | Holdvölgy |
| Salvatore-kúria | Sárvári-kúria | Holdvölgy |
| Gilbert-ház | Gyöngyösi-ház | Holdvölgy |
| Wickery-híd | Fűzfa-híd | Holdvölgy |
| Lockwood-kúria | Lukács-kúria | Holdvölgy |
| Cukorka Királyság | Cukorbirodalom | Mesevilág |
| Jég Királyság | Jégbirodalom | Mesevilág |
| Tűz Királyság | Tűzbirodalom | Mesevilág |
| Cullen-ház | Kollár-ház | Esőerdő-város |
| Forks Gimnázium | Esőerdő Gimnázium | Esőerdő-város |
| La Push part | Csendes-part | Esőerdő-város |
| Swan-ház | Lenkei-ház | Esőerdő-város |
| Forks kórház | Esőerdő kórház | Esőerdő-város |
| Volturi-torony | Vérkő-torony | Esőerdő-város |
| Börtön-cellablokk | Fogda-blokk | Sáncváros |
| Alexandria főtér | Sáncváros főtere | Sáncváros |
| Hilltop | Dombtető | Sáncváros |
| Pittsburgh | Dunaváros | Karantén-zóna |
| Tommy gátja | Zsilip-gát | Karantén-zóna |
| Jackson | Tetőtelep | Karantén-zóna |
| Griffendél-torony | Oroszlán-torony | Varázs-akadémia |
| Bájitaltan terem | Főzőterem | Varázs-akadémia |
| Tiltott Rengeteg | Tiltott Erdő | Varázs-akadémia |
| Roxfort kapuja | Akadémia kapuja | Varázs-akadémia |
| Hagrid kunyhója | Gyuri kunyhója | Varázs-akadémia |
| Szükség Szobája | Kívánság Terme | Varázs-akadémia |
| Kviddics-pálya | Repülő-pálya | Varázs-akadémia |
| Isteni liget | Szent liget | Hóerőd |
| A Falon túl | A Gáton túl | Hóerőd |
| Kampó-pince | Horgos-pince | A Sötét Kapu birodalma |
| Zane kunyhója | Zsolnai kunyhója | Fényhegy |
| Cauldron-tó (leírásban) | Fazék-tó | Fényhegy |

---

## 4. Szövegek, szabálynevek, címek

| Eredeti | Új |
|---|---|
| Fejjel lefelé világ / Fordított Világ | Árnyoldal |
| Starcourt, július 4. | Napfény, július 4. |
| Tekergők Térképe | Kalandozók Térképe |
| Squanch! (cím) | Csattanó! |
| Lumpy, Lumpy! (cím) | Göcsörtös, göcsörtös! |
| Kalandra fel! / Alkonyat / The … (forrás-feliratok) | lásd a 1. és 2. táblázatot |
| Ooo Földje | Mesevilág |
| Winterfell | Hóerőd |
| Roxfort | Varázs-akadémia / az Akadémia |
| Bright Falls | Fényhegy |
| Mount Massive | Sziklatető |
| Blackwood-hegy | Feketefa-hegy |
| USG Ishimura | Vesta űrhajó |
| Sevastopol | Zarya állomás |
| Alexandria | Sáncváros |
| Forks | Esőerdő-város |
| BMO (tárgy) | játékkonzol (a `bmo` tárgykulcs belső név, a játékban nem látszik) |
| vastrón (tárgy) | trón (a `throne` kulcs belső név) |

---

## 4b. Angol nyelv

Az angol nevek, történetek és szótár eredeti, kitalált tartalom (`src/content/en.ts`, `src/engine/vocab.en.ts`). Sem a franchise-nevek, sem azok hangzás szerinti másolatai nem szerepelhetnek benne; ezt a `src/content/en.test.ts` tiltólistája ellenőrzi. Az angol szobanevek is kerülik a franchise-ra utaló kifejezéseket (pl. Buccaneer Bay, Forbidden Woods, Grand Hall, Hall of Wishes, Beyond the Barrier).

---

## 5. Kinézet: hasonlóság és a megkülönböztetés

A rajzolt portrék (`src/content/looks.ts`, `src/components/EventPortrait.tsx`) eredeti, stilizált figurák. Mégis: ha egy figura jellegzetes jegye (kalap, szemüveg, villám-heg, bajusz, haj- vagy ruhaszín) egy franchise-karakteréhez köthető, azt le kell venni. Ez a kiadás előtti kör eredménye.

**Már megtett módosítások (`looks.ts`):**

| Karakter (új név) | Régi jegy, ami elkerült | Új megjelenés |
|---|---|---|
| Nyolc | rózsaszín ruha (a fő jegy) | barna bob-frizura, zöld-szürke kapucnis pulóver |
| Dezső Hunyadi | zöld sapka (fő jegy) | barna kötött sapka |
| Lóránt Sárkány | piros kendő | kék fejpánt |
| Mariann Majer | (megtartva) vörös haj | vörös haj, kék póló, szemüveg nélkül |
| Jenő Kertész | bajusz, narancs póló | borosta, kék dzseki, fekete sapka |
| Hugó Pákozdi | szemüveg, villám-heg | rövid haj, piros dzseki, kötött sapka |
| Gina Vasvári | vörös haj | barna haj |
| Rikárd Sánta | kék haj, labor-köpeny | szürke haj, mellény |
| Murci Szmit | sárga póló | kék-szürke póló |
| Gonosz Murci | sárga póló, szemkötő | fekete póló |
| Jon Hóvári | göndör haj, fekete dzseki | rövid haj, szürke dzseki |
| Dalma Tűzi | ezüst haj | réz-vörös haj |
| Rudi Görbe | sheriff-kalap (fedora) | kötött sapka |
| Nemes Noel | vörös csík a dzsekin | szürke csík |

**Figura-rajzok (kész):** mind a 36 figura (medve, nyúl, csirke, róka, Piramisfejű, Lidérc, Kattogó stb.) eredeti rajzot kapott: más színvilág, más kiegészítők, a jellegzetes sziluettek (piramis-sisak, megnyúlt fej, konzol-test) megváltoztatva. A belső azonosítók (`brumi`, `lidero` stb.) megmaradtak.

**Még ellenőrizendő:** néhány figura **magyar neve** szó szerinti fordítás maradt (Hosszúlábú Anyu, Kutyanap, Macskanap, Csókos Mici, Ölelő Lény, A Kattogó, A Piramisfejű). Ezek átnevezése pályatartalom-változás (újragenerálás kell), a kiadás előtt érdemes megtenni. A Hókirály, Albert Dombó, Szaloncukor hercegnő, Marcella és A Főnök portréját a jellegzetes jegyek (kék bőr + korona, varázslósapka + szemüveg, rózsaszín bőr, szemkötő) levételével átállítottam.

---

## 6. Klasszikus mód: mit kerüljünk, és hogyan

A Klasszikus módot a murdoku.com-hoz hasonlóan készítettük. Ezen a szinten nem a mechanika a probléma (a rácsos, ki-hol-állt logika nem védett), hanem a **név, a szöveg és a kinézet**.

**Kerülendő (és már kikerült):**

| Elem | Hol volt | Mit tettünk |
|---|---|---|
| A „Murdoku" név a játékban | menü-felirat, Klasszikus leírás | átírva („hétköznapi ügyek", „logikai gyilkossági rejtvény") |
| A „murdoku.com" említése | README, kommentek | a README-ben eltávolítva, a kommentek belsőek |
| A „Murdoku" név a kódban (`murdoku: true`, `MURDOKU_KINDS`) | belső azonosító, nem látszik | **nyitott**: a kiadás előtt átnevezendő |
| Az eredeti oldal elrendezése | 3 oszlop, jobbra az eszközök, a sorrend | módosítva: idő/nyelv/sötét mód a ✕ fölött, sorrend és gombok újrarendezve, nincs kérdőjel, megosztás és mentés gomb |
| Lapos, arc nélküli portrék | `Portrait.tsx` (a komment a murdoku.com-ra hivatkozik) | **nyitott**: a stílus eltér kell hogy legyen (saját arcforma / saját palettát) |

**Ami nem kerülendő:**

- Logikai rács, sudoku-szerű szabályok, nyomfajták: ötlet, nem védett.
- Hétköznapi nevek és helyszínek: szabad (a név nem védhető).

**Ami tilos, ha a kiadás előtt is megmarad:**

- A murdoku.com szövegeinek, pályáinak, képeinek, kódjának átvétele. Ezt nem ellenőriztem összehasonlítással, érdemes a kiadás előtt megtenni.
- A „Murdoku" név bármilyen formában a bolti leírásban vagy a címben (márka-kockázat).

---

## 7. Mi nincs még kész / ellenőrizendő

- [x] Figura-rajzok átrajzolása (lásd 5. fejezet)
- [ ] Belső `murdoku` azonosítók átnevezése (`generator.ts`, `puzzle.ts`, `classic.css`) — nem látszanak, de a kódban vannak
- [ ] Portrék stílusának eltérítése a murdoku.com-tól
- [ ] Védjegy-keresés a NIGHTDOKU névre (SZTNH és EUIPO) kiadás előtt
- [ ] Magyar szerzői jogi ügyvéd átnézése a végleges tartalomra
- [x] `hu.test.ts` névragozási példák: kicserélve; a motor a toldalékot mostantól a név utolsó szavára teszi (magyar névsorrend), ezért az eseménypályák nyomszövegei újragenerálva
- [ ] Döntés: felismerhető, hasonló hangzású nevek (lásd 8. fejezet)

---

## 8. Nyitott döntés: „felismerhető" nevek

A kérés: a nevek legyenek hasonló hangzásúak, hogy a rajongó felismerje (pl. Steve Harrington → „Steven Hair", Max Mayfield → „Maxim Haeyfield"). **Ez még nincs megcsinálva**, mert a jogi kockázat ellentétes irányba mutat:

- A szerzői jog a karaktert védi, nemcsak a nevét. Ha a név és a kinézet **szándékosan** az eredetire emlékeztet, az a „vékonyan álcázott másolat" tipikus esete.
- A védjegyjog az **összetéveszthetően hasonló** jelzést is védi (Steven Hair ~ Steve Harrington), és a hasonlóság szándéka súlyosbító körülmény.
- Fizetős termékben, bolti felületen (Steam, itch) a jogtulajdonosok (pl. Netflix) automatizált bejelentéssel kérhetik a levételt.

Jelenleg minden név teljesen eredeti, a kinézeten csak a gyenge utalás (pl. vörös haj) maradt meg. Ha mégis a hasonló nevek mellett döntesz, egy magyar szerzői jogi ügyvéd mondja ki előbb, hogy melyik még elég távoli.

---

## 9. Világnevek (felhasználói döntés)

Az Esemény-világok játék- és helynevei a felhasználó táblázata szerintiek: a játék neve mindkét nyelven azonos (pl. Five Evenings at Teddy's, Henry LightningScar), a helynév nyelvenként más (Frosthold / Frosthold Vár). Ezek szándékosan az eredetiekre rájátszó nevek, ezért a 8. fejezet kockázata érvényes: kiadás előtt jogi átnézés kell. Az adat: `src/game/worlds.ts` (magyar), `src/content/en.ts` `EN_WORLDS` (angol), `src/content/events.ts` (forrás-felirat).

---

## 10. Karakter-kinézet (felhasználói döntés, frissítve)

A karakterek (emberek és lények) az eredetihez hasonlóan **felismerhetők**, csak finoman eltérnek: ugyanaz a színárnyalat (kicsit sötétebb vagy világosabb) és egy kiegészítő (sál, sapka, szemüveg, kendő, jelvény). A 5. fejezet „teljesen eredeti újrarajzolás" megközelítését ez váltja fel. Ez szándékosan közel marad az eredetihez, ezért a 8. fejezet kockázata érvényes. A lények rajza: `src/components/EventPortrait.tsx`, az emberek: `src/content/looks.ts` (új mező: `scarf`).

---

## 11. Szereplő-nevek cseréje: felismerhető, enyhén módosított nevek (felhasználói döntés, 2026-10-27)

**Döntés:** a 8. fejezet nyitott kérdésére a felhasználó úgy döntött, hogy a szereplők nevei felismerhetően, de enyhén módosítva jelenjenek meg — angolul és magyarul is (pl. Rick Grimes → *Rich Granger*, Harry Potter → *Henry LightningScar* / *Henry Villámseb*), a 9. fejezetben a világnevekre már rögzített irányt követve. Ez **felülírja** a 2. és 3. fejezet „teljesen eredeti nevek” elvét a *megjelenített szereplő-nevekre*; a 8. fejezetben leírt jogi kockázat ettől nem szűnik meg (a szerzői jog a karaktert is védi, a hasonlóság szándéka súlyosbító körülmény) — **kiadás előtt jogász** nézze át.

A szereplő-azonosítók (`id`) **változatlanok** (a régi névből készült slug: mentés, rajzolt megjelenés, Gyűjtemény kulcsa); csak a megjelenített név cserélődött (`P(név, faj, id)` az `events.ts`-ben; angolul `EN_CHARACTERS` az `en.ts`-ben). A világ-címek (9. fejezet) külön készültek; a helyiségnevek és a világ-szabályok nevei ebben a körben **nem** változtak, kivéve a szereplő-névből képzett említéseket a bevezetőkben. **Nyitott:** a szereplőről elnevezett helyiségek (*Murci szobája*, *Gyuri kunyhója*, *Zsolnai kunyhója*, *Sárvári-kúria*, *Gyöngyösi-ház*, *Lukács-kúria*, *Kollár-ház*, *Lenkei-ház*) még a régi névből valók.

Oszlopok: **eredeti → angol → magyar**.

### Five Nights at Freddy's → Five Evenings at Teddy's

| Eredeti | Angol | Magyar |
|---|---|---|
| Freddy | Teddy Fuzzbear | Teddy Bolyhosmackó |
| Bonnie | Benny Bunny | Benny Nyuszi |
| Chica | Cheepy Chick | Csipi Csibe |
| Foxy | Rusty Fox | Rozsdás Róka |
| Golden Freddy | Golden Teddy | Arany Teddy |
| A Marionett | The Stringmaster | A Zsinórmester |
| Mike Schmidt | Miles Schmitt | Miles Schmitt |
| William Afton | Warren Ashford | Warren Ashford |

### Poppy Playtime → Daisy Toytime

| Eredeti | Angol | Magyar |
|---|---|---|
| Kissy Missy | Smoochy Mousy | Puszis Mici |
| Mommy Long Legs | Mama Stretchlegs | Nyújtólábú Anyu |
| Bunzo Bunny | Bongo Bunny | Bongó Nyuszi |
| PJ Pug-a-Pillar | DJ Pup-a-Pede | DJ Kutyaszázlábú |
| CatNap | KittyDoze | CicaSzundi |
| DogDay | PuppyDawn | KutyaHajnal |
| Poppy | Daisy | Daisy |
| Huggy Wuggy | Snuggly Wuggly | Öleli Bújli |
| The Visitor | The Visitor | A Látogató |

### Resident Evil → Vile Dweller

| Eredeti | Angol | Magyar |
|---|---|---|
| Leon S. Kennedy | Leo S. Kendrick | Leo S. Kendrick |
| Claire Redfield | Clara Redbrook | Clara Redbrook |
| Ada Wong | Ava Wei | Ava Wei |
| Sherry Birkin | Cherry Birkley | Cherry Birkley |
| Annette Birkin | Anita Birkley | Anita Birkley |
| Marvin Branagh | Martin Brannick | Martin Brannick |
| Brian Irons | Bryce Steel | Bryce Steel |
| Mr. X | Mr. Y | Y úr |

### Alien: Isolation → Outsider: Solitude

| Eredeti | Angol | Magyar |
|---|---|---|
| Amanda Ripley | Amelia Ridley | Amelia Ridley |
| Nina Taylor | Nora Tailor | Nora Tailor |
| Marlow | Harlow | Harlow |
| Waits | Wade | Wade |
| Axel | Axton | Axton |
| Ricardo | Rico | Rico |
| Samuels | Sampson | Sampson |
| A Xenomorph | The Voidborn | Az Űrszülött |

### Until Dawn → Before Daybreak

| Eredeti | Angol | Magyar |
|---|---|---|
| Sam | Sammy | Sammy |
| Mike | Mick | Mick |
| Jessica | Jessamine | Jessamine |
| Emily | Emery | Emery |
| Matt | Matty | Matty |
| Ashley | Ashlyn | Ashlyn |
| Chris | Kit | Kit |
| Josh | Joss | Joss |
| A Wendigo | The Antlered Hunger | Az Agancsos Éhség |

### Dead Space → Lifeless Void

| Eredeti | Angol | Magyar |
|---|---|---|
| Isaac Clarke | Isaiah Clarkson | Isaiah Clarkson |
| Kendra Daniels | Kara Danielson | Kara Danielson |
| Zach Hammond | Zane Hammerton | Zane Hammerton |
| Terrence Kyne | Tristan Kline | Tristan Kline |
| Nicole Brennan | Nicolette Brenner | Nicolette Brenner |
| Hans Tiedemann | Henrik Tillmann | Henrik Tillmann |
| Challus Mercer | Callum Merrow | Callum Merrow |
| Ellie Langford | Ella Longford | Ella Longford |
| Benjamin Mathius | Benedict Mathers | Benedict Mathers |
| A Hunter | The Pursuer | Az Üldöző |

### Outlast → Outlive

| Eredeti | Angol | Magyar |
|---|---|---|
| Miles Upshur | Milo Upcroft | Milo Upcroft |
| Waylon Park | Wade Parks | Wade Parks |
| Richard Trager | Richmond Traeger | Richmond Traeger |
| Father Martin | Father Marvin | Marvin atya |
| Dr. Wernicke | Dr. Werling | Dr. Werling |
| Jeremy Blaire | Jerome Blake | Jerome Blake |
| Eddie Gluskin | Edwin Glasswick | Edwin Glasswick |
| Chris Walker | Kris Strider | Kris Strider |

### Silent Hill → Hushed Heights

| Eredeti | Angol | Magyar |
|---|---|---|
| James Sunderland | Jamie Sunderwood | Jamie Sunderwood |
| Maria | Marina | Marina |
| Angela Orosco | Angelica Orsino | Angelica Orsino |
| Laura | Laurel | Laurel |
| Mary | Marie | Marie |
| Eddie Dombrowski | Edwin Dombro | Edwin Dombro |
| A Buborékfejű Ápolónő | The Blisterhead Nurse | A Hólyagfejű Ápolónő |
| Pyramid Head | The Obelisk Executioner | Az Obeliszkfejű Hóhér |
| A Hazug Alak | The Deceiving Figure | A Megtévesztő Alak |

### Dead by Daylight → Deceased by Daybreak

| Eredeti | Angol | Magyar |
|---|---|---|
| Dwight Fairfield | Dwayne Fairbrook | Dwayne Fairbrook |
| Meg Thomas | Maggie Thompson | Maggie Thompson |
| Claudette Morel | Claudine Moreau | Claudine Moreau |
| Jake Park | Jack Parks | Jack Parks |
| Nea Karlsson | Nia Karlsen | Nia Karlsen |
| Feng Min | Fen Mei | Fen Mei |
| David King | Davis Crown | Davis Crown |
| Quentin Smith | Quincy Smythe | Quincy Smythe |
| A Trapper | The Snarekeeper | A Hurokmester |

### Alan Wake → Adam Waken

| Eredeti | Angol | Magyar |
|---|---|---|
| Alan Wake | Adam Waken | Adam Waken |
| Alice Wake | Alicia Waken | Alicia Waken |
| Barry Wheeler | Benny Wheelwright | Benny Wheelwright |
| Sarah Breaker | Sara Breakwell | Sara Breakwell |
| Rose Marigold | Rosie Goldflower | Rosie Goldflower |
| Thomas Zane | Tobias Zayne | Tobias Zayne |
| Odin Anderson | Woden Anders | Woden Anders |
| Tor Anderson | Thunder Anders | Thunder Anders |
| Cynthia Weaver | Sylvia Webber | Sylvia Webber |
| Pat Maine | Pete Mayne | Pete Mayne |
| Dr. Emil Hartman | Dr. Emery Hartwell | Dr. Emery Hartwell |

### Stranger Things → Odder Matters

| Eredeti | Angol | Magyar |
|---|---|---|
| Eleven | Twelve | Tizenkettő |
| Mike Wheeler | Mick Wheelwright | Mick Wheelwright |
| Dustin Henderson | Dusty Hendricks | Dusty Hendricks |
| Lucas Sinclair | Luke St. Clair | Luke St. Clair |
| Will Byers | Willy Baines | Willy Baines |
| Max Mayfield | Maxine Meadows | Maxine Meadows |
| Steve Harrington | Stevie Hargrove | Stevie Hargrove |
| Robin Buckley | Wren Buckwell | Wren Buckwell |
| Jim Hopper | Jimmy Hopley | Jimmy Hopley |
| Erica Sinclair | Erin St. Clair | Erin St. Clair |
| Vecna | The Hexlord | Az Átokúr |

### Game of Thrones → Contest of Crowns

| Eredeti | Angol | Magyar |
|---|---|---|
| Jon Snow | John Frost | John Dér |
| Daenerys Targaryen | Daenara Drakaryn | Daenara Drakaryn |
| Tyrion Lannister | Tyrian Goldmere | Tyrian Goldmere |
| Arya Stark | Aria Winterhart | Aria Winterhart |
| Sansa Stark | Sarina Winterhart | Sarina Winterhart |
| Cersei Lannister | Cerys Goldmere | Cerys Goldmere |
| Jaime Lannister | Jaimon Goldmere | Jaimon Goldmere |
| Bran Stark | Bram Winterhart | Bram Winterhart |
| Samwell Tarly | Samwin Tarley | Samwin Tarley |
| Az Éjkirály | The Frost King | A Fagykirály |

### Rick and Morty → Rich and Marty

| Eredeti | Angol | Magyar |
|---|---|---|
| Rick Sanchez | Rich Sandrez | Rich Sandrez |
| Morty Smith | Marty Miller | Marty Miller |
| Summer Smith | Autumn Miller | Autumn Miller |
| Beth Smith | Bess Miller | Bess Miller |
| Jerry Smith | Gerry Miller | Gerry Miller |
| Birdperson | Featherperson | Tollember |
| Squanchy | Scrunchy | Gyűrci |
| Mr. Poopybutthole | Mr. Doodiebooty | Kakipopsi úr |
| Evil Morty | Wicked Marty | Gonosz Marty |
| Mr. Meeseeks | Mr. Lookatmee | Nézzrám úr |

### The Vampire Diaries → The Bloodsucker Journals

| Eredeti | Angol | Magyar |
|---|---|---|
| Elena Gilbert | Elina Gilmore | Elina Gilmore |
| Stefan Salvatore | Stephen Salvatori | Stephen Salvatori |
| Damon Salvatore | Damian Salvatori | Damian Salvatori |
| Bonnie Bennett | Bea Bennetson | Bea Bennetson |
| Caroline Forbes | Coraline Forrester | Coraline Forrester |
| Matt Donovan | Matty Donnelly | Matty Donnelly |
| Jeremy Gilbert | Jerome Gilmore | Jerome Gilmore |
| Alaric Saltzman | Aldric Saltwell | Aldric Saltwell |
| Tyler Lockwood | Taylor Lockridge | Taylor Lockridge |
| Katherine Pierce | Katerina Pearce | Katerina Pearce |

### Adventure Time → Quest Hour

| Eredeti | Angol | Magyar |
|---|---|---|
| Finn | Flynn | Flynn |
| Jake | Jax | Jax |
| Rágógumi hercegnő | Princess Bubblecandy | Buborékcukor hercegnő |
| Marceline | Marcelina | Marcelina |
| Jégkirály | Snow King | Hókirály |
| BMO | BEEPO | BÍPÓ |
| Lumpy hercegnő | Princess Bumpy | Bütyök hercegnő |
| A Lich | The Undying | A Halhatatlan |

### Twilight → Nightfall

| Eredeti | Angol | Magyar |
|---|---|---|
| Bella Swan | Belle Heron | Belle Heron |
| Edward Cullen | Edmund Callen | Edmund Callen |
| Jacob Black | Jakob Dark | Jakob Dark |
| Alice Cullen | Alyssa Callen | Alyssa Callen |
| Carlisle Cullen | Carlyle Callen | Carlyle Callen |
| Charlie Swan | Chaz Heron | Chaz Heron |
| Rosalie Hale | Rosalyn Hales | Rosalyn Hales |
| Jasper Hale | Casper Hales | Casper Hales |
| James | Jamie | Jamie |

### The Walking Dead → The Wandering Deceased

| Eredeti | Angol | Magyar |
|---|---|---|
| Rick Grimes | Rich Granger | Rich Granger |
| Michonne | Mishana | Mishana |
| Daryl Dixon | Darren Dixley | Darren Dixley |
| Carol Peletier | Carla Pellet | Carla Pellet |
| Glenn Rhee | Glen Ryu | Glen Ryu |
| Maggie Greene | Maisie Greenwood | Maisie Greenwood |
| Negan | Neylan | Neylan |
| Carl Grimes | Karl Granger | Karl Granger |
| A Kormányzó | The Commissioner | A Helytartó |

### The Last of Us → The Remaining Few

| Eredeti | Angol | Magyar |
|---|---|---|
| Joel Miller | Jonah Millward | Jonah Millward |
| Ellie Williams | Ella Williamson | Ella Williamson |
| Tess | Tessa | Tessa |
| Tommy Miller | Toby Millward | Toby Millward |
| Marlene | Marlena | Marlena |
| Bill | Billy | Billy |
| Henry | Hank | Hank |
| Sam | Sammy | Sammy |
| Riley | Rylee | Rylee |
| Abby Anderson | Addie Anders | Addie Anders |
| A Clicker | The Clacker | A Csattogó |

### Harry Potter → Henry LightningScar

| Eredeti | Angol | Magyar |
|---|---|---|
| Harry Potter | Henry LightningScar | Henry Villámseb |
| Hermione Granger | Hermina Greenwood | Hermina Greenwood |
| Ron Weasley | Rory Weswick | Rory Weswick |
| Albus Dumbledore | Albin Bumblewick | Albin Bumblewick |
| Perselus Piton | Severin Viper | Severin Vipera |
| Hagrid | Haldric | Haldric |
| Draco Malfoy | Drake Malgrave | Drake Malgrave |
| Neville Longbottom | Nevin Longbrook | Nevin Longbrook |
| Luna Lovegood | Selene Goodheart | Selene Jószív |
| Ginny Weasley | Ginnie Weswick | Ginnie Weswick |
| Minerva McGonagall | Mina McRaven | Mina McRaven |
| Voldemort nagyúr | Lord Mortivar | Mortivar nagyúr |

