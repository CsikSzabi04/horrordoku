import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Lang } from '../game/strings'
import { tr } from '../game/strings'
import type { Proposal } from '../game/coop'
import type { ChatMessage, RoomMember, RoomSession } from '../shared/room'
import './coop-panel.css'

interface Props {
  lang: Lang
  session: Pick<RoomSession, 'chat'>
  meId: string
  members: RoomMember[]
  proposal: Proposal | null
  voted: boolean
  hintsLeft: number
  onVote: (approve: boolean) => void
}

/** Az Együtt mód bal oszlopba kerülő sávja: játékosok (színnel, online-jelzéssel), a közös beküldés szavazása és a szobai chat. */
export function CoopPanel({ lang, session, meId, members, proposal, voted, hintsLeft, onVote }: Props) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k)
  const [messages, setMessages] = useState<ChatMessage[]>(session.chat.history())
  const [text, setText] = useState('')
  const [left, setLeft] = useState(0)
  const log = useRef<HTMLDivElement>(null)

  useEffect(() => session.chat.onMessage(() => setMessages(session.chat.history())), [session])
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [messages])
  useEffect(() => {
    if (!proposal) return
    const tick = () => setLeft(Math.max(0, Math.ceil((proposal.deadlineAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [proposal])

  const nameOf = (id: string) => members.find((m) => m.userId === id)?.username ?? '?'
  async function send(e: FormEvent) {
    e.preventDefault()
    const body = text
    if (!body.trim()) return
    const r = await session.chat.send(body)
    if (r.ok) setText('')
  }

  return (
    <section className="coop" aria-label={t('coopMembers')}>
      <ul className="coop-people">
        {members.map((m) => (
          <li key={m.userId} style={{ borderColor: m.color }} className={m.online ? 'on' : ''}>
            <i style={{ background: m.color }} aria-hidden="true" />
            {m.username}
            {m.userId === meId && <small> ({t('coopWho')})</small>}
          </li>
        ))}
      </ul>
      <small className="coop-hints">
        💡 {t('coopHintsLeft')}: {hintsLeft}
      </small>
      {proposal && (
        <div className="coop-vote" role="alert" data-coop="proposal">
          <b>
            {nameOf(proposal.by)} {t('coopProposes')}
          </b>
          <span className="left">{left}s</span>
          {proposal.by === meId ? (
            <small>{t('coopWaiting')}</small>
          ) : voted ? (
            <small>{t('coopVoted')}</small>
          ) : (
            <span className="row">
              <button type="button" data-act="coop-yes" onClick={() => onVote(true)}>
                ✔ {t('coopApprove')}
              </button>
              <button type="button" data-act="coop-no" className="no" onClick={() => onVote(false)}>
                ✘ {t('coopObject')}
              </button>
            </span>
          )}
        </div>
      )}
      <div className="coop-chat">
        <b>{t('coopChat')}</b>
        <div className="log" ref={log} aria-live="polite">
          {messages.slice(-40).map((m) => (
            <div key={m.id}>
              <b style={{ color: members.find((x) => x.userId === m.userId)?.color }}>{m.username}</b> {m.body}
            </div>
          ))}
        </div>
        <form onSubmit={(e) => void send(e)}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={t('coopChatPh')} autoComplete="off" aria-label={t('coopChat')} />
          <button type="submit" disabled={!text.trim()}>
            {t('coopSend')}
          </button>
        </form>
      </div>
    </section>
  )
}
