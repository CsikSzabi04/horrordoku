import type { ComponentType } from 'react'
import { ToastProvider } from '../ui'
import { NavProvider, useNav } from './nav'
import type { RouteName } from './routes'
import { Stub } from './Stub'
import MenuScreen from '../screens/menu'
// AI-B tulajdona (A1 csak csonkot hozott létre):
import LoginScreen from '../screens/login'
import ProfileScreen from '../screens/profile'
import FriendsScreen from '../screens/friends'
import LobbyScreen from '../screens/lobby'
import CoopScreen from '../screens/coop'

const stub = (title: string, task: string): ComponentType => function StubScreen() { return <Stub title={title} task={task} /> }

const screens: Record<RouteName, ComponentType> = {
  menu: MenuScreen,
  classic: stub('Klasszikus mód', 'A5'),
  event: stub('Esemény mód', 'A8'),
  random: stub('Random mód', 'A6'),
  game: stub('Játékképernyő', 'A4'),
  collection: stub('Gyűjtemény', 'A8'),
  settings: stub('Beállítások', 'A7'),
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
        <Shell />
      </NavProvider>
    </ToastProvider>
  )
}
