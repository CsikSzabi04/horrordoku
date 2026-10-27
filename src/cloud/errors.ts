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
      if (/room already started/i.test(r.message)) return t('err.room_started')
      if (/room limit/i.test(r.message)) return t('err.room_limit')
      if (/follow limit/i.test(r.message)) return t('err.follow_limit')
      if (/friend limit/i.test(r.message)) return t('err.friend_limit')
      return /username/i.test(r.message) ? t('err.username_taken') : t('err.email_taken')
    case 'not_found':
      return /room/i.test(r.message) ? t('err.room_not_found') : t('err.server')
    case 'forbidden':
      return /closed/i.test(r.message) ? t('err.room_closed') : t('err.forbidden')
    case 'invalid':
      if (r.message === 'chat_length') return t('err.chat_length')
      if (/^(cooldown|another effect)/i.test(r.message)) return t('err.k.cooldown')
      if (/^not now/i.test(r.message)) return t('err.k.notnow')
      if (/limit reached|^abilit/i.test(r.message)) return t('err.k.limit')
      if (/no sniffs/i.test(r.message)) return t('err.k.nosniff')
      if (/no meetings|meetings need/i.test(r.message)) return t('err.k.nomeeting')
      if (/at least 2 players/i.test(r.message)) return t('lobby.needTwo')
      if (/no time limit/i.test(r.message)) return t('err.k.notime')
      return r.message === 'username_length' ? t('err.username_length') : t('err.invalid')
    case 'rate_limited':
      return r.message === 'chat_rate' ? t('err.rate_chat') : t('err.rate')
    default:
      return t('err.server')
  }
}
