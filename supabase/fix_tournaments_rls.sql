-- Game Legal Tournament
-- Reparacion especifica de RLS para public.tournaments.
-- Ejecutar en Supabase > SQL Editor si aparece:
-- new row violates row-level security policy for table "tournaments"
--
-- No borra tablas ni datos. Solo reemplaza politicas de RLS de tournaments
-- y asegura permisos minimos para authenticated.

create extension if not exists pgcrypto;

alter table public.tournaments
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists slug text,
  add column if not exists registration_fee numeric default 150,
  add column if not exists status text default 'active',
  add column if not exists configuration_completed boolean default false;

create table if not exists public.tournament_members (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'finance', 'referee', 'viewer')),
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create or replace function public.can_manage_tournament(
  p_tournament_id uuid,
  p_capability text default 'read'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id = p_tournament_id
      and (
        t.user_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'superadmin'
        )
        or exists (
          select 1
          from public.tournament_members tm
          where tm.tournament_id = t.id
            and tm.user_id = auth.uid()
            and (
              tm.role in ('owner', 'admin')
              or p_capability = 'read'
              or (p_capability = 'finance' and tm.role = 'finance')
              or (p_capability = 'matches' and tm.role = 'referee')
            )
        )
      )
  );
$$;

revoke all on function public.can_manage_tournament(uuid, text) from public, anon;
grant execute on function public.can_manage_tournament(uuid, text) to authenticated;

alter table public.tournaments enable row level security;
alter table public.tournament_members enable row level security;

-- Limpia politicas antiguas de tournaments, incluyendo nombres heredados.
do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tournaments'
  loop
    execute format('drop policy if exists %I on public.tournaments', v_policy.policyname);
  end loop;
end $$;

-- Permisos SQL base. RLS sigue limitando que puede hacer cada usuario.
grant select on public.tournaments to anon, authenticated;
grant insert, update, delete on public.tournaments to authenticated;
grant select, insert, update, delete on public.tournament_members to authenticated;

create policy tournaments_public_read
  on public.tournaments
  for select
  to anon
  using (status is distinct from 'deleted');

create policy tournaments_authenticated_read
  on public.tournaments
  for select
  to authenticated
  using (
    status is distinct from 'deleted'
    and (
      user_id = auth.uid()
      or public.can_manage_tournament(id, 'read')
    )
  );

create policy tournaments_owner_insert
  on public.tournaments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and coalesce(status, 'active') in ('active', 'finished', 'archived')
  );

create policy tournaments_manager_update
  on public.tournaments
  for update
  to authenticated
  using (public.can_manage_tournament(id, 'admin'))
  with check (
    user_id = auth.uid()
    or public.can_manage_tournament(id, 'admin')
  );

create policy tournaments_manager_delete
  on public.tournaments
  for delete
  to authenticated
  using (public.can_manage_tournament(id, 'admin'));

-- Politicas de miembros para que el owner quede consultable.
drop policy if exists tournament_members_read on public.tournament_members;
create policy tournament_members_read
  on public.tournament_members
  for select
  to authenticated
  using (user_id = auth.uid() or public.can_manage_tournament(tournament_id, 'admin'));

drop policy if exists tournament_members_admin_insert on public.tournament_members;
create policy tournament_members_admin_insert
  on public.tournament_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or public.can_manage_tournament(tournament_id, 'admin')
  );

drop policy if exists tournament_members_admin_update on public.tournament_members;
create policy tournament_members_admin_update
  on public.tournament_members
  for update
  to authenticated
  using (public.can_manage_tournament(tournament_id, 'admin'))
  with check (public.can_manage_tournament(tournament_id, 'admin'));

drop policy if exists tournament_members_admin_delete on public.tournament_members;
create policy tournament_members_admin_delete
  on public.tournament_members
  for delete
  to authenticated
  using (public.can_manage_tournament(tournament_id, 'admin'));

select pg_notify('pgrst', 'reload schema');
