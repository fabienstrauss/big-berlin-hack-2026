create table if not exists public.generation_jobs (
  id text primary key,
  status text not null,
  provider text not null,
  type text not null,
  request_payload jsonb not null default '{}'::jsonb,
  operation_payload jsonb,
  artifact_path text,
  artifact_url text,
  warning text,
  error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint generation_jobs_status_check
    check (status in ('queued', 'running', 'completed', 'failed'))
);

create index if not exists generation_jobs_status_idx
  on public.generation_jobs (status);

create index if not exists generation_jobs_created_at_idx
  on public.generation_jobs (created_at desc);

create or replace function public.set_generation_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists generation_jobs_set_updated_at on public.generation_jobs;

create trigger generation_jobs_set_updated_at
before update on public.generation_jobs
for each row
execute function public.set_generation_jobs_updated_at();
