import { randomUUID } from 'crypto'
import { withClient } from './pool.js'

function mapSavedSearch(row) {
  if (!row) return null

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    config: row.config,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

export async function listSavedSearches({ userId }) {
  const result = await withClient(client => client.query(
    `select id, user_id as "userId", name, config,
      created_at as "createdAt", updated_at as "updatedAt"
     from saved_searches
     where user_id = $1
     order by updated_at desc`,
    [userId]
  ))

  return result.rows.map(mapSavedSearch)
}

export async function createSavedSearch({ userId, name, config }) {
  const result = await withClient(client => client.query(
    `insert into saved_searches (id, user_id, name, config)
     values ($1, $2, $3, $4)
     returning id, user_id as "userId", name, config,
       created_at as "createdAt", updated_at as "updatedAt"`,
    [randomUUID(), userId, name, config]
  ))

  return mapSavedSearch(result.rows[0])
}

export async function deleteSavedSearch({ userId, savedSearchId }) {
  const result = await withClient(client => client.query(
    `delete from saved_searches
     where id = $1 and user_id = $2
     returning id`,
    [savedSearchId, userId]
  ))

  return result.rowCount > 0
}
