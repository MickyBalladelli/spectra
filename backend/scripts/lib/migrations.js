import fs from 'fs/promises'
import pg from 'pg'
import { join } from 'path'

export async function runMigrations({ connectionString, migrationsPath, scope }) {
  const client = new pg.Client({ connectionString })
  await client.connect()

  try {
    await client.query(`
      create table if not exists schema_migrations (
        scope text not null,
        id text not null,
        applied_at timestamptz not null default now(),
        primary key (scope, id)
      )
    `)

    const files = (await fs.readdir(migrationsPath))
      .filter(file => file.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const applied = await client.query(
        'select 1 from schema_migrations where scope = $1 and id = $2',
        [scope, file]
      )

      if (applied.rowCount > 0) {
        continue
      }

      const sql = await fs.readFile(join(migrationsPath, file), 'utf8')

      await client.query('begin')
      try {
        await client.query(sql)
        await client.query(
          'insert into schema_migrations (scope, id) values ($1, $2)',
          [scope, file]
        )
        await client.query('commit')
        console.log(`Applied ${scope} migration ${file}`)
      } catch (error) {
        await client.query('rollback')
        throw error
      }
    }
  } finally {
    await client.end()
  }
}
