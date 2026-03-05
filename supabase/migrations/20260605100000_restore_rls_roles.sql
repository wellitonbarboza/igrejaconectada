-- Restaura uma base mínima de segurança para níveis de acesso (admin e usuario)
-- sem depender de colunas opcionais no perfil (ex.: congregacao_id).

alter table public.profiles enable row level security;
alter table public.membros enable row level security;
alter table public.departamentos enable row level security;
alter table public.congregacoes enable row level security;
alter table public.configs enable row level security;

-- Limpa políticas antigas para evitar conflito.
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_update_admin_or_self" on public.profiles;
drop policy if exists "profiles_insert_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;
drop policy if exists "membros_select_authenticated" on public.membros;
drop policy if exists "membros_insert_authenticated" on public.membros;
drop policy if exists "membros_update_authenticated" on public.membros;
drop policy if exists "membros_delete_admin" on public.membros;
drop policy if exists "departamentos_select_authenticated" on public.departamentos;
drop policy if exists "departamentos_mutation_admin" on public.departamentos;
drop policy if exists "congregacoes_select_authenticated" on public.congregacoes;
drop policy if exists "congregacoes_mutation_admin" on public.congregacoes;
drop policy if exists "configs_select_authenticated" on public.configs;
drop policy if exists "configs_mutation_admin" on public.configs;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_admin_or_self"
  on public.profiles for update
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "membros_select_authenticated"
  on public.membros for select
  to authenticated
  using (true);

create policy "membros_insert_authenticated"
  on public.membros for insert
  to authenticated
  with check (true);

create policy "membros_update_authenticated"
  on public.membros for update
  to authenticated
  using (true)
  with check (true);

create policy "membros_delete_admin"
  on public.membros for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "departamentos_select_authenticated"
  on public.departamentos for select
  to authenticated
  using (true);

create policy "departamentos_mutation_admin"
  on public.departamentos for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "congregacoes_select_authenticated"
  on public.congregacoes for select
  to authenticated
  using (true);

create policy "congregacoes_mutation_admin"
  on public.congregacoes for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "configs_select_authenticated"
  on public.configs for select
  to authenticated
  using (true);

create policy "configs_mutation_admin"
  on public.configs for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
