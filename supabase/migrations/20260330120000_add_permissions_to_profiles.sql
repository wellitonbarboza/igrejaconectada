-- Adiciona coluna de permissões granulares por usuário
-- Quando NULL, usa as permissões padrão do papel (role)
alter table if exists public.profiles
  add column if not exists permissions jsonb;

comment on column public.profiles.permissions is
  'Lista de páginas permitidas para o usuário. NULL = permissões padrão do papel.';
