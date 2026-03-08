-- Reestrutura permissões de autenticação/autorização e upload de fotos.
-- Observação: este script define credencial inicial do super admin conforme solicitado.

-- 1) Garantir perfil de super administrador por e-mail.
update public.profiles
set role = 'admin',
    email = lower('welliton.tec@hotmail.com'),
    full_name = coalesce(nullif(full_name, ''), 'Administrador Geral')
where lower(email) = lower('welliton.tec@hotmail.com');

-- 2) Ajustar senha inicial no Supabase Auth (trocar imediatamente após primeiro acesso).
do $$
begin
  if exists (select 1 from auth.users where lower(email) = lower('welliton.tec@hotmail.com')) then
    update auth.users
    set encrypted_password = crypt('190455wb', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where lower(email) = lower('welliton.tec@hotmail.com');
  end if;
end $$;

-- 3) Restringir upload de fotos para administradores.
alter table storage.objects enable row level security;

-- Limpa políticas antigas que possam conflitar.
drop policy if exists "storage_public_read" on storage.objects;
drop policy if exists "storage_upload_authenticated" on storage.objects;
drop policy if exists "storage_update_admin" on storage.objects;
drop policy if exists "storage_delete_admin" on storage.objects;
drop policy if exists "storage_photo_upload_admin" on storage.objects;
drop policy if exists "storage_photo_update_admin" on storage.objects;
drop policy if exists "storage_photo_delete_admin" on storage.objects;

-- Leitura pública para buckets públicos.
create policy "storage_public_read"
on storage.objects
for select
using (
  bucket_id in ('fotos-membros', 'avatares', 'documentos')
);

-- Upload autenticado para documentos (não-foto).
create policy "storage_upload_authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documentos'
);

-- Upload de foto apenas para admin.
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
