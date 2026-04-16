-- Fix: permitir upload de fotos de membros por qualquer usuário autenticado.
--
-- Contexto: o fluxo anterior usava service_role no frontend para burlar RLS
-- e restringia upload a admins no banco. Isso é inseguro (service_role
-- NUNCA deve vir no bundle) e também impedia usuários operacionais de
-- cadastrar membros com foto. Aqui relaxamos a policy para qualquer usuário
-- autenticado poder gravar em "fotos-membros", "avatares" e "documentos",
-- mantendo leitura pública.
--
-- As duas etapas (tabela storage.objects e buckets) são protegidas para
-- executar apenas se o role atual for owner da tabela.

-- 1) Garantir buckets públicos com tamanho/MIME corretos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos-membros','fotos-membros', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('avatares','avatares', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('documentos','documentos', true, 20971520, null)
on conflict (id) do update
  set public = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = coalesce(excluded.allowed_mime_types, storage.buckets.allowed_mime_types);

-- 2) Ajustar policies apenas quando temos ownership em storage.objects.
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
    raise notice 'Tabela storage.objects nao encontrada. Pulando policies.';
    return;
  end if;

  if objects_owner <> current_user then
    raise notice 'Sem ownership em storage.objects (owner=%, current_user=%). Configure as policies manualmente pelo Dashboard.', objects_owner, current_user;
    return;
  end if;

  execute 'alter table storage.objects enable row level security';

  -- Limpa versões antigas conflitantes
  execute 'drop policy if exists "storage_public_read" on storage.objects';
  execute 'drop policy if exists "storage_upload_authenticated" on storage.objects';
  execute 'drop policy if exists "storage_update_admin" on storage.objects';
  execute 'drop policy if exists "storage_delete_admin" on storage.objects';
  execute 'drop policy if exists "storage_photo_upload_admin" on storage.objects';
  execute 'drop policy if exists "storage_photo_update_admin" on storage.objects';
  execute 'drop policy if exists "storage_photo_delete_admin" on storage.objects';
  execute 'drop policy if exists "storage_upload_buckets_allow_authenticated" on storage.objects';
  execute 'drop policy if exists "storage_update_buckets_allow_authenticated" on storage.objects';
  execute 'drop policy if exists "storage_delete_buckets_allow_authenticated" on storage.objects';

  execute $policy$
    create policy "storage_public_read"
    on storage.objects
    for select
    using (bucket_id in ('fotos-membros','avatares','documentos'))
  $policy$;

  execute $policy$
    create policy "storage_upload_buckets_allow_authenticated"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id in ('fotos-membros','avatares','documentos'))
  $policy$;

  execute $policy$
    create policy "storage_update_buckets_allow_authenticated"
    on storage.objects
    for update
    to authenticated
    using (bucket_id in ('fotos-membros','avatares','documentos'))
    with check (bucket_id in ('fotos-membros','avatares','documentos'))
  $policy$;

  execute $policy$
    create policy "storage_delete_buckets_allow_authenticated"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id in ('fotos-membros','avatares','documentos'))
  $policy$;
end $$;
