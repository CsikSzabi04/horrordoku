// A Gyilkos-szoba szabályai (GDD 22.3 „Beállítások” tábla): a tulajdonos a lobbyban állítja, a szerver tartományba vágja és indításkor rögzíti.
import { t } from '../../i18n'
import type { RoomSettings } from '../../shared/room'
import './killer-rules.css'

/** Időkorlát nehézség szerint (perc): 8 / 12 / 18 / 25 / 35 (GDD 22.3). */
const LIMIT_MIN = [0, 8, 12, 18, 25, 35]

export const defaultKillerSettings = (difficulty: number): Required<Pick<RoomSettings, 'timeLimit' | 'lives' | 'killerCount' | 'abilities' | 'cooldownScale' | 'showPlacers' | 'telltale' | 'meetings' | 'sniffPerDetective'>> => ({
  timeLimit: (LIMIT_MIN[Math.min(5, Math.max(1, difficulty))] ?? 18) * 60,
  lives: 3,
  killerCount: 1,
  abilities: { timeWarp: true, textSwap: true, vanish: true },
  cooldownScale: 1,
  showPlacers: false,
  telltale: false,
  meetings: 2,
  sniffPerDetective: 1,
})

const TIMES = [5, 8, 12, 18, 25, 35, 45, 60]

interface Props {
  value: RoomSettings
  onChange: (v: RoomSettings) => void
  difficulty: number
  maxPlayers: number
}

/** Az űrlap-rész: az érték a szoba `settings`-e; ami hiányzik, azt az alapérték (a nehézségből) adja. */
export function KillerRules({ value, onChange, difficulty, maxPlayers }: Props) {
  const v = { ...defaultKillerSettings(difficulty), ...value }
  const set = (p: Partial<RoomSettings>) => onChange({ ...value, ...p })
  const ab = v.abilities
  const minutes = v.timeLimit == null ? 0 : Math.round(v.timeLimit / 60)
  const timeOptions = TIMES.includes(minutes) || minutes === 0 ? TIMES : [...TIMES, minutes].sort((a, b) => a - b)
  return (
    <fieldset className="nd-ks" data-killer="rules">
      <legend>{t('lobby.ks.title')}</legend>
      <label className="nd-field">
        {t('lobby.ks.time')}
        <select value={minutes} data-ks="timeLimit" onChange={(e) => set({ timeLimit: Number(e.target.value) === 0 ? null : Number(e.target.value) * 60 })}>
          <option value={0}>{t('lobby.ks.time.none')}</option>
          {timeOptions.map((m) => (
            <option key={m} value={m}>
              {m} {t('lobby.ks.min')}
            </option>
          ))}
        </select>
      </label>
      <label className="nd-field">
        {t('lobby.ks.lives')}
        <select value={v.lives} data-ks="lives" onChange={(e) => set({ lives: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      {maxPlayers >= 6 && (
        <label className="nd-field">
          {t('lobby.ks.killers')}
          <select value={v.killerCount} data-ks="killerCount" onChange={(e) => set({ killerCount: Number(e.target.value) })}>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </label>
      )}
      <div className="nd-field">
        {t('lobby.ks.abilities')}
        <div className="nd-ks-checks">
          {(['timeWarp', 'textSwap', 'vanish'] as const).map((a) => (
            <label key={a} className="nd-check">
              <input type="checkbox" data-ks={a} checked={ab[a]} onChange={(e) => set({ abilities: { ...ab, [a]: e.target.checked } })} />
              {t(`lobby.ks.ab.${a}` as 'lobby.ks.ab.timeWarp')}
            </label>
          ))}
        </div>
      </div>
      <label className="nd-field">
        {t('lobby.ks.cooldown')}
        <select value={v.cooldownScale} data-ks="cooldownScale" onChange={(e) => set({ cooldownScale: Number(e.target.value) })}>
          <option value={0.5}>{t('lobby.ks.cd.easy')}</option>
          <option value={1}>{t('lobby.ks.cd.normal')}</option>
          <option value={2}>{t('lobby.ks.cd.hard')}</option>
        </select>
      </label>
      <label className="nd-field">
        {t('lobby.ks.meetings')}
        <select value={v.meetings} data-ks="meetings" onChange={(e) => set({ meetings: Number(e.target.value) })}>
          {[0, 1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="nd-field">
        {t('lobby.ks.sniff')}
        <select value={v.sniffPerDetective} data-ks="sniffPerDetective" onChange={(e) => set({ sniffPerDetective: Number(e.target.value) })}>
          {[0, 1, 2, 3].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="nd-check">
        <input type="checkbox" data-ks="showPlacers" checked={v.showPlacers} onChange={(e) => set({ showPlacers: e.target.checked })} />
        {t('lobby.ks.placers')}
      </label>
      <label className="nd-check">
        <input type="checkbox" data-ks="telltale" checked={v.telltale} onChange={(e) => set({ telltale: e.target.checked })} />
        {t('lobby.ks.telltale')}
      </label>
      <p className="nd-note">{t('lobby.ks.hint')}</p>
    </fieldset>
  )
}
