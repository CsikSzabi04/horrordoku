import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { loadPuzzle } from '../content/catalog'
import { content } from '../content'
import { boardEngine, isDailyRef } from '../engine'
import { getStorage } from '../storage'
import type { PuzzleRef } from '../shared/base'
import type { Puzzle } from '../shared/puzzle'
import type { RunRecord, SessionState } from '../shared/storage'
import { createBoardController } from './controller'
import type { GameBoard } from './controller'
import { puzzleFingerprint } from './fingerprint'
import { awardSolve } from './rewards'
import type { Reward } from './rewards'
import { nextHint } from './hints'
import type { Hint } from './hints'

export type Boot = { puzzle: Puzzle; board: GameBoard; session?: SessionState; fp: string; refreshed?: boolean } | 'missing' | null

/** Betölti a pályát (katalógus vagy `gen:` ref) és a félbehagyott állapotot. */
export function useBoot(ref: PuzzleRef | undefined): Boot {
  const [boot, setBoot] = useState<Boot>(null)
  useEffect(() => {
    let alive = true
    let board: GameBoard | null = null
    setBoot(null)
    void (async () => {
      const puzzle = ref ? await loadPuzzle(ref) : null
      if (!puzzle) return alive ? setBoot('missing') : undefined
      const fp = puzzleFingerprint(puzzle)
      let session: SessionState | undefined = (await getStorage().getSessions()).sessions[puzzle.id]
      // a pálya közben megváltozott (frissítés): a régi lerakások nem illenek rá → friss játék
      const refreshed = !!session && session.meta?.fp !== fp
      if (refreshed) {
        session = undefined
        await getStorage().deleteSession(puzzle.id)
      }
      board = createBoardController(puzzle, session?.board)
      if (alive) setBoot({ puzzle, board, session, fp, ...(refreshed ? { refreshed } : {}) })
      else board.destroy()
    })()
    return () => {
      alive = false
      board?.destroy()
    }
  }, [ref])
  return boot
}

export const useView = (board: GameBoard) => useSyncExternalStore(board.subscribe, board.view)

export type Finish = 'won' | 'gaveUp' | null

/** Időmérő, automatikus mentés (azonnal + 3 mp-es késleltetéssel), beküldés, feladás, tippek. */
export function useRun(puzzle: Puzzle, board: GameBoard, restored?: SessionState) {
  const fp = useMemo(() => puzzleFingerprint(puzzle), [puzzle])
  const [elapsed, setElapsed] = useState(restored?.elapsedMs ?? 0)
  const [hints, setHints] = useState(restored?.hintsUsed ?? 0)
  const [wrong, setWrong] = useState(restored?.wrongSubmits ?? 0)
  const [finish, setFinish] = useState<Finish>(null)
  const [reward, setReward] = useState<Reward | null>(null)
  const live = useRef({ elapsed: restored?.elapsedMs ?? 0, hints: restored?.hintsUsed ?? 0, wrong: restored?.wrongSubmits ?? 0, finish: null as Finish })
  const startedAt = useRef(restored?.meta?.startedAt ?? new Date().toISOString())
  const stages = useRef<Record<string, number>>({})
  const kind: RunRecord['kind'] = isDailyRef(puzzle.id) ? 'daily' : puzzle.id.startsWith('gen:') ? 'random' : 'catalog'

  const save = useCallback(() => {
    if (live.current.finish) return
    void getStorage().putSession(puzzle.id, {
      elapsedMs: live.current.elapsed,
      hintsUsed: live.current.hints,
      wrongSubmits: live.current.wrong,
      board: board.getState(),
      meta: { title: puzzle.title, difficulty: puzzle.difficulty, size: puzzle.size, world: puzzle.world, startedAt: startedAt.current, fp },
      updatedAt: new Date().toISOString(),
    })
  }, [puzzle, board, fp])

  useEffect(() => {
    if (!restored) save()
    // karakter-„szerzés": az első szereplés feloldja a szereplőt a Gyűjteményben
    const known = new Set(content.characters().map((c) => c.id))
    // (a Klasszikus hétköznapi szereplői nem gyűjthetők)
    if (puzzle.mode !== 'classic' && puzzle.mode !== 'bonus') for (const c of puzzle.characters) if (known.has(c.id)) void getStorage().addUnlock('character', c.id)
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsub = board.subscribe(() => {
      clearTimeout(timer)
      timer = setTimeout(save, 3000)
    })
    let last = performance.now()
    let lastInput = last
    const touch = () => {
      lastInput = performance.now()
    }
    const inputs = ['pointerdown', 'pointermove', 'keydown', 'touchstart'] as const
    for (const ev of inputs) window.addEventListener(ev, touch, { passive: true })
    const tick = setInterval(() => {
      const now = performance.now()
      // az óra csak aktív ablaknál jár, 60 mp tétlenség után megáll
      if (document.visibilityState === 'visible' && !live.current.finish && now - lastInput < 60_000) {
        live.current.elapsed += now - last
        setElapsed(live.current.elapsed)
      }
      last = now
    }, 500)
    const flush = () => save()
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      unsub()
      clearTimeout(timer)
      clearInterval(tick)
      for (const ev of inputs) window.removeEventListener(ev, touch)
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
      save()
    }
  }, [board, save, restored, puzzle])

  const record = useCallback(
    (solved: boolean) => {
      const run: RunRecord = {
        id: crypto.randomUUID(), ref: puzzle.id, kind, difficulty: puzzle.difficulty, size: puzzle.size, solved,
        ...(solved ? { ms: Math.round(live.current.elapsed) } : {}),
        hints: live.current.hints, wrongSubmits: live.current.wrong, at: new Date().toISOString(),
      }
      // a végső idő pontosan az, amit a rekord tárol (az óra-állapot akár fél másodperccel le van maradva)
      setElapsed(live.current.elapsed)
      const st = getStorage()
      void (async () => {
        const was = kind !== 'catalog' || (await st.getProgress()).puzzles[puzzle.id]?.solved === true
        await st.recordRun(run)
        await st.deleteSession(puzzle.id)
        // XP csak katalógus-pálya első megoldásáért jár
        if (solved && kind === 'catalog') setReward(await awardSolve(st, puzzle, run.hints, was))
      })()
    },
    [puzzle, kind],
  )

  const submit = useCallback((): boolean | null => {
    const state = board.getState()
    if (live.current.finish || !boardEngine.isComplete(puzzle, state)) return null
    const { correct } = boardEngine.check(puzzle, state)
    if (correct) {
      live.current.finish = 'won'
      setFinish('won')
      record(true)
    } else {
      live.current.wrong++
      setWrong(live.current.wrong)
      save()
    }
    board.showSubmitResult({ correct })
    return correct
  }, [board, puzzle, record, save])

  const giveUp = useCallback(() => {
    if (live.current.finish) return
    live.current.finish = 'gaveUp'
    setFinish('gaveUp')
    record(false)
    board.setState({ placed: { ...puzzle.solution }, marks: [], notes: {} })
  }, [board, puzzle, record])

  const hint = useCallback(
    (prefer?: string): Hint | null => {
      const probe = nextHint(puzzle, board.getState(), 1, prefer)
      if (!probe || live.current.finish) return null
      const stage = (stages.current[probe.char] = (stages.current[probe.char] ?? 0) + 1)
      const h = nextHint(puzzle, board.getState(), stage, prefer)
      if (!h) return null
      for (const op of h.ops ?? []) board.act(op)
      live.current.hints++
      setHints(live.current.hints)
      save()
      return h
    },
    [board, puzzle, save],
  )

  return { elapsed, hints, wrong, finish, reward, submit, giveUp, hint, saveNow: save }
}
