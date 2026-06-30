-- Bloque 4.2 - Propuesta SQL para ampliar perfil de jugadores y fotos
--
-- IMPORTANTE:
-- - No ejecutar sin revisar primero en un entorno de pruebas.
-- - No elimina columnas ni modifica datos existentes.
-- - Mantiene compatibilidad con columnas actuales:
--   name, normalized_name, position, line, shirt_number, is_goalkeeper,
--   active, notes y team_id.
-- - Los campos nuevos quedan como NULLABLE para no romper datos históricos.

alter table public.players
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists birth_date date,
  add column if not exists dominant_foot text,
  add column if not exists primary_position text,
  add column if not exists secondary_position text,
  add column if not exists photo_path text;

-- Las constraints nuevas usan NOT VALID para no bloquear datos historicos
-- si alguna columna ya existia con valores fuera del catalogo.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_dominant_foot_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_dominant_foot_check
      check (
        dominant_foot is null
        or dominant_foot in ('DERECHO', 'IZQUIERDO', 'AMBIDIESTRO')
      ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_primary_position_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_primary_position_check
      check (
        primary_position is null
        or primary_position in (
          'PORTERO',
          'LATERAL IZQUIERDO',
          'LATERAL DERECHO',
          'DEFENSA CENTRAL',
          'PIVOTE',
          'MEDIOCENTRO',
          'MEDIAPUNTA',
          'EXTREMO IZQUIERDO',
          'EXTREMO DERECHO',
          'DELANTERO'
        )
      ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_secondary_position_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_secondary_position_check
      check (
        secondary_position is null
        or secondary_position in (
          'PORTERO',
          'LATERAL IZQUIERDO',
          'LATERAL DERECHO',
          'DEFENSA CENTRAL',
          'PIVOTE',
          'MEDIOCENTRO',
          'MEDIAPUNTA',
          'EXTREMO IZQUIERDO',
          'EXTREMO DERECHO',
          'DELANTERO'
        )
      ) not valid;
  end if;
end $$;

-- Opcional - Supabase Storage para fotos de jugadores
-- Revisar permisos y estrategia de rutas antes de ejecutar.
--
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values (
--   'player-photos',
--   'player-photos',
--   false,
--   5242880,
--   array['image/jpeg', 'image/png', 'image/webp']
-- )
-- on conflict (id) do nothing;

-- Notas RLS/Storage antes de ejecutar:
--
-- 1. Subida de fotos:
--    - Recomendado: permitir INSERT/UPDATE/DELETE en storage.objects solo a
--      usuarios con rol admin o staff.
--    - Validar que la ruta del objeto incluya team_id/player_id o una convención
--      equivalente para evitar sobrescrituras accidentales.
--
-- 2. Lectura de fotos:
--    - Si el bucket es privado, la app debe servir URLs firmadas o proxy seguro.
--    - Si se decide bucket público, asumir que cualquier persona con URL podrá ver
--      la imagen. Revisar consentimiento y privacidad de jugadores.
--
-- 3. Precauciones:
--    - Revisar datos existentes antes de añadir constraints si ya hay valores en
--      dominant_foot, primary_position o secondary_position.
--    - Ejecutar primero en staging o proyecto de pruebas.
--    - Confirmar que las políticas actuales de players y storage.objects no quedan
--      incoherentes con roles admin/staff/viewer.
--    - No activar NOT NULL en campos nuevos hasta completar backfill y validación.
