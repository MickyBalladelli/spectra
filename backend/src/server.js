import http from 'http'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { env, isAllowedFrontendOrigin } from './config/env.js'
import { logPool, pool, withClient, withLogClient } from './db/pool.js'
import { registerSockets } from './socket/index.js'
import { startIngestionJobEvents } from './services/ingestionJobEvents.js'
import { startIngestionWorkerLoop } from './services/ingestionWorkerLoop.js'

let io
let stopIngestionJobEvents = async () => {}
let stopIngestionWorker = () => {}
const app = createApp(() => io)
const server = http.createServer(app)
io = new Server(server, {
  cors: {
    origin(origin, callback) {
      callback(null, isAllowedFrontendOrigin(origin))
    },
    methods: ['GET', 'POST']
  }
})

async function ensureObservabilitySchema() {
  await withLogClient(async client => {
    await client.query(`
      create table if not exists observability_logs (
        id bigserial primary key,
        type text not null,
        user_id text,
        source text,
        message text,
        detail text,
        method text,
        path text,
        status integer,
        latency_ms integer,
        job_id uuid,
        worker_id text,
        metadata jsonb not null default '{}',
        created_at timestamptz not null default now()
      )
    `)
    await client.query(`create index if not exists observability_logs_type_created_idx on observability_logs(type, created_at desc)`)
    await client.query(`create index if not exists observability_logs_user_created_idx on observability_logs(user_id, created_at desc)`)
    await client.query(`create index if not exists observability_logs_job_id_idx on observability_logs(job_id)`)
  })
}

async function ensureDatabaseSchema() {
  try {
    await withClient(async client => {
      try {
        await client.query(`create extension if not exists vector`)
      } catch (error) {
        console.warn('pgvector extension check skipped:', error.message)
      }

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
      await client.query(`alter table document_chunks add column if not exists embedding vector(128)`)
      await client.query(`create index if not exists document_chunks_embedding_idx on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100)`)
      await client.query(`
        create table if not exists query_audit_logs (
          id bigserial primary key,
          user_id text not null,
          query_text text,
          filter jsonb default '{}',
          latency_ms integer not null,
          result_count integer not null,
          created_at timestamptz not null default now()
        )
      `)
      await client.query(`create index if not exists query_audit_logs_user_created_idx on query_audit_logs(user_id, created_at desc)`)
      await client.query(`
        create table if not exists ingestion_jobs (
          id uuid primary key,
          user_id text not null,
          status text not null default 'queued',
          title text not null,
          documents_total integer not null default 1,
          documents_completed integer not null default 0,
          stage text,
          percent integer not null default 0,
          message text,
          error text,
          payload jsonb not null default '{}',
          result jsonb,
          worker_id text,
          locked_at timestamptz,
          attempts integer not null default 0,
          created_at timestamptz not null default now(),
          started_at timestamptz,
          completed_at timestamptz,
          updated_at timestamptz not null default now()
        )
      `)
      await client.query(`alter table ingestion_jobs add column if not exists worker_id text`)
      await client.query(`alter table ingestion_jobs add column if not exists locked_at timestamptz`)
      await client.query(`alter table ingestion_jobs add column if not exists attempts integer not null default 0`)
      await client.query(`create index if not exists ingestion_jobs_user_id_idx on ingestion_jobs(user_id)`)
      await client.query(`create index if not exists ingestion_jobs_status_idx on ingestion_jobs(status)`)
      await client.query(`create index if not exists ingestion_jobs_created_at_idx on ingestion_jobs(created_at desc)`)
      await client.query(`
        create table if not exists users (
          username text primary key,
          password_hash text not null,
          created_at timestamptz not null default now()
        )
      `)
      await client.query(`create unique index if not exists users_username_idx on users(username)`)
      await client.query(`
        create table if not exists collections (
          id uuid primary key,
          owner_user_id text not null references users(username) on delete cascade,
          name text not null,
          created_at timestamptz not null default now()
        )
      `)
      await client.query(`
        create table if not exists collection_documents (
          collection_id uuid not null references collections(id) on delete cascade,
          document_id uuid not null references documents(id) on delete cascade,
          added_by text not null,
          added_at timestamptz not null default now(),
          primary key (collection_id, document_id)
        )
      `)
      await client.query(`
        create table if not exists collection_shares (
          collection_id uuid not null references collections(id) on delete cascade,
          user_id text not null references users(username) on delete cascade,
          created_at timestamptz not null default now(),
          primary key (collection_id, user_id)
        )
      `)
      await client.query(`create index if not exists collections_owner_user_id_idx on collections(owner_user_id)`)
      await client.query(`create index if not exists collection_documents_document_id_idx on collection_documents(document_id)`)
      await client.query(`create index if not exists collection_shares_user_id_idx on collection_shares(user_id)`)
    })
    await ensureObservabilitySchema()
  } catch (error) {
    console.warn('Skipping database schema migration:', error.message)
  }
}

registerSockets(io)

async function startServer() {
  await ensureDatabaseSchema()
  stopIngestionJobEvents = await startIngestionJobEvents(io)
  stopIngestionWorker = startIngestionWorkerLoop('server')

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
  stopIngestionWorker()
  await stopIngestionJobEvents()
  io.close()
  server.close(async () => {
    await pool.end()
    if (logPool !== pool) {
      await logPool.end()
    }
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
