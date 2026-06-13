import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/engine/**'],
      thresholds: { lines: 90, functions: 90, branches: 90 },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
