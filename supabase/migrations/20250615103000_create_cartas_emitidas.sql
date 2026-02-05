create table if not exists public.cartas_emitidas (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  tipo_carta text not null check (tipo_carta in ('recomendacao', 'mudanca', 'transferencia')),
  membro_id text,
  membro_nome text not null,
  incluir_familia boolean not null default false,
  cidade_destino text,
  estado_destino text,
  funcao_ministerial text,
  congregacao_id text,
  congregacao_nome text,
  igreja_nome text,
  pastor_presidente text,
  emitida_em timestamptz not null default now(),
  arquivo_bucket text,
  arquivo_path text,
  arquivo_url text
);

create index if not exists idx_cartas_emitidas_emitida_em_desc
  on public.cartas_emitidas (emitida_em desc);

create index if not exists idx_cartas_emitidas_membro_id
  on public.cartas_emitidas (membro_id);

create index if not exists idx_cartas_emitidas_congregacao_id
  on public.cartas_emitidas (congregacao_id);

create or replace function public.set_cartas_emitidas_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

drop trigger if exists trg_cartas_emitidas_updated_date on public.cartas_emitidas;

create trigger trg_cartas_emitidas_updated_date
before update on public.cartas_emitidas
for each row
execute function public.set_cartas_emitidas_updated_date();
