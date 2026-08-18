-- Direccion publica opcional para posters y pagina del torneo.
-- Es aditiva: no modifica datos ni reglas existentes.
alter table public.tournaments
  add column if not exists venue_address text;

select pg_notify('pgrst', 'reload schema');
