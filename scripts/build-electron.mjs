// A főfolyamat és a preload csomagolása (esbuild) -> dist-electron/*.cjs
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'

export async function buildElectron() {
  const common = { bundle: true, platform: 'node', target: 'node22', format: 'cjs', sourcemap: true, external: ['electron'], logLevel: 'warning' }
  await build({ ...common, entryPoints: ['electron/main.ts'], outfile: 'dist-electron/main.cjs' })
  await build({ ...common, entryPoints: ['electron/preload.ts'], outfile: 'dist-electron/preload.cjs' })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildElectron()
