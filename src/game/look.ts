import { content } from '../content'
import type { CharId } from '../shared/base'
import { getLang } from '../i18n/lang'
import type { Race } from '../shared/puzzle'

export const RACE_EMOJI: Record<Race, string> = {
  human: '🧑', vampire: '🧛', ghost: '👻', demon: '😈', werewolf: '🐺', witch: '🧙', ghoul: '🧟', shapeshifter: '🦎',
}
export const RACE_HU: Record<Race, string> = {
  human: 'Ember', vampire: 'Vámpír', ghost: 'Szellem', demon: 'Démon', werewolf: 'Vérfarkas', witch: 'Boszorkány', ghoul: 'Ghoul', shapeshifter: 'Alakváltó',
}
export const RACE_EN: Record<Race, string> = {
  human: 'Human', vampire: 'Vampire', ghost: 'Ghost', demon: 'Demon', werewolf: 'Werewolf', witch: 'Witch', ghoul: 'Ghoul', shapeshifter: 'Shapeshifter',
}
/** A faj neve az aktuális nyelven. */
export const raceName = (r: Race): string => (getLang() === 'en' ? RACE_EN[r] : RACE_HU[r])
export const RACE_COLOR: Record<Race, string> = {
  human: '#8a8f98', vampire: '#b3172e', ghost: '#7aa7c7', demon: '#d2561a', werewolf: '#8a6a3b', witch: '#7d4bb3', ghoul: '#5d8a4e', shapeshifter: '#2f9a8c',
}

const known = new Map(content.characters().map((c) => [c.id, c.emoji]))
/** A szereplő jele: a Gyűjtemény emojija, ennek híján a faj emojija (amíg nincs portré). */
export const charEmoji = (id: CharId, race: Race): string => known.get(id) ?? RACE_EMOJI[race]
