-- Fortalece arquivo morto, fotos de membros e prepara base da secretaria/tesouraria.

alter table public.membros
  add column if not exists foto_path text,
  add column if not exists foto_bucket text default 'fotos-membros',
  add column if not exists status text default 'ativo';

update public.membros
set foto_bucket = coalesce(nullif(foto_bucket, ''), 'fotos-membros')
where foto_bucket is null or foto_bucket = '';

create index if not exists idx_membros_status on public.membros (status);
create index if not exists idx_membros_congregacao_status on public.membros (congregacao_id, status);
create index if not exists idx_membros_nome on public.membros (nome_completo);

create table if not exists public.membro_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.membros(id) on delete cascade,
  tipo text not null,
  status_anterior text,
  status_novo text,
  observacao text,
  usuario_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_membro_movimentacoes_membro_data
  on public.membro_movimentacoes (membro_id, created_at desc);

create table if not exists public.financeiro_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  centro_custo text,
  congregacao_id uuid references public.congregacoes(id),
  created_at timestamptz not null default now()
);

create table if not exists public.financeiro_lancamentos (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  valor numeric(12,2) not null,
  data_lancamento date not null,
  categoria_id uuid references public.financeiro_categorias(id),
  congregacao_id uuid references public.congregacoes(id),
  membro_id uuid references public.membros(id),
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_financeiro_lancamentos_data
  on public.financeiro_lancamentos (data_lancamento desc);
create index if not exists idx_financeiro_lancamentos_congregacao
  on public.financeiro_lancamentos (congregacao_id);
