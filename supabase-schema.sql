-- ============================================================
-- Be Activ Timer — Supabase Schema
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Profiles (paramètres par utilisateur)
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  coach_tag   text        not null default '',
  sound_enabled     boolean not null default true,
  vibration_enabled boolean not null default true,
  updated_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Own profile" on public.profiles
  for all using (auth.uid() = id);

-- 2. Clients (liste des clients du coach)
create table if not exists public.clients (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete cascade not null,
  first_name text        not null default '',
  last_name  text        not null default '',
  created_at timestamptz not null default now()
);
alter table public.clients enable row level security;
create policy "Own clients" on public.clients
  for all using (auth.uid() = user_id);

-- 3. Timer sessions (historique des chronomètres)
create table if not exists public.timer_sessions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete cascade not null,
  mode       text        not null,
  date       timestamptz not null,
  total_time integer     not null default 0,
  rounds     integer     not null default 0,
  exercises  integer     not null default 1,
  config     jsonb,
  created_at timestamptz not null default now()
);
alter table public.timer_sessions enable row level security;
create policy "Own sessions" on public.timer_sessions
  for all using (auth.uid() = user_id);

-- 4. Session records (logs coaching avec participants)
create table if not exists public.session_records (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete cascade not null,
  date       timestamptz not null,
  mode       text        not null,
  total_time integer     not null default 0,
  rounds     integer     not null default 0,
  notes      text        not null default '',
  created_at timestamptz not null default now()
);
alter table public.session_records enable row level security;
create policy "Own records" on public.session_records
  for all using (auth.uid() = user_id);

-- 5. Participant scores (liés aux session records)
create table if not exists public.participant_scores (
  id                uuid primary key default gen_random_uuid(),
  session_record_id uuid references public.session_records(id) on delete cascade not null,
  client_id         uuid references public.clients(id) on delete set null,
  score             text not null default ''
);
alter table public.participant_scores enable row level security;
create policy "Own participant scores" on public.participant_scores
  for all using (
    session_record_id in (
      select id from public.session_records where user_id = auth.uid()
    )
  );

-- 6. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
