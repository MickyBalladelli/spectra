import os from 'os'
import { env } from '../config/env.js'
import { claimNextIngestionJob } from '../db/ingestionJobs.js'
import { runIngestionJob } from './ingestionJobRunner.js'

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function workOnce(workerId) {
  const job = await claimNextIngestionJob({ workerId })
  if (!job) return false

  console.log(`Worker ${workerId} running ingestion job ${job.id}`)
  await runIngestionJob(job)
  return true
}

export function startIngestionWorkerLoop(name = 'worker') {
  const workerId = `${name}:${os.hostname()}:${process.pid}`
  let stopping = false

  async function run() {
    console.log(`Spectra ingestion worker ${workerId} started`)

    while (!stopping) {
      try {
        const worked = await workOnce(workerId)
        if (!worked) {
          await sleep(env.ingestionWorkerPollMs)
        }
      } catch (error) {
        console.error('Ingestion worker loop error:', error.stack || error.message || error)
        await sleep(env.ingestionWorkerPollMs)
      }
    }
  }

  run().catch(error => {
    console.error('Ingestion worker loop stopped:', error.stack || error.message || error)
  })

  return function stopIngestionWorkerLoop() {
    stopping = true
  }
}
