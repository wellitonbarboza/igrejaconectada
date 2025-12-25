-- Ajuste das permissões no Supabase (tabelas já existentes)
-- Desabilita RLS e remove políticas para permitir gravação livre.

alter table public.profiles disable row level security;
alter table public.membros disable row level security;
alter table public.departamentos disable row level security;
alter table public.congregacoes disable row level security;
alter table public.configs disable row level security;
alter table storage.objects disable row level security;

-- Remover políticas existentes
 drop policy if exists "Selecionar o próprio perfil" on public.profiles;
 drop policy if exists "Atualizar próprio perfil" on public.profiles;
 drop policy if exists "Criar próprio perfil" on public.profiles;
 drop policy if exists "Administradores podem tudo" on public.profiles;
 drop policy if exists "Leitura geral" on public.membros;
 drop policy if exists "Escrita usuários" on public.membros;
 drop policy if exists "Atualizar registros" on public.membros;
 drop policy if exists "Excluir registros" on public.membros;
 drop policy if exists "Leitura" on public.congregacoes;
 drop policy if exists "Mutacao" on public.congregacoes;
 drop policy if exists "Leitura" on public.departamentos;
 drop policy if exists "Mutacao" on public.departamentos;
 drop policy if exists "Leitura" on public.configs;
 drop policy if exists "Mutacao" on public.configs;
 drop policy if exists "Uploads autenticados" on storage.objects;
 drop policy if exists "Leitura pública" on storage.objects;

-- Conceder permissões amplas
 grant all on table public.profiles to anon, authenticated;
 grant all on table public.membros to anon, authenticated;
 grant all on table public.departamentos to anon, authenticated;
 grant all on table public.congregacoes to anon, authenticated;
 grant all on table public.configs to anon, authenticated;
 grant all on table storage.objects to anon, authenticated;

-- Garantir buckets básicos de armazenamento
insert into storage.buckets (id, name, public)
values
  ('avatares', 'avatares', true),
  ('documentos', 'documentos', true)
on conflict (id) do update
  set name = excluded.name,
      public = excluded.public;
