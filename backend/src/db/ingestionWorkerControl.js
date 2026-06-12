import { withClient } from './pool.js'

const controlId = 'global'

function mapControl(row) {
  return {
    paused: Boolean(row?.paused),
    updatedBy: row?.updatedBy || null,
    updatedAt: row?.updatedAt || null
  }
}

export async function getIngestionWorkerControl() {
  const result = await withClient(client => client.query(
    `select paused, updated_by as "updatedBy", updated_at as "updatedAt"
     from ingestion_worker_controls
     where id = $1
     limit 1`,
    [controlId]
  ))

  return mapControl(result.rows[0])
}

export async function setIngestionWorkerPaused({ paused, updatedBy }) {
  const result = await withClient(client => client.query(
    `insert into ingestion_worker_controls (id, paused, updated_by, updated_at)
     values ($1, $2, $3, now())
     on conflict (id) do update
       set paused = excluded.paused,
         updated_by = excluded.updated_by,
         updated_at = now()
     returning paused, updated_by as "updatedBy", updated_at as "updatedAt"`,
    [controlId, paused, updatedBy]
  ))

  return mapControl(result.rows[0])
}
