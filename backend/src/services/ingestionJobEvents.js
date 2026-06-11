import { ingestionJobChannel } from '../db/ingestionJobs.js'
import { pool } from '../db/pool.js'

function emitJobEvent(io, event, job) {
  if (!job?.userId) return

  const userRoom = `user:${job.userId}`
  io.to(userRoom).emit('ingestion:job', job)

  if (event === 'running') {
    io.to(userRoom).emit('ingestion:progress', {
      userId: job.userId,
      jobId: job.id,
      stage: job.stage,
      percent: job.percent,
      message: job.message,
      documentsTotal: job.documentsTotal,
      documentsCompleted: job.documentsCompleted
    })
  }

  if (event === 'completed') {
    io.to(userRoom).emit('ingestion:completed', {
      userId: job.userId,
      jobId: job.id,
      ...job.result
    })
  }

  if (event === 'failed') {
    io.to(userRoom).emit('ingestion:error', {
      userId: job.userId,
      jobId: job.id,
      message: job.error || job.message || 'Ingestion failed'
    })
  }
}

export async function startIngestionJobEvents(io) {
  const client = await pool.connect()
  await client.query(`listen ${ingestionJobChannel}`)

  client.on('notification', message => {
    if (message.channel !== ingestionJobChannel) return

    try {
      const payload = JSON.parse(message.payload)
      emitJobEvent(io, payload.event, payload.job)
    } catch (error) {
      console.warn('Invalid ingestion job notification:', error.message)
    }
  })

  return async function stopIngestionJobEvents() {
    await client.query(`unlisten ${ingestionJobChannel}`).catch(() => {})
    client.release()
  }
}
