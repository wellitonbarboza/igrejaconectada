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
-- Alguns ambientes Supabase executam migrations com um role que não é owner de `storage.objects`.
-- Para evitar falha da migration, aplicamos as policies apenas quando o usuário atual é o owner.
do $$
declare
  objects_owner text;
begin
  select pg_catalog.pg_get_userbyid(c.relowner)
    into objects_owner
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
    and c.relkind = 'r';

  if objects_owner is null then
    raise notice 'Tabela storage.objects não encontrada. Pulando configuração de policies de storage.';
    return;
  end if;

  if objects_owner <> current_user then
    raise notice 'Sem ownership em storage.objects (owner=% , current_user=%). Pulando policies de storage nesta migration.', objects_owner, current_user;
    return;
  end if;

  execute 'alter table storage.objects enable row level security';

  execute 'drop policy if exists "storage_public_read" on storage.objects';
  execute 'drop policy if exists "storage_upload_authenticated" on storage.objects';
  execute 'drop policy if exists "storage_update_admin" on storage.objects';
  execute 'drop policy if exists "storage_delete_admin" on storage.objects';
  execute 'drop policy if exists "storage_photo_upload_admin" on storage.objects';
  execute 'drop policy if exists "storage_photo_update_admin" on storage.objects';
  execute 'drop policy if exists "storage_photo_delete_admin" on storage.objects';

  execute $policy$
    create policy "storage_public_read"
    on storage.objects
    for select
    using (
      bucket_id in ('fotos-membros', 'avatares', 'documentos')
    )
  $policy$;

  execute $policy$
    create policy "storage_upload_authenticated"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'documentos'
    )
  $policy$;

  execute $policy$
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
    )
  $policy$;

  execute $policy$
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
    )
  $policy$;

  execute $policy$
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
    )
  $policy$;
end $$;
