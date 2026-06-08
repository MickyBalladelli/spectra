import http from 'http'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { pool, withClient } from './db/pool.js'
import { registerSockets } from './socket/index.js'

const app = createApp()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: env.frontendOrigins,
    methods: ['GET', 'POST']
  }
})

async function ensureDatabaseSchema() {
  try {
    await withClient(async client => {
      const vectorKeyResult = await client.query(
        `select data_type from information_schema.columns
         where table_name = 'document_chunks'
           and column_name = 'vector_key'`
      )

      if (vectorKeyResult.rowCount === 1 && vectorKeyResult.rows[0].data_type !== 'text') {
        console.log('Converting document_chunks.vector_key to text')
        await client.query(
          `alter table document_chunks
           alter column vector_key type text using vector_key::text`
        )
      }

      const documentHashResult = await client.query(
        `select column_name from information_schema.columns
         where table_name = 'documents'
           and column_name = 'content_hash'`
      )

      if (documentHashResult.rowCount === 0) {
        console.log('Adding documents.content_hash column')
        await client.query(`alter table documents add column content_hash text`)
      }

      await client.query(`create index if not exists documents_user_content_hash_idx on documents(user_id, content_hash)`)
    })
  } catch (error) {
    console.warn('Skipping database schema migration:', error.message)
  }
}

registerSockets(io)

async function startServer() {
  await ensureDatabaseSchema()

  server.listen(env.port, () => {
    console.log(`Spectra backend listening on ${env.port}`)
  })
}

startServer().catch(error => {
  console.error('Failed to start Spectra backend:', error.stack || error.message || error)
  process.exit(1)
})

async function shutdown(signal) {
  console.log(`${signal} received, closing Spectra backend`)
  io.close()
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
