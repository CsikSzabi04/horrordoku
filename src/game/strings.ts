import { useCallback, useEffect, useState } from 'react'
import { getStorage } from '../storage'

export type Lang = 'hu' | 'en'

/** A játékképernyő felirata két nyelven (a nyomkártyák szövege a pályával jön, az egyelőre magyar). */
const S = {
  hu: {
    back: 'Vissza a menübe', suspects: 'Gyanúsítottak', suspectsHint: 'kattints a kiválasztáshoz, tartsd nyomva a rácson az elhelyezéshez',
    tools: 'Eszközök', xTool: 'Kizárás (✕)', erase: 'Radír', eraseHint: 'tartsd nyomva az összes mező törléséhez', undo: 'Visszavonás', redo: 'Újra',
    hint: 'Tipp', submit: 'Beküldés', submitHint: '(előbb helyezd el mindet)', how: 'Hogyan kell játszani', help: 'Súgó', share: 'Megosztás',
    save: 'Mentés', saved: 'Elmentve ✔', sound: 'Hang', soundOff: 'Hang kikapcsolva', settings: 'Beállítások', victim: 'Az áldozat', giveUp: 'Feladom',
    giveUpTitle: 'Feladod?', giveUpText: 'A megoldás megjelenik, a futás feladottként kerül a naplóba.', cancel: 'Mégse', solved: 'Ügy lezárva',
    murderer: 'A gyilkos', time: 'Idő', hints: 'Tipp', wrong: 'Hibás beküldés', toMenu: 'Vissza a menübe', notFound: 'Ez a pálya nem található.', loading: 'Betöltés…',
    pickFirst: 'Előbb válassz egy szereplőt a kártyák közül.', wrongSubmit: 'Nem stimmel — valaki rossz helyen áll.', noHint: 'Nincs több tipp.',
    codeCopied: 'Ügykód a vágólapon.', idCopied: 'Pálya-azonosító a vágólapon.', cleared: 'Minden törölve.', refreshed: 'A pálya közben frissült — a korábbi lerakások nem illenek rá, új játék indult.', coopMembers: 'Játékosok', coopChat: 'Chat', coopChatPh: 'Üzenet…', coopSend: 'Küldés', coopProposes: 'beküldést javasol', coopApprove: 'Jóváhagyom', coopObject: 'Nem', coopVoted: 'Szavaztál — várjuk a többieket…', coopWaiting: 'Beküldés javasolva — a társak jóváhagyására vár…', coopRejected: 'A beküldést a többiek nem erősítették meg.', coopNoHints: 'Elfogyott a közös tippkeret.', coopHintsLeft: 'Közös tippkeret', roomCopied: 'Szobakód a vágólapon.', coopEnded: 'A host lezárta a játékot.', coopSaved: 'A közös játékot a szoba menti.', coopOnlyHost: 'A játékot csak a host zárhatja le.', coopBack: 'Vissza a szobához', coopWho: 'te', language: 'Nyelv', darkMode: 'Sötét mód',
    skip: 'Kihagyom', legend: 'Jelmagyarázat', legendHint: 'a szaggatott keret a kijelölt kártya nyomában említett tárgyakat mutatja', blockedNote: 'foglalt: ide senki nem állhat',
    notQuite: 'Nem egészen jó', verdictText: 'Zölddel a helyes, pirossal a rossz helyen álló szereplők.', restart: 'Elölről kezdem', keepLooking: 'Megnézem, ahogy hagytam', correctN: 'helyes',
    fGaveUp: 'Feladott ügy', fBest: 'Legjobb idő', fNewBest: 'Új legjobb idő!', fXpNote: 'tipp nélkül +25%', fXpRepeat: 'Már megoldott ügy — újabb XP nincs.', fXpGaveUp: 'Feladott ügyért nem jár XP.',
    fProfile: 'Profilod', fGuest: 'Vendég', fProgress: 'Haladásod', fSolvedOf: 'megoldva', fSolvedTotal: 'Összes megoldott ügy', fClassic: 'Klasszikus', fEvent: 'Esemény',
    fLook: 'Megnézem a táblát', fMenu: 'Menü', fNext: 'Folytatás', fNextUp: 'Következő',
    rank0: 'Újonc nyomozó', rank1: 'Éjjeli Őr', rank2: 'Hollowmere-i Nyomozó', rank3: 'Vérhold-vadász', rank4: 'A Kilencedik Szem',
    camAll: 'Mind', camHelp: 'Segítség: a „Mind” mindent mutat. Egy helyiséget választva a térképen kiemelődik, a többi helyiség nyomai halványak — de bárkit letehetsz bárhová.', wrongN: 'rossz', prev: '← Vissza', next: 'Tovább →', start: 'Kezdjük', gaveUp: 'A megoldás: a gyilkos',
  },
  en: {
    back: 'Back to menu', suspects: 'Suspects', suspectsHint: 'click to select, press and hold on the grid to place',
    tools: 'Tools', xTool: 'Cross out (✕)', erase: 'Eraser', eraseHint: 'press and hold to clear all cells', undo: 'Undo', redo: 'Redo',
    hint: 'Hint', submit: 'Submit', submitHint: '(place everyone first)', how: 'How to play', help: 'Help', share: 'Share',
    save: 'Save', saved: 'Saved ✔', sound: 'Sound', soundOff: 'Sound off', settings: 'Settings', victim: 'The victim', giveUp: 'Give up',
    giveUpTitle: 'Give up?', giveUpText: 'The solution will be shown and the run is logged as abandoned.', cancel: 'Cancel', solved: 'Case closed',
    murderer: 'The murderer', time: 'Time', hints: 'Hints', wrong: 'Wrong submits', toMenu: 'Back to menu', notFound: 'This puzzle could not be found.', loading: 'Loading…',
    pickFirst: 'Select a suspect from the cards first.', wrongSubmit: "That's not right — someone is in the wrong place.", noHint: 'No more hints.',
    codeCopied: 'Case code copied.', idCopied: 'Puzzle id copied.', cleared: 'Everything cleared.', refreshed: 'This puzzle was updated meanwhile — the old placements no longer fit, a fresh game started.', coopMembers: 'Players', coopChat: 'Chat', coopChatPh: 'Message…', coopSend: 'Send', coopProposes: 'proposes to submit', coopApprove: 'Approve', coopObject: 'No', coopVoted: 'You voted — waiting for the others…', coopWaiting: 'Submission proposed — waiting for your teammates…', coopRejected: 'The others did not confirm the submission.', coopNoHints: 'The shared hint pool is empty.', coopHintsLeft: 'Shared hints', roomCopied: 'Room code copied.', coopEnded: 'The host ended the game.', coopSaved: 'The room saves the shared game.', coopOnlyHost: 'Only the host can end the game.', coopBack: 'Back to the room', coopWho: 'you', language: 'Language', darkMode: 'Dark mode',
    skip: 'Skip', legend: 'Legend', legendHint: 'the dashed frame shows the objects mentioned in the selected card', blockedNote: 'blocked: nobody can stand here',
    notQuite: 'Not quite right', verdictText: 'Green: correct. Red: standing in the wrong place.', restart: 'Start over', keepLooking: 'Let me look as I left it', correctN: 'correct',
    fGaveUp: 'Case abandoned', fBest: 'Best time', fNewBest: 'New best time!', fXpNote: 'no hints: +25%', fXpRepeat: 'Already solved — no more XP.', fXpGaveUp: 'No XP for an abandoned case.',
    fProfile: 'Your profile', fGuest: 'Guest', fProgress: 'Your progress', fSolvedOf: 'solved', fSolvedTotal: 'Cases solved in total', fClassic: 'Classic', fEvent: 'Event',
    fLook: 'Look at the board', fMenu: 'Menu', fNext: 'Continue', fNextUp: 'Next',
    rank0: 'Rookie detective', rank1: 'Night Guard', rank2: 'Hollowmere Detective', rank3: 'Bloodhound hunter', rank4: 'The Ninth Eye',
    camAll: 'All', camHelp: 'Tip: “All” shows everything. Pick a room to light it up on the map; the other rooms’ clues fade — but you can still place anyone anywhere.', wrongN: 'wrong', prev: '← Back', next: 'Next →', start: "Let's go", gaveUp: 'The solution: the murderer was',
  },
} as const

export type StrKey = keyof (typeof S)['hu']
export const tr = (lang: Lang, key: StrKey): string => S[lang][key]

/** A nyelv a Beállításokból (`settings.language`); a váltó ide ír vissza. */
export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>('hu')
  useEffect(() => {
    const load = () => void getStorage().getSettings().then((s) => setLang(s.language))
    load()
    return getStorage().onChange((e) => e.type === 'settings' && load())
  }, [])
  const change = useCallback((l: Lang) => {
    setLang(l)
    void getStorage().patchSettings({ language: l })
  }, [])
  return [lang, change]
}
