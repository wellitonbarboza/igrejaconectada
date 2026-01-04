insert into storage.buckets (id, name, public)
values
  ('fotos-membros', 'fotos-membros', true)
on conflict (id) do update
  set name = excluded.name,
      public = excluded.public;

alter table public.membros
  alter column foto_bucket set default 'fotos-membros';
