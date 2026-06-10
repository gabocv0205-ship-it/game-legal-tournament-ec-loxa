-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Es idempotente: no elimina datos existentes.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists role text default 'organizer',
  add column if not exists saas_status text default 'active',
  add column if not exists max_tournaments integer default 1;

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
