-- =====================================================================
-- MÓDULO SECRETARIA · CULTOS (lista de presença + relatórios de frequência)
-- =====================================================================
-- Registra cultos por igreja/congregação e a presença de membros do
-- cadastro e também de visitantes (pessoas fora do cadastro).
--
-- Segue o mesmo modelo das demais tabelas de módulos (tesouraria/ebd/
-- setores): RLS desabilitada + grants amplos para anon/authenticated,
-- pois o app aplica o controle de acesso (ACL) no cliente.
-- =====================================================================

create table if not exists public.cultos (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid references public.igrejas(id) on delete cascade,
  congregacao_id uuid references public.congregacoes(id) on delete set null,
  data_culto date not null default current_date,
  tipo_culto text,
  tema text,
  hora_inicio time,
  observacoes text,
  responsavel_nome text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cultos_igreja_data on public.cultos(igreja_id, data_culto);
create index if not exists idx_cultos_congregacao on public.cultos(congregacao_id);

create table if not exists public.culto_presencas (
  id uuid primary key default gen_random_uuid(),
  culto_id uuid references public.cultos(id) on delete cascade,
  igreja_id uuid references public.igrejas(id) on delete cascade,
  congregacao_id uuid references public.congregacoes(id) on delete set null,
  membro_id uuid references public.membros(id) on delete set null,
  nome text,
  tipo text not null default 'membro' check (tipo in ('membro', 'visitante')),
  telefone text,
  presente boolean default true,
  created_at timestamptz default now(),
  -- Evita duplicidade de um mesmo membro no mesmo culto.
  -- Visitantes têm membro_id nulo (NULLs são distintos), então não conflitam.
  unique (culto_id, membro_id)
);

create index if not exists idx_culto_presencas_culto on public.culto_presencas(culto_id);
create index if not exists idx_culto_presencas_membro on public.culto_presencas(membro_id);

alter table public.cultos          disable row level security;
alter table public.culto_presencas disable row level security;

grant all on public.cultos          to anon, authenticated;
grant all on public.culto_presencas to anon, authenticated;
