import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/**
 * Content-Security-Policy a kész oldalakba (csak éles buildben; a fejlesztői szerver HMR-je beágyazott szkriptet használ).
 * A beágyazott szkripteket (téma / nyelv villanás-mentes beállítása) hash-sel engedélyezzük, mást nem: nincs `unsafe-inline` a szkriptekre,
 * a külső kapcsolat csak a saját forrás és a Supabase. Az `X-Frame-Options` és a többi fejléc a `vercel.json`-ban van.
 */
function csp(): Plugin {
  return {
    name: 'nightdoku-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // a HTML-elemző a sortöréseket LF-re normalizálja, a hash is erre a szövegre készül
        const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
          (m) => `'sha256-${createHash('sha256').update(m[1]!.replace(/\r\n?/g, '\n')).digest('base64')}'`,
        )
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`.trim(),
          "style-src 'self' 'unsafe-inline'", // a React `style` attribútumai miatt
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
          "media-src 'self' blob: data:",
          "worker-src 'self' blob:",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          'upgrade-insecure-requests',
        ].join('; ')
        return html.replace(/<head[^>]*>/, (m) => `${m}
    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), csp()],
  base: '/',
  // Két oldal: / = Home (landing), /play/ = maga a játék (React-app)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022', // modern böngészők: kisebb, gyorsabb kód
    rollupOptions: {
      input: { home: page('index.html'), play: page('play/index.html') },
      output: {
        // a ritkán változó könyvtárak külön, hosszan gyorsítótárazható csomagba kerülnek (a játék kódjának frissítése nem érinti őket)
        manualChunks(id) {
          if (id.includes('node_modules/@supabase')) return 'supabase'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          return undefined
        },
      },
    },
  },
  server: { port: 5173, strictPort: false }, // több worktree egyszerre: szabad portra ugrik
  test: {
    environment: 'node',
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
    exclude: ['**/node_modules/**', '.work/**', 'memory*/**', '.dev-userdata/**', 'dist/**', 'release/**'],
  },
})
