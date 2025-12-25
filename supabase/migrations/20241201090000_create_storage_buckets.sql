insert into storage.buckets (id, name, public)
values
  ('avatares', 'avatares', true),
  ('documentos', 'documentos', true)
on conflict (id) do update
  set name = excluded.name,
      public = excluded.public;
