create extension if not exists "pgcrypto";

-- As tabelas e políticas já existem. Use apenas ALTER/DROP/CREATE para migrar.

-- Ajustes na tabela de perfis para armazenar senha
alter table if exists public.profiles
  alter column id set default gen_random_uuid();

alter table if exists public.profiles
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists password_hash text,
  add column if not exists role text default 'usuario',
  add column if not exists created_at timestamp with time zone default now();

create unique index if not exists profiles_email_unique on public.profiles (email);

-- Função auxiliar para verificar privilégios de administrador sem acionar
-- recursão nas políticas da própria tabela de perfis.
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

create or replace function public.authenticate_profile(email_input text, password_input text)
returns table (
  id uuid,
  full_name text,
  email text,
  role text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select p.id, p.full_name, p.email, p.role
  from public.profiles p
  where p.email = email_input
    and p.password_hash = crypt(password_input, p.password_hash);
end;
$$;

create or replace function public.create_profile(
  email_input text,
  password_input text,
  full_name_input text,
  role_input text default 'usuario'
)
returns table (
  id uuid,
  full_name text,
  email text,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into public.profiles (email, password_hash, full_name, role)
  values (
    email_input,
    crypt(password_input, gen_salt('bf')),
    full_name_input,
    coalesce(role_input, 'usuario')
  )
  returning public.profiles.id, public.profiles.full_name, public.profiles.email, public.profiles.role;
end;
$$;

grant execute on function public.is_admin(uuid) to public;

grant execute on function public.authenticate_profile(text, text) to public;
grant execute on function public.create_profile(text, text, text, text) to public;

-- Storage buckets
insert into storage.buckets (id, name, public)
  values ('documentos', 'documentos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('avatares', 'avatares', true)
  on conflict (id) do nothing;

-- Regras de segurança básicas
alter table public.profiles enable row level security;
alter table public.membros enable row level security;
alter table public.departamentos enable row level security;
alter table public.congregacoes enable row level security;
alter table public.configs enable row level security;

-- Recriar políticas existentes para o modelo de acesso via profiles

drop policy if exists "Selecionar o próprio perfil" on public.profiles;
drop policy if exists "Atualizar próprio perfil" on public.profiles;
drop policy if exists "Criar próprio perfil" on public.profiles;
drop policy if exists "Administradores podem tudo" on public.profiles;

drop policy if exists "Leitura geral" on public.membros;
drop policy if exists "Escrita usuários" on public.membros;
drop policy if exists "Atualizar registros" on public.membros;
drop policy if exists "Excluir registros" on public.membros;

drop policy if exists "Leitura" on public.congregacoes;
drop policy if exists "Mutacao" on public.congregacoes;

drop policy if exists "Leitura" on public.departamentos;
drop policy if exists "Mutacao" on public.departamentos;

drop policy if exists "Leitura" on public.configs;
drop policy if exists "Mutacao" on public.configs;

drop policy if exists "Uploads autenticados" on storage.objects;
drop policy if exists "Leitura pública" on storage.objects;

create policy "Selecionar o próprio perfil" on public.profiles
  for select using (true);

create policy "Atualizar próprio perfil" on public.profiles
  for update using (true);

create policy "Criar próprio perfil" on public.profiles
  for insert with check (true);

create policy "Administradores podem tudo" on public.profiles
  for all
  using (true)
  with check (true);

create policy "Leitura geral" on public.membros
  for select using (true);

create policy "Escrita usuários" on public.membros
  for insert with check (true);

create policy "Atualizar registros" on public.membros
  for update using (true);

create policy "Excluir registros" on public.membros
  for delete using (true);

-- Replicar as mesmas políticas para congregacoes, departamentos e configs
create policy "Leitura" on public.congregacoes for select using (true);
create policy "Mutacao" on public.congregacoes for all using (exists (
  select 1 from public.profiles p where p.role = 'admin'
));

create policy "Leitura" on public.departamentos for select using (true);
create policy "Mutacao" on public.departamentos for all using (true);

create policy "Leitura" on public.configs for select using (true);
create policy "Mutacao" on public.configs for update using (exists (
  select 1 from public.profiles p where p.role = 'admin'
));

-- Políticas para storage público
create policy "Uploads autenticados" on storage.objects
  for insert with check (bucket_id = 'documentos');

create policy "Leitura pública" on storage.objects
  for select using (bucket_id = 'documentos');
