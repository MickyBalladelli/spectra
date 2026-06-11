import { randomUUID } from 'crypto'
import { withClient } from './pool.js'

export const ingestionJobChannel = 'ingestion_job_events'

function mapJob(row) {
  if (!row) return null

  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    title: row.title,
    documentsTotal: row.documentsTotal,
    documentsCompleted: row.documentsCompleted,
    stage: row.stage,
    percent: row.percent,
    message: row.message,
    error: row.error,
    payload: row.payload,
    result: row.result,
    workerId: row.workerId,
    lockedAt: row.lockedAt,
    attempts: row.attempts,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    updatedAt: row.updatedAt
  }
}

const jobColumns = `id, user_id as "userId", status, title,
  documents_total as "documentsTotal", documents_completed as "documentsCompleted",
  stage, percent, message, error, payload, result,
  worker_id as "workerId", locked_at as "lockedAt", attempts,
  created_at as "createdAt", started_at as "startedAt",
  completed_at as "completedAt", updated_at as "updatedAt"`

const claimedJobColumns = `job.id, job.user_id as "userId", job.status, job.title,
  job.documents_total as "documentsTotal", job.documents_completed as "documentsCompleted",
  job.stage, job.percent, job.message, job.error, job.payload, job.result,
  job.worker_id as "workerId", job.locked_at as "lockedAt", job.attempts,
  job.created_at as "createdAt", job.started_at as "startedAt",
  job.completed_at as "completedAt", job.updated_at as "updatedAt"`

function summarizeResult(result) {
  if (!result) return null

  const documents = Array.isArray(result.documents) ? result.documents : [result.document].filter(Boolean)
  const chunks = Array.isArray(result.chunks) ? result.chunks : []
  const vectorKeys = Array.isArray(result.vectorKeys) ? result.vectorKeys : []

  return {
    documentCount: documents.length,
    chunkCount: chunks.length,
    vectorCount: vectorKeys.length
  }
}

export function toPublicIngestionJob(job) {
  if (!job) return null

  const { payload, result, ...publicJob } = job

  return {
    ...publicJob,
    result: summarizeResult(result)
  }
}

async function notifyIngestionJob(client, event, job) {
  await client.query(
    'select pg_notify($1, $2)',
    [ingestionJobChannel, JSON.stringify({ event, job: toPublicIngestionJob(job) })]
  )
}

export async function createIngestionJob({ userId, title, documentsTotal, payload }) {
  const id = randomUUID()
  const result = await withClient(async client => {
    const insertResult = await client.query(
      `insert into ingestion_jobs (id, user_id, title, documents_total, payload)
       values ($1, $2, $3, $4, $5)
       returning ${jobColumns}`,
      [id, userId, title, documentsTotal, payload]
    )
    const job = mapJob(insertResult.rows[0])
    await notifyIngestionJob(client, 'queued', job)
    return insertResult
  })

  return mapJob(result.rows[0])
}

export async function updateIngestionJob({ jobId, userId, patch }) {
  const fields = []
  const values = []

  function add(column, value) {
    values.push(value)
    fields.push(`${column} = $${values.length}`)
  }

  if (patch.status !== undefined) add('status', patch.status)
  if (patch.stage !== undefined) add('stage', patch.stage)
  if (patch.percent !== undefined) add('percent', patch.percent)
  if (patch.message !== undefined) add('message', patch.message)
  if (patch.error !== undefined) add('error', patch.error)
  if (patch.result !== undefined) add('result', patch.result)
  if (patch.documentsCompleted !== undefined) add('documents_completed', patch.documentsCompleted)
  if (patch.startedAt !== undefined) add('started_at', patch.startedAt)
  if (patch.completedAt !== undefined) add('completed_at', patch.completedAt)
  if (patch.workerId !== undefined) add('worker_id', patch.workerId)
  if (patch.lockedAt !== undefined) add('locked_at', patch.lockedAt)
  if (patch.attempts !== undefined) add('attempts', patch.attempts)

  add('updated_at', new Date())

  values.push(jobId, userId)
  const result = await withClient(async client => {
    const updateResult = await client.query(
      `update ingestion_jobs
       set ${fields.join(', ')}
       where id = $${values.length - 1} and user_id = $${values.length}
       returning ${jobColumns}`,
      values
    )
    const job = mapJob(updateResult.rows[0])
    if (job) {
      await notifyIngestionJob(client, job.status, job)
    }
    return updateResult
  })

  return mapJob(result.rows[0])
}

export async function claimNextIngestionJob({ workerId }) {
  return withClient(async client => {
    await client.query('begin')

    try {
      const result = await client.query(
        `with next_job as (
           select id
           from ingestion_jobs
           where status = 'queued'
           order by created_at
           for update skip locked
           limit 1
         )
         update ingestion_jobs job
         set status = 'running',
           stage = 'queued',
           percent = case when percent > 0 then percent else 1 end,
           message = 'Starting ingestion',
           started_at = coalesce(started_at, now()),
           updated_at = now(),
           locked_at = now(),
           worker_id = $1,
           attempts = attempts + 1
         from next_job
         where job.id = next_job.id
         returning ${claimedJobColumns}`,
        [workerId]
      )

      const job = mapJob(result.rows[0])
      if (job) {
        await notifyIngestionJob(client, 'running', job)
      }

      await client.query('commit')
      return job
    } catch (error) {
      await client.query('rollback')
      throw error
    }
  })
}

export async function listIngestionJobs({ userId, limit = 20 }) {
  const result = await withClient(client => client.query(
    `select ${jobColumns}
     from ingestion_jobs
     where user_id = $1
     order by created_at desc
     limit $2`,
    [userId, limit]
  ))

  return result.rows.map(mapJob)
}

export async function getIngestionJob({ userId, jobId }) {
  const result = await withClient(client => client.query(
    `select ${jobColumns}
     from ingestion_jobs
     where user_id = $1 and id = $2
     limit 1`,
    [userId, jobId]
  ))

  return mapJob(result.rows[0])
}
