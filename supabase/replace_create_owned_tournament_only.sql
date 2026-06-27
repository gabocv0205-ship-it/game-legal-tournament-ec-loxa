-- Ejecuta solo este bloque si Supabase muestra:
-- column reference "id" is ambiguous

create or replace function public.create_owned_tournament(
  p_name text,
  p_slug text,
  p_registration_fee numeric default 150
)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_tournament public.tournaments;
  v_active_count integer;
  v_clean_name text := btrim(coalesce(p_name, ''));
  v_clean_slug text := btrim(coalesce(p_slug, ''));
begin
  if v_user_id is null then
    raise exception 'No hay una sesion activa para crear el torneo';
  end if;

  if length(v_clean_name) = 0 then
    raise exception 'El nombre del torneo es obligatorio';
  end if;

  if length(v_clean_slug) = 0 then
    v_clean_slug := lower(regexp_replace(v_clean_name, '[^a-zA-Z0-9]+', '-', 'g'));
  end if;

  insert into public.profiles (id, email, full_name, role, saas_status, max_tournaments)
  values (
    v_user_id,
    (select auth_users.email from auth.users as auth_users where auth_users.id = v_user_id),
    coalesce(
      (select auth_users.raw_user_meta_data ->> 'full_name' from auth.users as auth_users where auth_users.id = v_user_id),
      (select auth_users.email from auth.users as auth_users where auth_users.id = v_user_id)
    ),
    'organizer',
    'active',
    1
  )
  on conflict on constraint profiles_pkey do update set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name)
  returning * into v_profile;

  if coalesce(v_profile.saas_status, 'active') <> 'active' then
    raise exception 'La cuenta del cliente no esta activa';
  end if;

  if coalesce(v_profile.role, 'organizer') <> 'superadmin' then
    select count(*) into v_active_count
    from public.tournaments as existing_tournaments
    where existing_tournaments.user_id = v_user_id
      and existing_tournaments.status is distinct from 'deleted';

    if v_active_count >= coalesce(v_profile.max_tournaments, 1) then
      raise exception 'El cliente alcanzo el limite de torneos de su plan';
    end if;
  end if;

  insert into public.tournaments (name, slug, user_id, registration_fee, status, configuration_completed)
  values (v_clean_name, v_clean_slug, v_user_id, coalesce(p_registration_fee, 150), 'active', false)
  returning * into v_tournament;

  insert into public.tournament_members (tournament_id, user_id, role)
  values (v_tournament.id, v_user_id, 'owner')
  on conflict (tournament_id, user_id)
  do update set role = excluded.role;

  return query select v_tournament.id, v_tournament.name;
end;
$$;

revoke all on function public.create_owned_tournament(text, text, numeric) from public, anon;
grant execute on function public.create_owned_tournament(text, text, numeric) to authenticated;
select pg_notify('pgrst', 'reload schema');
