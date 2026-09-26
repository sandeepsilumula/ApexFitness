import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Creates the test database from the committed migrations. Runs once per
    // test run; without it every suite fails on a clean checkout with "The
    // table `main.User` does not exist in the current database".
    globalSetup: ['./tests/global-setup.ts'],
    include: ['tests/**/*.test.ts'],
    // Every file shares one SQLite test database and purges its fixtures in
    // beforeEach. Running files in parallel lets one file's delete race another
    // file's insert, so the files must run one at a time.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts'],
      exclude: ['lib/**/*.d.ts'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '.') },
  },
})
