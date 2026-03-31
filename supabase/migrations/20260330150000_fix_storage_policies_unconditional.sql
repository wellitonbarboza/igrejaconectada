-- Fix storage for photo upload.
--
-- IMPORTANT: Storage RLS policies (on storage.objects) cannot be created via
-- the SQL Editor because the logged-in role is not the owner of that table.
-- The policies below must be created through the Supabase Dashboard UI:
--   Storage > Policies  (or Authentication > Policies > storage.objects)
--
-- Required policies (create manually in the Dashboard):
--
--   1. storage_public_read (SELECT)
--      Target roles: public
--      USING: bucket_id in ('fotos-membros','avatares','documentos')
--
--   2. storage_upload_authenticated (INSERT)
--      Target roles: authenticated
--      WITH CHECK: bucket_id = 'documentos'
--
--   3. storage_photo_upload_admin (INSERT)
--      Target roles: authenticated
--      WITH CHECK: bucket_id in ('fotos-membros','avatares')
--                  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
--
--   4. storage_photo_update_admin (UPDATE)
--      Target roles: authenticated
--      USING + WITH CHECK: bucket_id in ('fotos-membros','avatares')
--                          and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
--
--   5. storage_photo_delete_admin (DELETE)
--      Target roles: authenticated
--      USING: bucket_id in ('fotos-membros','avatares')
--             and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
--
-- However, the application code now uses the service_role key for photo bucket
-- operations (after validating admin at the app level), so uploads will work
-- even without these policies.  The policies are still recommended as
-- defense-in-depth.

-- Ensure buckets exist and are public (this part works fine in the SQL Editor)
insert into storage.buckets (id, name, public)
values
  ('fotos-membros', 'fotos-membros', true),
  ('avatares', 'avatares', true),
  ('documentos', 'documentos', true)
on conflict (id) do update
  set public = true;
