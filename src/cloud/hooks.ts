// React-kötések a felhő állapotához (AI-B). A képernyők ezeken át figyelik a belépést és a szinkron-állapotot.
import { useEffect, useState } from 'react'
import type { CloudStatus, CloudUser } from '../shared/cloud'
import { cloud } from '.'

export function useCloudUser(): CloudUser | null {
  const [u, setU] = useState(cloud.auth.current())
  useEffect(() => {
    setU(cloud.auth.current()) // a feliratkozás előtt érkezett változás se vesszen el
    return cloud.auth.onChange(setU)
  }, [])
  return u
}

export function useCloudStatus(): CloudStatus {
  const [s, setS] = useState(cloud.status())
  useEffect(() => {
    setS(cloud.status())
    return cloud.onStatus(setS)
  }, [])
  return s
}
