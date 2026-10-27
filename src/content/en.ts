/**
 * English player-facing CONTENT (worlds, rule texts, character names, event stories, everyday themes, bonus stories).
 * The Hungarian originals live in `game/worlds.ts`, `content/events.ts`, `content/event-cases.ts`, `content/classic.ts` and `content/looks.ts`;
 * this file is pure DATA keyed by the same ids, wired into the UI by the language layer.
 *
 * Naming rule (see `franchise.md`): every name here is ORIGINAL. None of the franchise originals that were replaced in the
 * Hungarian content — nor a phonetic or semantic near-copy of one — may appear (`en.test.ts` guards a word list).
 * Speaking names are translated by meaning, ordinary personal names are replaced by natural English ones.
 * American spelling, plain strings (no markdown). Room names follow `ROOMS_EN` in `engine/vocab.en.ts`.
 */

type EnTheme = { title: string; place: string; who: string; whoObj: string }

// ---------------------------------------------------------------------------------------------------------------------
// Worlds
// ---------------------------------------------------------------------------------------------------------------------

export const EN_WORLDS: Record<string, { title: string; game: string }> = {
  hollowmere: { title: 'Hollowmere', game: 'NIGHTDOKU' },
  'night-pizzeria': { title: "Teddy's Bear Pizzeria", game: "Five Evenings at Teddy's" },
  'toy-factory': { title: 'Toytime Co. Factory', game: 'Daisy Toytime' },
  'city-police': { title: 'Lemur City Police Station', game: 'Vile Dweller' },
  'space-station': { title: 'Novastopol Station', game: 'Outsider: Solitude' },
  'mountain-cabin': { title: 'Wendigo Mountain', game: 'Before Daybreak' },
  'deep-ship': { title: 'Starship Kuromura', game: 'Lifeless Void' },
  'summit-shelter': { title: 'Mount Hollow Asylum', game: 'Outlive' },
  'fog-town': { title: 'Hushed Hill Town', game: 'Hushed Heights' },
  'entity-realm': { title: "The Presence's Realm", game: 'Deceased by Daybreak' },
  'lake-town': { title: 'Radiant Falls', game: 'Adam Waken' },
  'sunshine-mall': { title: 'Starplaza Mall', game: 'Odder Matters' },
  'frost-keep': { title: 'Frosthold', game: 'Contest of Crowns' },
  'portal-garage': { title: "Crazy Grandpa's Garage", game: 'Rich and Marty' },
  'moon-town': { title: 'Arcane Falls', game: 'The Bloodsucker Journals' },
  'candy-land': { title: 'Land of Aah', game: 'Quest Hour' },
  'rain-forest': { title: 'Crossroads', game: 'Nightfall' },
  'walled-town': { title: 'Avalon Safe Zone', game: 'The Wandering Deceased' },
  'spore-zone': { title: 'Sporefield Quarantine Zone', game: 'The Remaining Few' },
  'wizard-school': { title: 'Ravenwick School of Magic', game: 'Henry LightningScar' },
}

// ---------------------------------------------------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------------------------------------------------

export const EN_RULES: Record<string, { name: string; text: string }> = {
  cameras: {
    name: 'Cameras',
    text: 'Pick a camera: that room is highlighted and the clues of the other rooms fade. "All" shows everything.',
  },
  grab: {
    name: 'Grab It!',
    text: 'The "next to" clue of a character standing beside a hand switch applies to two cells, in a single row or column.',
  },
  doors: {
    name: 'Locked Doors',
    text: 'Clues beside keyed doors also apply through the door, to the neighboring room.',
  },
  motion: {
    name: 'Motion Sensor',
    text: 'Some characters only have distance data: "They were exactly 3 cells from the airlock." Count the cells in steps: one step is one cell to the right, left, up, down or diagonally — walls and objects are no obstacle.',
  },
  totems: {
    name: 'Totem Vision',
    text: 'A character who ends up next to a totem has a locked, extra clue revealed.',
  },
  vacuum: {
    name: 'Vacuum',
    text: 'Only an armored (🛡) character can stand in the airless rooms marked in red.',
  },
  nightvision: {
    name: 'Night Vision',
    text: 'The board is dark — only the cells around your cursor are visible.',
  },
  radio: {
    name: 'Radio Noise',
    text: 'Near the radio the clues get distorted: one word is blacked out (███) — work it out from the other clues.',
  },
  generators: {
    name: 'Generators',
    text: 'A character standing next to a generator makes noise: the killer cannot stand next to a generator.',
  },
  light: {
    name: 'Light and Darkness',
    text: 'There is light around the lamp posts and chargers. The Possessed can stand only on dark cells.',
  },
}

export const EN_WORLD_RULES: Record<string, { name: string; text: string }> = {
  'sunshine-mall': {
    name: 'Shadow Side',
    text: 'In the darkness of the Shadow Side only the beam of your flashlight shows: the board is dark, and you see only the cells around your cursor.',
  },
  'frost-keep': {
    name: 'The Barrier',
    text: 'Only an armored (🛡) character ventures into the frozen rooms beyond the Barrier (marked in red).',
  },
  'portal-garage': {
    name: 'Portals',
    text: 'Clues beside portals also apply through the portal, to the neighboring room.',
  },
  'moon-town': {
    name: 'Sunlight',
    text: 'The cells around the lamp posts and chargers are sunlit. Vampires can stand only in the shade (on dark cells).',
  },
  'candy-land': {
    name: 'Map',
    text: 'Some characters only have distance data: "They were exactly 3 cells from the sword." Count the cells in steps: one step is one cell to the right, left, up, down or diagonally — walls and objects are no obstacle.',
  },
  'rain-forest': {
    name: 'Visions',
    text: 'A character who ends up next to a totem has a vision revealed: a locked, extra clue.',
  },
  'walled-town': {
    name: 'Noise',
    text: 'A character standing next to a generator makes noise and lures the wanderers over: the killer cannot stand next to a generator.',
  },
  'spore-zone': {
    name: 'Spores',
    text: 'The radio crackles in the spore fog: near it, one word of each clue is blacked out (███) — work it out from the other clues.',
  },
  'wizard-school': {
    name: "Adventurers' Map",
    text: 'Pick a room: it is highlighted and the clues of the other rooms fade. "All" shows everything.',
  },
}

// ---------------------------------------------------------------------------------------------------------------------
// Characters (id -> English display name). Ids are the Hungarian slugs used in puzzles/event/*.json and content/looks.ts.
// ---------------------------------------------------------------------------------------------------------------------

export const EN_CHARACTERS: Record<string, string> = {
  // Hollowmere (NIGHTDOKU's own cast; the extras are not drawn in looks.ts but appear in the Collection)
  vlad: 'Vlad Drăgulescu',
  morrigan: 'Morrigan Ashvale',
  silas: 'Silas Grey',
  lilith: 'Lilith Vane',
  ezekiel: 'Ezekiel Thorne',
  abel: 'Abel Corrigan',
  corvin: 'Corvin Hale',
  selene: 'Selene Roth',
  damian: 'Damian Frost',
  isolde: 'Isolde Marsh',
  nyx: 'Nyx Crane',
  rowan: 'Rowan Wren',
  cassian: 'Cassian Dusk',
  elara: 'Elara Morrow',

  // Night Pizzeria
  brumi: 'Teddy Fuzzbear',
  nyuszi: 'Benny Bunny',
  csibi: 'Cheepy Chick',
  roko: 'Rusty Fox',
  'arany-brumi': 'Golden Teddy',
  'a-babu': 'The Stringmaster',
  'kiss-marton': 'Miles Schmitt',
  'varga-ferenc': 'Warren Ashford',

  // Toy Factory
  'csokos-mici': 'Smoochy Mousy',
  'hosszulabu-anyu': 'Mama Stretchlegs',
  'dobos-nyuszi': 'Bongo Bunny',
  'pottyos-hernyo': 'DJ Pup-a-Pede',
  macskanap: 'KittyDoze',
  kutyanap: 'PuppyDawn',
  'babika-rozsi': 'Daisy',
  'a-latogato': 'The Visitor',
  'olelo-leny': 'Snuggly Wuggly',

  // Scarlet City Police Headquarters
  'lazar-leo': 'Leo S. Kendrick',
  'hegedus-klara': 'Clara Redbrook',
  'lin-adel': 'Ava Wei',
  'biro-csenge': 'Cherry Birkley',
  'biro-anett': 'Anita Birkley',
  'bodor-marcell': 'Martin Brannick',
  'banfi-bruno': 'Bryce Steel',
  'a-sotet-ur': 'Mr. Y',

  // Zarya Station
  'antal-anita': 'Amelia Ridley',
  'toth-nora': 'Nora Tailor',
  meszaros: 'Harlow',
  veres: 'Wade',
  akos: 'Axton',
  rokus: 'Rico',
  sos: 'Sampson',
  'az-urleny': 'The Voidborn',

  // Darkpine Mountain
  dani: 'Sammy',
  mihaly: 'Mick',
  julia: 'Jessamine',
  emese: 'Emery',
  mate: 'Matty',
  agnes: 'Ashlyn',
  krisztian: 'Kit',
  gergo: 'Joss',
  'a-hegyi-szellem': 'The Antlered Hunger',

  // Starship Vesta
  'ivan-kovacs': 'Isaiah Clarkson',
  'kinga-dezso': 'Kara Danielson',
  'zoltan-hamar': 'Zane Hammerton',
  'tibor-kun': 'Tristan Kline',
  'nikolett-beran': 'Nicolette Brenner',
  'hubert-tamas': 'Henrik Tillmann',
  'csaba-mester': 'Callum Merrow',
  'eszter-lakatos': 'Ella Longford',
  'bence-marton': 'Benedict Mathers',
  'a-vadasz': 'The Pursuer',

  // Cragtop Sanctuary
  'milan-ungvari': 'Milo Upcroft',
  'vajk-pal': 'Wade Parks',
  'rudolf-tarnai': 'Richmond Traeger',
  'atya-marton': 'Father Marvin',
  'dr-vargha': 'Dr. Werling',
  'jeno-balogh': 'Jerome Blake',
  'elemer-gulyas': 'Edwin Glasswick',
  'kristof-vadas': 'Kris Strider',

  // The City of Fog
  'sandor-szeles': 'Jamie Sunderwood',
  marianna: 'Marina',
  'anna-oroszi': 'Angelica Orsino',
  lujza: 'Laurel',
  mara: 'Marie',
  'ede-dombi': 'Edwin Dombro',
  'a-piramisfeju': 'The Obelisk Executioner',
  'a-lampasfeju-apolono': 'The Blisterhead Nurse',
  'a-hazug-alak': 'The Deceiving Figure',

  // The Realm of the Dark Gate
  'denes-feher': 'Dwayne Fairbrook',
  'margo-tamas': 'Maggie Thompson',
  'klaudia-morvai': 'Claudine Moreau',
  'jakab-pal': 'Jack Parks',
  'nelli-karolyi': 'Nia Karlsen',
  'hung-mihal': 'Fen Mei',
  'david-kiraly': 'Davis Crown',
  'kalman-szuts': 'Quincy Smythe',
  'a-csapdas': 'The Snarekeeper',

  // Lumen Hill
  'attila-vago': 'Adam Waken',
  'ilona-vago': 'Alicia Waken',
  'barna-vincze': 'Benny Wheelwright',
  'sara-toro': 'Sara Breakwell',
  'rozsa-csikos': 'Rosie Goldflower',
  'tamas-zsolnai': 'Tobias Zayne',
  'odon-andrasfi': 'Woden Anders',
  'tibor-andrasfi': 'Thunder Anders',
  'cintia-szovo': 'Sylvia Webber',
  'patrik-meszar': 'Pete Mayne',
  'dr-emil-hofer': 'Dr. Emery Hartwell',

  // Sunshine Mall
  nyolc: 'Twelve',
  'matyas-palfi': 'Mick Wheelwright',
  'dezso-hunyadi': 'Dusty Hendricks',
  'lorant-sarkany': 'Luke St. Clair',
  'vilmos-balint': 'Willy Baines',
  'mariann-majer': 'Maxine Meadows',
  'istvan-halasz': 'Stevie Hargrove',
  'rita-berki': 'Wren Buckwell',
  'jeno-kertesz': 'Jimmy Hopley',
  'erika-sarosi': 'Erin St. Clair',
  'a-liderc': 'The Hexlord',

  // Snow Keep
  'jon-hovari': 'John Frost',
  'dalma-tuzi': 'Daenara Drakaryn',
  'tamas-rendes': 'Tyrian Goldmere',
  'aliz-szurke': 'Aria Winterhart',
  'sarolta-hideg': 'Sarina Winterhart',
  'cecilia-aranyi': 'Cerys Goldmere',
  'jeno-aranykez': 'Jaimon Goldmere',
  'balint-fagyos': 'Bram Winterhart',
  'samu-tarlos': 'Samwin Tarley',
  'a-fagykiraly': 'The Frost King',

  // The Wexler House Garage
  'rikard-santa': 'Rich Sandrez',
  'murci-szmit': 'Marty Miller',
  'zsanett-szmit': 'Autumn Miller',
  'bea-szmit': 'Bess Miller',
  'jerzsi-szmit': 'Gerry Miller',
  'a-madarember': 'Featherperson',
  csippento: 'Scrunchy',
  'mr-fenekcsomo': 'Mr. Doodiebooty',
  'gonosz-murci': 'Wicked Marty',
  'mr-kerek': 'Mr. Lookatmee',

  // Moon Valley
  'ella-gyongyosi': 'Elina Gilmore',
  'szabolcs-sarvari': 'Stephen Salvatori',
  'daniel-sarvari': 'Damian Salvatori',
  'bogi-bertalan': 'Bea Bennetson',
  'karola-fabian': 'Coraline Forrester',
  'mark-denes': 'Matty Donnelly',
  'jeromos-gyongyosi': 'Jerome Gilmore',
  'alfred-sos': 'Aldric Saltwell',
  'tamas-lukacs': 'Taylor Lockridge',
  'kata-pasztor': 'Katerina Pearce',

  // Fableland
  fin: 'Flynn',
  dzsaki: 'Jax',
  'szaloncukor-hercegno': 'Princess Bubblecandy',
  marcella: 'Marcelina',
  hokiraly: 'Snow King',
  bimbo: 'BEEPO',
  'gocsortos-hercegno': 'Princess Bumpy',
  'a-lich': 'The Undying',

  // Rainforest Town
  'bella-lenkei': 'Belle Heron',
  'ede-kollar': 'Edmund Callen',
  'jakob-fekete': 'Jakob Dark',
  'aliz-kollar': 'Alyssa Callen',
  'karoly-kollar': 'Carlyle Callen',
  'peter-lenkei': 'Chaz Heron',
  'rozalia-hajdu': 'Rosalyn Hales',
  'jonas-hajdu': 'Casper Hales',
  'gabor-sas': 'Jamie',

  // Rampart Town
  'rudi-gorbe': 'Rich Granger',
  'mihaela-szep': 'Mishana',
  'denes-deak': 'Darren Dixley',
  'kamilla-pelle': 'Carla Pellet',
  'gyula-reti': 'Glen Ryu',
  'magdolna-zold': 'Maisie Greenwood',
  'nemes-noel': 'Neylan',
  'kornel-gorbe': 'Karl Granger',
  'a-fonok': 'The Commissioner',

  // Quarantine Zone
  'jozsef-muller': 'Jonah Millward',
  'ella-szucs': 'Ella Williamson',
  tesza: 'Tessa',
  'tomi-muller': 'Toby Millward',
  'marcsi-makai': 'Marlena',
  bela: 'Billy',
  hektor: 'Hank',
  szabi: 'Sammy',
  renata: 'Rylee',
  'abigel-andrasy': 'Addie Anders',
  'a-kattogo': 'The Clacker',

  // Magic Academy
  'hugo-pakozdi': 'Henry LightningScar',
  'hermina-gazdag': 'Hermina Greenwood',
  'remi-vasvari': 'Rory Weswick',
  'gina-vasvari': 'Ginnie Weswick',
  'albert-dombo': 'Albin Bumblewick',
  'perec-pitvar': 'Severin Viper',
  'gyuri-bozontos': 'Haldric',
  'dorian-galambos': 'Drake Malgrave',
  'nandor-hosszuszar': 'Nevin Longbrook',
  'lujza-szerelmes': 'Selene Goodheart',
  'minerva-kopjas': 'Mina McRaven',
  'a-nevtelen-ur': 'Lord Mortivar',
}

// ---------------------------------------------------------------------------------------------------------------------
// Event cases (puzzle id -> title + story). Case 1 of a world carries the world intro; cases 2-5 their own victim story.
// ---------------------------------------------------------------------------------------------------------------------

export const EN_EVENT_CASES: Record<string, { title: string; story: string }> = {
  // 01 Night Pizzeria
  'event-01-night-pizzeria-1': {
    title: "The Night Guard's Shift",
    story:
      "During the night guard's shift, the man in the lilac coat never came back from the Security Storeroom. The cameras saw everything — but only one room at a time.",
  },
  'event-01-night-pizzeria-2': {
    title: 'Six in the Morning',
    story:
      'Miles Schmitt never stepped out of the pizzeria door when the sun came up at dawn. The cameras recorded the whole night — but they show only one room at a time.',
  },
  'event-01-night-pizzeria-3': {
    title: 'The Silent Music Box',
    story:
      'The music box has fallen silent, and The Stringmaster lies motionless on the floor. Someone failed to wind it in time — or did so on purpose.',
  },
  'event-01-night-pizzeria-4': {
    title: 'The Golden Shadow',
    story: 'Golden Teddy came out of the darkness and never got up again. Nobody knows who was last with it.',
  },
  'event-01-night-pizzeria-5': {
    title: 'Behind the Curtain',
    story:
      'When the cameras came back on, Rusty Fox no longer moved. The lights had flickered several times in the meantime — someone was running in the dark.',
  },

  // 02 Toy Factory
  'event-02-toy-factory-1': {
    title: 'The Green Hand',
    story:
      'In the abandoned toy factory, Snuggly Wuggly will never rise again. The green hand can reach anywhere — the suspects, however, cannot all.',
  },
  'event-02-toy-factory-2': {
    title: 'Empty Drumbeat',
    story:
      "Bongo Bunny's drum has fallen silent, and the hare himself lies in the corridor of the toy factory. The belts are still running, as if nothing had happened.",
  },
  'event-02-toy-factory-3': {
    title: 'Long Arms',
    story:
      'Even with her long arms, Mama Stretchlegs could not reach whoever finished her off. The green hand knew something all the same — but not all of the suspects do.',
  },
  'event-02-toy-factory-4': {
    title: 'Daydream',
    story:
      'KittyDoze fell asleep and never woke up again. The smell of gas still hangs in the vents, and the toys are silent.',
  },
  'event-02-toy-factory-5': {
    title: "The Doll's Last Word",
    story:
      'Daisy lies beside the display case, and the factory hummed all night long. Someone took her voice.',
  },

  // 03 Scarlet City Police Headquarters
  'event-03-city-police-1': {
    title: "Mr. Y's Hat",
    story:
      'September 1998. Mr. Y lies beside his hat, and the keyed doors watch from both sides.',
  },
  'event-03-city-police-2': {
    title: "The Captain's Office",
    story:
      'Bryce Steel stayed behind in his own office, and the secret door stands open. The keys open both ways — and watch both ways.',
  },
  'event-03-city-police-3': {
    title: 'The Last Radio Message',
    story:
      'Martin Brannick sent his last message over the radio, then silence fell. The corridors of the police station look different at night.',
  },
  'event-03-city-police-4': {
    title: "The Lab's Secrets",
    story:
      "Anita Birkley's research notes lie scattered across the floor. Whoever got out of the lab did not say what they saw.",
  },
  'event-03-city-police-5': {
    title: 'The Grappling Rope',
    story:
      "Ava Wei's grappling rope hangs on the railing, but she herself lies on the floor. Nobody knows who she was really working for.",
  },

  // 04 Zarya Station
  'event-04-space-station-1': {
    title: 'The Slip in the Vent',
    story:
      "The Voidborn slipped for the last time in the vent. The motion sensor doesn't give a name — only a distance.",
  },
  'event-04-space-station-2': {
    title: 'Behind a Closed Door',
    story:
      'Harlow was working among the systems when the power went out again. The motion sensor beeps, but it gives no name.',
  },
  'event-04-space-station-3': {
    title: 'After the Alarm',
    story: 'Wade stayed where the alarm went off. The cargo cart is still standing in front of the door.',
  },
  'event-04-space-station-4': {
    title: 'Late Report',
    story:
      'Rico did not check in at the end of his shift. The motion sensor did pick something up — just not him.',
  },
  'event-04-space-station-5': {
    title: 'The Call Was Cut Off',
    story:
      "Nora Tailor's voice broke off on the radio, then began to crackle. Novastopol Station is silent again.",
  },

  // 05 Darkpine Mountain
  'event-05-mountain-cabin-1': {
    title: "The Antlered Hunger's Night",
    story:
      'In the mountain cabin, the Antlered Hunger did not survive the night. The clues of the characters standing beside the totems reveal more.',
  },
  'event-05-mountain-cabin-2': {
    title: 'The First Scream',
    story:
      'Emery screamed, but the mountain did not even send back an echo. The totems around the cabin stand just as they did this morning.',
  },
  'event-05-mountain-cabin-3': {
    title: 'Locked Cabin Door',
    story:
      'Jessamine locked herself in when the lights went out. By morning the door was open — from the inside.',
  },
  'event-05-mountain-cabin-4': {
    title: 'Blurred Tracks',
    story:
      "Matty's tracks in the snow lead as far as the cabin, but no farther. Those standing beside the totems see more.",
  },
  'event-05-mountain-cabin-5': {
    title: 'The Hidden Voice',
    story: 'Joss stayed in the cabin when the power went out. Dawn is approaching — and with it, the truth.',
  },

  // 06 Starship Vesta
  'event-06-deep-ship-1': {
    title: 'The Pursuer Remains',
    story:
      'A Pursuer was left dead on the ship. Only an armored character can enter the airless sections — the marker is on the cards.',
  },
  'event-06-deep-ship-2': {
    title: 'The Silent Corridor',
    story:
      'Tristan Kline was left behind dead, and the lights are still flickering. The doors of the airless sections stand open.',
  },
  'event-06-deep-ship-3': {
    title: "The Chief Engineer's Log",
    story:
      "Henrik Tillmann's log breaks off, and he himself lies on the floor. Only those in armor could have gone after him.",
  },
  'event-06-deep-ship-4': {
    title: 'The Head of Security',
    story:
      "Callum Merrow never trusted the ship's leaders. Now he can trust no one anymore — the lights have gone out.",
  },
  'event-06-deep-ship-5': {
    title: "The Captain's Last Order",
    story:
      'Benedict Mathers gave his last order, then silence fell. Some sections of Starship Kuromura can be entered only by armored crew.',
  },

  // 07 Cragtop Sanctuary
  'event-07-summit-shelter-1': {
    title: 'Out of Batteries',
    story:
      'It is dark, and the battery is running out. Kris Strider met his end in the sanctuary — but you can see only around your cursor.',
  },
  'event-07-summit-shelter-2': {
    title: 'At the Bottom of the Stairs',
    story:
      'Jerome Blake lies at the bottom of the stairs, the flashlight in his hand still lit. The walls of the sanctuary saw everything.',
  },
  'event-07-summit-shelter-3': {
    title: 'The Silent Bell',
    story:
      "Father Marvin's prayer was cut short; the pews are empty. In the dark, only the light of your cursor shows the way.",
  },
  'event-07-summit-shelter-4': {
    title: "The Doctor's Notes",
    story: "Dr. Werling's notes lie scattered across the floor of the ward. Who carried the drawers out?",
  },
  'event-07-summit-shelter-5': {
    title: 'Open Doors',
    story:
      "Edwin Glasswick's study was always locked; now it stands wide open. The batteries are dying, and the corridors are long.",
  },

  // 08 The City of Fog
  'event-08-fog-town-1': {
    title: 'The Obelisk Executioner',
    story:
      'The corpse of the Obelisk Executioner lies in the fog. The radio crackles: a few words of the clues stay blacked out.',
  },
  'event-08-fog-town-2': {
    title: 'The Cold Room',
    story:
      'Edwin Dombro stayed in front of the cold room, and the fog crept in behind him. The radio crackles, and the words fade.',
  },
  'event-08-fog-town-3': {
    title: 'Mirror Room',
    story:
      'The Deceiving Figure never showed its face — we still cannot see who finished it off. The radio blacks out some of the words.',
  },
  'event-08-fog-town-4': {
    title: 'The Night Shift',
    story:
      'The Blisterhead Nurse was standing in the corridor when the lights went out. The fog hides everything, and the radio distorts the clues.',
  },
  'event-08-fog-town-5': {
    title: 'The Foot of the Stairwell',
    story:
      'Angelica Orsino was waiting in the stairwell for someone who never came. The radio blacks out a word here and there.',
  },

  // 09 The Realm of the Dark Gate
  'event-09-entity-realm-1': {
    title: "The Snarekeeper's Hooks",
    story:
      'The Snarekeeper met his end on his own hooks. Whoever stands beside a generator makes noise — and the killer never slips up like that.',
  },
  'event-09-entity-realm-2': {
    title: 'The First Generator',
    story:
      'Dwayne Fairbrook was last seen at the generator, from where a noise was heard. The killer, however, never slips up like that.',
  },
  'event-09-entity-realm-3': {
    title: 'Healing Hands',
    story:
      "Claudine Moreau's first-aid kit lies empty beside her. The cornfield rustles, the generators drone.",
  },
  'event-09-entity-realm-4': {
    title: 'The Fighter',
    story: 'Davis Crown was still laughing at the end, then fell silent. Only the clues remain.',
  },
  'event-09-entity-realm-5': {
    title: 'Fabric of Dreams',
    story:
      "Quincy Smythe did not wake up. In The Presence's Realm, the drone of the generators is the worst witness.",
  },

  // 10 Lumen Hill
  'event-10-lake-town-1': {
    title: 'The Asylum',
    story:
      'Dr. Emery Hartwell lies dead. Among the cells of light and darkness, the Possessed can stand only in the dark.',
  },
  'event-10-lake-town-2': {
    title: 'On the Lakeshore',
    story:
      'Woden Anders stayed on the shore of Stewpot Lake. Among the cells of light and darkness, the Possessed can stand only in the dark.',
  },
  'event-10-lake-town-3': {
    title: "Benny's Last Joke",
    story: 'Benny Wheelwright did not laugh when the lights went out. The Possessed can stand only on dark cells.',
  },
  'event-10-lake-town-4': {
    title: "The Brother's Shadow",
    story:
      'Thunder Anders lies beneath the lamp post; the light no longer reaches him. The Possessed move in the dark.',
  },
  'event-10-lake-town-5': {
    title: "The Radio Host's Voice",
    story:
      "Pete Mayne's voice has fallen silent. The cells of light and darkness mark where the Possessed could have stood.",
  },

  // 11 Sunshine Mall
  'event-11-sunshine-mall-1': {
    title: 'Starplaza, July Fourth',
    story:
      'July 4, 1985, Starplaza Mall. The Hexlord lies in the elevator of the Secret Lab. In the darkness of the power outage only the beam of your flashlight remains: on the Shadow Side you see only what is around your cursor.',
  },
  'event-11-sunshine-mall-2': {
    title: 'The Police Chief',
    story:
      "Jimmy Hopley was left in the mall's back corridor before the lights went out. The Shadow Side is visible only around your flashlight.",
  },
  'event-11-sunshine-mall-3': {
    title: 'Ice Cream Parlor',
    story:
      "Stevie Hargrove's ice cream cap was left on the counter; he himself is gone. In the blackout only the light of your cursor shines.",
  },
  'event-11-sunshine-mall-4': {
    title: 'The Arcade',
    story:
      'Erin St. Clair never left the arcade without a prize. Tonight, though, the machines have gone silent.',
  },
  'event-11-sunshine-mall-5': {
    title: 'The Radio Call',
    story:
      "Dusty Hendricks's last call came from the direction of the lab, and then there was silence. In the darkness of the Shadow Side only the beam of your flashlight remains.",
  },

  // 12 Snow Keep
  'event-12-frost-keep-1': {
    title: 'The Frost King',
    story:
      'On the cold night at Frosthold, the Frost King collapsed dead. Only an armored (🛡) character ventures beyond the Barrier — the marker is on the cards.',
  },
  'event-12-frost-keep-2': {
    title: 'Wine and Poison',
    story:
      'Cerys Goldmere stayed beside her glass when the fireplaces went out. Only an armored character dares to go beyond the Barrier.',
  },
  'event-12-frost-keep-3': {
    title: 'The Gilded Gauntlet',
    story:
      'Jaimon Goldmere could not defend himself even with his gilded gauntlet. The cold of the night froze over everything.',
  },
  'event-12-frost-keep-4': {
    title: "Tyrian's Cup",
    story:
      'Tyrian Goldmere raised his wine in one last toast, then the glass dropped from his hand. Only an armored character ventures beyond the Barrier.',
  },
  'event-12-frost-keep-5': {
    title: 'The Bookworm',
    story: "Samwin Tarley's books lie scattered on the ground. Whoever went beyond the Barrier wore armor.",
  },

  // 13 The Wexler House Garage
  'event-13-portal-garage-1': {
    title: 'Mr. Lookatmee',
    story:
      'Mr. Lookatmee lies dead — someone asked too much of him. The portals see through to both sides: clues beside a portal also apply to the neighboring room.',
  },
  'event-13-portal-garage-2': {
    title: 'Gerry Left Behind',
    story:
      'Gerry Miller did not come back when the portal opened. The green, blue and orange portals see both ways.',
  },
  'event-13-portal-garage-3': {
    title: "Featherperson's Wedding",
    story:
      'Featherperson came from Fortress City and never made it home. Characters standing beside portals can see the neighboring room too.',
  },
  'event-13-portal-garage-4': {
    title: 'Snap!',
    story: 'Scrunchy snipped, then there was silence. The portals see through to both sides.',
  },
  'event-13-portal-garage-5': {
    title: 'Cheeky Marty',
    story:
      'Wicked Marty was standing on top of Fortress City, yet now he lies on the floor. One dimension over, someone very much did not want this.',
  },

  // 14 Moon Valley
  'event-14-moon-town-1': {
    title: 'The Harvest Festival',
    story:
      'Arcane Falls, the night of the harvest festival. Katerina Pearce lies dead in the cemetery. Vampires cannot stand on the sunlit cells — the circles of light around the lamps mark out the shade.',
  },
  'event-14-moon-town-2': {
    title: "The Teacher's Glass",
    story:
      "Aldric Saltwell's glass was left half full at the Moon Tavern. There is sunlight around the lamps — vampires can stand only in the shade.",
  },
  'event-14-moon-town-3': {
    title: 'At Full Moon',
    story: 'Taylor Lockridge was lying on the stairs when the moon came out. Vampires avoid the sunlit cells.',
  },
  'event-14-moon-town-4': {
    title: "The Ghost's Visit",
    story:
      'Jerome Gilmore was last seen in the old house. Outside the circles of light around the lamps, everything is shadow.',
  },
  'event-14-moon-town-5': {
    title: 'The Last Shift',
    story:
      'Matty Donnelly stayed behind the bar of the Moon Tavern when the lamps went to sleep. Vampires can stand only in the shade.',
  },

  // 15 Fableland
  'event-15-candy-land-1': {
    title: "The Undying's Tomb",
    story:
      "In the Land of Aah, the Undying's body lies in the tomb. The map does not show everything: for some characters we learn only how far they were from the sword or from BEEPO.",
  },
  'event-15-candy-land-2': {
    title: 'The Trace of the Crown',
    story:
      "The Snow King's crown was left on the ice, and he himself is gone. The map does not show everything — for some characters there is only a distance.",
  },
  'event-15-candy-land-3': {
    title: 'Bumpy Business',
    story:
      'Princess Bumpy lay at the edge of the Sugar Realm. The distance between the sword and BEEPO is a telltale clue.',
  },
  'event-15-candy-land-4': {
    title: 'The Laboratory',
    story:
      "In Princess Bubblecandy's laboratory the flasks have toppled over. The map shows distances — regardless of direction.",
  },
  'event-15-candy-land-5': {
    title: 'The Bass Guitar',
    story:
      "Marcelina's bass guitar lies in the grass. The distance from the sword and from BEEPO helps work out who passed by.",
  },

  // 16 Rainforest Town
  'event-16-rain-forest-1': {
    title: 'The Vampire Tracker',
    story:
      "Crossroads, the city of eternal rain. Jamie, the tracker vampire, lies dead. Beside the totems, Alyssa's visions are revealed: the characters standing there get an extra clue.",
  },
  'event-16-rain-forest-2': {
    title: 'The Master of Emotions',
    story:
      "Casper Hales was lying in the garden when the rain began to fall. Beside the totems, Alyssa's visions are revealed.",
  },
  'event-16-rain-forest-3': {
    title: 'The Car Lover',
    story: 'Rosalyn Hales lies beside her favorite car. An extra clue is revealed near the totems.',
  },
  'event-16-rain-forest-4': {
    title: 'The Police Chief',
    story:
      "Chaz Heron set out for the lakeshore with his fishing rod. According to Alyssa's vision, he did not go alone.",
  },
  'event-16-rain-forest-5': {
    title: 'The Doctor',
    story:
      'Carlyle Callen never abandoned his patients — now he could not help himself. Visions are revealed beside the totems.',
  },

  // 17 Rampart Town
  'event-17-walled-town-1': {
    title: 'The Commissioner',
    story:
      'After the end of the world, the square of Avalon Safe Zone has fallen quiet: The Commissioner lies dead. The noise of the generator lures the wandering infected — the killer cannot stand beside a generator.',
  },
  'event-17-walled-town-2': {
    title: 'Barbed Wire',
    story:
      "Neylan's baseball bat lies on the ground, the barbed wire bloody. The noise of the generators lures the wanderers over — the killer cannot stand beside them.",
  },
  'event-17-walled-town-3': {
    title: 'The Hat',
    story: "Karl Granger's hat was left on the porch. The noise of the generator gives everything away.",
  },
  'event-17-walled-town-4': {
    title: 'The Courier',
    story:
      'Glen Ryu never made it as far as the gate. The noise of the generators draws the wanderers over — the killer cannot stand beside them.',
  },
  'event-17-walled-town-5': {
    title: 'The Quiet Kitchen',
    story:
      'Carla Pellet lies in the kitchen, and the fire is still burning. Whoever stands beside the generator makes noise.',
  },

  // 18 Quarantine Zone
  'event-18-spore-zone-1': {
    title: 'The Clacker',
    story:
      "Boston's quarantine zone, twenty years after the outbreak. The body of a Clacker lies on the ground. The radio crackles in the spore fog: a few words of the clues stay blacked out.",
  },
  'event-18-spore-zone-2': {
    title: 'The Master of Traps',
    story:
      'Billy walked into his own trap. The spore fog muddies the radio — a word here and there drops out of the clues.',
  },
  'event-18-spore-zone-3': {
    title: 'Two Brothers',
    story:
      'Hank stayed beside his kid brother in the lodgings, where the radio was still crackling. The spore fog blacks out some words of the clues.',
  },
  'event-18-spore-zone-4': {
    title: 'Lanterns in the Dark',
    story:
      'Marlena set out toward the hospital but never got there. The radio crackles, and the words smear.',
  },
  'event-18-spore-zone-5': {
    title: 'A Long Road',
    story:
      'Addie Anders set out on a long journey and did not return. The spore fog swallows a few words of the clues.',
  },

  // 19 Magic Academy
  'event-19-wizard-school-1': {
    title: 'The Grand Hall',
    story:
      "Lord Mortivar lies dead at Ravenwick School of Magic. The Adventurers' Map shows only one room sharply at a time — switch rooms, and the other clues fade.",
  },
  'event-19-wizard-school-2': {
    title: 'The Forbidden Potion',
    story:
      "Drake Malgrave stayed in the dark corridor when the torches went out. The Adventurers' Map shows one room sharply at a time.",
  },
  'event-19-wizard-school-3': {
    title: 'The Shadow Prince',
    story: 'Severin Viper lies in the dark, and the map is silent. Switch rooms, and the other clues fade.',
  },
  'event-19-wizard-school-4': {
    title: 'Open Door',
    story:
      "Haldric lay in front of the door, his keys beside him. The Adventurers' Map shows only one room sharply.",
  },
  'event-19-wizard-school-5': {
    title: 'The Highest Point',
    story:
      "Albin Bumblewick left the castle from the highest point. The Adventurers' Map shows only one room at a time.",
  },
}

// ---------------------------------------------------------------------------------------------------------------------
// Classic mode: everyday themes, title suffixes, story templates, bonus puzzles
// ---------------------------------------------------------------------------------------------------------------------

const T = (title: string, place: string, who: string): EnTheme => ({ title, place, who, whoObj: who })

export const EN_THEMES: Record<string, EnTheme> = {
  'flower-store': T('The Flower Shop', 'at the flower shop', 'one of the employees'),
  playground: T('The Playground', 'at the playground', 'an adult'),
  apartment: T('The Apartment', 'in the apartment', 'the apartment owner'),
  restaurant: T('The Restaurant', 'at the restaurant', 'the head chef'),
  school: T('The School', 'at the school', 'the principal'),
  library: T('The Library', 'at the library', 'the librarian'),
  beach: T('The Beach', 'at the beach', 'the lifeguard'),
  zoo: T('The Zoo', 'at the zoo', 'one of the keepers'),
  'amusement-park': T('The Amusement Park', 'at the amusement park', 'the park operator'),
  hotel: T('The Hotel', 'at the hotel', 'the hotel manager'),
  bakery: T('The Bakery', 'at the bakery', 'the baker'),
  hospital: T('The Hospital', 'at the hospital', 'the on-call doctor'),
  museum: T('The Museum', 'at the museum', 'the gallery attendant'),
  cinema: T('The Cinema', 'at the cinema', 'the ticket taker'),
  gym: T('The Gym', 'at the gym', 'the trainer'),
  farm: T('The Farm', 'on the farm', 'the farmer'),
  station: T('The Train Station', 'at the train station', 'the station dispatcher'),
  airport: T('The Airport', 'at the airport', 'one of the passengers'),
  camping: T('The Campsite', 'at the campsite', 'one of the hikers'),
  office: T('The Office', 'at the office', 'the department head'),
  stadium: T('The Stadium', 'at the stadium', 'the groundskeeper'),
  market: T('The Market', 'at the market', 'one of the vendors'),
  circus: T('The Circus', 'at the circus', 'the juggler'),
  ship: T('The Ship', 'on the ship', 'the captain'),
  salon: T('The Beauty Salon', 'at the beauty salon', 'the hairdresser'),
  garage: T('The Auto Repair Shop', 'at the auto repair shop', 'the workshop manager'),
  studio: T('The TV Studio', 'at the TV studio', 'the show host'),
  manor: T('The Manor', 'at the manor', 'the master of the manor'),
  vet: T("The Vet's Office", "at the vet's office", "the vet's assistant"),
  factory: T('The Factory', 'at the factory', 'the shift manager'),
  // bonus puzzles
  'last-call': T('Last Call', 'at the Crossroads Bar', 'the bartender'),
  'sunken-mill': T('The Sunken Mill', 'at the sunken mill', 'the old mill keeper'),
}

/** Translation of `WHEN` in classic.ts (same length and order; index 0 is the empty suffix). */
export const EN_WHEN: string[] = [
  '',
  ' – morning',
  ' – evening',
  ' – weekend',
  ' – holiday',
  ' – after closing',
  ' – before opening',
  ' – rainy day',
]

/** Four story templates mirroring `story()` in classic.ts; the Hungarian code picks the variant by `(use + nn) % 4`. */
export const EN_CLASSIC_STORY: Array<(t: EnTheme) => string> = [
  (t) => `After closing time ${t.place}, ${t.who} lay dead. Only a few people were around today.`,
  (t) =>
    `In the morning, they found ${t.whoObj} dead ${t.place}. Everyone pretends not to have seen anything.`,
  (t) => `On Saturday evening ${t.place}, ${t.who} never made it home. Someone was left alone with them.`,
  (t) =>
    `It was a holiday ${t.place}, and ${t.who} never spoke again. Hardly a trace was left, but those present remember.`,
]

export const EN_BONUS: Record<string, { title: string; story: string }> = {
  'bonus-01-last-call': {
    title: 'Last Call',
    story:
      'The Crossroads Bar has closed for the night, but the bartender never made it home. All that was left behind the bar was a full glass.',
  },
  'bonus-02-sunken-mill': {
    title: 'The Sunken Mill',
    story:
      "The swamp has given back the mill's old keeper. The mill wheel has been turning ever since, although the water dried up long ago.",
  },
}
