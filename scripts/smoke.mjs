// Füstteszt VALÓDI Electronban: híd (memory, secure, útvonal-védelem) + külön --memory mappa. Kilépési kód: 0 = rendben.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const mem = mkdtempSync(path.join(tmpdir(), 'nd-smoke-'))
const child = spawn(require('electron'), ['.', `--memory=${mem}`], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, NIGHTDOKU_SMOKE: '1' },
  stdio: ['ignore', 'inherit', 'inherit'],
})
const timer = setTimeout(() => { console.error('SMOKE timeout'); child.kill() }, 60000)
child.on('exit', (code) => {
  clearTimeout(timer)
  rmSync(mem, { recursive: true, force: true })
  rmSync(mem + '-userdata', { recursive: true, force: true })
  process.exit(code ?? 1)
})
