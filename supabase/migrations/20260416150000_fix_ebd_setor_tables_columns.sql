-- Migration defensiva: garante que todas as colunas esperadas pelo app existam
-- nas tabelas de EBD e Setores. Corrige o erro 400 ao salvar presenças (POST
-- em /rest/v1/ebd_presencas) quando a tabela foi criada em uma versão
-- anterior que não possuía todas as colunas.

-- =====================================================================
-- 1. EBD CLASSES
-- =====================================================================
alter table public.ebd_classes
  add column if not exists igreja_id uuid references public.igrejas(id) on delete cascade,
  add column if not exists nome text,
  add column if not exists faixa_etaria text,
  add column if not exists professor_id uuid references public.membros(id) on delete set null,
  add column if not exists professor_nome text,
  add column if not exists descricao text,
  add column if not exists ativa boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- =====================================================================
-- 2. EBD MATRICULAS
-- =====================================================================
alter table public.ebd_matriculas
  add column if not exists classe_id uuid references public.ebd_classes(id) on delete cascade,
  add column if not exists membro_id uuid references public.membros(id) on delete cascade,
  add column if not exists membro_nome text,
  add column if not exists ativo boolean default true,
  add column if not exists created_at timestamptz default now();

-- =====================================================================
-- 3. EBD AULAS
-- =====================================================================
alter table public.ebd_aulas
  add column if not exists igreja_id uuid references public.igrejas(id) on delete cascade,
  add column if not exists classe_id uuid references public.ebd_classes(id) on delete cascade,
  add column if not exists data_aula date default current_date,
  add column if not exists tema text,
  add column if not exists revistas int default 0,
  add column if not exists biblias int default 0,
  add column if not exists oferta numeric(12,2) default 0,
  add column if not exists visitantes int default 0,
  add column if not exists observacoes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- =====================================================================
-- 4. EBD PRESENCAS (fix principal do bug 400)
-- =====================================================================
alter table public.ebd_presencas
  add column if not exists aula_id uuid references public.ebd_aulas(id) on delete cascade,
  add column if not exists membro_id uuid references public.membros(id) on delete set null,
  add column if not exists membro_nome text,
  add column if not exists presente boolean default true,
  add column if not exists visitante boolean default false,
  add column if not exists observacoes text,
  add column if not exists created_at timestamptz default now();

create index if not exists idx_ebd_presencas_aula on public.ebd_presencas(aula_id);

-- =====================================================================
-- 5. EBD FINANCEIRO
-- =====================================================================
alter table public.ebd_financeiro
  add column if not exists igreja_id uuid references public.igrejas(id) on delete cascade,
  add column if not exists classe_id uuid references public.ebd_classes(id) on delete set null,
  add column if not exists tipo text,
  add column if not exists categoria text,
  add column if not exists descricao text,
  add column if not exists valor numeric(12,2) default 0,
  add column if not exists data_lancamento date default current_date,
  add column if not exists aula_id uuid references public.ebd_aulas(id) on delete set null,
  add column if not exists responsavel_nome text,
  add column if not exists observacoes text,
  add column if not exists created_at timestamptz default now();

-- =====================================================================
-- 6. SETOR REUNIOES
-- =====================================================================
alter table public.setor_reunioes
  add column if not exists igreja_id uuid references public.igrejas(id) on delete cascade,
  add column if not exists departamento_id uuid references public.departamentos(id) on delete cascade,
  add column if not exists departamento_nome text,
  add column if not exists data_reuniao date default current_date,
  add column if not exists hora_inicio time,
  add column if not exists tema text,
  add column if not exists responsavel_nome text,
  add column if not exists observacoes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- =====================================================================
-- 7. SETOR PRESENCAS
-- =====================================================================
alter table public.setor_presencas
  add column if not exists reuniao_id uuid references public.setor_reunioes(id) on delete cascade,
  add column if not exists membro_id uuid references public.membros(id) on delete set null,
  add column if not exists membro_nome text,
  add column if not exists presente boolean default true,
  add column if not exists justificativa text,
  add column if not exists created_at timestamptz default now();

-- =====================================================================
-- 8. Reforço: RLS desabilitada e grants para anon/authenticated
--    (idempotente, caso alguma migration anterior tenha ativado RLS sem
--     policies e bloqueado inserts/selects).
-- =====================================================================
alter table public.ebd_classes      disable row level security;
alter table public.ebd_matriculas   disable row level security;
alter table public.ebd_aulas        disable row level security;
alter table public.ebd_presencas    disable row level security;
alter table public.ebd_financeiro   disable row level security;
alter table public.setor_reunioes   disable row level security;
alter table public.setor_presencas  disable row level security;

grant all on public.ebd_classes      to anon, authenticated;
grant all on public.ebd_matriculas   to anon, authenticated;
grant all on public.ebd_aulas        to anon, authenticated;
grant all on public.ebd_presencas    to anon, authenticated;
grant all on public.ebd_financeiro   to anon, authenticated;
grant all on public.setor_reunioes   to anon, authenticated;
grant all on public.setor_presencas  to anon, authenticated;

-- Recarrega o schema no PostgREST para que novas colunas sejam reconhecidas
-- imediatamente (se o NOTIFY não estiver disponível, o reload ocorre a cada
-- 10s de qualquer forma).
notify pgrst, 'reload schema';
