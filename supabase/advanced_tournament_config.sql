-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Idempotente: solo agrega configuraciones avanzadas si aun no existen.

alter table public.tournaments
  add column if not exists knockout_pairing_mode text default 'general_table',
  add column if not exists substitution_rule text default 'limited';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tournaments_knockout_pairing_mode_check') then
    alter table public.tournaments
      add constraint tournaments_knockout_pairing_mode_check
      check (knockout_pairing_mode in ('general_table', 'group_cross', 'manual')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tournaments_substitution_rule_check') then
    alter table public.tournaments
      add constraint tournaments_substitution_rule_check
      check (substitution_rule in ('limited', 'unlimited', 'reentry')) not valid;
  end if;
end $$;
