// Útvonal-tábla. A csonk-képernyők tulajdonosa: login/profile/friends/lobby/coop → AI-B; a többi → AI-A.
export type Route =
  | { name: 'menu' }
  | { name: 'classic' }
  | { name: 'event'; world?: string } // world: egy világ ügyei (5 db, sorban); nélküle a világok listája
  | { name: 'random' }
  | { name: 'game'; ref?: string }
  | { name: 'collection' }
  | { name: 'settings' }
  | { name: 'login' }
  | { name: 'profile' }
  | { name: 'friends'; add?: string } // add: barát-link kódja (a link megnyitása után a találat felvehető)
  | { name: 'lobby'; mode?: 'together' | 'killer'; room?: string } // room: egy szoba azonosítója — a lista helyett egyből a szoba nyílik (meghívó „Belépés")
  | { name: 'coop' }

export type RouteName = Route['name']
