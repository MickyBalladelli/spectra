import os from 'os'
import { env } from '../config/env.js'
import { pool } from '../db/pool.js'
import { claimNextIngestionJob } from '../db/ingestionJobs.js'
import { runIngestionJob } from '../services/ingestionJobRunner.js'

const workerId = `${os.hostname()}:${process.pid}`
let stopping = false

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function workOnce() {
  const job = await claimNextIngestionJob({ workerId })
  if (!job) return false

  console.log(`Worker ${workerId} running ingestion job ${job.id}`)
  await runIngestionJob(job)
  return true
}

async function runWorker() {
  console.log(`Spectra ingestion worker ${workerId} started`)

  while (!stopping) {
    const worked = await workOnce()
    if (!worked) {
      await sleep(env.ingestionWorkerPollMs)
    }
  }
}

async function shutdown(signal) {
  console.log(`${signal} received, closing ingestion worker`)
  stopping = true
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

runWorker().catch(async error => {
  console.error('Ingestion worker failed:', error.stack || error.message || error)
  await pool.end()
  process.exit(1)
})
