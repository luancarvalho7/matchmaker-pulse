create schema if not exists feimec;

create table if not exists feimec.tracking_sessions (
  id uuid primary key,
  status text not null check (status in ('loading', 'completed')),
  brief text,
  name text,
  phone text,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table feimec.tracking_sessions
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists role text;

create or replace function feimec.is_valid_match_ranking(ranks integer[])
returns boolean
language sql
immutable
as $$
  select coalesce(
    cardinality(ranks) = 20
    and cardinality(array(select distinct rank from unnest(ranks) as rank)) = 20
    and ranks <@ array[
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20
    ],
    false
  );
$$;

create table if not exists feimec.tracking_session_results (
  session_id uuid primary key references feimec.tracking_sessions (id) on delete cascade,
  match_ranks integer[] not null check (feimec.is_valid_match_ranking(match_ranks)),
  matchmaker_payload jsonb not null default '{"matchRanks": [], "matches": []}'::jsonb,
  saved_at timestamptz not null default now()
);

alter table feimec.tracking_session_results
  add column if not exists matchmaker_payload jsonb not null default '{"matchRanks": [], "matches": []}'::jsonb;

alter table feimec.tracking_session_results
  drop constraint if exists tracking_session_results_match_ranks_check;

alter table feimec.tracking_session_results
  add constraint tracking_session_results_match_ranks_check
  check (feimec.is_valid_match_ranking(match_ranks)) not valid;