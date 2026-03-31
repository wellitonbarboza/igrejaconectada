-- Corrige colunas de foto e dados inconsistentes nos membros.
-- Garante que todas as colunas necessárias existam e que os buckets estejam corretos.

-- 1) Garante que as colunas de foto existam na tabela membros
alter table public.membros
  add column if not exists foto_url    text,
  add column if not exists foto_path   text,
  add column if not exists foto_bucket text default 'fotos-membros';

-- 2) Garante colunas de nome desnormalizadas (usadas pelo ModalMembro para evitar joins)
alter table public.membros
  add column if not exists congregacao_nome  text,
  add column if not exists departamento_nome text;

-- 3) Corrige registros com foto_bucket apontando para o bucket antigo ('avatares').
--    As fotos foram sempre enviadas para 'fotos-membros'; apenas o campo estava errado.
update public.membros
set foto_bucket = 'fotos-membros'
where foto_bucket = 'avatares'
  and foto_path is not null
  and foto_path <> '';

-- 4) Preenche foto_bucket nulo/vazio para registros que já têm foto_path
update public.membros
set foto_bucket = 'fotos-membros'
where (foto_bucket is null or foto_bucket = '')
  and foto_path is not null
  and foto_path <> '';

-- 5) Garante que o bucket fotos-membros exista e seja público
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-membros',
  'fotos-membros',
  true,
  5242880,  -- 5 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 6) Garante que o bucket avatares exista e seja público (legado)
insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', true)
on conflict (id) do update
  set public = true;
