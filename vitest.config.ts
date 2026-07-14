import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      DATABASE_URL: 'postgresql://user:password@localhost:5432/cuvote',
      AUTH_SECRET: 'test-secret-key-with-enough-length-for-validation',
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
