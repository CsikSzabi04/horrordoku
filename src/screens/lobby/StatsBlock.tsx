// Egy szoba statisztikája: összesítő + a legutóbbi játékok (0005 `room_stats`, `room_recent_games`).
import { useEffect, useState } from 'react'
import { cloud } from '../../cloud'
import { t } from '../../i18n'
import type { RoomGame, RoomStats } from '../../shared/room'
import '../login/form.css'
import { fmtDate, fmtMs } from './format'

export function StatsBlock({ roomId, refreshKey }: { roomId: string; refreshKey?: unknown }) {
  const [stats, setStats] = useState<RoomStats | null>(null)
  const [games, setGames] = useState<RoomGame[]>([])
  useEffect(() => {
    let live = true
    void Promise.all([cloud.rooms.stats(roomId), cloud.rooms.recentGames(roomId, 5)]).then(([s, g]) => {
      if (!live) return
      if (s.ok) setStats(s.value)
      if (g.ok) setGames(g.value)
    })
    return () => {
      live = false
    }
  }, [roomId, refreshKey])
  if (!stats) return <p className="nd-note">{t('profile.loading')}</p>
  const rows: [string, string | number][] = [
    [t('costats.played'), stats.gamesPlayed],
    [t('costats.solved'), stats.gamesSolved],
    [t('costats.best'), fmtMs(stats.bestMs)],
    [t('costats.avg'), fmtMs(stats.avgMs)],
    [t('costats.total'), fmtMs(stats.totalMs)],
    [t('costats.last'), stats.lastPlayed ? fmtDate(stats.lastPlayed) : t('costats.never')],
  ]
  return (
    <div className="nd-rstats">
      <ul className="nd-stats">
        {rows.map(([k, v]) => (
          <li key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </li>
        ))}
      </ul>
      <h4 style={{ margin: '.8rem 0 .4rem' }}>{t('costats.recent')}</h4>
      {games.length === 0 ? (
        <p className="nd-note">{t('costats.noGames')}</p>
      ) : (
        <ul className="nd-stats">
          {games.map((g) => (
            <li key={g.startedAt}>
              <span>
                {fmtDate(g.startedAt)} · {g.puzzleRef} · {g.players} {t('costats.players')}
              </span>
              <b>{g.endedAt ? (g.solved ? `✔ ${fmtMs(g.ms)}` : `✘ ${t('costats.fail')}`) : '…'}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
