import { useState } from 'react'
import { cloud } from '../cloud'
import { t } from '../i18n'
import { Button, useToast } from '../ui'

/** Piros „Kijelentkezés” gomb (a menüben a név mellett, a profil fejlécében). */
export function SignOutButton({ onDone }: { onDone?: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const out = async () => {
    setBusy(true)
    await cloud.auth.signOut()
    setBusy(false)
    toast(t('account.signedout'))
    onDone?.()
  }
  return (
    <Button variant="danger" size="sm" disabled={busy} data-act="signout" onClick={() => void out()}>
      {t('account.signout')}
    </Button>
  )
}
