import { useEffect, useState } from 'react'
import { listPuzzles } from '../content/catalog'
import type { PuzzleMeta } from '../content/catalog'
import { content } from '../content'
import { levelOf } from '../game/levels'
import type { Reward } from '../game/rewards'
import { tr } from '../game/strings'
import type { Lang } from '../game/strings'
import { rankOf } from '../screens/profile/rank'
import type { Puzzle } from '../shared/puzzle'
import type { ProfileSnapshot, ProgressFile } from '../shared/storage'
import { getStorage } from '../storage'
import { Avatar, Button, Modal, ProgressBar } from '../ui'
import './finish.css'

interface Props {
  open: boolean
  won: boolean
  puzzle: Pick<Puzzle, 'id' | 'title' | 'size' | 'difficulty' | 'mode'>
  murderer?: string
  elapsed: number
  hints: number
  wrong: number
  reward: Reward | null
  lang: Lang
  next: PuzzleMeta | null
  onClose: () => void
  onMenu: () => void
  onNext: (p: PuzzleMeta) => void
}

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const RANK_KEY = { rookie: 'rank0', guard: 'rank1', detective: 'rank2', hunter: 'rank3', ninth: 'rank4' } as const

/** A pálya végén (megoldás vagy feladás): az eredmény, a profil, a haladás — és a „Menü” / „Folytatás” gombok. */
export function FinishModal({ open, won, puzzle, murderer, elapsed, hints, wrong, reward, lang, next, onClose, onMenu, onNext }: Props) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k)
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null)
  const [progress, setProgress] = useState<ProgressFile | null>(null)
  useEffect(() => {
    if (!open) return
    let live = true
    void (async () => {
      const s = getStorage()
      const [p, g] = await Promise.all([s.getProfile(), s.getProgress()])
      if (live) {
        setProfile(p)
        setProgress(g)
      }
    })()
    return () => {
      live = false
    }
  }, [open, reward])

  const entry = progress?.puzzles[puzzle.id]
  const newBest = won && entry?.bestMs != null && entry.bestMs === Math.round(elapsed)
  const rank = rankOf(profile?.xp ?? 0)
  const avatar = profile ? content.characters().find((c) => c.id === profile.avatar) : undefined

  const modeKey = puzzle.mode === 'event' ? 'event' : puzzle.mode === 'classic' || puzzle.mode === 'bonus' ? 'classic' : null
  const list = modeKey ? listPuzzles(modeKey) : []
  const solvedIn = (rows: PuzzleMeta[]) => rows.filter((p) => progress?.puzzles[p.id]?.solved).length
  const level = modeKey === 'classic' && puzzle.mode === 'classic' ? levelOf(puzzle.difficulty) : null
  const levelRows = level ? list.filter((p) => p.difficulty === puzzle.difficulty) : []
  const total = progress ? Object.values(progress.puzzles).filter((p) => p.solved).length : 0

  let rewardLine: string | null = null
  if (!won) rewardLine = t('fXpGaveUp')
  else if (reward?.first) rewardLine = `+${reward.xp} XP${hints === 0 ? ` · ${t('fXpNote')}` : ''}`
  else if (reward) rewardLine = t('fXpRepeat')

  return (
    <Modal open={open} onClose={onClose}>
      <div className="tutorial win fin" data-result={won ? 'won' : 'gaveup-summary'}>
        <div className="fin-head">
          <span className="fin-icon" aria-hidden="true">{won ? '🔍' : '🏳️'}</span>
          <div>
            <h3>{won ? t('solved') : t('fGaveUp')}</h3>
            <small>
              {puzzle.title} · {puzzle.size}×{puzzle.size}
              {level ? ` · ${level.emoji} ${lang === 'en' ? level.en : level.name}` : ''}
            </small>
          </div>
        </div>
        <p>
          {t('murderer')}: <b>{murderer}</b>
        </p>
        <div className="fin-stats">
          <div>
            <b>{fmt(elapsed)}</b>
            <span>{t('time')}</span>
          </div>
          <div>
            <b>{hints}</b>
            <span>{t('hints')}</span>
          </div>
          <div>
            <b>{wrong}</b>
            <span>{t('wrong')}</span>
          </div>
          {entry?.bestMs != null && (
            <div>
              <b>{fmt(entry.bestMs)}</b>
              <span>{t('fBest')}</span>
            </div>
          )}
        </div>
        {newBest && <p className="fin-badge">★ {t('fNewBest')}</p>}
        {rewardLine && <p className={`fin-xp${reward?.first ? ' gain' : ''}`}>{rewardLine}</p>}

        {profile && (
          <section className="fin-card" aria-label={t('fProfile')}>
            <Avatar id={profile.avatar} emoji={avatar?.emoji} size="3rem" />
            <div className="fin-grow">
              <b>{profile.username || t('fGuest')}</b>
              <small>{t(RANK_KEY[rank.id])}</small>
              <ProgressBar value={profile.xp - rank.min} max={rank.next === null ? 1 : rank.next - rank.min} />
              <span className="fin-xpline">
                {profile.xp} XP{rank.next !== null ? ` / ${rank.next}` : ''}
                {profile.streak > 0 ? ` · 🔥 ${profile.streak}` : ''}
              </span>
            </div>
          </section>
        )}
        {progress && (
          <section className="fin-card col" aria-label={t('fProgress')}>
            {modeKey ? (
              <>
                <div className="fin-line">
                  <span>{modeKey === 'event' ? t('fEvent') : t('fClassic')}</span>
                  <b>
                    {solvedIn(list)} / {list.length} {t('fSolvedOf')}
                  </b>
                </div>
                <ProgressBar value={solvedIn(list)} max={Math.max(1, list.length)} />
                {level && levelRows.length > 0 && (
                  <>
                    <div className="fin-line">
                      <span>
                        {level.emoji} {lang === 'en' ? level.en : level.name}
                      </span>
                      <b>
                        {solvedIn(levelRows)} / {levelRows.length}
                      </b>
                    </div>
                    <ProgressBar value={solvedIn(levelRows)} max={levelRows.length} />
                  </>
                )}
              </>
            ) : (
              <div className="fin-line">
                <span>{t('fSolvedTotal')}</span>
                <b>{total}</b>
              </div>
            )}
          </section>
        )}

        <div className="row fin-row">
          <Button variant="ghost" size="sm" data-act="finish-look" onClick={onClose}>
            {t('fLook')}
          </Button>
          <Button variant={next ? 'ghost' : undefined} size="sm" data-act="win-exit" onClick={onMenu}>
            {t('fMenu')}
          </Button>
          {next && (
            <Button size="sm" data-act="finish-next" title={`${t('fNextUp')}: ${next.title}`} onClick={() => onNext(next)}>
              {t('fNext')} →
            </Button>
          )}
        </div>
        {next && (
          <small className="fin-next">
            {t('fNextUp')}: {next.icon ?? '🔎'} {next.title}
          </small>
        )}
      </div>
    </Modal>
  )
}
