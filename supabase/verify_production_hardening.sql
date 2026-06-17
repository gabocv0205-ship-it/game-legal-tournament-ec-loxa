-- Ejecutar despues de production_hardening.sql.
-- Cada consulta debe devolver los objetos esperados.

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('tournaments','teams','players','matches','match_events','payments','tournament_members','audit_log','financial_ledger','app_error_log')
order by tablename;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('tournaments','teams','players','matches','match_events','payments','tournament_members','audit_log','financial_ledger')
order by tablename, policyname;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('can_manage_tournament','audit_tournament_change','sync_payment_to_ledger','sync_team_registration_charge','sync_finished_match_charges','sync_card_charge')
order by routine_name;

select
  (select count(*) from public.financial_ledger) as movimientos_financieros,
  (select count(*) from public.audit_log) as movimientos_auditados,
  (select count(*) from public.tournament_members) as colaboradores_asignados;

-- Debe devolver cero filas. Detecta politicas heredadas no contempladas.
with expected(tablename, policyname) as (
  values
    ('tournaments','tournaments_public_read'), ('tournaments','tournaments_tenant_read'), ('tournaments','tournaments_manager_write'),
    ('teams','teams_public_read'), ('teams','teams_tenant_read'), ('teams','teams_manager_write'),
    ('players','players_tenant_read'),
    ('matches','matches_public_read'), ('matches','matches_tenant_read'), ('matches','matches_manager_write'),
    ('match_events','match_events_public_read'), ('match_events','match_events_tenant_read'), ('match_events','match_events_manager_write'),
    ('payments','payments_finance_read'), ('payments','payments_finance_write')
)
select p.tablename, p.policyname as politica_inesperada
from pg_policies p
left join expected e on e.tablename = p.tablename and e.policyname = p.policyname
where p.schemaname = 'public'
  and p.tablename in ('tournaments','teams','players','matches','match_events','payments')
  and e.policyname is null;
