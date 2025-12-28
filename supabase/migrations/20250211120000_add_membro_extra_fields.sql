alter table public.membros
  add column if not exists nome_conjuge text,
  add column if not exists conjuge_tipo text,
  add column if not exists conjuge_outros text,
  add column if not exists escolaridade text,
  add column if not exists profissao text,
  add column if not exists nacionalidade text,
  add column if not exists nacionalidade_outros text,
  add column if not exists naturalidade text,
  add column if not exists pai text,
  add column if not exists mae text,
  add column if not exists religiao_origem text,
  add column if not exists data_conversao date,
  add column if not exists data_obreiro date;
