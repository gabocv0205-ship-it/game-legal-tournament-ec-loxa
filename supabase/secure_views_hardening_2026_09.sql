-- Corrige las vistas SECURITY DEFINER detectadas por Supabase Security Advisor.
-- Es idempotente y no modifica ni elimina datos.

begin;

do $$
begin
  if to_regclass('public.public_players') is not null then
    execute 'alter view public.public_players set (security_invoker = true, security_barrier = true)';
    execute 'revoke all on public.public_players from public, anon, authenticated';
    execute 'grant select on public.public_players to authenticated';
  end if;

  if to_regclass('public.public_tournament_social_links') is not null then
    execute 'alter view public.public_tournament_social_links set (security_invoker = true, security_barrier = true)';
    execute 'revoke all on public.public_tournament_social_links from public, anon, authenticated';
  end if;

  if to_regclass('public.security_policy_audit') is not null then
    execute 'alter view public.security_policy_audit set (security_invoker = true, security_barrier = true)';
    execute 'revoke all on public.security_policy_audit from public, anon, authenticated';
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');

commit;

-- RESULTADO ESPERADO: cero filas.
select
  n.nspname as schema_name,
  c.relname as vista_insegura
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'v'
  and not coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true'];

-- RESULTADO ESPERADO: false | true.
select
  has_table_privilege('anon', 'public.public_players', 'select') as anon_puede_leer_jugadores,
  has_table_privilege('authenticated', 'public.public_players', 'select') as usuario_autenticado_puede_leer;
