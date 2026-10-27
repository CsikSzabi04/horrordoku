// Együtt mód (B5): a szoba közös játéka. A pálya a szoba `puzzle_ref`-jéből áll elő (mindenkinél ugyanaz), a táblát a `game/coop.ts` tartja szinkronban.
import { useEffect, useMemo, useRef, useState } from 'react'
import { loadPuzzle } from '../../content/catalog'
import { createBoardController } from '../../game/controller'
import type { GameBoard } from '../../game/controller'
import { createCoopSync, loadCoopBase } from '../../game/coop'
import type { CoopSync } from '../../game/coop'
import { tr, useLang } from '../../game/strings'
import type { Puzzle } from '../../shared/puzzle'
import type { RoomInfo, RoomMember, RoomSession } from '../../shared/room'
import { Button, Panel } from '../../ui'
import { Game } from '../game'

interface Boot {
  puzzle: Puzzle
  board: GameBoard
  sync: CoopSync
}

/** A szoba közös játéka. `onExit`: vissza a szoba nézetéhez (a tagság és a szoba megmarad). */
export function CoopGame({ session, meId, onExit }: { session: RoomSession; meId: string; onExit: () => void }) {
  const [lang] = useLang()
  const [info, setInfo] = useState<RoomInfo>(session.info())
  const [members, setMembers] = useState<RoomMember[]>(session.members())
  const [boot, setBoot] = useState<Boot | 'missing' | null>(null)
  const infoRef = useRef(info)
  infoRef.current = info
  const startedPlaying = useRef(info.status === 'playing')

  useEffect(() => {
    const offs = [
      session.onInfo((i) => {
        setInfo(i)
        if (i.status === 'playing') startedPlaying.current = true
      }),
      session.onMembers(setMembers),
    ]
    return () => offs.forEach((off) => off())
  }, [session])

  useEffect(() => {
    let alive = true
    let made: Boot | null = null
    void (async () => {
      const puzzle = await loadPuzzle(session.info().puzzleRef)
      if (!puzzle) return alive ? setBoot('missing') : undefined
      const base = await loadCoopBase(session)
      if (!alive) return
      const board = createBoardController(puzzle, base.state)
      board.setSelf(meId)
      const sync = createCoopSync({ session, board, puzzle, meId, isHost: () => infoRef.current.hostId === meId, rev: base.rev })
      made = { puzzle, board, sync }
      setBoot(made)
    })()
    return () => {
      alive = false
      made?.sync.destroy()
      made?.board.destroy()
    }
  }, [session, meId])

  // a többiek a táblán (kurzor-keret a színükkel)
  useEffect(() => {
    if (boot && boot !== 'missing') boot.board.setPeers(members.filter((m) => m.userId !== meId).map((m) => ({ userId: m.userId, username: m.username, color: m.color })))
  }, [boot, members, meId])

  const startedAt = useMemo(() => (info.startedAt ? Date.parse(info.startedAt) : Date.now()), [info.startedAt])
  const isHost = info.hostId === meId
  const coopRun = useMemo(
    () =>
      boot && boot !== 'missing'
        ? {
            startedAt,
            roomId: info.id,
            sync: boot.sync,
            members: () => Math.max(1, session.members().length),
            host: isHost,
            // a játék végét a host rögzíti a szobában; győzelemnél egy kis késéssel, hogy mindenki lássa a megoldás-képernyőt
            onFinish: (r: { solved: boolean; ms: number }) => {
              if (!isHost) return
              setTimeout(() => void session.finish(r), r.solved ? 2500 : 0)
            },
          }
        : undefined,
    [boot, startedAt, info.id, isHost, session],
  )

  if (boot === null) return <main className="game-msg">{tr(lang, 'loading')}</main>
  if (boot === 'missing' || !coopRun)
    return (
      <main className="game-msg">
        <Panel tag="HIBA">
          <p>{tr(lang, 'notFound')}</p>
          <Button onClick={onExit}>← {tr(lang, 'coopBack')}</Button>
        </Panel>
      </main>
    )
  return (
    <Game
      key={boot.puzzle.id}
      puzzle={boot.puzzle}
      board={boot.board}
      coop={{ run: coopRun, session, meId, members, ended: startedPlaying.current && info.status !== 'playing' }}
      onExit={onExit}
    />
  )
}
