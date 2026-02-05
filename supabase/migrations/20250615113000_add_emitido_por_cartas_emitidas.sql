alter table public.cartas_emitidas
  add column if not exists emitido_por text;
