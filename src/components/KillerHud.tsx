// A Gyilkos mód felülete (B6, GDD 22.3): állapotsáv (szerep, életek), a gyilkos képességei és a nyomozók eszközei (a jobb oszlop `extra` helyére),
// a Gyűlés / Epilógus szakasz (a bal oszlopban, a chat fölött — a chat közben is használható), a szerepkártya és a vég-ablak.
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { errorText } from '../cloud/errors'
import { fakeClueText } from '../game/fakeClue'
import { kt } from '../game/killerStrings'
import type { KillerStrKey } from '../game/killerStrings'
import { clockText, remainingMs } from '../game/killerClock'
import type { Lang } from '../game/strings'
import type { KillerEnd, KillerUi } from '../game/useKiller'
import type { Reward } from '../game/rewards'
import type { Puzzle } from '../shared/puzzle'
import type { KillerAbility, KillerSession, RoomMember } from '../shared/room'
import { Button, Modal } from '../ui'
import './killer-hud.css'

type T = (k: KillerStrKey, v?: Record<string, string | number>) => string
const useT = (lang: Lang): T => (k, v) => kt(lang, k, v)

/** Másodpercenként (és gyorsabban a hűtéseknél) frissülő „most”. */
function useTick(ms = 250): number {
  const [n, setN] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setN(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return n
}

const nameOf = (members: RoomMember[], id: string | null | undefined) => members.find((m) => m.userId === id)?.username ?? '?'

/** A hátralévő idő szövege a fejlécbe (időkorlát nélkül az eltelt idő marad — a hívó dönt). */
export function killerClock(ui: KillerUi): string | null {
  if (ui.state?.phase && ui.state.phase !== 'play') return null // az Epilógus alatt az idő már nem számít
  const left = remainingMs(ui.state, ui.now())
  return left == null ? null : clockText(left)
}

// ---------------------------------------------------------------------------------------------------------------------------------------
/** Állapotsáv: a szerepem, az életek, és a rám vonatkozó figyelmeztetések (leleplezve / néma / ellenőrzés). */
export function KillerStatus({ lang, ui, silenced, verifying }: { lang: Lang; ui: KillerUi; silenced: boolean; verifying: boolean }) {
  const t = useT(lang)
  const s = ui.state
  if (!ui.role) return null
  const lives = s?.lives ?? 0
  const max = s?.maxLives ?? lives
  return (
    <div className={`kh-status ${ui.role}`} data-killer="status" data-role={ui.role}>
      <b className="kh-role">{ui.role === 'killer' ? `🔪 ${t('roleKiller')}` : `🔎 ${t('roleDet')}`}</b>
      <span className="kh-lives" aria-label={t('lives')} title={t('lives')}>
        {'♥'.repeat(Math.max(0, lives))}
        <span className="off">{'♥'.repeat(Math.max(0, max - lives))}</span>
      </span>
      {ui.role === 'killer' && s?.exposed && <small className="kh-warn">{t('abOff')}</small>}
      {ui.role === 'killer' && s?.killerGone && <small className="kh-warn">{t('abGone')}</small>}
      {silenced && <small className="kh-warn">{t('silenced')}</small>}
      {verifying && <small className="kh-note">{t('verifying')}</small>}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------------------------------
interface ActionsProps {
  lang: Lang
  ui: KillerUi
  session: KillerSession
  puzzle: Puzzle
  /** A kijelölt kártya (a Szövegcseréhez). */
  selected: string | null
  /** Az Eltüntetés célzó módban van-e (a következő koppintás a térképen a célpont). */
  picking: boolean
  onPick: (on: boolean) => void
  toast: (m: string) => void
  disabled?: boolean
}

/** A jobb oszlopba (Tools `extra`): a gyilkosnak a 3 képesség (hűtéssel), a nyomozónak a Szimat és a Gyűlés. */
export function KillerActions({ lang, ui, session, puzzle, selected, picking, onPick, toast, disabled }: ActionsProps) {
  const t = useT(lang)
  useTick(250)
  const s = ui.state
  if (!s?.running || !ui.role) return null
  const off = disabled || s.phase !== 'play' || !!s.meeting || !!s.submit

  const fail = (r: { ok: false; code: never; message: string } | { ok: false; code: string; message: string }) => toast(errorText(r as { code: never; message: string }))

  if (ui.role === 'detective') {
    return (
      <div className="kh-actions" data-killer="actions">
        <button type="button" className="tbtn" data-act="sniff" disabled={off || (s.sniffsLeft ?? 0) <= 0} title={t('sniffHelp')} onClick={() => void session.sniff().then((r) => !r.ok && fail(r))}>
          🔎 {t('sniff')} ({s.sniffsLeft ?? 0})
        </button>
        <button type="button" className="tbtn" data-act="meeting" disabled={off || !s.canCallMeeting} title={t('meetingHelp')} onClick={() => void session.callMeeting().then((r) => !r.ok && fail(r))}>
          🗳️ {t('meeting')} ({s.meetingsLeft ?? 0})
        </button>
      </div>
    )
  }

  const cd = session.cooldowns()
  const busy = (s.busyMs ?? 0) > 0
  const blocked = off || !!s.exposed || !!s.killerGone
  const enabled = (a: KillerAbility) => s.abilities?.[a] !== false
  const use = (a: KillerAbility, target?: Parameters<KillerSession['useAbility']>[1]) => {
    if (busy) return toast(t('abBusy'))
    void session.useAbility(a, target).then((r) => !r.ok && fail(r))
  }
  const left = (a: KillerAbility) => (cd[a] > 0 ? ` · ${Math.ceil(cd[a] / 1000)}s` : '')
  const ready = (a: KillerAbility) => !blocked && enabled(a) && cd[a] <= 0
  const noLimit = s.timeLimitMs == null

  return (
    <div className="kh-actions" data-killer="actions">
      <div className="kh-row" title={t('abHelpTime')}>
        <button type="button" className="tbtn" data-act="ab-time-steal" disabled={!ready('timeWarp') || noLimit} onClick={() => use('timeWarp', { mode: 'steal' })}>
          ⏱️ {t('abTimeSteal')}
          {left('timeWarp')}
        </button>
        <button type="button" className="tbtn" data-act="ab-time-speed" disabled={!ready('timeWarp') || noLimit} onClick={() => use('timeWarp', { mode: 'speed' })}>
          ⏱️ {t('abTimeSpeed')}
        </button>
      </div>
      <button
        type="button"
        className="tbtn"
        data-act="ab-text"
        disabled={!ready('textSwap')}
        title={t('abHelpText')}
        onClick={() => {
          if (!selected) return toast(t('abPickCard'))
          const text = fakeClueText(puzzle, selected)
          if (!text) return toast(t('abNoFake'))
          use('textSwap', { char: selected, text })
        }}
      >
        ✍️ {t('abText')}
        {left('textSwap')}
      </button>
      <button type="button" className={`tbtn${picking ? ' on' : ''}`} data-act="ab-vanish" disabled={!ready('vanish') && !picking} title={t('abHelpVanish')} onClick={() => onPick(!picking)}>
        🕳️ {picking ? t('abCancel') : t('abVanish')}
        {!picking && left('vanish')}
      </button>
      {picking && <small className="kh-note">{t('abPickCell')}</small>}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------------------------------
interface MeetingProps {
  lang: Lang
  ui: KillerUi
  session: KillerSession
  members: RoomMember[]
  meId: string
  toast: (m: string) => void
}

/** A Gyűlés (vita → szavazás → eredmény) és az Epilógus szakasza a bal oszlopban; a chat közben is használható. */
export function KillerMeeting({ lang, ui, session, members, meId, toast }: MeetingProps) {
  const t = useT(lang)
  useTick(500)
  const s = ui.state
  if (!s?.running) return null
  const secs = (ms: number) => Math.max(0, Math.ceil((ms - ui.now()) / 1000))
  const fail = (r: { ok: false; code: never; message: string } | { ok: false; code: string; message: string }) => toast(errorText(r as { code: never; message: string }))
  const others = members.filter((m) => m.userId !== meId)
  const pick = (title: string, left: number, voted: boolean, onVote: (id: string | null) => void, allowAbstain: boolean, voters: ReactNode = null) => (
    <div className="kh-meet" data-killer="meeting">
      <b>{title}</b> <span className="left">{left}s</span>
      {voted ? (
        <small className="kh-note">{t('mtVoted')}</small>
      ) : (
        <div className="kh-vote">
          {others.map((m) => (
            <button key={m.userId} type="button" data-act="kvote" data-uid={m.userId} style={{ borderColor: m.color }} onClick={() => onVote(m.userId)}>
              {m.username}
            </button>
          ))}
          {allowAbstain && (
            <button type="button" data-act="kvote-abstain" className="ghost" onClick={() => onVote(null)}>
              {t('mtAbstain')}
            </button>
          )}
        </div>
      )}
      {voters}
    </div>
  )

  if (s.phase === 'epilogue' && s.epilogue) {
    if (ui.role !== 'detective') {
      return (
        <div className="kh-meet" data-killer="epilogue">
          <b>{t('epTitle')}</b> <span className="left">{secs(s.epilogue.endsAt)}s</span>
          <small className="kh-note">{t('epWait')}</small>
        </div>
      )
    }
    return (
      <>
        <p className="kh-note">{t('epText')}</p>
        {pick(t('epTitle'), secs(s.epilogue.endsAt), s.epilogue.voted, (id) => id && void session.epilogueVote(id).then((r) => !r.ok && fail(r)), false)}
      </>
    )
  }
  const m = s.meeting
  if (!m) return null
  if (m.phase === 'discuss')
    return (
      <div className="kh-meet" data-killer="meeting">
        <b>{t('mtDiscuss')}</b> <span className="left">{secs(m.endsAt)}s</span>
      </div>
    )
  if (m.phase === 'vote') return pick(t('mtVote'), secs(m.endsAt), !!m.voted, (id) => void session.vote(id).then((r) => !r.ok && fail(r)), true)
  return (
    <div className="kh-meet result" data-killer="meeting">
      <b>
        {m.ejected ? t(m.killerExposed ? 'mtExposed' : 'mtSilenced', { name: nameOf(members, m.ejected) }) : t('mtNoMajority')}
      </b>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------------------------------
/** A szerepkártya a játék elején: csak a saját szerepedet látod. */
export function KillerRoleCard({ lang, ui, members, meId, onClose }: { lang: Lang; ui: KillerUi; members: RoomMember[]; meId: string; onClose: () => void }) {
  const t = useT(lang)
  const open = ui.roleCard && !!ui.state?.running && !!ui.role && !ui.end
  useEffect(() => {
    if (!open) return
    const id = setTimeout(onClose, 9000)
    return () => clearTimeout(id)
  }, [open, onClose])
  const publicKiller = ui.role === 'detective' ? (ui.state?.exposedKillers ?? []).find((k) => k !== meId) : undefined
  return (
    <Modal open={open} onClose={onClose}>
      <div className={`tutorial kh-card ${ui.role ?? ''}`} data-killer="role-card" data-role={ui.role ?? ''}>
        <h3>{ui.role === 'killer' ? t('cardKillerTitle') : t('cardDetTitle')}</h3>
        <p>{ui.role === 'killer' ? t('cardKillerText') : t('cardDetText')}</p>
        {publicKiller && <p className="kh-note">{t('cardDetPublic', { name: nameOf(members, publicKiller) })}</p>}
        <div className="row">
          <Button size="sm" data-act="role-ok" onClick={onClose}>
            {t('gotIt')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------------------------------------------------------------------
export const killerWon = (end: Pick<KillerEnd, 'outcome'>, role: 'killer' | 'detective'): boolean | null =>
  end.outcome === 'draw' || end.outcome === 'aborted' ? null : (end.outcome === 'detectives') === (role === 'detective')

const ABILITY_NAME: Record<string, KillerStrKey> = { timeWarp: 'abTime', textSwap: 'abText', vanish: 'abVanish' }
const REASON: Record<string, KillerStrKey> = { time: 'reasonTime', lives: 'reasonLives', identified: 'reasonIdentified', escaped: 'reasonEscaped', solved: 'reasonSolved', host: 'reasonHost' }

/** A vég-ablak: eredmény, a gyilkos kiléte, a képesség-napló („Időcsavar ×2, Szövegcsere ×3…”), XP. */
export function KillerEndModal({
  lang, ui, members, open, reward, onClose, onExit,
}: { lang: Lang; ui: KillerUi; members: RoomMember[]; open: boolean; reward: Reward | null; onClose: () => void; onExit: () => void }) {
  const t = useT(lang)
  const end = ui.end
  if (!end) return null
  const won = ui.role ? killerWon(end, ui.role) : null
  const title = end.outcome === 'detectives' ? t('endDet') : end.outcome === 'killer' ? t('endKiller') : end.outcome === 'draw' ? t('endDraw') : t('endAborted')
  const counts = new Map<string, number>()
  for (const e of end.abilityLog) counts.set(e.ability, (counts.get(e.ability) ?? 0) + 1)
  const logText = [...counts.entries()].map(([a, n]) => `${t(ABILITY_NAME[a] ?? 'abTime')} ×${n}`).join(', ')
  return (
    <Modal open={open} onClose={onClose}>
      <div className="tutorial win kh-end" data-result="killer-end" data-outcome={end.outcome}>
        <h3>{title}</h3>
        {end.outcome !== 'aborted' && <p className={`kh-you ${won === true ? 'won' : won === false ? 'lost' : ''}`}>{won === true ? t('endYouWon') : won === false ? t('endYouLost') : t('endYouDraw')}</p>}
        <p className="muted">{t(REASON[end.reason] ?? 'reasonSolved')}</p>
        {end.killerIds.length > 0 && (
          <p>
            {t('endKillerWas')}: <b>{end.killerIds.map((k) => nameOf(members, k)).join(', ')}</b>
          </p>
        )}
        <p className="muted">
          {t('endLog')}: {logText || t('endNoAbility')}
        </p>
        {reward && reward.xp > 0 && <p className="kh-xp">+{reward.xp} XP</p>}
        <div className="row">
          <Button variant="ghost" size="sm" data-act="killer-look" onClick={onClose}>
            {t('endLook')}
          </Button>
          <Button size="sm" data-act="killer-exit" onClick={onExit}>
            {t('endBack')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
