-- Ejecutar despues de supabase/saas_setup.sql.
-- Endurecimiento idempotente previo a produccion.

create table if not exists public.tournament_members (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'finance', 'referee', 'viewer')),
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);
alter table public.tournament_members enable row level security;

create or replace function public.can_manage_tournament(p_tournament_id uuid, p_capability text default 'read')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tournaments t where t.id = p_tournament_id and (
      t.user_id = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
      or exists (
        select 1 from public.tournament_members tm
        where tm.tournament_id = t.id and tm.user_id = auth.uid() and (
          tm.role in ('owner', 'admin') or p_capability = 'read'
          or (p_capability = 'finance' and tm.role = 'finance')
          or (p_capability = 'matches' and tm.role = 'referee')
        )
      )
    )
  );
$$;
revoke all on function public.can_manage_tournament(uuid, text) from public, anon;
grant execute on function public.can_manage_tournament(uuid, text) to authenticated;

create or replace function public.can_manage_tournament_media(tournament_id_text text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_tournament(tournament_id_text::uuid, 'admin');
$$;

drop policy if exists tournament_members_read on public.tournament_members;
create policy tournament_members_read on public.tournament_members for select to authenticated
using (user_id = auth.uid() or public.can_manage_tournament(tournament_id, 'admin'));
drop policy if exists tournament_members_admin_write on public.tournament_members;
create policy tournament_members_admin_write on public.tournament_members for all to authenticated
using (public.can_manage_tournament(tournament_id, 'admin'))
with check (public.can_manage_tournament(tournament_id, 'admin'));

alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.payments enable row level security;

-- Elimina politicas heredadas de estas tablas antes de instalar el modelo definitivo.
-- Evita que una politica permisiva anterior anule el aislamiento multi-tenant.
do $$
declare v_table text; v_policy record;
begin
  foreach v_table in array array['tournaments','teams','matches','match_events','payments'] loop
    for v_policy in
      select policyname from pg_policies where schemaname = 'public' and tablename = v_table
    loop
      execute format('drop policy if exists %I on public.%I', v_policy.policyname, v_table);
    end loop;
  end loop;
end $$;

drop policy if exists tournaments_public_read on public.tournaments;
create policy tournaments_public_read on public.tournaments for select to anon, authenticated
using (status is distinct from 'deleted');
drop policy if exists tournaments_manager_write on public.tournaments;
create policy tournaments_manager_write on public.tournaments for all to authenticated
using (public.can_manage_tournament(id, 'admin'))
with check (user_id = auth.uid() or public.can_manage_tournament(id, 'admin'));

drop policy if exists teams_public_read on public.teams;
create policy teams_public_read on public.teams for select to anon, authenticated
using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.status is distinct from 'deleted'));
drop policy if exists teams_manager_write on public.teams;
create policy teams_manager_write on public.teams for all to authenticated
using (public.can_manage_tournament(tournament_id, 'admin'))
with check (public.can_manage_tournament(tournament_id, 'admin'));

drop policy if exists matches_public_read on public.matches;
create policy matches_public_read on public.matches for select to anon, authenticated
using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.status is distinct from 'deleted'));
drop policy if exists matches_manager_write on public.matches;
create policy matches_manager_write on public.matches for all to authenticated
using (public.can_manage_tournament(tournament_id, 'matches'))
with check (public.can_manage_tournament(tournament_id, 'matches'));

drop policy if exists match_events_public_read on public.match_events;
create policy match_events_public_read on public.match_events for select to anon, authenticated
using (exists (
  select 1 from public.matches m join public.tournaments t on t.id = m.tournament_id
  where m.id = match_id and t.status is distinct from 'deleted'
));
drop policy if exists match_events_manager_write on public.match_events;
create policy match_events_manager_write on public.match_events for all to authenticated
using (exists (select 1 from public.matches m where m.id = match_id and public.can_manage_tournament(m.tournament_id, 'matches')))
with check (exists (select 1 from public.matches m where m.id = match_id and public.can_manage_tournament(m.tournament_id, 'matches')));

drop policy if exists payments_finance_read on public.payments;
create policy payments_finance_read on public.payments for select to authenticated
using (public.can_manage_tournament(tournament_id, 'finance'));
drop policy if exists payments_finance_write on public.payments;
create policy payments_finance_write on public.payments for all to authenticated
using (public.can_manage_tournament(tournament_id, 'finance'))
with check (public.can_manage_tournament(tournament_id, 'finance'));

-- Los pagos confirmados son inmutables. Para corregirlos se elimina el pago
-- original, lo cual genera automaticamente un reverso auditable, y se registra
-- el movimiento correcto.
revoke update on public.payments from authenticated;

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  tournament_id uuid,
  actor_id uuid,
  table_name text not null,
  record_id text,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_tournament_created_idx on public.audit_log (tournament_id, created_at desc);
alter table public.audit_log enable row level security;
drop policy if exists audit_log_manager_read on public.audit_log;
create policy audit_log_manager_read on public.audit_log for select to authenticated
using (public.can_manage_tournament(tournament_id, 'admin'));

create or replace function public.audit_tournament_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_before jsonb; v_after jsonb; v_tournament_id uuid; v_record_id text;
begin
  v_before := case when tg_op = 'INSERT' then null else to_jsonb(old) - 'cedula' end;
  v_after := case when tg_op = 'DELETE' then null else to_jsonb(new) - 'cedula' end;
  v_tournament_id := coalesce((v_after ->> 'tournament_id')::uuid, (v_before ->> 'tournament_id')::uuid);
  if tg_table_name = 'tournaments' then
    v_tournament_id := coalesce((v_after ->> 'id')::uuid, (v_before ->> 'id')::uuid);
  elsif tg_table_name = 'match_events' then
    select tournament_id into v_tournament_id from public.matches
    where id = coalesce((v_after ->> 'match_id')::uuid, (v_before ->> 'match_id')::uuid);
  end if;
  v_record_id := coalesce(v_after ->> 'id', v_before ->> 'id');
  insert into public.audit_log (tournament_id, actor_id, table_name, record_id, action, before_data, after_data)
  values (v_tournament_id, auth.uid(), tg_table_name, v_record_id, lower(tg_op), v_before, v_after);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare v_table text;
begin
  foreach v_table in array array['tournaments','tournament_members','teams','players','matches','match_events','payments'] loop
    execute format('drop trigger if exists audit_%I_changes on public.%I', v_table, v_table);
    execute format('create trigger audit_%I_changes after insert or update or delete on public.%I for each row execute function public.audit_tournament_change()', v_table, v_table);
  end loop;
end $$;

create table if not exists public.financial_ledger (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  entry_type text not null check (entry_type in ('charge', 'payment', 'adjustment', 'reversal')),
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  reference_type text not null,
  reference_id text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index if not exists financial_ledger_reference_unique
on public.financial_ledger (tournament_id, team_id, entry_type, category, reference_type, reference_id);
create index if not exists financial_ledger_team_created_idx
on public.financial_ledger (tournament_id, team_id, created_at desc);
alter table public.financial_ledger enable row level security;
drop policy if exists financial_ledger_read on public.financial_ledger;
create policy financial_ledger_read on public.financial_ledger for select to authenticated
using (public.can_manage_tournament(tournament_id, 'finance'));
revoke insert, update, delete on public.financial_ledger from anon, authenticated;

create or replace function public.sync_payment_to_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.financial_ledger (tournament_id, team_id, entry_type, category, amount, reference_type, reference_id, description)
    values (new.tournament_id, new.team_id, 'payment', coalesce(new.concept, 'payment'), new.amount, 'payments', new.id::text, coalesce(new.notes, new.description))
    on conflict do nothing;
    return new;
  end if;
  insert into public.financial_ledger (tournament_id, team_id, entry_type, category, amount, reference_type, reference_id, description)
  values (old.tournament_id, old.team_id, 'reversal', coalesce(old.concept, 'payment'), old.amount, 'payments', old.id::text || ':deleted', 'Reverso de pago eliminado')
  on conflict do nothing;
  return old;
end;
$$;
drop trigger if exists sync_payment_ledger on public.payments;
create trigger sync_payment_ledger after insert or delete on public.payments for each row execute function public.sync_payment_to_ledger();

create or replace function public.sync_team_registration_charge()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_fee numeric;
begin
  select registration_fee into v_fee from public.tournaments where id = new.tournament_id;
  if coalesce(v_fee, 0) > 0 then
    insert into public.financial_ledger (tournament_id, team_id, entry_type, category, amount, reference_type, reference_id, description)
    values (new.tournament_id, new.id, 'charge', 'inscripcion', v_fee, 'teams', new.id::text, 'Inscripcion del equipo')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists sync_team_registration_ledger on public.teams;
create trigger sync_team_registration_ledger after insert on public.teams for each row execute function public.sync_team_registration_charge();

create or replace function public.sync_finished_match_charges()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_fee numeric;
begin
  if new.status = 'finished' and coalesce(old.status, '') <> 'finished' then
    select referee_fee into v_fee from public.tournaments where id = new.tournament_id;
    if coalesce(v_fee, 0) > 0 then
      insert into public.financial_ledger (tournament_id, team_id, entry_type, category, amount, reference_type, reference_id, description)
      values
        (new.tournament_id, new.home_team_id, 'charge', 'arbitraje', v_fee, 'matches', new.id::text, 'Arbitraje de partido'),
        (new.tournament_id, new.away_team_id, 'charge', 'arbitraje', v_fee, 'matches', new.id::text, 'Arbitraje de partido')
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists sync_finished_match_ledger on public.matches;
create trigger sync_finished_match_ledger after update of status on public.matches for each row execute function public.sync_finished_match_charges();

create or replace function public.sync_card_charge()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tournament_id uuid; v_fee numeric;
begin
  if new.event_type not in ('amarilla', 'roja') then return new; end if;
  select m.tournament_id, case when new.event_type = 'roja' then t.red_card_fee else t.yellow_card_fee end
  into v_tournament_id, v_fee from public.matches m join public.tournaments t on t.id = m.tournament_id where m.id = new.match_id;
  if coalesce(v_fee, 0) > 0 then
    insert into public.financial_ledger (tournament_id, team_id, entry_type, category, amount, reference_type, reference_id, description)
    values (v_tournament_id, new.team_id, 'charge', new.event_type, v_fee, 'match_events', new.id::text, 'Sancion economica por tarjeta')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists sync_card_ledger on public.match_events;
create trigger sync_card_ledger after insert on public.match_events for each row execute function public.sync_card_charge();

-- Backfill idempotente de datos existentes.
insert into public.financial_ledger (tournament_id, team_id, entry_type, category, amount, reference_type, reference_id, description)
select t.tournament_id, t.id, 'charge', 'inscripcion', tr.registration_fee, 'teams', t.id::text, 'Inscripcion del equipo'
from public.teams t join public.tournaments tr on tr.id = t.tournament_id
where coalesce(tr.registration_fee, 0) > 0 on conflict do nothing;
insert into public.financial_ledger (tournament_id, team_id, entry_type, category, amount, reference_type, reference_id, description)
select p.tournament_id, p.team_id, 'payment', coalesce(p.concept, 'payment'), p.amount, 'payments', p.id::text, coalesce(p.notes, p.description)
from public.payments p where p.amount > 0 on conflict do nothing;
insert into public.financial_ledger (tournament_id, team_id, entry_type, category, amount, reference_type, reference_id, description)
select m.tournament_id, side.team_id, 'charge', 'arbitraje', t.referee_fee, 'matches', m.id::text, 'Arbitraje de partido'
from public.matches m join public.tournaments t on t.id = m.tournament_id
cross join lateral (values (m.home_team_id), (m.away_team_id)) side(team_id)
where m.status = 'finished' and coalesce(t.referee_fee, 0) > 0 on conflict do nothing;
insert into public.financial_ledger (tournament_id, team_id, entry_type, category, amount, reference_type, reference_id, description)
select m.tournament_id, e.team_id, 'charge', e.event_type,
case when e.event_type = 'roja' then t.red_card_fee else t.yellow_card_fee end,
'match_events', e.id::text, 'Sancion economica por tarjeta'
from public.match_events e join public.matches m on m.id = e.match_id join public.tournaments t on t.id = m.tournament_id
where e.event_type in ('amarilla', 'roja')
and (case when e.event_type = 'roja' then t.red_card_fee else t.yellow_card_fee end) > 0 on conflict do nothing;

create table if not exists public.app_error_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  path text,
  message text not null,
  digest text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.app_error_log enable row level security;
revoke all on public.app_error_log from anon, authenticated;

create or replace view public.security_policy_audit as
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
revoke all on public.security_policy_audit from public, anon, authenticated;
