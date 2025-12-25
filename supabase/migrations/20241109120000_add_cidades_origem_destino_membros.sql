alter table public.membros
  add column if not exists cidade_origem text,
  add column if not exists cidade_destino text;
