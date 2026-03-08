-- Corrige bootstrap de perfil com RLS habilitado:
-- permite que usuários autenticados criem o próprio perfil (id = auth.uid()),
-- enquanto mantém criação de perfis de terceiros restrita para administradores.

alter table public.profiles enable row level security;

drop policy if exists "profiles_insert_admin" on public.profiles;

drop policy if exists "profiles_insert_admin_or_self" on public.profiles;
create policy "profiles_insert_admin_or_self"
  on public.profiles for insert
  to authenticated
  with check (
    id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
