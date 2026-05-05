create schema if not exists feimec;

create table if not exists feimec.tracking_sessions (
  id uuid primary key,
  status text not null check (status in ('loading', 'completed')),
  brief text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feimec.tracking_session_results (
  session_id uuid primary key references feimec.tracking_sessions (id) on delete cascade,
  match_ranks integer[] not null check (cardinality(match_ranks) > 0),
  saved_at timestamptz not null default now()
);