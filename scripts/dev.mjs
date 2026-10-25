// Fejlesztői indítás: Vite-szerver + Electron natív ablak. A főfolyamat/preload módosítása után indítsd újra.
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { buildElectron } from './build-electron.mjs'

const require = createRequire(import.meta.url)
const server = await createServer({ server: { port: 5173, strictPort: false } })
await server.listen()
const url = server.resolvedUrls?.local[0]
if (!url) throw new Error('A Vite-szerver nem adott URL-t')
await buildElectron()

const child = spawn(require('electron'), ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, VITE_DEV_SERVER_URL: url }, // ELECTRON_RUN_AS_NODE (pl. VS Code-os eszközök) plain Node-ként indítaná
})
child.on('exit', (code) => void server.close().then(() => process.exit(code ?? 0)))
