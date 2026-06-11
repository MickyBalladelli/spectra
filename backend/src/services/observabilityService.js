import { logPool } from '../db/pool.js'

const maxDetailLength = 12000

function normalizeDetail(detail) {
  if (detail === undefined || detail === null) return null
  if (typeof detail === 'string') return detail.slice(0, maxDetailLength)

  try {
    return JSON.stringify(detail).slice(0, maxDetailLength)
  } catch {
    return String(detail).slice(0, maxDetailLength)
  }
}

function writeLog(type, entry) {
  logPool.query(
    `insert into observability_logs
      (type, user_id, source, message, detail, method, path, status, latency_ms, job_id, worker_id, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      type,
      entry.userId || null,
      entry.source || null,
      entry.message || null,
      normalizeDetail(entry.detail),
      entry.method || null,
      entry.path || null,
      entry.status || null,
      entry.latencyMs || null,
      entry.jobId || null,
      entry.workerId || null,
      {
        title: entry.title,
        event: entry.event,
        stage: entry.stage,
        percent: entry.percent,
        error: entry.error
      }
    ]
  ).catch(error => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Failed to write observability log:', error.message)
    }
  })
}

export function recordRequestLog(entry) {
  writeLog('request', entry)
}

export function recordJobLog(entry) {
  writeLog('job', entry)
}

export function recordWorkerLog(entry) {
  writeLog('worker', entry)
}

export function recordErrorLog(entry) {
  writeLog('error', entry)
}

async function listLogs({ userId, type, limit }) {
  const result = await logPool.query(
    `select id, type, user_id as "userId", source, message, detail, method, path,
      status, latency_ms as "latencyMs", job_id as "jobId", worker_id as "workerId",
      metadata, created_at as "at"
     from observability_logs
     where type = $1
       and (
         type = 'worker'
         or $2::text is null
         or user_id = $2
       )
     order by created_at desc
     limit $3`,
    [type, userId, limit]
  )

  return result.rows.map(row => ({
    ...row,
    title: row.metadata?.title,
    event: row.metadata?.event,
    stage: row.metadata?.stage,
    percent: row.metadata?.percent,
    error: row.metadata?.error
  }))
}

export async function getObservabilityLogs({ userId, limit = 50 }) {
  const [requests, jobs, workers, errors] = await Promise.all([
    listLogs({ userId, type: 'request', limit }),
    listLogs({ userId, type: 'job', limit }),
    listLogs({ userId, type: 'worker', limit }),
    listLogs({ userId, type: 'error', limit })
  ])

  return {
    requests,
    jobs,
    workers,
    errors
  }
}
