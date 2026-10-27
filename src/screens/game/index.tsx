import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNav } from '../../app/nav'
import { errorText } from '../../cloud/errors'
import { Board } from '../../components/Board/Board'
import type { Tool } from '../../components/Board/Board'
import { CoopPanel } from '../../components/CoopPanel'
import { KillerActions, KillerEndModal, killerClock, KillerMeeting, KillerRoleCard, KillerStatus, killerWon } from '../../components/KillerHud'
import { FinishModal } from '../../components/FinishModal'
import { GameFooter, GameFrame, GameHeader } from '../../components/GameFrame'
import { Legend } from '../../components/Legend'
import { SuspectCard } from '../../components/SuspectCard'
import { Tools } from '../../components/Tools'
import { Tutorial } from '../../components/Tutorial'
import { HINTS_PER_PLAYER } from '../../game/coop'
import { boardEngine, CATEGORIES, isBesideType, violations } from '../../engine'
import { buildGrid, parseCell } from '../../engine/grid'
import { isMuted, setMuted } from '../../fx/audio'
import { useFx } from '../../fx/useFx'
import type { GameBoard } from '../../game/controller'
import { kt } from '../../game/killerStrings'
import { charColors } from '../../game/charColor'
import { markersOf } from '../../game/markers'
import { useKiller } from '../../game/useKiller'
import { listPuzzles } from '../../content/catalog'
import { nextPuzzle } from '../../game/next'
import { readableClues } from '../../game/readableClues'
import { useGameDark } from '../../game/theme'
import { plain } from '../../game/rich'
import { tr, useLang } from '../../game/strings'
import type { StrKey } from '../../game/strings'
import type { Proposal } from '../../game/coop'
import { useBoot, useRun, useView } from '../../game/useGame'
import type { CoopRun } from '../../game/useGame'
import { ruleInfo } from '../../game/worlds'
import { charName, puzzleStory, puzzleTitle, roomName } from '../../content/localize'
import { pick as byLang } from '../../i18n/lang'
import type { CellId, CharId } from '../../shared/base'
import type { Puzzle } from '../../shared/puzzle'
import type { KillerSession, RoomMember, RoomSession } from '../../shared/room'
import type { SessionState } from '../../shared/storage'
import { Button, Modal, Panel, useToast } from '../../ui'
import './game.css'

const TUT_KEY = 'nd_tutorial'
const seenTutorial = () => {
  try {
    return localStorage.getItem(TUT_KEY) === '1'
  } catch {
    return true
  }
}
const markTutorial = () => {
  try {
    localStorage.setItem(TUT_KEY, '1')
  } catch {
    /* tiltott tároló: a bemutató legközelebb is megjelenik */
  }
}
const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function GameScreen() {
  const { route, back } = useNav()
  const boot = useBoot(route.name === 'game' ? route.ref : undefined)
  const [lang] = useLang()
  if (boot === null) return <main className="game-msg">{tr(lang, 'loading')}</main>
  if (boot === 'missing')
    return (
      <main className="game-msg">
        <Panel tag="HIBA">
          <p>{tr(lang, 'notFound')}</p>
          <Button onClick={back}>← {tr(lang, 'back')}</Button>
        </Panel>
      </main>
    )
  return <Game key={boot.puzzle.id} puzzle={boot.puzzle} board={boot.board} restored={boot.session} refreshed={boot.refreshed} onExit={back} />
}

/** Együtt mód: a szoba közös játéka (a `screens/coop/CoopGame.tsx` állítja össze). */
export interface CoopCtx {
  run: CoopRun
  session: RoomSession
  meId: string
  members: RoomMember[]
  /** A szoba visszaállt lobbyba (a host lezárta a játékot). */
  ended: boolean
  /** A host a következő pályára viszi a szobát (átállítja a pályát és újraindítja a játékot). */
  onNext: (ref: string) => Promise<void>
  /** Gyilkos-mód: a szerver-oldali játék kliense (szerep, képességek, Gyűlés, beküldés). */
  killer?: { session: KillerSession }
}

export function Game({ puzzle, board, restored, refreshed, coop, onExit }: { puzzle: Puzzle; board: GameBoard; restored?: SessionState; refreshed?: boolean; coop?: CoopCtx; onExit: () => void }) {
  const { go, replace } = useNav()
  const toast = useToast()
  const view = useView(board)
  const run = useRun(puzzle, board, restored, coop?.run)
  const fx = useFx(puzzle, Object.keys(view.state.placed).length)
  const [lang, setLang] = useLang()
  const [dark, setDark] = useGameDark()
  const t = useCallback((k: StrKey) => tr(lang, k), [lang])
  const [tool, setTool] = useState<Tool>('letter')
  const [sel, setSel] = useState<CharId | null>(null)
  const [tut, setTut] = useState(() => !seenTutorial() && !restored)
  useEffect(() => {
    if (refreshed) toast(tr(lang, 'refreshed'), { ms: 8000, key: 'refreshed' })
  }, [refreshed])
  const [confirm, setConfirm] = useState(false)
  const [room, setRoom] = useState<string | null>(null)
  const [pulse, setPulse] = useState<CharId | null>(null)
  const [muted, setMutedState] = useState(isMuted())
  const [cam, setCam] = useState<string | null>(null) // null = „Mind”: semmi sem halvány
  const [verdict, setVerdict] = useState<Record<CharId, 'ok' | 'bad'> | null>(null)
  const [verdictOpen, setVerdictOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  // Együtt: a host viszi tovább a szobát; ha a pályának nincs „következője” (bónusz), az első Klasszikus ügyre ugrik
  const next = useMemo(() => nextPuzzle(puzzle) ?? (coop ? (listPuzzles('classic')[0] ?? null) : null), [puzzle, coop])
  const [legendFocus, setLegendFocus] = useState<string | null>(null)
  const verdictFor = useRef<unknown>(null)
  // Gyilkos-mód
  const kui = useKiller(coop?.killer?.session, board, coop?.members ?? [], lang)
  const [pick, setPick] = useState<'vanish' | null>(null) // az Eltüntetés célzó módja: a következő koppintás a térképen a célpont
  const [endOpen, setEndOpen] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const kt2 = useCallback((k: Parameters<typeof kt>[1]) => kt(lang, k), [lang])

  const person = puzzle.mode === 'classic' || puzzle.mode === 'bonus'
  const grid = useMemo(() => buildGrid(puzzle), [puzzle])
  const markers = useMemo(() => markersOf(puzzle), [puzzle, lang])
  const colors = useMemo(() => charColors(puzzle.characters, person), [puzzle, person]) // minden karakternek saját színe van (a kezdőbetűje is ezt kapja)
  const ordered = useMemo(() => [...puzzle.characters.filter((c) => !c.victim), ...puzzle.characters.filter((c) => c.victim)], [puzzle])
  const placed = view.state.placed
  const bad = useMemo(() => new Set(violations(puzzle, placed)), [puzzle, placed])
  const complete = boardEngine.isComplete(puzzle, view.state)
  const done = run.finish !== null
  const byCell = useMemo(() => new Map(Object.entries(placed).map(([c, cell]) => [cell, c])), [placed])
  const isBlocked = useCallback(
    (cell: CellId) => {
      const { r, c } = parseCell(cell)
      return (grid.blocked[r]![c]! && !view.vanished.includes(cell)) || view.locked.includes(cell) // eltűnt tárgy: szabad csapda-mező
    },
    [grid, view.vanished, view.locked],
  )
  /** Rövid koppintás: az eszköz szerint betű-jegyzet, ✕ vagy radír; lerakott karakterre koppintva felvesszük. */
  const onTap = (cell: CellId) => {
    if (done) return
    if (pick === 'vanish' && coop?.killer) {
      const { r, c } = parseCell(cell)
      if (!grid.blocked[r]![c]! || view.vanished.includes(cell) || view.locked.includes(cell)) return toast(kt2('abNoObject'))
      setPick(null)
      void coop.killer.session.useAbility('vanish', { cell }).then((res) => !res.ok && toast(errorText(res)))
      return
    }
    board.moveCursor(cell)
    const occupant = byCell.get(cell)
    setRoom(null)
    if (tool === 'x') {
      if (occupant || isBlocked(cell)) return
      board.act({ op: 'mark', cell, on: !view.state.marks.includes(cell) })
      fx.sfx('mark')
      return
    }
    if (tool === 'erase') {
      board.act({ op: 'erase', cell })
      fx.sfx('erase')
      return
    }
    if (occupant) {
      board.act({ op: 'unplace', char: occupant })
      setSel(occupant)
      fx.sfx('select')
      return
    }
    if (!sel) {
      toast(t('pickFirst'))
      return
    }
    if (isBlocked(cell)) return // foglalt / zárolt mező: nem történik semmi (se felirat, se rázkódás)
    const cur = view.state.notes[cell] ?? []
    board.act({ op: 'note', cell, chars: cur.includes(sel) ? cur.filter((c) => c !== sel) : [...cur, sel] })
    fx.sfx('mark')
  }

  /** Hosszú nyomás (vagy Enter): a kiválasztott karakter tényleges lerakása. */
  const onHold = (cell: CellId) => {
    if (done || tool !== 'letter') return
    if (!sel) {
      toast(t('pickFirst'))
      return
    }
    const err = board.act({ op: 'place', char: sel, cell })
    if (err) return // oda nem rakható: csendben nem rakjuk le (se felirat, se rázkódás)
    setSel(null)
    fx.sfx('place')
  }

  const doHint = () => {
    const h = run.hint(sel ?? undefined)
    if (!h) {
      toast(t('noHint'))
      return
    }
    fx.sfx('hint')
    // a tipp hosszan, ~10 mp-ig látszik, hogy el lehessen olvasni; az új tipp a régit váltja
    toast(`💡 ${plain(h.text)}`, { ms: 10_000, key: 'hint' })
    setRoom(h.room && !h.ops ? h.room : null)
    setPulse(h.char)
    setTimeout(() => setPulse(null), 2200)
  }

  /** A beküldés eredménye (mint a murdoku.com-on): a jó helyen állók zöld, a rosszak piros karikát kapnak, és a játékos dönt: elölről kezdi, vagy megnézi úgy, ahogy hagyta. */
  const showVerdict = (res: boolean) => {
    const { wrongChars } = boardEngine.check(puzzle, board.getState())
    setVerdict(Object.fromEntries(puzzle.characters.map((c) => [c.id, wrongChars.includes(c.id) ? 'bad' : 'ok'])) as Record<CharId, 'ok' | 'bad'>)
    if (res) fx.win()
    else {
      verdictFor.current = board.getState()
      setVerdictOpen(true)
      fx.wrong()
    }
  }
  const doSubmit = () => {
    const res = run.submit()
    if (res === null) {
      if (coop) toast(t('coopWaiting')) // közös beküldés: az eredmény a jóváhagyás után érkezik
      return
    }
    showVerdict(res)
  }

  // ---- Együtt: közös beküldés (szavazás), eredmény, a játék lezárása
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [voted, setVoted] = useState(false)
  const latest = useRef({ applyResult: run.applyResult, endKiller: run.endKiller, showVerdict, giveUp: run.giveUp, finish: run.finish })
  latest.current = { applyResult: run.applyResult, endKiller: run.endKiller, showVerdict, giveUp: run.giveUp, finish: run.finish }
  useEffect(() => {
    const sync = coop?.run.sync
    if (!sync) return
    const offs = [
      sync.onProposal((p) => {
        setProposal(p)
        setVoted(sync.hasVoted())
      }),
      sync.onResult((r) => {
        if (coop?.killer && r.correct) return latest.current.showVerdict(true) // Gyilkos: a játék az Epilógus után ér véget (a szerver zárja)
        latest.current.applyResult(r.correct)
        latest.current.showVerdict(r.correct)
      }),
      sync.onRejected(() => toast(tr(lang, 'coopRejected'))),
      ...('onVerifying' in sync ? [(sync as { onVerifying: (cb: (v: boolean) => void) => () => void }).onVerifying(setVerifying)] : []),
      ...('onError' in sync ? [(sync as { onError: (cb: (m: string) => void) => () => void }).onError((m) => toast(errorText({ code: 'invalid', message: m })))] : []),
    ]
    return () => offs.forEach((off) => off())
  }, [coop?.run.sync])
  useEffect(() => {
    if (!coop?.ended || coop.killer) return
    // a szoba lezárása és a közös beküldés eredménye külön úton érkezik: egy kis türelem, hogy a győzelem ne feladásnak látsszon
    const id = setTimeout(() => {
      if (latest.current.finish === null) {
        toast(tr(lang, 'coopEnded'))
        latest.current.giveUp()
      }
    }, 1500)
    return () => clearTimeout(id)
  }, [coop?.ended])
  // Gyilkos-mód: a szerver kimondta a végeredményt → a futás lezárul (RunRecord: kind 'killer', szerep, won), a vég-ablak megnyílik
  useEffect(() => {
    if (!kui.end || !kui.role) return
    latest.current.endKiller({ solved: kui.end.outcome === 'detectives' || kui.end.outcome === 'draw', won: killerWon(kui.end, kui.role), role: kui.role })
    setEndOpen(true)
  }, [kui.end])
  // a karikák addig maradnak, amíg a játékos a táblához nem nyúl
  useEffect(() => {
    if (verdict && !done && view.state !== verdictFor.current) setVerdict(null)
  }, [view.state])
  // győzelemnél a zöld karikák látszanak egy kicsit, csak utána jön az ablak; feladásnál hamarabb
  useEffect(() => {
    if (run.finish === null) return
    const id = setTimeout(() => setFinishOpen(true), run.finish === 'won' ? 1300 : 700)
    return () => clearTimeout(id)
  }, [run.finish])
  // A kijelölt kártya nyomai, amiket a térképen kiemelünk. A kitakart (███) és a még zárolt (🔒) nyom — vagy a Gyilkos-mód szövegcseréje — mögött
  // álló tárgyat / padlót / sort / szereplőt NEM emeljük ki: a kiemelés elárulná azt, amit a kártya épp elrejt.
  const selClues = useMemo(() => {
    const ch = puzzle.characters.find((c) => c.id === sel)
    if (!ch || view.clueOverrides[ch.id]) return []
    return readableClues(ch, !!placed[ch.id] && isBesideType(puzzle, placed[ch.id]!, 'totem'))
  }, [puzzle, sel, placed, view.clueOverrides])
  const focusTypes = useMemo(() => {
    const set = new Set<string>()
    if (legendFocus) set.add(legendFocus)
    for (const cl of selClues) {
      if ('object' in cl) set.add(cl.object)
      if ('objects' in cl) cl.objects.forEach((o) => set.add(o))
      if ('fromObject' in cl) set.add(cl.fromObject)
      if ('cat' in cl) for (const t of CATEGORIES[cl.cat]?.types ?? []) set.add(t)
    }
    return [...set]
  }, [legendFocus, selClues])
  const focusFloors = useMemo(() => selClues.flatMap((cl) => (cl.kind === 'terrain' ? [cl.style] : [])), [selClues])
  const focusChars = useMemo(() => selClues.flatMap((cl) => ('of' in cl ? [cl.of] : 'with' in cl ? [cl.with] : 'char' in cl ? [cl.char] : [])), [selClues])
  const focusLines = useMemo(
    () => selClues.flatMap((cl) => (cl.kind === 'line' ? [{ axis: cl.axis, n: cl.n }] : cl.kind === 'col' ? [{ axis: 'col' as const, n: cl.n }] : cl.kind === 'row' ? [{ axis: 'row' as const, n: cl.n }] : [])),
    [selClues],
  )
  const doSound = () => {
    setMuted(!muted)
    setMutedState(!muted)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.ctrlKey || e.metaKey || e.altKey || el.tagName === 'INPUT' || el.tagName === 'SELECT') return
      const k = e.key.toLowerCase()
      const num = Number(k)
      if (num >= 1 && num <= ordered.length) setSel(ordered[num - 1]!.id)
      else if (k === 'escape') {
        setSel(null)
        setTool('letter')
      } else if (k === 'x') setTool((v) => (v === 'x' ? 'letter' : 'x'))
      else if (k === 'e') setTool((v) => (v === 'erase' ? 'letter' : 'erase'))
      else if (k === 'z') board.undo()
      else if (k === 'y') board.redo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [board, ordered])

  // Gyilkos-mód „Névvel mutatott lerakások” (lobby-opció, alapból ki): ki rakta le a karaktert, a színével
  const placerColors =
    coop?.killer && kui.state?.showPlacers && coop.run.sync.placers
      ? Object.fromEntries(Object.entries(coop.run.sync.placers()).map(([ch, uid]) => [ch, coop.members.find((m) => m.userId === uid)?.color ?? '']).filter(([, col]) => col))
      : undefined
  const murderer = puzzle.characters.find((c) => c.id === puzzle.murderer)
  const rule = ruleInfo(puzzle.world, puzzle.worldRule)

  return (
    <GameFrame
      theme={person ? 'classic' : 'horror'}
      dark={dark}
      header={
        <GameHeader title={puzzleTitle(puzzle)} subtitle={`${puzzle.size}×${puzzle.size}`} onBack={onExit} backLabel={t('back')} />
      }
      footer={
        <GameFooter
          time={(coop?.killer && killerClock(kui)) || fmt(run.elapsed)}
          lang={lang}
          onLang={setLang}
          languageLabel={t('language')}
          dark={dark}
          onDark={person ? setDark : undefined}
          darkLabel={t('darkMode')}
          muted={muted}
          onSound={doSound}
          soundLabel={t('sound')}
          onSettings={() => go({ name: 'settings' })}
          settingsLabel={t('settings')}
          hideSettings={!!coop}
        />
      }
      intro={
        <>
          {puzzle.story && <p className="gf-intro">{puzzleStory(puzzle)}</p>}
          {coop?.killer && <KillerStatus lang={lang} ui={kui} silenced={view.silenced} verifying={verifying} />}
          {coop && (
            <CoopPanel
              lang={lang}
              session={coop.session}
              meId={coop.meId}
              members={coop.members}
              proposal={proposal}
              voted={voted}
              hintsLeft={Math.max(0, coop.members.length * HINTS_PER_PLAYER - run.hints)}
              onVote={(yes) => {
                coop.run.sync.vote(yes)
                setVoted(true)
              }}
              {...(coop.killer
                ? {
                    system: kui.log,
                    extra: <KillerMeeting lang={lang} ui={kui} session={coop.killer.session} members={coop.members} meId={coop.meId} toast={toast} />,
                  }
                : {})}
            />
          )}
          {rule && (
            <p className="gf-intro rule" data-rule={puzzle.worldRule}>
              <b>{rule.name}</b>
              {rule.text}
            </p>
          )}
          {puzzle.worldRule === 'cameras' && (
            <>
              <div className="cams" role="radiogroup" aria-label={byLang('Kamera', 'Camera')}>
                <button type="button" role="radio" aria-checked={cam === null} className={cam === null ? 'on' : ''} data-cam-all onClick={() => setCam(null)}>
                  {t('camAll')}
                </button>
                {Object.entries(puzzle.rooms).map(([l, nm]) => (
                  <button key={l} type="button" role="radio" aria-checked={cam === l} className={cam === l ? 'on' : ''} data-cam={l} onClick={() => setCam(l)}>
                    📹 {roomName(nm)}
                  </button>
                ))}
              </div>
              <small className="cams-help">{t('camHelp')}</small>
            </>
          )}
          {run.finish === 'gaveUp' && !coop?.killer && (
            <p className="gf-intro" data-result="gaveup">
              {t('gaveUp')} <b>{murderer && charName(murderer.id, murderer.name)}</b>.
            </p>
          )}
        </>
      }
      cards={
        <>
          <div className="cards-head">
            <b>{t('suspects')}</b>
            <small>{t('suspectsHint')}</small>
          </div>
          <div className="cards" aria-label={t('suspects')}>
            {ordered.map((c, i) => (
              <SuspectCard
                key={c.id}
                ch={c}
                puzzle={puzzle}
                index={i}
                marker={markers.get(c.id)!}
                color={colors.get(c.id)}
                person={person}
                selected={sel === c.id}
                placedAt={placed[c.id]}
                bad={bad.has(c.id)}
                override={view.clueOverrides[c.id]}
                pulse={pulse === c.id}
                flash={kui.flash === c.id}
                dim={puzzle.worldRule === 'cameras' && cam !== null && c.clues.some((cl) => 'room' in cl && !!cl.room && cl.room !== cam)}
                unlocked={!!placed[c.id] && isBesideType(puzzle, placed[c.id]!, 'totem')}
                delay={150 + i * 50}
                victimLabel={t('victim')}
                lockedText={byLang('🔒 Zárolt nyom — tedd egy totem mellé.', '🔒 Locked clue — put them next to a totem.')}
                onSelect={() => {
                  fx.sfx('select')
                  setSel((s) => (s === c.id ? null : c.id))
                  setTool('letter')
                }}
              />
            ))}
          </div>
        </>
      }
      board={
        <div className="board-stack">
        <Board
          puzzle={puzzle}
          view={view}
          selected={sel}
          markers={markers}
          colors={colors}
          person={person}
          floors={person}
          tool={tool}
          highlightRoom={room ?? (puzzle.worldRule === 'cameras' ? cam : null)}
          placers={placerColors}
          fog={puzzle.worldRule === 'nightvision'}
          revealed={!!verdict || done}
          disabled={done}
          verdict={verdict}
          focusTypes={focusTypes}
          focusFloors={focusFloors}
          focusChars={focusChars}
          focusLines={focusLines}
          onTap={onTap}
          onHold={onHold}
        />
        <Legend puzzle={puzzle} title={t('legend')} hint={t('legendHint')} blockedNote={t('blockedNote')} focus={legendFocus} onFocus={setLegendFocus} />
        </div>
      }
      tools={
        <Tools
          t={t}
          tool={tool}
          onTool={setTool}
          canUndo={view.canUndo && !done}
          onUndo={() => {
            board.undo()
            fx.sfx('undo')
          }}
          onClearAll={() => {
            if (board.clearAll() === null) toast(t('cleared'))
            fx.sfx('erase')
            setTool('letter')
          }}
          onHint={doHint}
          hints={run.hints}
          canSubmit={complete && !done && !proposal && !(coop?.killer && (kui.busy || verifying))}
          onSubmit={doSubmit}
          onHow={() => setTut(true)}
          disabled={done}
          extra={
            <>
            {coop?.killer && (
              <KillerActions lang={lang} ui={kui} session={coop.killer.session} puzzle={puzzle} selected={sel} picking={pick === 'vanish'} onPick={(on) => setPick(on ? 'vanish' : null)} toast={toast} disabled={done || view.silenced} />
            )}
            {!coop || coop.run.host ? (
              // a pálya végén (megoldva vagy feladva) a „Feladom" helyén a „Következő" áll: egyből a következő ügyre visz
              done && next ? (
                <button type="button" className="tbtn submit" data-act="next" onClick={() => (coop ? void coop.onNext(next.id) : replace({ name: 'game', ref: next.id }))}>
                  {t('fNextUp')} →
                </button>
              ) : (
                <button type="button" className="tbtn" data-act="giveup" disabled={done} onClick={() => setConfirm(true)}>
                  {coop?.killer ? kt2('abort') : t('giveUp')}
                </button>
              )
            ) : undefined}
            </>
          }
        />
      }
      overlays={
        <>
          <Tutorial lang={lang} open={tut} onClose={() => { setTut(false); markTutorial() }} />
          <Modal open={confirm} onClose={() => setConfirm(false)}>
            <div className="tutorial">
              <h3>{coop?.killer ? kt2('abortTitle') : t('giveUpTitle')}</h3>
              <p>{coop?.killer ? kt2('abortText') : t('giveUpText')}</p>
              <div className="row">
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>{t('cancel')}</Button>
                <Button size="sm" onClick={() => { setConfirm(false); if (coop?.killer) void coop.session.finish({ solved: false, ms: Math.round(run.elapsed) }); else run.giveUp() }} data-act="giveup-yes">{coop?.killer ? kt2('abort') : t('giveUp')}</Button>
              </div>
            </div>
          </Modal>
          <Modal open={verdictOpen} onClose={() => setVerdictOpen(false)}>
            <div className="tutorial verdict" data-result="verdict">
              <h3>{t('notQuite')}</h3>
              <p>{t('verdictText')}</p>
              <p className="muted">
                <span className="vok">✔ {Object.values(verdict ?? {}).filter((v) => v === 'ok').length} {t('correctN')}</span> · <span className="vbad">✘ {Object.values(verdict ?? {}).filter((v) => v === 'bad').length} {t('wrongN')}</span>
              </p>
              <div className="row">
                {!coop && <Button variant="ghost" size="sm" data-act="verdict-restart" onClick={() => { setVerdictOpen(false); setVerdict(null); board.clearAll() }}>{t('restart')}</Button>}
                <Button size="sm" data-act="verdict-look" onClick={() => setVerdictOpen(false)}>{t('keepLooking')}</Button>
              </div>
            </div>
          </Modal>
          {coop?.killer && <KillerRoleCard lang={lang} ui={kui} members={coop.members} meId={coop.meId} onClose={kui.dismissRoleCard} />}
          {coop?.killer && <KillerEndModal lang={lang} ui={kui} members={coop.members} open={endOpen && !!kui.end} reward={run.reward} onClose={() => setEndOpen(false)} onExit={onExit} />}
          <FinishModal
            open={finishOpen && run.finish !== null && !coop?.killer}
            won={run.finish === 'won'}
            puzzle={puzzle}
            murderer={murderer && charName(murderer.id, murderer.name)}
            elapsed={run.elapsed}
            hints={run.hints}
            wrong={run.wrong}
            reward={run.reward}
            lang={lang}
            next={coop && !coop.run.host ? null : next}
            note={coop && !coop.run.host ? t('coopNextWait') : undefined}
            onClose={() => setFinishOpen(false)}
            onMenu={onExit}
            onNext={(p) => (coop ? void coop.onNext(p.id) : replace({ name: 'game', ref: p.id }))}
          />
        </>
      }
    />
  )
}
