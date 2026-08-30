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
  berry_high_score integer not null default 0,
  berry_level_reached integer not null default 1,
  updated_at timestamptz not null default now()
);

-- Safe to re-run against a database where profiles already existed before
-- a given minigame's scoreboard was added.
alter table public.profiles add column if not exists hyena_high_score integer not null default 0;
alter table public.profiles add column if not exists hyena_level_reached integer not null default 1;
alter table public.profiles add column if not exists berry_high_score integer not null default 0;
alter table public.profiles add column if not exists berry_level_reached integer not null default 1;

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

-- Task board: a user can publish one of their own goal tasks so anyone else
-- can browse it and copy it into their own goals. Anyone signed in can read
-- the whole board; only the submitter can delete their own entry.
create table if not exists public.shared_tasks (
  id uuid primary key default gen_random_uuid(),
  need_type text not null,
  goal_title text not null default '',
  label text not null,
  restore_amount integer not null check (restore_amount > 0),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  use_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Safe to re-run against a database where shared_tasks already existed
-- before goal_title was added — tasks used to be tagged with a category
-- directly instead of carrying the goal they actually belong to.
alter table public.shared_tasks add column if not exists goal_title text not null default '';

alter table public.shared_tasks enable row level security;

create policy "shared tasks are readable by any authenticated user"
  on public.shared_tasks for select
  to authenticated
  using (true);

create policy "users can submit their own tasks"
  on public.shared_tasks for insert
  to authenticated
  with check (auth.uid() = submitted_by);

create policy "users can delete tasks they submitted"
  on public.shared_tasks for delete
  to authenticated
  using (auth.uid() = submitted_by);

-- Lets any signed-in user bump a task's use count when they copy it, without
-- granting general UPDATE access to rows they don't own.
create or replace function public.increment_shared_task_use(task_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.shared_tasks set use_count = use_count + 1 where id = task_id;
$$;

grant execute on function public.increment_shared_task_use(uuid) to authenticated;

-- Realtime: let clients subscribe to live changes on all three tables so a
-- friend's level/streak, an incoming request, or a new board task shows up
-- without a refresh.
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.shared_tasks;
