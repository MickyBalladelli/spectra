import dotenv from 'dotenv'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: join(here, '../../../.env') })
dotenv.config()

export const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://spectra:spectra@localhost:5432/spectra',
  frontendOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  vectorWorkerPath: process.env.VECTOR_WORKER_PATH || './workers/turbovec_worker.py'
  ,
  jwtSecret: process.env.JWT_SECRET || 'spectra-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
}
