// Felhő-hiba → a játékosnak szóló magyar szöveg (i18n-kulcsból). Az `ErrorCode`-ok jelentése: result.ts.
import { t } from '../i18n'
import type { ErrorCode } from '../shared/base'

export function errorText(r: { code: ErrorCode; message: string }): string {
  switch (r.code) {
    case 'offline':
      return t('err.offline')
    case 'unauthenticated':
      return r.message === 'sign_in_required' ? t('err.auth') : t('err.credentials')
    case 'conflict':
      if (/room is full/i.test(r.message)) return t('err.room_full')
      return /username/i.test(r.message) ? t('err.username_taken') : t('err.email_taken')
    case 'not_found':
      return /room/i.test(r.message) ? t('err.room_not_found') : t('err.server')
    case 'forbidden':
      return t('err.forbidden')
    case 'invalid':
      if (r.message === 'chat_length') return t('err.chat_length')
      return r.message === 'username_length' ? t('err.username_length') : t('err.invalid')
    case 'rate_limited':
      return r.message === 'chat_rate' ? t('err.rate_chat') : t('err.rate')
    default:
      return t('err.server')
  }
}
