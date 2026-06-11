import os from 'os'
import { env } from '../config/env.js'
import { claimNextIngestionJob } from '../db/ingestionJobs.js'
import { runIngestionJob } from './ingestionJobRunner.js'
import { recordWorkerLog, recordErrorLog } from './observabilityService.js'

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function workOnce(workerId) {
  const job = await claimNextIngestionJob({ workerId })
  if (!job) return false

  console.log(`Worker ${workerId} running ingestion job ${job.id}`)
  recordWorkerLog({
    workerId,
    jobId: job.id,
    title: job.title,
    message: 'Running ingestion job'
  })
  await runIngestionJob(job)
  recordWorkerLog({
    workerId,
    jobId: job.id,
    title: job.title,
    message: 'Finished ingestion job'
  })
  return true
}

export function startIngestionWorkerLoop(name = 'worker') {
  const workerId = `${name}:${os.hostname()}:${process.pid}`
  let stopping = false

  async function run() {
    console.log(`Spectra ingestion worker ${workerId} started`)
    recordWorkerLog({
      workerId,
      message: 'Worker started'
    })

    while (!stopping) {
      try {
        const worked = await workOnce(workerId)
        if (!worked) {
          await sleep(env.ingestionWorkerPollMs)
        }
      } catch (error) {
        console.error('Ingestion worker loop error:', error.stack || error.message || error)
        recordErrorLog({
          source: 'worker',
          message: error.message,
          detail: error.stack,
          workerId
        })
        recordWorkerLog({
          workerId,
          message: 'Worker loop error',
          error: error.message
        })
        await sleep(env.ingestionWorkerPollMs)
      }
    }
  }

  run().catch(error => {
    console.error('Ingestion worker loop stopped:', error.stack || error.message || error)
    recordErrorLog({
      source: 'worker',
      message: error.message,
      detail: error.stack,
      workerId
    })
  })

  return function stopIngestionWorkerLoop() {
    stopping = true
    recordWorkerLog({
      workerId,
      message: 'Worker stopping'
    })
  }
}
