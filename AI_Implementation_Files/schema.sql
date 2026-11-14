-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

-- Qualified inquiries captured by the intake agent.
create table if not exists public.inquiries (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text,
  email         text,
  company       text,
  project_type  text,          -- 'automation' | 'web_app' | 'api_backend' | 'marketing_site' | 'job_opportunity' | 'other'
  budget_signal text,          -- 'unknown' | 'under_1k' | '1k_5k' | '5k_15k' | 'over_15k'
  timeline      text,          -- 'unknown' | 'asap' | 'weeks' | 'months' | 'exploring'
  fit_score     int check (fit_score between 0 and 100),
  summary       text,          -- 2-3 sentence brief written by the agent
  transcript    jsonb not null default '[]'::jsonb,
  emailed       boolean not null default false
);

create index if not exists inquiries_created_at_idx
  on public.inquiries (created_at desc);

-- Cheap IP rate limiting so a bored visitor can't drain your daily quota.
create table if not exists public.agent_hits (
  id         bigserial primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);

create index if not exists agent_hits_lookup_idx
  on public.agent_hits (ip_hash, created_at desc);

-- Row Level Security: deny everything by default. The API route uses the
-- service role key, which bypasses RLS, so no policies are needed.
-- This means nothing is readable from the browser even if the anon key leaks.
alter table public.inquiries  enable row level security;
alter table public.agent_hits enable row level security;

-- Optional housekeeping: drop rate-limit rows older than a day.
-- Schedule via Supabase Dashboard -> Database -> Cron, or just run it manually.
-- delete from public.agent_hits where created_at < now() - interval '1 day';
