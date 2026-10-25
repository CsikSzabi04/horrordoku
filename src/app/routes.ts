// Útvonal-tábla. A csonk-képernyők tulajdonosa: login/profile/friends/lobby/coop → AI-B; a többi → AI-A.
export type Route =
  | { name: 'menu' }
  | { name: 'classic' }
  | { name: 'event' }
  | { name: 'random' }
  | { name: 'game'; ref?: string }
  | { name: 'collection' }
  | { name: 'settings' }
  | { name: 'login' }
  | { name: 'profile' }
  | { name: 'friends' }
  | { name: 'lobby'; mode?: 'together' | 'killer' }
  | { name: 'coop' }

export type RouteName = Route['name']
