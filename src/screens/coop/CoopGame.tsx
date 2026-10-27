// Együtt mód (B5): a szoba közös játéka. A pálya a szoba `puzzle_ref`-jéből áll elő (mindenkinél ugyanaz), a táblát a `game/coop.ts` tartja szinkronban.
// Egy „kör” = a szoba egy indítása (`started_at`): ha a host új pályát indít, mindenki új körre vált.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cloud } from '../../cloud'
import { errorText } from '../../cloud/errors'
import { loadPuzzle } from '../../content/catalog'
import { createBoardController } from '../../game/controller'
import type { GameBoard } from '../../game/controller'
import { createCoopSync, loadCoopBase } from '../../game/coop'
import type { CoopSync } from '../../game/coop'
import { createKillerSync } from '../../game/killer'
import { tr, useLang } from '../../game/strings'
import { pick } from '../../i18n/lang'
import type { Puzzle } from '../../shared/puzzle'
import type { RoomInfo, RoomMember, RoomSession } from '../../shared/room'
import { Button, Panel, useToast } from '../../ui'
import { Game } from '../game'

interface Boot {
  puzzle: Puzzle
  board: GameBoard
  sync: CoopSync
}
interface Round {
  key: string
  ref: string
  startedAt: number
}
const roundOf = (i: RoomInfo): Round => ({ key: i.startedAt ?? `r${Date.now()}`, ref: i.puzzleRef, startedAt: i.startedAt ? Date.parse(i.startedAt) : Date.now() })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A szoba közös játéka. `onExit`: vissza a szoba nézetéhez (a tagság és a szoba megmarad). */
export function CoopGame({ session, meId, onExit }: { session: RoomSession; meId: string; onExit: () => void }) {
  const [lang] = useLang()
  const toast = useToast()
  const [info, setInfo] = useState<RoomInfo>(session.info())
  const [members, setMembers] = useState<RoomMember[]>(session.members())
  const [round, setRound] = useState<Round>(() => roundOf(session.info()))
  const [boot, setBoot] = useState<Boot | 'missing' | null>(null)
  const infoRef = useRef(info)
  infoRef.current = info
  const everPlaying = useRef(info.status === 'playing')

  useEffect(() => {
    const offs = [
      session.onInfo((i) => {
        setInfo(i)
        if (i.status !== 'playing') return
        everPlaying.current = true
        // új indítás (a host új pályát választott): új kör
        setRound((r) => (i.startedAt && i.startedAt !== r.key ? roundOf(i) : r))
      }),
      session.onMembers(setMembers),
    ]
    return () => offs.forEach((off) => off())
  }, [session])

  useEffect(() => {
    let alive = true
    let made: Boot | null = null
    setBoot(null)
    void (async () => {
      const puzzle = await loadPuzzle(round.ref)
      if (!puzzle) return alive ? setBoot('missing') : undefined
      const base = await loadCoopBase(session)
      if (!alive) return
      const board = createBoardController(puzzle, base.state)
      board.setSelf(meId)
      const opts = { session, board, puzzle, meId, isHost: () => infoRef.current.hostId === meId, hostId: () => infoRef.current.hostId, rev: base.rev }
      // Gyilkos-mód: ugyanaz a közös tábla, de a beküldést (és minden játékszabályt) a szerver végzi
      const sync = session.killer ? createKillerSync({ ...opts, killer: session.killer }) : createCoopSync(opts)
      made = { puzzle, board, sync }
      setBoot(made)
    })()
    return () => {
      alive = false
      made?.sync.destroy()
      made?.board.destroy()
    }
  }, [session, meId, round.key, round.ref])

  // a többiek a táblán (kurzor-keret a színükkel)
  useEffect(() => {
    if (boot && boot !== 'missing') boot.board.setPeers(members.filter((m) => m.userId !== meId).map((m) => ({ userId: m.userId, username: m.username, color: m.color })))
  }, [boot, members, meId])

  const isHost = info.hostId === meId
  const roomId = info.id
  const coopRun = useMemo(
    () =>
      boot && boot !== 'missing'
        ? {
            startedAt: round.startedAt,
            roomId,
            sync: boot.sync,
            members: () => Math.max(1, session.members().length),
            host: isHost,
            kind: session.killer ? ('killer' as const) : ('together' as const),
            role: () => session.killer?.myRole() ?? 'detective',
            // a játék végét a host rögzíti a szobában (a megoldás-képernyő a játékosoknál addig is megmarad)
            onFinish: (r: { solved: boolean; ms: number }) => {
              if (!isHost) return
              setTimeout(() => void session.finish(r), r.solved ? 800 : 0)
            },
          }
        : undefined,
    [boot, round.startedAt, roomId, isHost, session],
  )

  /** A host a következő pályára viszi a szobát: megvárja, míg a szoba visszaáll lobbyba, átállítja a pályát, és újraindítja a játékot. */
  const onNext = useCallback(
    async (ref: string) => {
      for (let i = 0; i < 15 && infoRef.current.status === 'playing'; i++) await sleep(200)
      const c = await cloud.rooms.configure(infoRef.current.id, { puzzleRef: ref })
      if (!c.ok) return void toast(errorText(c))
      const s = await session.start()
      if (!s.ok) toast(errorText(s))
    },
    [session, toast],
  )

  if (boot === null) return <main className="game-msg">{tr(lang, 'loading')}</main>
  if (boot === 'missing' || !coopRun)
    return (
      <main className="game-msg">
        <Panel tag={pick('HIBA', 'ERROR')}>
          <p>{tr(lang, 'notFound')}</p>
          <Button onClick={onExit}>← {tr(lang, 'coopBack')}</Button>
        </Panel>
      </main>
    )
  return (
    <Game
      key={`${boot.puzzle.id}:${round.key}`}
      puzzle={boot.puzzle}
      board={boot.board}
      coop={{ run: coopRun, session, meId, members, ended: everPlaying.current && info.status !== 'playing', onNext, ...(session.killer ? { killer: { session: session.killer } } : {}) }}
      onExit={onExit}
    />
  )
}
