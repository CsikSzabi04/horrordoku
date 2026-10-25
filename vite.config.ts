import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 5173, strictPort: false }, // több worktree / példány: szabad portra ugrik
  test: {
    environment: 'node',
    include: ['electron/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '.work/**', 'memory*/**', '.dev-userdata/**', 'dist/**', 'release/**'],
  },
})
