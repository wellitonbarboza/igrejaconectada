-- Migration: multi-tenant (igrejas), módulos por igreja, Tesouraria, EBD e
-- presença de setores. Inclui colunas extras em membros e profiles.

create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. IGREJAS e MÓDULOS (multi-tenant)
-- =====================================================================
create table if not exists public.igrejas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  razao_social text,
  cnpj text,
  telefone text,
  email text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  pastor_responsavel text,
  logo_url text,
  ativa boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.igreja_modulos (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid references public.igrejas(id) on delete cascade,
  modulo text not null,
  ativo boolean default true,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (igreja_id, modulo)
);

-- Vincula profiles à igreja e marca super admin
alter table public.profiles
  add column if not exists igreja_id uuid references public.igrejas(id) on delete set null,
  add column if not exists is_super_admin boolean default false;

-- Vincula principais entidades à igreja (multi-tenant)
alter table public.membros       add column if not exists igreja_id uuid references public.igrejas(id) on delete set null;
alter table public.congregacoes  add column if not exists igreja_id uuid references public.igrejas(id) on delete set null;
alter table public.departamentos add column if not exists igreja_id uuid references public.igrejas(id) on delete set null;

-- Flag "participa da EBD" no membro + classe preferida
alter table public.membros
  add column if not exists participa_ebd boolean default false,
  add column if not exists ebd_classe_id uuid;

-- =====================================================================
-- 2. TESOURARIA
-- =====================================================================
create table if not exists public.lancamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid references public.igrejas(id) on delete cascade,
  congregacao_id uuid references public.congregacoes(id) on delete set null,
  tipo text not null check (tipo in ('dizimo','oferta','voto','entrada','saida','despesa')),
  categoria text,
  descricao text,
  valor numeric(12,2) not null default 0,
  data_lancamento date not null default current_date,
  membro_id uuid references public.membros(id) on delete set null,
  membro_nome text,
  forma_pagamento text,
  comprovante_url text,
  responsavel_id uuid,
  responsavel_nome text,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_lanc_fin_igreja_data on public.lancamentos_financeiros(igreja_id, data_lancamento);
create index if not exists idx_lanc_fin_tipo on public.lancamentos_financeiros(tipo);
create index if not exists idx_lanc_fin_membro on public.lancamentos_financeiros(membro_id);

-- =====================================================================
-- 3. EBD (Escola Bíblica Dominical)
-- =====================================================================
create table if not exists public.ebd_classes (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid references public.igrejas(id) on delete cascade,
  nome text not null,
  faixa_etaria text,
  professor_id uuid references public.membros(id) on delete set null,
  professor_nome text,
  descricao text,
  ativa boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.membros
  add constraint membros_ebd_classe_fk foreign key (ebd_classe_id)
    references public.ebd_classes(id) on delete set null
  deferrable initially deferred;

create table if not exists public.ebd_matriculas (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid references public.ebd_classes(id) on delete cascade,
  membro_id uuid references public.membros(id) on delete cascade,
  membro_nome text,
  ativo boolean default true,
  created_at timestamptz default now(),
  unique (classe_id, membro_id)
);

create table if not exists public.ebd_aulas (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid references public.igrejas(id) on delete cascade,
  classe_id uuid references public.ebd_classes(id) on delete cascade,
  data_aula date not null default current_date,
  tema text,
  revistas int default 0,
  biblias int default 0,
  oferta numeric(12,2) default 0,
  visitantes int default 0,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ebd_aulas_classe_data on public.ebd_aulas(classe_id, data_aula);
create index if not exists idx_ebd_aulas_igreja_data on public.ebd_aulas(igreja_id, data_aula);

create table if not exists public.ebd_presencas (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid references public.ebd_aulas(id) on delete cascade,
  membro_id uuid references public.membros(id) on delete set null,
  membro_nome text,
  presente boolean default true,
  visitante boolean default false,
  observacoes text,
  created_at timestamptz default now()
);

create index if not exists idx_ebd_presencas_aula on public.ebd_presencas(aula_id);

create table if not exists public.ebd_financeiro (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid references public.igrejas(id) on delete cascade,
  classe_id uuid references public.ebd_classes(id) on delete set null,
  tipo text not null check (tipo in ('entrada','saida')),
  categoria text,
  descricao text,
  valor numeric(12,2) not null default 0,
  data_lancamento date not null default current_date,
  aula_id uuid references public.ebd_aulas(id) on delete set null,
  responsavel_nome text,
  observacoes text,
  created_at timestamptz default now()
);

create index if not exists idx_ebd_financeiro_igreja_data on public.ebd_financeiro(igreja_id, data_lancamento);

-- =====================================================================
-- 4. PRESENÇA DE SETORES / DEPARTAMENTOS
-- =====================================================================
create table if not exists public.setor_reunioes (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid references public.igrejas(id) on delete cascade,
  departamento_id uuid references public.departamentos(id) on delete cascade,
  departamento_nome text,
  data_reuniao date not null default current_date,
  hora_inicio time,
  tema text,
  responsavel_nome text,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_setor_reunioes_dept_data on public.setor_reunioes(departamento_id, data_reuniao);

create table if not exists public.setor_presencas (
  id uuid primary key default gen_random_uuid(),
  reuniao_id uuid references public.setor_reunioes(id) on delete cascade,
  membro_id uuid references public.membros(id) on delete set null,
  membro_nome text,
  presente boolean default true,
  justificativa text,
  created_at timestamptz default now(),
  unique (reuniao_id, membro_id)
);

-- =====================================================================
-- 5. PERMISSÕES amplas para anon/authenticated (o app aplica ACL no cliente)
--    Observação: o projeto hoje trabalha com RLS desabilitada em schema.sql.
--    Mantemos a mesma política para as novas tabelas.
-- =====================================================================
alter table public.igrejas                 disable row level security;
alter table public.igreja_modulos          disable row level security;
alter table public.lancamentos_financeiros disable row level security;
alter table public.ebd_classes             disable row level security;
alter table public.ebd_matriculas          disable row level security;
alter table public.ebd_aulas               disable row level security;
alter table public.ebd_presencas           disable row level security;
alter table public.ebd_financeiro          disable row level security;
alter table public.setor_reunioes          disable row level security;
alter table public.setor_presencas         disable row level security;

grant all on public.igrejas                 to anon, authenticated;
grant all on public.igreja_modulos          to anon, authenticated;
grant all on public.lancamentos_financeiros to anon, authenticated;
grant all on public.ebd_classes             to anon, authenticated;
grant all on public.ebd_matriculas          to anon, authenticated;
grant all on public.ebd_aulas               to anon, authenticated;
grant all on public.ebd_presencas           to anon, authenticated;
grant all on public.ebd_financeiro          to anon, authenticated;
grant all on public.setor_reunioes          to anon, authenticated;
grant all on public.setor_presencas         to anon, authenticated;

-- =====================================================================
-- 6. SUPER ADMIN inicial
-- =====================================================================
update public.profiles
   set is_super_admin = true,
       role = 'admin'
 where lower(email) = lower('welliton.tec@hotmail.com');

-- =====================================================================
-- 7. Igreja "Padrão" para dados legados (caso já existam membros)
-- =====================================================================
do $$
declare
  igreja_padrao_id uuid;
begin
  if not exists (select 1 from public.igrejas) then
    insert into public.igrejas (nome, cidade, estado, ativa)
    values ('Igreja Principal', null, null, true)
    returning id into igreja_padrao_id;

    -- Habilita todos os módulos por padrão
    insert into public.igreja_modulos (igreja_id, modulo, ativo)
    values
      (igreja_padrao_id, 'secretaria', true),
      (igreja_padrao_id, 'tesouraria', true),
      (igreja_padrao_id, 'ebd',        true),
      (igreja_padrao_id, 'setores',    true)
    on conflict do nothing;

    update public.membros       set igreja_id = igreja_padrao_id where igreja_id is null;
    update public.congregacoes  set igreja_id = igreja_padrao_id where igreja_id is null;
    update public.departamentos set igreja_id = igreja_padrao_id where igreja_id is null;
    update public.profiles      set igreja_id = igreja_padrao_id where igreja_id is null;
  end if;
end $$;
