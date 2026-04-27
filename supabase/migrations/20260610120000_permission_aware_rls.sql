-- Substitui as policies "somente admin" por uma checagem que respeita
-- as permissões granulares do usuário (coluna profiles.permissions),
-- mantendo o role "admin" como atalho com acesso total.
--
-- Motivação: usuários não-admin com permissão "edit/create/delete"
-- atribuída em uma página estavam tendo o PATCH/POST/DELETE silenciosamente
-- bloqueado pelo RLS (PostgREST retorna 200 com array vazio), o que fazia o
-- formulário "voltar para o valor anterior" após salvar.

-- 1) Função utilitária: verifica se o usuário autenticado tem uma ação em uma página.
--    Aceita o formato armazenado em profiles.permissions:
--      { "Congregacoes": ["view","create","edit","delete"], ... }
create or replace function public.has_permission(target_page text, target_action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when p.role = 'admin' then true
        when p.permissions is not null
          and jsonb_typeof(p.permissions) = 'object'
          and p.permissions ? target_page
          and jsonb_typeof(p.permissions -> target_page) = 'array'
          and (p.permissions -> target_page) @> to_jsonb(array[target_action])
        then true
        else false
      end
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

grant execute on function public.has_permission(text, text) to authenticated;

-- 2) congregacoes: substitui mutation_admin por policies por ação.
drop policy if exists "congregacoes_mutation_admin" on public.congregacoes;
drop policy if exists "congregacoes_insert_with_permission" on public.congregacoes;
drop policy if exists "congregacoes_update_with_permission" on public.congregacoes;
drop policy if exists "congregacoes_delete_with_permission" on public.congregacoes;

create policy "congregacoes_insert_with_permission"
  on public.congregacoes for insert
  to authenticated
  with check (public.has_permission('Congregacoes', 'create'));

create policy "congregacoes_update_with_permission"
  on public.congregacoes for update
  to authenticated
  using (public.has_permission('Congregacoes', 'edit'))
  with check (public.has_permission('Congregacoes', 'edit'));

create policy "congregacoes_delete_with_permission"
  on public.congregacoes for delete
  to authenticated
  using (public.has_permission('Congregacoes', 'delete'));

-- 3) departamentos: substitui mutation_admin por policies por ação.
drop policy if exists "departamentos_mutation_admin" on public.departamentos;
drop policy if exists "departamentos_insert_with_permission" on public.departamentos;
drop policy if exists "departamentos_update_with_permission" on public.departamentos;
drop policy if exists "departamentos_delete_with_permission" on public.departamentos;

create policy "departamentos_insert_with_permission"
  on public.departamentos for insert
  to authenticated
  with check (public.has_permission('Departamentos', 'create'));

create policy "departamentos_update_with_permission"
  on public.departamentos for update
  to authenticated
  using (public.has_permission('Departamentos', 'edit'))
  with check (public.has_permission('Departamentos', 'edit'));

create policy "departamentos_delete_with_permission"
  on public.departamentos for delete
  to authenticated
  using (public.has_permission('Departamentos', 'delete'));

-- 4) configs: substitui mutation_admin por policies por ação.
drop policy if exists "configs_mutation_admin" on public.configs;
drop policy if exists "configs_insert_with_permission" on public.configs;
drop policy if exists "configs_update_with_permission" on public.configs;
drop policy if exists "configs_delete_with_permission" on public.configs;

create policy "configs_insert_with_permission"
  on public.configs for insert
  to authenticated
  with check (public.has_permission('Configuracoes', 'edit'));

create policy "configs_update_with_permission"
  on public.configs for update
  to authenticated
  using (public.has_permission('Configuracoes', 'edit'))
  with check (public.has_permission('Configuracoes', 'edit'));

create policy "configs_delete_with_permission"
  on public.configs for delete
  to authenticated
  using (public.has_permission('Configuracoes', 'edit'));

-- 5) membros: o select/insert/update já estavam liberados; trocamos só o delete admin.
drop policy if exists "membros_delete_admin" on public.membros;
drop policy if exists "membros_delete_with_permission" on public.membros;

create policy "membros_delete_with_permission"
  on public.membros for delete
  to authenticated
  using (public.has_permission('Membros', 'delete'));

-- 6) profiles: ampliar policies para considerar a permissão "Usuarios" também.
drop policy if exists "profiles_insert_admin" on public.profiles;
drop policy if exists "profiles_insert_admin_or_self" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;
drop policy if exists "profiles_update_admin_or_self" on public.profiles;
drop policy if exists "profiles_insert_with_permission" on public.profiles;
drop policy if exists "profiles_delete_with_permission" on public.profiles;
drop policy if exists "profiles_update_with_permission" on public.profiles;

create policy "profiles_insert_with_permission"
  on public.profiles for insert
  to authenticated
  with check (
    id = auth.uid()
    or public.has_permission('Usuarios', 'create')
  );

create policy "profiles_update_with_permission"
  on public.profiles for update
  to authenticated
  using (
    id = auth.uid()
    or public.has_permission('Usuarios', 'edit')
  )
  with check (
    id = auth.uid()
    or public.has_permission('Usuarios', 'edit')
  );

create policy "profiles_delete_with_permission"
  on public.profiles for delete
  to authenticated
  using (public.has_permission('Usuarios', 'delete'));

-- 7) Storage: liberar upload/edição/remoção de foto-membro/avatar para usuários
--    com permissão de edição/criação em "Membros". Mantém o mesmo guard de
--    ownership de storage.objects usado nas migrations anteriores.
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
    raise notice 'Tabela storage.objects não encontrada. Pulando policies de storage.';
    return;
  end if;

  if objects_owner <> current_user then
    raise notice 'Sem ownership em storage.objects (owner=% , current_user=%). Pulando policies de storage nesta migration.', objects_owner, current_user;
    return;
  end if;

  execute 'drop policy if exists "storage_photo_upload_admin" on storage.objects';
  execute 'drop policy if exists "storage_photo_update_admin" on storage.objects';
  execute 'drop policy if exists "storage_photo_delete_admin" on storage.objects';
  execute 'drop policy if exists "storage_photo_upload_with_permission" on storage.objects';
  execute 'drop policy if exists "storage_photo_update_with_permission" on storage.objects';
  execute 'drop policy if exists "storage_photo_delete_with_permission" on storage.objects';

  execute $policy$
    create policy "storage_photo_upload_with_permission"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id in ('fotos-membros', 'avatares')
      and (
        public.has_permission('Membros', 'create')
        or public.has_permission('Membros', 'edit')
      )
    )
  $policy$;

  execute $policy$
    create policy "storage_photo_update_with_permission"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id in ('fotos-membros', 'avatares')
      and (
        public.has_permission('Membros', 'create')
        or public.has_permission('Membros', 'edit')
      )
    )
    with check (
      bucket_id in ('fotos-membros', 'avatares')
      and (
        public.has_permission('Membros', 'create')
        or public.has_permission('Membros', 'edit')
      )
    )
  $policy$;

  execute $policy$
    create policy "storage_photo_delete_with_permission"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id in ('fotos-membros', 'avatares')
      and (
        public.has_permission('Membros', 'edit')
        or public.has_permission('Membros', 'delete')
      )
    )
  $policy$;
end $$;
