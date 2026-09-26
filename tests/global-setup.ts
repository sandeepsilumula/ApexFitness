import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The test database is a build artefact, not a committed file. Provision it here
 * so a fresh clone — or a CI runner that has never seen this project — can run
 * `npm test` without a manual migration step.
 *
 * The failure this prevents is silent in the worst way: a stale `prisma/dev.db`
 * with the schema already applied makes the suite pass locally, so the missing
 * step only surfaces on a clean checkout, where every suite fails with
 * "The table `main.User` does not exist in the current database".
 *
 * This runs once per test run. tests/setup.ts is per test file, so provisioning
 * there would re-run the migration 21 times.
 */

const TEST_DATABASE_URL = 'file:./test.db'
const TEST_DATABASE_PATH = path.resolve(process.cwd(), 'test.db')

/**
 * Resolve the Prisma CLI entry point instead of shelling out to `npx`.
 * `npx` is `npx.cmd` on Windows, so a bare spawn fails with ENOENT there, and
 * relying on shell resolution is fragile on CI. The bin entry in Prisma's
 * package.json is the same file on every platform.
 */
const PRISMA_CLI = fileURLToPath(
  new URL('../node_modules/prisma/build/index.js', import.meta.url),
)

function resetDatabase() {
  // A partial file from an interrupted run can be schema-shaped but missing
  // tables, and `migrate deploy` will not repair it — the migration is already
  // recorded as applied. Deleting the file makes provisioning deterministic.
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const file = `${TEST_DATABASE_PATH}${suffix}`
    if (existsSync(file)) rmSync(file, { force: true })
  }
}

export default function globalSetup() {
  // Keep the process env aligned with tests/setup.ts. Anything importing
  // @/lib/db outside a test file's setup window reads this value.
  process.env.DATABASE_URL = TEST_DATABASE_URL

  resetDatabase()

  try {
    execFileSync(process.execPath, [PRISMA_CLI, 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    })
  } catch (error) {
    throw new Error(
      `Could not provision the test database at ${TEST_DATABASE_PATH}. ` +
        `Run \`npx prisma migrate deploy\` with DATABASE_URL=${TEST_DATABASE_URL} ` +
        `to see the underlying error.\n${String(error)}`,
    )
  }
}
