-- Fix storage policies for photo upload.
-- The previous migration (20260607103000) conditionally applied policies only
-- when the migration runner was the owner of storage.objects, which often fails
-- in hosted Supabase environments.  This migration applies the policies
-- unconditionally so that photo uploads work correctly.

-- Ensure buckets exist and are public
insert into storage.buckets (id, name, public)
values
  ('fotos-membros', 'fotos-membros', true),
  ('avatares', 'avatares', true),
  ('documentos', 'documentos', true)
on conflict (id) do update
  set public = true;

-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- Drop old policies if they exist (idempotent)
drop policy if exists "storage_public_read" on storage.objects;
drop policy if exists "storage_upload_authenticated" on storage.objects;
drop policy if exists "storage_photo_upload_admin" on storage.objects;
drop policy if exists "storage_photo_update_admin" on storage.objects;
drop policy if exists "storage_photo_delete_admin" on storage.objects;

-- Public read for all app buckets
create policy "storage_public_read"
on storage.objects
for select
using (
  bucket_id in ('fotos-membros', 'avatares', 'documentos')
);

-- Any authenticated user can upload to documentos
create policy "storage_upload_authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documentos'
);

-- Admin-only insert for photo buckets
create policy "storage_photo_upload_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('fotos-membros', 'avatares')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Admin-only update for photo buckets
create policy "storage_photo_update_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('fotos-membros', 'avatares')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  bucket_id in ('fotos-membros', 'avatares')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Admin-only delete for photo buckets
create policy "storage_photo_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('fotos-membros', 'avatares')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
