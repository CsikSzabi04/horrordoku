import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNav } from '../../app/nav'
import { Board } from '../../components/Board/Board'
import type { Tool } from '../../components/Board/Board'
import { FinishModal } from '../../components/FinishModal'
import { GameFrame, GameHeader } from '../../components/GameFrame'
import { Legend } from '../../components/Legend'
import { SuspectCard } from '../../components/SuspectCard'
import { Tools } from '../../components/Tools'
import { Tutorial } from '../../components/Tutorial'
import { boardEngine, CATEGORIES, codeOf, isBesideType, violations } from '../../engine'
import { buildGrid, parseCell } from '../../engine/grid'
import { isMuted, setMuted } from '../../fx/audio'
import { useFx } from '../../fx/useFx'
import type { GameBoard } from '../../game/controller'
import { markersOf } from '../../game/markers'
import { nextPuzzle } from '../../game/next'
import { useGameDark } from '../../game/theme'
import { plain } from '../../game/rich'
import { tr, useLang } from '../../game/strings'
import type { StrKey } from '../../game/strings'
import { useBoot, useRun, useView } from '../../game/useGame'
import { ruleInfo } from '../../game/worlds'
import type { CellId, CharId } from '../../shared/base'
import type { Puzzle } from '../../shared/puzzle'
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

function Game({ puzzle, board, restored, refreshed, onExit }: { puzzle: Puzzle; board: GameBoard; restored?: SessionState; refreshed?: boolean; onExit: () => void }) {
  const { go, replace } = useNav()
  const toast = useToast()
  const view = useView(board)
  const run = useRun(puzzle, board, restored)
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
  const next = useMemo(() => nextPuzzle(puzzle), [puzzle])
  const [legendFocus, setLegendFocus] = useState<string | null>(null)
  const verdictFor = useRef<unknown>(null)

  const person = puzzle.mode === 'classic' || puzzle.mode === 'bonus'
  const grid = useMemo(() => buildGrid(puzzle), [puzzle])
  const markers = useMemo(() => markersOf(puzzle), [puzzle])
  const ordered = useMemo(() => [...puzzle.characters.filter((c) => !c.victim), ...puzzle.characters.filter((c) => c.victim)], [puzzle])
  const placed = view.state.placed
  const bad = useMemo(() => new Set(violations(puzzle, placed)), [puzzle, placed])
  const complete = boardEngine.isComplete(puzzle, view.state)
  const done = run.finish !== null
  const byCell = useMemo(() => new Map(Object.entries(placed).map(([c, cell]) => [cell, c])), [placed])
  const isBlocked = useCallback(
    (cell: CellId) => {
      const { r, c } = parseCell(cell)
      return grid.blocked[r]![c]! || view.vanished.includes(cell) || view.locked.includes(cell)
    },
    [grid, view.vanished, view.locked],
  )
  /** Rövid koppintás: az eszköz szerint betű-jegyzet, ✕ vagy radír; lerakott karakterre koppintva felvesszük. */
  const onTap = (cell: CellId) => {
    if (done) return
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

  /** Beküldés (mint a murdoku.com-on): a jó helyen állók zöld, a rosszak piros karikát kapnak, és a játékos dönt: elölről kezdi, vagy megnézi úgy, ahogy hagyta. */
  const doSubmit = () => {
    const res = run.submit()
    if (res === null) return
    const { wrongChars } = boardEngine.check(puzzle, board.getState())
    setVerdict(Object.fromEntries(puzzle.characters.map((c) => [c.id, wrongChars.includes(c.id) ? 'bad' : 'ok'])) as Record<CharId, 'ok' | 'bad'>)
    if (res) fx.win()
    else {
      verdictFor.current = board.getState()
      setVerdictOpen(true)
      fx.wrong()
    }
  }
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
  const focusTypes = useMemo(() => {
    const set = new Set<string>()
    if (legendFocus) set.add(legendFocus)
    for (const cl of puzzle.characters.find((c) => c.id === sel)?.clues ?? []) {
      if ('object' in cl) set.add(cl.object)
      if ('objects' in cl) cl.objects.forEach((o) => set.add(o))
      if ('fromObject' in cl) set.add(cl.fromObject)
      if ('cat' in cl) for (const t of CATEGORIES[cl.cat]?.types ?? []) set.add(t)
    }
    return [...set]
  }, [legendFocus, sel, puzzle])
  const selClues = useMemo(() => puzzle.characters.find((c) => c.id === sel)?.clues ?? [], [puzzle, sel])
  const focusFloors = useMemo(() => selClues.flatMap((cl) => (cl.kind === 'terrain' ? [cl.style] : [])), [selClues])
  const focusChars = useMemo(() => selClues.flatMap((cl) => ('of' in cl ? [cl.of] : 'with' in cl ? [cl.with] : 'char' in cl ? [cl.char] : [])), [selClues])
  const focusLines = useMemo(
    () => selClues.flatMap((cl) => (cl.kind === 'line' ? [{ axis: cl.axis, n: cl.n }] : cl.kind === 'col' ? [{ axis: 'col' as const, n: cl.n }] : cl.kind === 'row' ? [{ axis: 'row' as const, n: cl.n }] : [])),
    [selClues],
  )
  const doShare = () => {
    const code = codeOf(puzzle.id)
    void navigator.clipboard?.writeText(code ?? puzzle.id)
    toast(code ? t('codeCopied') : t('idCopied'))
  }
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

  const murderer = puzzle.characters.find((c) => c.id === puzzle.murderer)
  const rule = ruleInfo(puzzle.world, puzzle.worldRule)

  return (
    <GameFrame
      theme={person ? 'classic' : 'horror'}
      dark={dark}
      header={
        <GameHeader
          title={puzzle.title}
          subtitle={`${puzzle.size}×${puzzle.size}`}
          time={fmt(run.elapsed)}
          onBack={onExit}
          backLabel={t('back')}
          lang={lang}
          onLang={setLang}
          languageLabel={t('language')}
          dark={dark}
          onDark={person ? setDark : undefined}
          darkLabel={t('darkMode')}
        />
      }
      intro={
        <>
          {puzzle.story && <p className="gf-intro">{puzzle.story}</p>}
          {rule && (
            <p className="gf-intro rule" data-rule={puzzle.worldRule}>
              <b>{rule.name}</b>
              {rule.text}
            </p>
          )}
          {puzzle.worldRule === 'cameras' && (
            <>
              <div className="cams" role="radiogroup" aria-label="Kamera">
                <button type="button" role="radio" aria-checked={cam === null} className={cam === null ? 'on' : ''} data-cam-all onClick={() => setCam(null)}>
                  {t('camAll')}
                </button>
                {Object.entries(puzzle.rooms).map(([l, nm]) => (
                  <button key={l} type="button" role="radio" aria-checked={cam === l} className={cam === l ? 'on' : ''} data-cam={l} onClick={() => setCam(l)}>
                    📹 {nm}
                  </button>
                ))}
              </div>
              <small className="cams-help">{t('camHelp')}</small>
            </>
          )}
          {run.finish === 'gaveUp' && (
            <p className="gf-intro" data-result="gaveup">
              {t('gaveUp')} <b>{murderer?.name}</b>.
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
                index={i}
                marker={markers.get(c.id)!}
                person={person}
                selected={sel === c.id}
                placedAt={placed[c.id]}
                bad={bad.has(c.id)}
                override={view.clueOverrides[c.id]}
                pulse={pulse === c.id}
                dim={puzzle.worldRule === 'cameras' && cam !== null && c.clues.some((cl) => 'room' in cl && !!cl.room && cl.room !== cam)}
                unlocked={!!placed[c.id] && isBesideType(puzzle, placed[c.id]!, 'totem')}
                delay={150 + i * 50}
                victimLabel={t('victim')}
                lockedText="🔒 Zárolt nyom — tedd egy totem mellé."
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
          person={person}
          floors={person}
          tool={tool}
          highlightRoom={room ?? (puzzle.worldRule === 'cameras' ? cam : null)}
          fog={puzzle.worldRule === 'nightvision'}
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
          canRedo={view.canRedo && !done}
          onUndo={() => {
            board.undo()
            fx.sfx('undo')
          }}
          onRedo={() => board.redo()}
          onClearAll={() => {
            if (board.clearAll() === null) toast(t('cleared'))
            fx.sfx('erase')
            setTool('letter')
          }}
          onHint={doHint}
          hints={run.hints}
          canSubmit={complete && !done}
          onSubmit={doSubmit}
          onHow={() => setTut(true)}
          onHelp={() => setTut(true)}
          onShare={doShare}
          onSave={() => {
            run.saveNow()
            toast(t('saved'))
          }}
          onSound={doSound}
          muted={muted}
          onSettings={() => go({ name: 'settings' })}
          disabled={done}
          extra={
            <button type="button" className="tbtn" data-act="giveup" disabled={done} onClick={() => setConfirm(true)}>
              {t('giveUp')}
            </button>
          }
        />
      }
      overlays={
        <>
          <Tutorial lang={lang} open={tut} onClose={() => { setTut(false); markTutorial() }} />
          <Modal open={confirm} onClose={() => setConfirm(false)}>
            <div className="tutorial">
              <h3>{t('giveUpTitle')}</h3>
              <p>{t('giveUpText')}</p>
              <div className="row">
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>{t('cancel')}</Button>
                <Button size="sm" onClick={() => { setConfirm(false); run.giveUp() }} data-act="giveup-yes">{t('giveUp')}</Button>
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
                <Button variant="ghost" size="sm" data-act="verdict-restart" onClick={() => { setVerdictOpen(false); setVerdict(null); board.clearAll() }}>{t('restart')}</Button>
                <Button size="sm" data-act="verdict-look" onClick={() => setVerdictOpen(false)}>{t('keepLooking')}</Button>
              </div>
            </div>
          </Modal>
          <FinishModal
            open={finishOpen && run.finish !== null}
            won={run.finish === 'won'}
            puzzle={puzzle}
            murderer={murderer?.name}
            elapsed={run.elapsed}
            hints={run.hints}
            wrong={run.wrong}
            reward={run.reward}
            lang={lang}
            next={next}
            onClose={() => setFinishOpen(false)}
            onMenu={onExit}
            onNext={(p) => replace({ name: 'game', ref: p.id })}
          />
        </>
      }
    />
  )
}
