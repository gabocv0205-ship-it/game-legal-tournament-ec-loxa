-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Es idempotente: no elimina datos existentes.

create extension if not exists pgcrypto;

alter table public.tournaments
  add column if not exists group_count integer default 1,
  add column if not exists teams_per_group integer default 4,
  add column if not exists qualifiers_per_group integer default 2,
  add column if not exists repechage_enabled boolean default false,
  add column if not exists repechage_slots integer default 0,
  add column if not exists knockout_legs integer default 1,
  add column if not exists final_legs integer default 1,
  add column if not exists court_count integer default 1,
  add column if not exists start_date date,
  add column if not exists estimated_end_date date,
  add column if not exists match_duration_minutes integer default 60,
  add column if not exists break_between_matches_minutes integer default 10,
  add column if not exists banner_url text,
  add column if not exists poster_url text,
  add column if not exists yellow_cards_for_suspension integer default 3,
  add column if not exists yellow_suspension_matches integer default 1,
  add column if not exists red_suspension_matches integer default 1,
  add column if not exists configuration_completed boolean default false;

alter table public.payments
  add column if not exists payment_method text default 'efectivo',
  add column if not exists notes text;

create index if not exists payments_tournament_team_created_idx
  on public.payments (tournament_id, team_id, created_at desc);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists role text default 'organizer',
  add column if not exists saas_status text default 'active',
  add column if not exists max_tournaments integer default 1,
  add column if not exists archived_at timestamptz;

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_target_created_idx
  on public.admin_activity_log (target_id, created_at desc);

alter table public.admin_activity_log enable row level security;

insert into storage.buckets (id, name, public)
values ('identidad-torneos', 'identidad-torneos', true)
on conflict (id) do update set public = true;

create or replace function public.can_manage_tournament_media(tournament_id_text text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id::text = tournament_id_text
      and (
        t.user_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'superadmin'
        )
      )
  );
$$;

revoke all on function public.can_manage_tournament_media(text) from public, anon;
grant execute on function public.can_manage_tournament_media(text) to authenticated;

drop policy if exists tournament_identity_upload on storage.objects;
create policy tournament_identity_upload
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'identidad-torneos'
    and public.can_manage_tournament_media((storage.foldername(name))[1])
  );

drop policy if exists tournament_identity_update on storage.objects;
create policy tournament_identity_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'identidad-torneos'
    and public.can_manage_tournament_media((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'identidad-torneos'
    and public.can_manage_tournament_media((storage.foldername(name))[1])
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    saas_status,
    max_tournaments
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'organizer',
    'active',
    1
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create table if not exists public.saas_payments (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  concept text not null,
  notes text,
  collected_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.saas_payments
  add column if not exists organizer_id uuid,
  add column if not exists amount numeric(12, 2),
  add column if not exists concept text,
  add column if not exists notes text,
  add column if not exists payment_method text default 'transferencia',
  add column if not exists collected_by uuid,
  add column if not exists created_at timestamptz default now();

create index if not exists saas_payments_organizer_id_idx
  on public.saas_payments (organizer_id);

create index if not exists saas_payments_created_at_idx
  on public.saas_payments (created_at desc);

alter table public.saas_payments enable row level security;

-- La tabla no necesita políticas públicas: las APIs protegidas del servidor
-- usan service_role y validan que el usuario autenticado sea superadmin.
