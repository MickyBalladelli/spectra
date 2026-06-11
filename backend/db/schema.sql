create extension if not exists "uuid-ossp";

create table if not exists documents (
  id uuid primary key,
  user_id text not null default 'local',
  title text not null,
  source_type text not null default 'raw',
  body text not null,
  content_hash text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table documents add column if not exists user_id text not null default 'local';
alter table documents add column if not exists content_hash text;
create index if not exists documents_user_id_idx on documents(user_id);
create index if not exists documents_user_content_hash_idx on documents(user_id, content_hash);

create table if not exists document_chunks (
  id bigserial primary key,
  document_id uuid not null references documents(id) on delete cascade,
  user_id text not null default 'local',
  chunk_index integer not null,
  vector_key text not null unique,
  content text not null,
  token_count integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table document_chunks add column if not exists user_id text not null default 'local';
update document_chunks set user_id = d.user_id
  from documents d
  where d.id = document_chunks.document_id;

alter table document_chunks alter column vector_key type text using vector_key::text;

create index if not exists document_chunks_document_id_idx on document_chunks(document_id);
create index if not exists document_chunks_user_id_idx on document_chunks(user_id);
create index if not exists document_chunks_vector_key_idx on document_chunks(vector_key);
create index if not exists document_chunks_metadata_gin_idx on document_chunks using gin(metadata);

create table if not exists query_audit_logs (
  id bigserial primary key,
  user_id text not null default 'local',
  query_text text not null,
  filter jsonb not null default '{}',
  latency_ms integer not null,
  result_count integer not null,
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists ingestion_jobs_user_id_idx on ingestion_jobs(user_id);
create index if not exists ingestion_jobs_status_idx on ingestion_jobs(status);
create index if not exists ingestion_jobs_created_at_idx on ingestion_jobs(created_at desc);

create table if not exists users (
  username text primary key,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists users_username_idx on users(username);

alter table query_audit_logs add column if not exists user_id text not null default 'local';
create index if not exists query_audit_logs_user_id_idx on query_audit_logs(user_id);
