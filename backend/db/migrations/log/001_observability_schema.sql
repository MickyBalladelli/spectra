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
