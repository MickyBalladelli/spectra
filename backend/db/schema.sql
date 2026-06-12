create extension if not exists "uuid-ossp";
create extension if not exists vector;

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
  embedding vector(128),
  content text not null,
  token_count integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table document_chunks add column if not exists user_id text not null default 'local';
alter table document_chunks add column if not exists embedding vector(128);
update document_chunks set user_id = d.user_id
  from documents d
  where d.id = document_chunks.document_id;

alter table document_chunks alter column vector_key type text using vector_key::text;

create index if not exists document_chunks_document_id_idx on document_chunks(document_id);
create index if not exists document_chunks_user_id_idx on document_chunks(user_id);
create index if not exists document_chunks_vector_key_idx on document_chunks(vector_key);
create index if not exists document_chunks_metadata_gin_idx on document_chunks using gin(metadata);
create index if not exists document_chunks_embedding_idx on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table if not exists query_audit_logs (
  id bigserial primary key,
  user_id text not null default 'local',
  query_text text not null,
  filter jsonb not null default '{}',
  latency_ms integer not null,
  result_count integer not null,
  created_at timestamptz not null default now()
);

create table if not exists search_feedback (
  id bigserial primary key,
  user_id text not null,
  query_audit_id bigint not null references query_audit_logs(id) on delete cascade,
  chunk_id bigint not null references document_chunks(id) on delete cascade,
  rating text not null check (rating in ('good', 'bad')),
  created_at timestamptz not null default now(),
  unique (user_id, query_audit_id, chunk_id)
);

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
);

create index if not exists observability_logs_type_created_idx on observability_logs(type, created_at desc);
create index if not exists observability_logs_user_created_idx on observability_logs(user_id, created_at desc);
create index if not exists observability_logs_job_id_idx on observability_logs(job_id);

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
);

alter table ingestion_jobs add column if not exists worker_id text;
alter table ingestion_jobs add column if not exists locked_at timestamptz;
alter table ingestion_jobs add column if not exists attempts integer not null default 0;
create index if not exists ingestion_jobs_user_id_idx on ingestion_jobs(user_id);
create index if not exists ingestion_jobs_status_idx on ingestion_jobs(status);
create index if not exists ingestion_jobs_created_at_idx on ingestion_jobs(created_at desc);

create table if not exists ingestion_worker_controls (
  id text primary key,
  paused boolean not null default false,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists users (
  username text primary key,
  password_hash text not null,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create unique index if not exists users_username_idx on users(username);

create table if not exists collections (
  id uuid primary key,
  owner_user_id text not null references users(username) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists collection_documents (
  collection_id uuid not null references collections(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  added_by text not null,
  added_at timestamptz not null default now(),
  primary key (collection_id, document_id)
);

create table if not exists collection_shares (
  collection_id uuid not null references collections(id) on delete cascade,
  user_id text not null references users(username) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);

create index if not exists collections_owner_user_id_idx on collections(owner_user_id);
create index if not exists collection_documents_document_id_idx on collection_documents(document_id);
create index if not exists collection_shares_user_id_idx on collection_shares(user_id);

alter table query_audit_logs add column if not exists user_id text not null default 'local';
create index if not exists query_audit_logs_user_id_idx on query_audit_logs(user_id);
