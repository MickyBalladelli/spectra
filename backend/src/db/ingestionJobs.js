import { randomUUID } from 'crypto'
import { withClient } from './pool.js'

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
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    updatedAt: row.updatedAt
  }
}

const jobColumns = `id, user_id as "userId", status, title,
  documents_total as "documentsTotal", documents_completed as "documentsCompleted",
  stage, percent, message, error, payload, result,
  created_at as "createdAt", started_at as "startedAt",
  completed_at as "completedAt", updated_at as "updatedAt"`

export async function createIngestionJob({ userId, title, documentsTotal, payload }) {
  const id = randomUUID()
  const result = await withClient(client => client.query(
    `insert into ingestion_jobs (id, user_id, title, documents_total, payload)
     values ($1, $2, $3, $4, $5)
     returning ${jobColumns}`,
    [id, userId, title, documentsTotal, payload]
  ))

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

  add('updated_at', new Date())

  values.push(jobId, userId)
  const result = await withClient(client => client.query(
    `update ingestion_jobs
     set ${fields.join(', ')}
     where id = $${values.length - 1} and user_id = $${values.length}
     returning ${jobColumns}`,
    values
  ))

  return mapJob(result.rows[0])
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
