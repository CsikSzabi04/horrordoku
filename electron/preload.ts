import { contextBridge, ipcRenderer } from 'electron'
import type { NightdokuBridge } from '../src/shared/bridge'

const info = ipcRenderer.sendSync('nd:app:info') as { version: string; platform: NightdokuBridge['platform'] }
const inv = <T>(ch: string, ...a: unknown[]) => ipcRenderer.invoke(ch, ...a) as Promise<T>

// Kilépés előtti végső mentés: a főfolyamat kérésére lefuttatja a regisztrált kezelőket, majd nyugtáz.
const quitHandlers = new Set<() => Promise<void>>()
ipcRenderer.on('nd:before-quit', () => {
  void Promise.allSettled([...quitHandlers].map((h) => h())).then(() => ipcRenderer.send('nd:before-quit:done'))
})

const bridge: NightdokuBridge = {
  version: info.version,
  platform: info.platform,
  memory: {
    dir: async () => (await inv<{ dir: string }>('nd:memory:status')).dir,
    status: () => inv('nd:memory:status'),
    readJson: <T>(rel: string) => inv<T | null>('nd:memory:read', rel),
    writeJson: (rel, data) => inv('nd:memory:write', rel, data),
    remove: (rel) => inv('nd:memory:remove', rel),
    list: (rel) => inv('nd:memory:list', rel),
    usage: () => inv('nd:memory:usage'),
    openInExplorer: () => inv('nd:memory:open'),
  },
  secure: {
    get: (key) => inv('nd:secure:get', key),
    set: (key, value) => inv('nd:secure:set', key, value),
    remove: (key) => inv('nd:secure:remove', key),
  },
  app: {
    openExternal: (url) => inv('nd:app:openExternal', url),
    quit: () => ipcRenderer.send('nd:app:quit'),
    onBeforeQuit: (cb) => {
      quitHandlers.add(cb)
      return () => void quitHandlers.delete(cb)
    },
  },
  window: { toggleFullscreen: () => ipcRenderer.send('nd:window:fullscreen') },
}

contextBridge.exposeInMainWorld('nightdoku', bridge)
