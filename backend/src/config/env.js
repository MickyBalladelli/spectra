import dotenv from 'dotenv'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: join(here, '../../../.env') })
dotenv.config()

const frontendOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

export function isAllowedFrontendOrigin(origin) {
  if (!origin) return true
  if (frontendOrigins.includes(origin)) return true

  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://spectra:spectra@localhost:5432/spectra',
  logDatabaseUrl: process.env.LOG_DATABASE_URL || process.env.DATABASE_URL || 'postgres://spectra:spectra@localhost:5432/spectra',
  frontendOrigins,
  jwtSecret: process.env.JWT_SECRET || 'spectra-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  ingestionWorkerPollMs: Number(process.env.INGESTION_WORKER_POLL_MS || 1000),
  searchMinScore: Number(process.env.SEARCH_MIN_SCORE || 0.35)
}
