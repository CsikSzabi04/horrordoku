// B10 — Gyűjtemény / bestiárium (GDD 14.7, 19.4): a `content.characters()` és a `StorageService.getUnlocks()` találkozása.
// A még meg nem szerzett karakterek „ismeretlen" sziluettként látszanak; szűrés világ / faj szerint; számláló.
import { useEffect, useMemo, useState } from 'react'
import { charBio, charName, charSource, worldTitle } from '../../content/localize'
import { useNav } from '../../app/nav'
import { content } from '../../content'
import { t } from '../../i18n'
import type { I18nKey } from '../../i18n'
import { getStorage } from '../../storage'
import { Avatar, Button, Panel } from '../../ui'
import '../login/form.css'
import './collection.css'

const worldName = worldTitle

export default function CollectionScreen() {
  const { back } = useNav()
  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [world, setWorld] = useState('')
  const [race, setRace] = useState('')
  const storage = getStorage()
  const all = content.characters()

  useEffect(() => {
    let live = true
    const load = () =>
      void storage.getUnlocks().then((u) => live && setOwned(new Set(u.items.filter((i) => i.kind === 'character').map((i) => i.id))))
    load()
    const off = storage.onChange((e) => (e.type === 'unlocks' || e.type === 'scope') && load())
    return () => {
      live = false
      off()
    }
  }, [storage])

  const worlds = useMemo(() => [...new Set(all.map((c) => c.world))], [all])
  const races = useMemo(() => [...new Set(all.map((c) => c.race))], [all])
  const shown = all.filter((c) => (!world || c.world === world) && (!race || c.race === race))
  const have = all.filter((c) => owned.has(c.id)).length

  return (
    <main className="nd-page top">
      <div className="nd-pf">
        <div className="nd-row">
          <Button variant="ghost" size="sm" onClick={back}>
            ← {t('common.back')}
          </Button>
        </div>
        <Panel tag={t('collection.title').toUpperCase()}>
          <div className="nd-row" style={{ justifyContent: 'space-between' }}>
            <b>
              {have} / {all.length} {t('collection.count')}
            </b>
            <div className="nd-row">
              <select aria-label={t('collection.allWorlds')} value={world} onChange={(e) => setWorld(e.target.value)}>
                <option value="">{t('collection.allWorlds')}</option>
                {worlds.map((w) => (
                  <option key={w} value={w}>
                    {worldName(w)}
                  </option>
                ))}
              </select>
              <select aria-label={t('collection.allRaces')} value={race} onChange={(e) => setRace(e.target.value)}>
                <option value="">{t('collection.allRaces')}</option>
                {races.map((r) => (
                  <option key={r} value={r}>
                    {t(`race.${r}` as I18nKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="nd-note">{t('collection.empty')}</p>
          ) : (
            <ul className="nd-cards">
              {shown.map((c) => {
                const known = owned.has(c.id)
                return (
                  <li key={c.id} className={known ? 'nd-card' : 'nd-card locked'}>
                    <Avatar id={known ? c.id : 'unknown'} emoji={known ? c.emoji : '❔'} size="3.4rem" />
                    <div>
                      <h4>{known ? charName(c.id, c.name) : t('collection.unknown')}</h4>
                      <p className="nd-note">
                        {known ? `${t(`race.${c.race}` as I18nKey)} · ${worldName(c.world)}` : t('collection.unknown.hint')}
                      </p>
                      {known && charBio(c) && <p>{charBio(c)}</p>}
                      {known && charSource(c) && <p className="nd-note">{charSource(c)}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </main>
  )
}
