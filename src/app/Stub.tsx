import { Button, Panel } from '../ui'
import { t } from '../i18n'
import { useNav } from './nav'

/** Helyőrző képernyő, amíg a feladat (task) el nem készül. A tulajdonos a TASKS-táblákban van. */
export function Stub({ title, task }: { title: string; task: string }) {
  const { back } = useNav()
  return (
    <main style={{ minHeight: '100%', display: 'grid', placeContent: 'center', gap: '1rem', textAlign: 'center' }}>
      <Panel tag={task}>
        <h2 style={{ margin: '0 0 .4rem', fontFamily: 'var(--display)', letterSpacing: '.06em' }}>{title}</h2>
        <p style={{ margin: '0 0 1rem', color: 'var(--muted)' }}>{t('common.soon')}</p>
        <Button variant="ghost" size="sm" onClick={back}>
          ← {t('common.back')}
        </Button>
      </Panel>
    </main>
  )
}
