alter table public.membros
  add column if not exists foto_url text,
  add column if not exists foto_path text,
  add column if not exists foto_bucket text default 'avatares';
