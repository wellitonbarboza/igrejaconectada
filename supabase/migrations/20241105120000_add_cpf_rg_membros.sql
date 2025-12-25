alter table public.membros
  add column if not exists cpf text,
  add column if not exists rg text;
