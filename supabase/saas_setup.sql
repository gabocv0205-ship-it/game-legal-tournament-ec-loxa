-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Es idempotente: no elimina datos existentes.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists role text default 'organizer',
  add column if not exists saas_status text default 'active',
  add column if not exists max_tournaments integer default 1;

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
  add column if not exists collected_by uuid,
  add column if not exists created_at timestamptz default now();

create index if not exists saas_payments_organizer_id_idx
  on public.saas_payments (organizer_id);

create index if not exists saas_payments_created_at_idx
  on public.saas_payments (created_at desc);

alter table public.saas_payments enable row level security;

-- La tabla no necesita políticas públicas: las APIs protegidas del servidor
-- usan service_role y validan que el usuario autenticado sea superadmin.
