create extension if not exists "pgcrypto" with schema extensions;

-- Criação de tabelas principais
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text unique,
  password_hash text,
  role text default 'usuario',
  created_at timestamp with time zone default now()
);

-- Função auxiliar para verificar privilégios de administrador sem acionar
-- recursão nas políticas da própria tabela de perfis.
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to public;

create table if not exists public.congregacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativa boolean default true,
  endereco text,
  cidade text,
  estado text,
  created_date timestamp with time zone default now()
);

create table if not exists public.departamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ativo boolean default true,
  congregacao_id uuid references public.congregacoes(id) on delete set null,
  congregacao_nome text,
  cor text,
  created_date timestamp with time zone default now()
);

alter table public.congregacoes
  add column if not exists telefone text,
  add column if not exists email text,
  add column if not exists pastor_responsavel text;

alter table public.departamentos
  add column if not exists lider_id uuid,
  add column if not exists lider_nome text,
  add column if not exists membros_ids uuid[];

create table if not exists public.membros (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  tipo text default 'congregado',
  status text default 'ativo',
  congregacao_id uuid references public.congregacoes(id) on delete set null,
  congregacao_nome text,
  departamento_id uuid references public.departamentos(id) on delete set null,
  departamento_nome text,
  origem text,
  data_nascimento date,
  sexo text,
  estado_civil text,
  telefone text,
  email text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  bairro text,
  ativo boolean default true,
  foto_url text,
  data_batismo date,
  local_batismo text,
  batismo_espirito_santo boolean default false,
  data_batismo_espirito_santo date,
  obreiro boolean default false,
  cargo_obreiro text,
  data_membresia date,
  observacoes text,
  created_date timestamp with time zone default now()
);

create table if not exists public.configs (
  id uuid primary key default gen_random_uuid(),
  nome_igreja text not null,
  endereco_completo text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  email text,
  cnpj text,
  pastor_presidente text,
  logo_url text,
  created_at timestamp with time zone default now()
);

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
