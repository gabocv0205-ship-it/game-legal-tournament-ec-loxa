-- Analitica comercial anonima para la pagina publica de Game Legal.
-- Ejecutar este archivo completo desde Supabase SQL Editor.
-- No almacena correos, telefonos, mensajes ni datos personales del visitante.

create table if not exists public.commercial_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'landing_view',
    'demo_open',
    'public_tournament_open',
    'whatsapp_lead_click'
  )),
  visitor_key text,
  page_path text not null default '/',
  tournament_id uuid references public.tournaments(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists commercial_events_created_at_idx
  on public.commercial_events (created_at desc);
create index if not exists commercial_events_type_created_at_idx
  on public.commercial_events (event_type, created_at desc);
create index if not exists commercial_events_tournament_id_idx
  on public.commercial_events (tournament_id) where tournament_id is not null;

alter table public.commercial_events enable row level security;

-- Cualquier visitante puede registrar solo eventos permitidos. No puede leerlos.
drop policy if exists commercial_events_public_insert on public.commercial_events;
create policy commercial_events_public_insert on public.commercial_events
  for insert to anon, authenticated
  with check (
    event_type in ('landing_view', 'demo_open', 'public_tournament_open', 'whatsapp_lead_click')
    and jsonb_typeof(payload) = 'object'
    and length(coalesce(visitor_key, '')) <= 100
    and length(page_path) <= 300
  );

-- Solo el propietario de la plataforma puede consultar o depurar la analitica.
drop policy if exists commercial_events_superadmin_read on public.commercial_events;
create policy commercial_events_superadmin_read on public.commercial_events
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'superadmin'
    )
  );

revoke all on table public.commercial_events from anon, authenticated;
grant insert on table public.commercial_events to anon, authenticated;
grant select on table public.commercial_events to authenticated;

-- Consulta de control para el propietario, por ejemplo ultimos 30 dias:
-- select event_type, count(*) as total
-- from public.commercial_events
-- where created_at >= now() - interval '30 days'
-- group by event_type order by total desc;
