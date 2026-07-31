-- Game Legal Tournament: facturacion SaaS, finanzas operativas y redes sociales.
-- Ejecutar despues de production_hardening.sql y feature_expansion_2026_06_23.sql.
-- Idempotente: no elimina ni modifica datos historicos existentes.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Perfil comercial: enlaces publicos del organizador.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists whatsapp_url text,
  add column if not exists tiktok_url text,
  add column if not exists youtube_url text,
  add column if not exists website_url text,
  add column if not exists other_social_url text;

create or replace function public.validate_profile_social_urls()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_column text;
  v_value text;
begin
  foreach v_column in array array[
    'facebook_url', 'instagram_url', 'whatsapp_url', 'tiktok_url',
    'youtube_url', 'website_url', 'other_social_url'
  ] loop
    v_value := nullif(btrim(to_jsonb(new) ->> v_column), '');
    if v_value is not null and v_value !~* '^https?://[^[:space:]]+$' then
      raise exception 'El enlace % debe comenzar con http:// o https://', v_column;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists validate_profile_social_urls_before_write on public.profiles;
create trigger validate_profile_social_urls_before_write
before insert or update of facebook_url, instagram_url, whatsapp_url, tiktok_url,
  youtube_url, website_url, other_social_url on public.profiles
for each row execute function public.validate_profile_social_urls();

grant update (
  full_name, phone, avatar_url, logo_url,
  facebook_url, instagram_url, whatsapp_url, tiktok_url,
  youtube_url, website_url, other_social_url
) on public.profiles to authenticated;

-- Vista minima: la pagina publica solo puede leer enlaces sociales del torneo.
create or replace view public.public_tournament_social_links as
select
  t.id as tournament_id,
  t.slug,
  p.full_name,
  p.facebook_url,
  p.instagram_url,
  p.whatsapp_url,
  p.tiktok_url,
  p.youtube_url,
  p.website_url,
  p.other_social_url
from public.tournaments t
left join public.profiles p on p.id = t.user_id
where t.status is distinct from 'deleted';

revoke all on public.public_tournament_social_links from public;
grant select on public.public_tournament_social_links to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Finanzas operativas del torneo. No comparte team_id ni financial_ledger.
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_operating_transactions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  description text,
  payment_method text,
  transaction_date date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists tournament_operating_transactions_lookup_idx
  on public.tournament_operating_transactions (tournament_id, transaction_date desc, created_at desc);

alter table public.tournament_operating_transactions enable row level security;
drop policy if exists tournament_operating_transactions_read on public.tournament_operating_transactions;
create policy tournament_operating_transactions_read
on public.tournament_operating_transactions for select to authenticated
using (public.can_manage_tournament(tournament_id, 'finance'));
drop policy if exists tournament_operating_transactions_insert on public.tournament_operating_transactions;
create policy tournament_operating_transactions_insert
on public.tournament_operating_transactions for insert to authenticated
with check (public.can_manage_tournament(tournament_id, 'finance'));
drop policy if exists tournament_operating_transactions_update on public.tournament_operating_transactions;
create policy tournament_operating_transactions_update
on public.tournament_operating_transactions for update to authenticated
using (public.can_manage_tournament(tournament_id, 'finance'))
with check (public.can_manage_tournament(tournament_id, 'finance'));
drop policy if exists tournament_operating_transactions_delete on public.tournament_operating_transactions;
create policy tournament_operating_transactions_delete
on public.tournament_operating_transactions for delete to authenticated
using (public.can_manage_tournament(tournament_id, 'finance'));

do $$
begin
  if to_regclass('public.audit_log') is not null then
    execute 'drop trigger if exists audit_tournament_operating_transactions_changes on public.tournament_operating_transactions';
    execute 'create trigger audit_tournament_operating_transactions_changes after insert or update or delete on public.tournament_operating_transactions for each row execute function public.audit_tournament_change()';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Facturacion del software: cuentas por cobrar independientes del torneo.
-- ---------------------------------------------------------------------------
create table if not exists public.saas_invoices (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  invoice_number text not null unique default ('GL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  concept text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saas_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.saas_invoices(id) on delete restrict,
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'transferencia',
  notes text,
  paid_at timestamptz not null default now(),
  collected_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists saas_invoices_organizer_status_idx
  on public.saas_invoices (organizer_id, status, due_date);
create index if not exists saas_invoice_payments_invoice_paid_idx
  on public.saas_invoice_payments (invoice_id, paid_at desc);

alter table public.saas_invoices enable row level security;
alter table public.saas_invoice_payments enable row level security;

drop policy if exists saas_invoices_superadmin_all on public.saas_invoices;
create policy saas_invoices_superadmin_all on public.saas_invoices
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'));

drop policy if exists saas_invoice_payments_superadmin_all on public.saas_invoice_payments;
create policy saas_invoice_payments_superadmin_all on public.saas_invoice_payments
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'));

create or replace function public.set_saas_invoice_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_saas_invoice_updated_at on public.saas_invoices;
create trigger set_saas_invoice_updated_at before update on public.saas_invoices
for each row execute function public.set_saas_invoice_updated_at();

create or replace function public.refresh_saas_invoice_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.saas_invoices;
  v_paid numeric := 0;
  v_status text;
begin
  select * into v_invoice from public.saas_invoices
  where id = case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;
  if v_invoice.id is null or v_invoice.status = 'cancelled' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.saas_invoice_payments where invoice_id = v_invoice.id;

  v_status := case
    when v_paid >= v_invoice.amount then 'paid'
    when v_paid > 0 then case when v_invoice.due_date < current_date then 'overdue' else 'partial' end
    when v_invoice.due_date is not null and v_invoice.due_date < current_date then 'overdue'
    else 'pending'
  end;

  update public.saas_invoices set status = v_status, updated_at = now() where id = v_invoice.id;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists refresh_saas_invoice_status_after_payment on public.saas_invoice_payments;
create trigger refresh_saas_invoice_status_after_payment
after insert or update or delete on public.saas_invoice_payments
for each row execute function public.refresh_saas_invoice_status();

-- El endpoint protegido valida al superadmin; esta funcion agrega bloqueo de fila
-- para impedir dos cobros simultaneos que superen el saldo de la factura.
create or replace function public.record_saas_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text default 'transferencia',
  p_notes text default null,
  p_collected_by uuid default null
)
returns public.saas_invoice_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.saas_invoices;
  v_paid numeric := 0;
  v_payment public.saas_invoice_payments;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'El pago SaaS debe ser mayor a cero'; end if;
  select * into v_invoice from public.saas_invoices where id = p_invoice_id for update;
  if v_invoice.id is null or v_invoice.status = 'cancelled' then raise exception 'Factura SaaS no disponible'; end if;

  select coalesce(sum(amount), 0) into v_paid from public.saas_invoice_payments where invoice_id = p_invoice_id;
  if p_amount > greatest(0, v_invoice.amount - v_paid) then
    raise exception 'El pago supera el saldo pendiente de la factura';
  end if;

  insert into public.saas_invoice_payments (invoice_id, organizer_id, amount, payment_method, notes, collected_by)
  values (p_invoice_id, v_invoice.organizer_id, round(p_amount, 2), coalesce(nullif(btrim(p_payment_method), ''), 'transferencia'), nullif(btrim(p_notes), ''), p_collected_by)
  returning * into v_payment;
  return v_payment;
end;
$$;

revoke all on function public.record_saas_invoice_payment(uuid, numeric, text, text, uuid) from public, anon, authenticated;
grant execute on function public.record_saas_invoice_payment(uuid, numeric, text, text, uuid) to service_role;

-- Recalcula estados existentes al instalar la migracion.
update public.saas_invoices i
set status = case
  when i.status = 'cancelled' then 'cancelled'
  when coalesce((select sum(p.amount) from public.saas_invoice_payments p where p.invoice_id = i.id), 0) >= i.amount then 'paid'
  when coalesce((select sum(p.amount) from public.saas_invoice_payments p where p.invoice_id = i.id), 0) > 0 then case when i.due_date < current_date then 'overdue' else 'partial' end
  when i.due_date is not null and i.due_date < current_date then 'overdue'
  else 'pending'
end,
updated_at = now();

select pg_notify('pgrst', 'reload schema');
