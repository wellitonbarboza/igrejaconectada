alter table public.membros
  add column if not exists departamentos_ids uuid[],
  add column if not exists departamentos_nomes text[];
