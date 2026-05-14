-- Creature Clash cloud-save schema.
--
-- Apply this once in the Supabase SQL editor (or via `supabase db push`) after
-- creating the project. The anon key is fine to ship in the client; RLS is
-- the actual protection.
--
-- Data shape:
--   saves.data      -> JSON blob serialized from playerStore (the same shape
--                      zustand-persist writes to AsyncStorage).
--   saves.version   -> playerStore schema version. Mismatches are resolved on
--                      the client (the migrate() callback already handles
--                      this for local).
--   saves.updated_at -> client-supplied LWW timestamp (NOT the server's
--                      clock). Always set this to the value of
--                      playerStore.localUpdatedAt on push.

create table if not exists public.saves (
  user_id     uuid primary key references auth.users on delete cascade,
  data        jsonb not null,
  version     integer not null default 2,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table public.saves enable row level security;

-- One row per user; each user can only see / write their own row.
drop policy if exists "saves_select_own" on public.saves;
create policy "saves_select_own"
  on public.saves for select
  using (auth.uid() = user_id);

drop policy if exists "saves_insert_own" on public.saves;
create policy "saves_insert_own"
  on public.saves for insert
  with check (auth.uid() = user_id);

drop policy if exists "saves_update_own" on public.saves;
create policy "saves_update_own"
  on public.saves for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saves_delete_own" on public.saves;
create policy "saves_delete_own"
  on public.saves for delete
  using (auth.uid() = user_id);

-- Trim to a single index (PK already indexes user_id). Add more here only
-- when query patterns demand them.
