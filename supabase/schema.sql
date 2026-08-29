-- AnderPark friends/leaderboard schema.
-- Run this once in your Supabase project's SQL editor (or via the CLI:
-- `supabase db push` / `psql < schema.sql`), then copy your project URL and
-- anon key into .env.local (see .env.example).

-- One row per signed-in user (anonymous auth), synced from their local
-- character whenever it changes. Anyone signed in can read any profile —
-- needed for username lookup when adding a friend, and this app has no
-- private data worth restricting further (nicknames, levels, streaks only).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  nickname text not null default '',
  appearance_id text not null default '',
  level integer not null default 1,
  streak_count integer not null default 0,
  longest_streak integer not null default 0,
  hyena_high_score integer not null default 0,
  hyena_level_reached integer not null default 1,
  updated_at timestamptz not null default now()
);

-- Safe to re-run against a database where profiles already existed before
-- the Hyena Defense scoreboard was added.
alter table public.profiles add column if not exists hyena_high_score integer not null default 0;
alter table public.profiles add column if not exists hyena_level_reached integer not null default 1;

alter table public.profiles enable row level security;

create policy "profiles are readable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- A friend request from requester_id to addressee_id. 'accepted' rows are
-- the actual friendships; 'pending' rows are outstanding requests.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "users can see friendships they're part of"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "users can create requests as themselves"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "users can update requests they're part of"
  on public.friendships for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "users can delete requests they're part of"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Realtime: let clients subscribe to live changes on both tables so a
-- friend's level/streak or an incoming request shows up without a refresh.
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.friendships;
