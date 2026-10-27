// CSONK — AI-B tulajdona (B5): a co-op játék-overlay. A játékképernyőhöz a BoardController-en át csatlakozik.
import { Stub } from '../../app/Stub'
import { pick } from '../../i18n/lang'

export default function CoopScreen() {
  return <Stub title={pick('Közös játék', 'Play together')} task="B5" />
}
