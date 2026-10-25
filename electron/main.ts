import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell } from 'electron'
import path from 'node:path'
import { MemoryStore } from './memory'
import { SecureStore } from './secure'
import { parseMemoryFlag, pickMemoryDir } from './paths'

interface WinState {
  w: number
  h: number
  x?: number
  y?: number
  maximized?: boolean
}

const flag = parseMemoryFlag(process.argv)
const smoke = process.env.NIGHTDOKU_SMOKE === '1'
const devUrl = process.env.VITE_DEV_SERVER_URL
const projectRoot = app.getAppPath()

// Külön userData: a fejlesztői példányok (több worktree) és a --memory példányok ne tiltsák ki egymást
// a single-instance zárral, és ne osszák meg a localStorage-ot.
if (flag) app.setPath('userData', path.resolve(flag) + '-userdata')
else if (!app.isPackaged) app.setPath('userData', path.join(projectRoot, '.dev-userdata'))

let win: BrowserWindow | null = null
let mem: MemoryStore
let sec: SecureStore
let memInfo = { dir: '', fallback: false }
let ackQuit: (() => void) | null = null

const str = (v: unknown, max = 200): string => {
  if (typeof v !== 'string' || v.length === 0 || v.length > max) throw new Error('invalid argument')
  return v
}

function registerIpc() {
  ipcMain.on('nd:app:info', (e) => {
    e.returnValue = { version: app.getVersion(), platform: process.platform }
  })
  ipcMain.handle('nd:memory:status', () => memInfo)
  ipcMain.handle('nd:memory:read', (_e, rel: string) => mem.readJson(rel))
  ipcMain.handle('nd:memory:write', (_e, rel: string, data: unknown) => mem.writeJson(rel, data))
  ipcMain.handle('nd:memory:remove', (_e, rel: string) => mem.remove(rel))
  ipcMain.handle('nd:memory:list', (_e, rel: string) => mem.list(rel))
  ipcMain.handle('nd:memory:usage', () => mem.usage())
  ipcMain.handle('nd:memory:open', async () => void (await shell.openPath(memInfo.dir)))
  ipcMain.handle('nd:secure:get', (_e, k: unknown) => sec.get(str(k)))
  ipcMain.handle('nd:secure:set', (_e, k: unknown, v: unknown) => sec.set(str(k), str(v, 100_000)))
  ipcMain.handle('nd:secure:remove', (_e, k: unknown) => sec.remove(str(k)))
  ipcMain.handle('nd:app:openExternal', (_e, url: unknown) => {
    if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('only https:// allowed')
    return shell.openExternal(url)
  })
  ipcMain.on('nd:app:quit', () => app.quit())
  ipcMain.on('nd:window:fullscreen', () => win?.setFullScreen(!win.isFullScreen()))
  ipcMain.on('nd:before-quit:done', () => ackQuit?.())
}

async function createWindow() {
  const st = (await mem.readJson<WinState>('window.json').catch(() => null)) ?? { w: 1280, h: 800 }
  const w = new BrowserWindow({
    width: st.w,
    height: st.h,
    x: st.x,
    y: st.y,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#07060a',
    title: 'NIGHTDOKU',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  win = w
  if (st.maximized) w.maximize()
  if (!smoke) w.once('ready-to-show', () => w.show())

  let t: NodeJS.Timeout | undefined
  const saveBounds = () => {
    clearTimeout(t)
    t = setTimeout(() => {
      if (w.isDestroyed()) return
      const b = w.getNormalBounds()
      void mem.writeJson('window.json', { w: b.width, h: b.height, x: b.x, y: b.y, maximized: w.isMaximized() })
    }, 400)
  }
  w.on('resize', saveBounds)
  w.on('move', saveBounds)

  // F11 = teljes képernyő
  w.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      w.setFullScreen(!w.isFullScreen())
      e.preventDefault()
    }
  })
  // Keményítés: nincs navigáció / új ablak; külső link csak https-en, rendszer-böngészőben.
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  w.webContents.on('will-navigate', (e, url) => {
    if (!(devUrl ? url.startsWith(devUrl) : url.startsWith('file://'))) e.preventDefault()
  })

  // Bezáráskor: a renderer végső mentése (onBeforeQuit), legfeljebb ~2 mp, aztán tényleges bezárás.
  let closing = false
  w.on('close', (e) => {
    if (closing || smoke) return
    e.preventDefault()
    closing = true
    const done = () => {
      ackQuit = null
      if (!w.isDestroyed()) w.destroy()
    }
    const timer = setTimeout(done, 2000)
    ackQuit = () => {
      clearTimeout(timer)
      done()
    }
    w.webContents.send('nd:before-quit')
  })

  if (devUrl) await w.loadURL(devUrl)
  else await w.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  return w
}

// Füstteszt (npm run smoke): a híd valódi Electronban, a renderer oldaláról.
const SMOKE_JS = `(async () => {
  const b = window.nightdoku, o = {}
  await b.secure.set('k', 'titok-érték'); o.secure = await b.secure.get('k')
  await b.secure.remove('k'); o.secureRemoved = await b.secure.get('k')
  await b.memory.writeJson('smoke/a.json', { x: 1 }); o.json = await b.memory.readJson('smoke/a.json')
  o.list = await b.memory.list('smoke'); o.usage = (await b.memory.usage()).bytes > 0
  for (const [k, p] of [['dotdot', '../x.json'], ['abs', 'C:/Windows/win.ini'], ['unc', '\\\\\\\\srv\\\\s\\\\x']]) {
    try { await b.memory.readJson(p); o[k] = 'NOT BLOCKED' } catch { o[k] = 'blocked' }
  }
  try { await b.app.openExternal('http://insecure.example'); o.http = 'NOT BLOCKED' } catch { o.http = 'blocked' }
  o.status = await b.memory.status(); o.version = b.version; o.platform = b.platform
  o.isolated = typeof require === 'undefined' && typeof process === 'undefined'
  return o
})()`

async function runSmoke(w: BrowserWindow) {
  try {
    const r = (await w.webContents.executeJavaScript(SMOKE_JS)) as Record<string, unknown>
    const ok =
      r.secure === 'titok-érték' && r.secureRemoved === null && JSON.stringify(r.json) === '{"x":1}' &&
      JSON.stringify(r.list) === '["a.json"]' && r.usage === true && r.dotdot === 'blocked' && r.abs === 'blocked' &&
      r.unc === 'blocked' && r.http === 'blocked' && r.isolated === true
    console.log(`SMOKE ${ok ? 'OK' : 'FAIL'} ${JSON.stringify(r)}`)
    app.exit(ok ? 0 : 1)
  } catch (e) {
    console.log(`SMOKE FAIL ${String(e)}`)
    app.exit(1)
  }
}

async function start() {
  try {
    memInfo = await pickMemoryDir({
      flag,
      isPackaged: app.isPackaged,
      portableDir: process.env.PORTABLE_EXECUTABLE_DIR,
      exeDir: path.dirname(app.getPath('exe')),
      projectRoot,
      appData: app.getPath('appData'),
      cwd: process.cwd(),
    })
  } catch (e) {
    dialog.showErrorBox('NIGHTDOKU', String(e))
    app.exit(1)
    return
  }
  if (memInfo.fallback) console.warn(`memory mappa nem írható az app mellett, tartalék: ${memInfo.dir}`)
  mem = new MemoryStore(memInfo.dir)
  sec = new SecureStore(path.join(memInfo.dir, 'auth.bin'), {
    isAvailable: () => safeStorage.isEncryptionAvailable(),
    encrypt: (s) => safeStorage.encryptString(s),
    decrypt: (b) => safeStorage.decryptString(b),
  })
  Menu.setApplicationMenu(null)
  registerIpc()
  const w = await createWindow()
  if (smoke) await runSmoke(w)
}

// Egy példány (a --memory kapcsolóval indított példányok külön adatmappát kapnak, azokra nincs zár).
if (flag || app.requestSingleInstanceLock()) {
  app.on('second-instance', () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })
  app.on('window-all-closed', () => app.quit())
  void app.whenReady().then(start)
} else {
  app.quit()
}
