import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: '/',
  // Két oldal: / = Home (landing), /play/ = maga a játék (React-app)
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: { home: page('index.html'), play: page('play/index.html') } } },
  server: { port: 5173, strictPort: false }, // több worktree egyszerre: szabad portra ugrik
  test: {
    environment: 'node',
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '.work/**', 'memory*/**', '.dev-userdata/**', 'dist/**', 'release/**'],
  },
})
