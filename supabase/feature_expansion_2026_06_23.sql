-- Mejoras incrementales: perfil/logo, dirigentes, sorteos, exportaciones y notificaciones.
-- Ejecutar despues de supabase/production_hardening.sql.
-- Idempotente: no elimina datos existentes.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists logo_url text;

grant update (full_name, phone, avatar_url, logo_url) on public.profiles to authenticated;

alter table public.teams
  add column if not exists manager_name text,
  add column if not exists manager_phone text,
  add column if not exists manager_email text,
  add column if not exists manager_notes text,
  add column if not exists manager_country_code text default '+593';

create index if not exists teams_tournament_manager_phone_idx
  on public.teams (tournament_id, manager_phone);

do $$
begin
  if not exists (
    select 1 from public.teams
    where manager_phone is not null and btrim(manager_phone) <> ''
    group by tournament_id, regexp_replace(manager_phone, '\D', '', 'g')
    having count(*) > 1
  ) then
    create unique index if not exists teams_tournament_manager_phone_unique_idx
      on public.teams (tournament_id, regexp_replace(manager_phone, '\D', '', 'g'))
      where manager_phone is not null and btrim(manager_phone) <> '';
  end if;
end $$;

create table if not exists public.draw_history (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  mode text not null check (mode in ('automatic', 'manual')),
  title text not null default 'Sorteo oficial',
  pots jsonb not null default '[]'::jsonb,
  result jsonb not null default '{}'::jsonb,
  random_seed text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists draw_history_tournament_created_idx
  on public.draw_history (tournament_id, created_at desc);
alter table public.draw_history enable row level security;
drop policy if exists draw_history_read on public.draw_history;
create policy draw_history_read on public.draw_history for select to authenticated
using (public.can_manage_tournament(tournament_id, 'read'));
drop policy if exists draw_history_write on public.draw_history;
create policy draw_history_write on public.draw_history for insert to authenticated
with check (public.can_manage_tournament(tournament_id, 'admin'));

create table if not exists public.financial_exports (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  export_type text not null check (export_type in ('pdf', 'xlsx', 'csv')),
  date_from date,
  date_to date,
  row_count integer not null default 0,
  generated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists financial_exports_tournament_created_idx
  on public.financial_exports (tournament_id, created_at desc);
alter table public.financial_exports enable row level security;
drop policy if exists financial_exports_read on public.financial_exports;
create policy financial_exports_read on public.financial_exports for select to authenticated
using (public.can_manage_tournament(tournament_id, 'finance'));
drop policy if exists financial_exports_insert on public.financial_exports;
create policy financial_exports_insert on public.financial_exports for insert to authenticated
with check (public.can_manage_tournament(tournament_id, 'finance'));

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  recipient_name text not null,
  country_code text not null default '+593',
  phone text not null,
  channel text not null default 'whatsapp',
  message_type text not null,
  template_name text,
  message text not null,
  status text not null default 'prepared',
  sent_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Compatibilidad con el modelo usado por la app.
-- Versiones anteriores de esta migracion crearon phone/message, mientras que
-- el frontend usa recipient_phone/message_body. Mantenemos ambos pares para
-- evitar fallos por schema cache de PostgREST y no romper datos existentes.
alter table public.notification_logs
  add column if not exists recipient_phone text,
  add column if not exists message_body text;

update public.notification_logs
set recipient_phone = phone
where recipient_phone is null and phone is not null;

update public.notification_logs
set message_body = message
where message_body is null and message is not null;

create index if not exists notification_logs_tournament_created_idx
  on public.notification_logs (tournament_id, created_at desc);
alter table public.notification_logs enable row level security;
drop policy if exists notification_logs_read on public.notification_logs;
create policy notification_logs_read on public.notification_logs for select to authenticated
using (public.can_manage_tournament(tournament_id, 'read'));
drop policy if exists notification_logs_write on public.notification_logs;
create policy notification_logs_write on public.notification_logs for insert to authenticated
with check (public.can_manage_tournament(tournament_id, 'admin') or public.can_manage_tournament(tournament_id, 'matches'));

insert into storage.buckets (id, name, public)
values ('profile-assets', 'profile-assets', true)
on conflict (id) do update set public = true;

drop policy if exists profile_assets_public_read on storage.objects;
create policy profile_assets_public_read on storage.objects for select to anon, authenticated
using (bucket_id = 'profile-assets');

drop policy if exists profile_assets_owner_insert on storage.objects;
create policy profile_assets_owner_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists profile_assets_owner_update on storage.objects;
create policy profile_assets_owner_update on storage.objects for update to authenticated
using (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists profile_assets_owner_delete on storage.objects;
create policy profile_assets_owner_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

select pg_notify('pgrst', 'reload schema');
