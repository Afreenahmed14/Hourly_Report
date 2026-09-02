-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run

create table if not exists updates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  entry_date date not null default current_date,
  start_time text not null,
  end_time text not null,
  task text not null,
  created_at timestamptz default now()
);

-- If you already ran the old version of this script and the table exists
-- without entry_date, run this line by itself to add it:
-- alter table updates add column if not exists entry_date date not null default current_date;

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table updates enable row level security;
alter table notes enable row level security;

-- Simple open policies: anyone with the app link can read/write.
-- This matches "no login for team members" — good enough for an internal
-- team tool. Don't put anything sensitive in this table.
create policy "allow all on updates" on updates
  for all using (true) with check (true);

create policy "allow all on notes" on notes
  for all using (true) with check (true);
