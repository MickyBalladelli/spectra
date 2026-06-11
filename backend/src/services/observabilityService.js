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
      typeof entry.status === 'number' ? entry.status : null,
      entry.latencyMs || null,
      entry.jobId || null,
      entry.workerId || null,
      {
        title: entry.title,
        status: entry.status,
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

async function listLogs({ viewerUserId, type, limit, filters = {} }) {
  const values = [type]
  const where = ['type = $1']

  if (type === 'worker') {
    if (filters.user) {
      values.push(filters.user)
      where.push(`user_id = $${values.length}`)
    }
  } else {
    values.push(filters.user || viewerUserId)
    where.push(`user_id = $${values.length}`)
  }

  if (filters.status) {
    values.push(filters.status)
    where.push(`(
      status::text = $${values.length}
      or metadata->>'status' = $${values.length}
      or metadata->>'event' = $${values.length}
      or source = $${values.length}
    )`)
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom)
    where.push(`created_at >= $${values.length}::timestamptz`)
  }

  if (filters.dateTo) {
    values.push(filters.dateTo)
    where.push(`created_at <= $${values.length}::timestamptz`)
  }

  values.push(limit)
  const result = await logPool.query(
    `select id, type, user_id as "userId", source, message, detail, method, path,
      status, latency_ms as "latencyMs", job_id as "jobId", worker_id as "workerId",
      metadata, created_at as "at"
     from observability_logs
     where ${where.join(' and ')}
     order by created_at desc
     limit $${values.length}`,
    values
  )

  return result.rows.map(row => ({
    ...row,
    title: row.metadata?.title,
    status: row.status || row.metadata?.status,
    event: row.metadata?.event,
    stage: row.metadata?.stage,
    percent: row.metadata?.percent,
    error: row.metadata?.error
  }))
}

export async function getObservabilityLogs({ userId, limit = 50, filters = {} }) {
  const allowedTypes = ['request', 'job', 'worker', 'error']
  const types = filters.type && filters.type !== 'all'
    ? allowedTypes.filter(type => type === filters.type)
    : allowedTypes

  const entries = await Promise.all(types.map(type => listLogs({
    viewerUserId: userId,
    type,
    limit,
    filters
  })))
  const byType = Object.fromEntries(types.map((type, index) => [type, entries[index]]))

  return {
    requests: byType.request || [],
    jobs: byType.job || [],
    workers: byType.worker || [],
    errors: byType.error || []
  }
}

function escapeCsv(value) {
  const text = value === undefined || value === null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export async function exportObservabilityLogs({ userId, limit = 1000, filters = {} }) {
  const logs = await getObservabilityLogs({ userId, limit, filters })
  const rows = [
    ...logs.requests,
    ...logs.jobs,
    ...logs.workers,
    ...logs.errors
  ].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())

  const headers = [
    'at',
    'type',
    'userId',
    'source',
    'method',
    'path',
    'status',
    'latencyMs',
    'jobId',
    'workerId',
    'title',
    'event',
    'stage',
    'percent',
    'message',
    'error',
    'detail'
  ]

  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => escapeCsv(row[header])).join(','))
  ].join('\n')
}

export function sanitizeObservabilityFilters({ viewerUserId, query }) {
  const requestedUser = String(query.user || '').trim()
  const user = requestedUser
    ? requestedUser === viewerUserId ? requestedUser : '__blocked__'
    : ''

  return {
    type: ['all', 'request', 'job', 'worker', 'error'].includes(query.type) ? query.type : 'all',
    status: String(query.status || '').trim(),
    dateFrom: String(query.dateFrom || '').trim(),
    dateTo: String(query.dateTo || '').trim(),
    user
  }
}
