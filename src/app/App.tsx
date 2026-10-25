import type { ComponentType } from 'react'
import { ToastProvider } from '../ui'
import { NavProvider, useNav } from './nav'
import type { RouteName } from './routes'
import MenuScreen from '../screens/menu'
import GameScreen from '../screens/game'
import ClassicScreen from '../screens/classic'
import RandomScreen from '../screens/random'
import EventScreen from '../screens/event'
// AI-B tulajdona (A1 csak csonkot hozott létre):
import LoginScreen from '../screens/login'
import ProfileScreen from '../screens/profile'
import FriendsScreen from '../screens/friends'
import { AddLinkHandler } from '../screens/friends/addLink'
import LobbyScreen from '../screens/lobby'
import CoopScreen from '../screens/coop'
import CollectionScreen from '../screens/collection'
import SettingsScreen from '../screens/settings'


const screens: Record<RouteName, ComponentType> = {
  menu: MenuScreen,
  classic: ClassicScreen,
  event: EventScreen,
  random: RandomScreen,
  game: GameScreen,
  collection: CollectionScreen,
  settings: SettingsScreen,
  login: LoginScreen,
  profile: ProfileScreen,
  friends: FriendsScreen,
  lobby: LobbyScreen,
  coop: CoopScreen,
}

function Shell() {
  const { route } = useNav()
  const Screen = screens[route.name]
  return <Screen />
}

export default function App() {
  return (
    <ToastProvider>
      <NavProvider>
        <AddLinkHandler />
        <Shell />
      </NavProvider>
    </ToastProvider>
  )
}
