import { t } from '../i18n'
import { useLang } from '../game/strings'
import type { Lang } from '../i18n/lang'

/**
 * Nyelvváltó (Magyar / English). A `settings.language`-be ír, ami bejelentkezve a felhő-profillal szinkronban van —
 * így a nyelv eszközről eszközre követi a profilt. A játékképernyőn, a Beállításokban és a Profilban is ez áll.
 */
export function LangSwitch({ className }: { className?: string }) {
  const [lang, setLang] = useLang()
  return (
    <label className={className ?? 'nd-field'}>
      {t('settings.language')}
      <select value={lang} aria-label={t('settings.language')} onChange={(e) => setLang(e.target.value as Lang)}>
        <option value="hu">Magyar</option>
        <option value="en">English</option>
      </select>
    </label>
  )
}
