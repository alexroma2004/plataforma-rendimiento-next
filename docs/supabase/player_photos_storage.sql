-- Bloque 4.4.2.1 - Propuesta SQL para Supabase Storage: fotos de jugadores
--
-- Objetivo:
-- - Crear/configurar el bucket privado player-photos.
-- - Permitir lectura solo a usuarios autenticados.
-- - Permitir escritura solo a usuarios con rol admin o staff en public.user_roles.
-- - Relacionar players.photo_path con la ruta del objeto dentro del bucket.
--
-- IMPORTANTE:
-- - Revisar en staging antes de ejecutar en producción.
-- - No ejecuta migraciones de tabla players: se asume que players.photo_path ya existe.
-- - No incluye comandos destructivos activos.
-- - Si las políticas RLS de public.user_roles impiden consultar roles desde policies,
--   las políticas de escritura pueden denegar subidas hasta ajustar un helper seguro.

-- 1. Bucket privado para fotos de jugadores.
--
-- Recomendación: mantenerlo privado.
-- Motivo: las fotos pueden ser datos personales; la app debería servirlas más adelante
-- mediante URLs firmadas o un flujo controlado.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'player-photos',
  'player-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Lectura: cualquier usuario autenticado puede leer objetos del bucket.
-- La app podrá usar players.photo_path como ruta relativa dentro de player-photos.
-- Ejemplo recomendado de photo_path: <team_id>/<player_id>/profile.webp

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'player_photos_authenticated_read'
  ) then
    create policy "player_photos_authenticated_read"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'player-photos'
      );
  end if;
end $$;

-- 3. Escritura: solo admin/staff pueden subir objetos al bucket.
-- Precaución:
-- - Esta policy asume que public.user_roles tiene user_id vinculado a auth.uid()
--   y role con valores admin/staff/viewer.
-- - Si public.user_roles tiene RLS restrictiva, probar primero que esta condición
--   funciona dentro de policies de storage.objects.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'player_photos_admin_staff_insert'
  ) then
    create policy "player_photos_admin_staff_insert"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'player-photos'
        and exists (
          select 1
          from public.user_roles
          where user_id = auth.uid()
            and role in ('admin', 'staff')
        )
      );
  end if;
end $$;

-- 4. Actualización: solo admin/staff pueden reemplazar objetos del bucket.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'player_photos_admin_staff_update'
  ) then
    create policy "player_photos_admin_staff_update"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'player-photos'
        and exists (
          select 1
          from public.user_roles
          where user_id = auth.uid()
            and role in ('admin', 'staff')
        )
      )
      with check (
        bucket_id = 'player-photos'
        and exists (
          select 1
          from public.user_roles
          where user_id = auth.uid()
            and role in ('admin', 'staff')
        )
      );
  end if;
end $$;

-- 5. Eliminación: solo admin/staff pueden eliminar objetos del bucket.
-- No se elimina nada al ejecutar esta propuesta: solo se crea la policy.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'player_photos_admin_staff_delete'
  ) then
    create policy "player_photos_admin_staff_delete"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'player-photos'
        and exists (
          select 1
          from public.user_roles
          where user_id = auth.uid()
            and role in ('admin', 'staff')
        )
      );
  end if;
end $$;

-- 6. Precauciones antes de ejecutar:
--
-- - Confirmar que existe public.user_roles y que user_id corresponde a auth.uid().
-- - Confirmar que los roles válidos siguen siendo admin, staff y viewer.
-- - Probar subida, reemplazo y lectura con un usuario admin/staff y con un viewer.
-- - Mantener players.photo_path como ruta relativa del objeto, no como URL pública.
-- - No guardar secretos ni URLs firmadas persistentes en players.photo_path.
-- - Si se decide hacer el bucket público en el futuro, revisar consentimiento,
--   privacidad y exposición de fotos antes de cambiar public = true.
