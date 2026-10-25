// B9 — Beállítások (GDD 12.4, 17.4): hang, jumpscare-mód, akadálymentesség, online, adatok (export / import / törlés).
// A képernyő csak a `Settings`-et írja (`patchSettings`); a Nyugodt módot a StorageService érvényesíti, a jumpscare/hang motort az AI-A írja.
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNav } from '../../app/nav'
import { useCloudUser } from '../../cloud/hooks'
import { t } from '../../i18n'
import type { I18nKey } from '../../i18n'
import type { JumpscareMode, Settings, StorageExport } from '../../shared/storage'
import { getStorage } from '../../storage'
import { Button, Modal, Panel, useToast } from '../../ui'
import '../login/form.css'

const SCARES: JumpscareMode[] = ['off', 'soft', 'soundOnly', 'imageOnly', 'on']

function Range({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="nd-field">
      <span>
        {label} — {Math.round(value * 100)}%
      </span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="nd-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export default function SettingsScreen() {
  const { back, go } = useNav()
  const toast = useToast()
  const user = useCloudUser()
  const [s, setS] = useState<Settings | null>(null)
  const [confirm, setConfirm] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const storage = getStorage()

  useEffect(() => {
    let live = true
    const load = () => void storage.getSettings().then((v) => live && setS(v))
    load()
    const off = storage.onChange((e) => e.type === 'settings' && load())
    return () => {
      live = false
      off()
    }
  }, [storage])

  const patch = (p: Partial<Omit<Settings, 'v' | 'updatedAt'>>) => void storage.patchSettings(p).then(setS)

  function download() {
    void storage.exportData().then((data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `nightdoku-mentes-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      await storage.importData(JSON.parse(await f.text()) as StorageExport)
      toast(t('settings.imported'))
    } catch {
      toast(t('settings.import.fail'))
    }
  }

  async function clearLocal() {
    setConfirm(false)
    await storage.clearAll()
    toast(t('settings.cleared'))
  }

  return (
    <main className="nd-page top">
      <div className="nd-pf">
        <div className="nd-row">
          <Button variant="ghost" size="sm" onClick={back}>
            ← {t('common.back')}
          </Button>
          {user && (
            <Button variant="ghost" size="sm" onClick={() => go({ name: 'profile' })}>
              👤 {t('settings.profile')}
            </Button>
          )}
        </div>
        <Panel tag={t('settings.title').toUpperCase()}>
          {!s ? (
            <p>{t('profile.loading')}</p>
          ) : (
            <div className="nd-form" style={{ width: 'auto', gap: '1.6rem' }}>
              <section className="nd-sec">
                <h3>{t('settings.audio')}</h3>
                <div className="nd-form">
                  <Range label={t('settings.music')} value={s.audio.music} onChange={(v) => patch({ audio: { ...s.audio, music: v } })} />
                  <Range label={t('settings.sfx')} value={s.audio.sfx} onChange={(v) => patch({ audio: { ...s.audio, sfx: v } })} />
                  <Range label={t('settings.cap')} value={s.audio.volumeCap} onChange={(v) => patch({ audio: { ...s.audio, volumeCap: v } })} />
                </div>
              </section>
              <section className="nd-sec">
                <h3>{t('settings.scare')}</h3>
                <div className="nd-form">
                  <label className="nd-field">
                    <select value={s.jumpscare} onChange={(e) => patch({ jumpscare: e.target.value as JumpscareMode })}>
                      {SCARES.map((m) => (
                        <option key={m} value={m}>
                          {t(`settings.scare.${m}` as I18nKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="nd-note">{t('settings.scare.note')}</p>
                </div>
              </section>
              <section className="nd-sec">
                <h3>{t('settings.access')}</h3>
                <div className="nd-form">
                  <Check label={t('settings.calm')} checked={s.photosensitive} onChange={(v) => patch({ photosensitive: v })} />
                  <Check label={t('settings.shake')} checked={s.screenShake} onChange={(v) => patch({ screenShake: v })} />
                  <Check label={t('settings.streamer')} checked={s.streamerMode} onChange={(v) => patch({ streamerMode: v })} />
                  <label className="nd-field">
                    {t('settings.language')}
                    <select value={s.language} onChange={(e) => patch({ language: e.target.value as Settings['language'] })}>
                      <option value="hu">Magyar</option>
                      <option value="en" disabled>
                        {t('settings.lang.en')}
                      </option>
                    </select>
                  </label>
                </div>
              </section>
              {user && (
                <section className="nd-sec">
                  <h3>{t('settings.online')}</h3>
                  <div className="nd-form">
                    <Check label={t('settings.invisible')} checked={s.invisible} onChange={(v) => patch({ invisible: v })} />
                  </div>
                </section>
              )}
              <section className="nd-sec">
                <h3>{t('settings.data')}</h3>
                <div className="nd-row">
                  <Button variant="ghost" size="sm" onClick={download}>
                    {t('settings.export')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => file.current?.click()}>
                    {t('settings.import')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
                    {t('settings.clear')}
                  </Button>
                  <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void upload(e)} />
                </div>
              </section>
            </div>
          )}
        </Panel>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <p>{t('settings.clear.ask')}</p>
        <div className="nd-row">
          <Button size="sm" onClick={() => void clearLocal()}>
            {t('settings.clear.yes')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
            {t('settings.clear.no')}
          </Button>
        </div>
      </Modal>
    </main>
  )
}
