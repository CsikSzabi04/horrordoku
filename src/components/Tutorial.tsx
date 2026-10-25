import { useState } from 'react'
import { tr } from '../game/strings'
import type { Lang } from '../game/strings'
import { Button, Modal } from '../ui'

const STEPS: Record<Lang, { t: string; b: string }[]> = {
  hu: [
    { t: 'A feladat', b: 'Egy gyilkosság történt. Tedd a helyére mindenkit a térképen — a kártyák nyomai elárulják, hol volt. Az áldozattal egyedül lévő gyanúsított a gyilkos.' },
    { t: 'Sor és oszlop', b: 'Minden sorban és minden oszlopban pontosan egy ember áll (az áldozat is). Ha lerakod valakit, a sorában és oszlopában a többi mező halvány ✕-et kap.' },
    { t: 'Kiválasztás és betű', b: 'Kattints egy arcképre, aztán egy mezőre: a mezőre a karakter kezdőbetűje kerül — ez a jegyzeted („itt lehetett"). Még egy koppintás törli. Több betű is lehet egy mezőn.' },
    { t: 'Nyomok és tárgyak', b: 'A „mellett" a négy szomszédos mezőt jelenti (átlósan nem), ugyanabban a helyiségben. A tárgyak nevét a térkép alatti jelmagyarázat mutatja; a kijelölt kártya nyomában említett tárgyak szaggatott kerettel kiemelődnek. Foglalt tárgyra (sötétebb mező) senki sem állhat. Égtájak: észak = fent, dél = lent, kelet = jobbra, nyugat = balra. „Átlósan szomszédos": a négy sarok-szomszéd mező, ugyanabban a helyiségben. A „víz", „mocsár", „fű"… a helyiség padlójának mintája (a jelmagyarázat mutatja), az „állat", „növény" stb. a jelmagyarázatban felsorolt tárgyak közül bármelyik.' },
    { t: 'Lerakás: nyomva tartva', b: 'Ha biztos vagy benne, tartsd nyomva a mezőt kb. 1 másodpercig: a gyűrű megtelik, és a karakter lekerül a helyére. Egy lerakott karakterre koppintva felveheted.' },
    { t: 'Kizárás, radír, visszavonás', b: 'A ✕ eszközzel kizársz egy mezőt. A radír letörli a mezőt; a radírt nyomva tartva minden törlődik. A Visszavonás mindig egy lépést lép vissza.' },
    { t: 'Beküldés és tipp', b: 'Ha mindenki a helyén áll, a Beküldés ellenőriz. A Tipp háromszintű: először a nyomra, aztán a helyiségre mutat, végül a helyére is teszi a szereplőt.' },
  ],
  en: [
    { t: 'The goal', b: 'A murder has happened. Put everyone in their place on the map — the clue cards tell where they were. The suspect alone with the victim is the murderer.' },
    { t: 'Rows and columns', b: 'Every row and every column holds exactly one person (the victim too). Placing someone puts a faint ✕ on the rest of their row and column.' },
    { t: 'Select and letter', b: 'Click a portrait, then a cell: the character\'s initial goes into the cell — that is your note ("could be here"). Tap again to remove it. A cell can hold several letters.' },
    { t: 'Clues and objects', b: 'Beside means the four neighbouring cells (not diagonal) inside the same room. Object names are in the legend under the map; objects mentioned in the selected card get a dashed frame. Nobody can stand on a blocked (darker) cell. Compass: north = up, south = down, east = right, west = left. "Diagonal neighbour" means one of the four corner neighbours inside the same room. "Water", "swamp", "grass"… are the room floor patterns (shown in the legend); "animal", "plant" etc. mean any of the objects listed in the legend.' },
    { t: 'Placing: press and hold', b: 'When you are sure, press and hold the cell for about 1 second: the ring fills and the character is placed. Tap a placed character to pick it up.' },
    { t: 'Cross out, eraser, undo', b: 'The ✕ tool crosses out a cell. The eraser clears a cell; hold it to clear everything. Undo always steps back one move.' },
    { t: 'Submit and hint', b: 'When everyone is placed, Submit checks the answer. Hints have three levels: the clue, then the room, then the exact spot.' },
  ],
}

export function Tutorial({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: Lang }) {
  const [i, setI] = useState(0)
  const steps = STEPS[lang]
  const s = steps[i]!
  const last = i === steps.length - 1
  const close = () => {
    setI(0)
    onClose()
  }
  return (
    <Modal open={open} onClose={close}>
      <div className="tutorial" data-step={i + 1}>
        <small>
          {i + 1} / {steps.length}
        </small>
        <h3>{s.t}</h3>
        <p>{s.b}</p>
        <div className="row">
          <Button variant="ghost" size="sm" onClick={close}>{tr(lang, 'skip')}</Button>
          {i > 0 && <Button variant="ghost" size="sm" onClick={() => setI(i - 1)}>{tr(lang, 'prev')}</Button>}
          <Button size="sm" onClick={() => (last ? close() : setI(i + 1))}>{last ? tr(lang, 'start') : tr(lang, 'next')}</Button>
        </div>
      </div>
    </Modal>
  )
}
