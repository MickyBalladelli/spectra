import dotenv from 'dotenv'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { runMigrations } from './lib/migrations.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

dotenv.config({ path: join(root, '.env') })
dotenv.config()

const databaseUrl = process.env.DATABASE_URL || 'postgres://spectra:spectra@localhost:5432/spectra'
const logDatabaseUrl = process.env.LOG_DATABASE_URL || databaseUrl

async function main() {
  await runMigrations({
    connectionString: databaseUrl,
    migrationsPath: join(root, 'backend/db/migrations/app'),
    scope: 'app'
  })

  await runMigrations({
    connectionString: logDatabaseUrl,
    migrationsPath: join(root, 'backend/db/migrations/log'),
    scope: 'log'
  })
}

main().catch(error => {
  console.error(error.stack || error.message || error)
  process.exit(1)
})
