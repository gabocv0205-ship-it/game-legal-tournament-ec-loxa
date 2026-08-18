-- Importacion atomica de una ficha oficial ya revisada en la aplicacion.
create or replace function public.import_tournament_roster(
  p_tournament_id uuid, p_team_id uuid, p_manager_name text, p_manager_phone text, p_players jsonb
) returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer; v_limit integer; v_enabled boolean;
begin
  if not public.can_manage_tournament(p_tournament_id, 'admin') then raise exception 'No tienes permiso para administrar este torneo'; end if;
  if not exists (select 1 from public.teams where id = p_team_id and tournament_id = p_tournament_id) then raise exception 'El equipo no pertenece al torneo seleccionado'; end if;
  if jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) = 0 then raise exception 'La nomina esta vacia'; end if;
  if exists (select 1 from jsonb_to_recordset(p_players) as x(cedula text, full_name text, jersey_number integer) where length(btrim(coalesce(x.cedula,''))) = 0 or length(btrim(coalesce(x.full_name,''))) = 0 or x.jersey_number not between 1 and 99) then raise exception 'Cada jugador debe tener cedula, nombre y dorsal valido'; end if;
  if exists (select 1 from jsonb_to_recordset(p_players) as x(cedula text, full_name text, jersey_number integer) group by lower(btrim(cedula)) having count(*) > 1) then raise exception 'Hay cedulas repetidas dentro de la ficha'; end if;
  if exists (select 1 from jsonb_to_recordset(p_players) as x(cedula text, full_name text, jersey_number integer) group by jersey_number having count(*) > 1) then raise exception 'Hay dorsales repetidos dentro de la ficha'; end if;
  perform pg_advisory_xact_lock(hashtext(p_tournament_id::text || ':team:' || p_team_id::text));
  if exists (select 1 from public.players p join jsonb_to_recordset(p_players) as x(cedula text, full_name text, jersey_number integer) on lower(btrim(p.cedula)) = lower(btrim(x.cedula)) where p.tournament_id = p_tournament_id) then raise exception 'Una cedula de la ficha ya esta registrada en este torneo'; end if;
  if exists (select 1 from public.players p join jsonb_to_recordset(p_players) as x(cedula text, full_name text, jersey_number integer) on p.jersey_number = x.jersey_number where p.tournament_id = p_tournament_id and p.team_id = p_team_id) then raise exception 'Un dorsal de la ficha ya esta asignado al equipo'; end if;
  select is_auto_template_enabled, max_players_per_team into v_enabled, v_limit from public.tournaments where id = p_tournament_id;
  if coalesce(v_enabled,false) and (select count(*) from public.players where tournament_id=p_tournament_id and team_id=p_team_id) + jsonb_array_length(p_players) > greatest(1,coalesce(v_limit,25)) then raise exception 'La ficha supera el limite de jugadores configurado'; end if;
  update public.teams set manager_name = coalesce(nullif(btrim(p_manager_name),''), manager_name), manager_phone = coalesce(nullif(btrim(p_manager_phone),''), manager_phone), manager_country_code = coalesce(manager_country_code, '+593') where id = p_team_id;
  insert into public.players(tournament_id, team_id, full_name, cedula, jersey_number)
  select p_tournament_id, p_team_id, btrim(x.full_name), btrim(x.cedula), x.jersey_number from jsonb_to_recordset(p_players) as x(cedula text, full_name text, jersey_number integer);
  get diagnostics v_count = row_count; return v_count;
end; $$;
revoke all on function public.import_tournament_roster(uuid,uuid,text,text,jsonb) from public, anon;
grant execute on function public.import_tournament_roster(uuid,uuid,text,text,jsonb) to authenticated;
select pg_notify('pgrst', 'reload schema');
