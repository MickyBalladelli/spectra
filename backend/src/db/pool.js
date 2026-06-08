import pg from 'pg'
import { env } from '../config/env.js'

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
})

export async function withClient(work) {
  const client = await pool.connect()

  try {
    return await work(client)
  } finally {
    client.release()
  }
}
