import { pool } from '../db/pool.js'
import { startIngestionWorkerLoop } from '../services/ingestionWorkerLoop.js'

const stopWorker = startIngestionWorkerLoop('process')

async function shutdown(signal) {
  console.log(`${signal} received, closing ingestion worker`)
  stopWorker()
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
