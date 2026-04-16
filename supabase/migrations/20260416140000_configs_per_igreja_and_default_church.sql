-- Migration: torna tabela `configs` per-igreja, renomeia/cria a igreja padrão como
-- "Assembleia de Deus Santa Tereza do Oeste" e vincula os registros existentes.

create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. CONFIGS per-igreja: adiciona colunas igreja_id + logo_path/bucket
-- =====================================================================
alter table public.configs
  add column if not exists igreja_id uuid references public.igrejas(id) on delete cascade,
  add column if not exists logo_path text,
  add column if not exists logo_bucket text;

-- Garante índice único por igreja (um config por igreja)
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'configs_igreja_id_unique'
  ) then
    begin
      create unique index configs_igreja_id_unique on public.configs(igreja_id)
        where igreja_id is not null;
    exception when others then
      null;
    end;
  end if;
end $$;

-- =====================================================================
-- 2. Igreja padrão: "Assembleia de Deus Santa Tereza do Oeste"
--    - Se já existe uma igreja com esse nome, usa ela.
--    - Caso contrário, renomeia a primeira igreja (ex.: "Igreja Principal")
--      para esse nome; se não houver nenhuma, cria uma nova.
--    - Ao final, garante que todos os dados legados apontem para ela.
-- =====================================================================
do $$
declare
  v_igreja_id uuid;
  v_nome_padrao text := 'Assembleia de Deus Santa Tereza do Oeste';
begin
  select id into v_igreja_id from public.igrejas
   where lower(nome) = lower(v_nome_padrao)
   limit 1;

  if v_igreja_id is null then
    -- Tenta reaproveitar a "Igreja Principal" criada em migrations anteriores
    select id into v_igreja_id from public.igrejas
     where lower(nome) = lower('Igreja Principal')
     limit 1;

    if v_igreja_id is not null then
      update public.igrejas
         set nome = v_nome_padrao,
             cidade = coalesce(cidade, 'Santa Tereza do Oeste'),
             estado = coalesce(estado, 'PR'),
             updated_at = now()
       where id = v_igreja_id;
    else
      -- Se nem "Igreja Principal" existe, pega qualquer primeira igreja
      select id into v_igreja_id from public.igrejas order by created_at asc limit 1;

      if v_igreja_id is null then
        insert into public.igrejas (nome, cidade, estado, ativa)
        values (v_nome_padrao, 'Santa Tereza do Oeste', 'PR', true)
        returning id into v_igreja_id;
      else
        update public.igrejas
           set nome = v_nome_padrao,
               cidade = coalesce(cidade, 'Santa Tereza do Oeste'),
               estado = coalesce(estado, 'PR'),
               updated_at = now()
         where id = v_igreja_id;
      end if;
    end if;
  end if;

  -- Ativa todos os módulos para essa igreja (idempotente)
  insert into public.igreja_modulos (igreja_id, modulo, ativo)
  values
    (v_igreja_id, 'secretaria', true),
    (v_igreja_id, 'tesouraria', true),
    (v_igreja_id, 'ebd',        true),
    (v_igreja_id, 'setores',    true)
  on conflict (igreja_id, modulo) do update set ativo = true;

  -- Vincula dados legados que ainda não tenham igreja_id
  update public.membros        set igreja_id = v_igreja_id where igreja_id is null;
  update public.congregacoes   set igreja_id = v_igreja_id where igreja_id is null;
  update public.departamentos  set igreja_id = v_igreja_id where igreja_id is null;
  update public.profiles       set igreja_id = v_igreja_id where igreja_id is null;

  -- Configs: vincula configs existentes à igreja padrão (1 config por igreja)
  update public.configs set igreja_id = v_igreja_id where igreja_id is null;

  -- Se existem múltiplos configs sem igreja (ou vários legados), mantém o mais
  -- recente como oficial da igreja e descarta os demais.
  if (select count(*) from public.configs where igreja_id = v_igreja_id) > 1 then
    delete from public.configs
     where id in (
       select id from public.configs
        where igreja_id = v_igreja_id
        order by coalesce(updated_at, created_at, now()) desc
        offset 1
     );
  end if;

  -- Garante que existe pelo menos uma config para a igreja padrão
  if not exists (select 1 from public.configs where igreja_id = v_igreja_id) then
    insert into public.configs (igreja_id, nome_igreja, cidade, estado)
    values (v_igreja_id, v_nome_padrao, 'Santa Tereza do Oeste', 'PR');
  else
    -- Atualiza o nome_igreja para o nome oficial se ainda estiver vazio
    update public.configs
       set nome_igreja = coalesce(nullif(nome_igreja, ''), v_nome_padrao),
           cidade = coalesce(nullif(cidade, ''), 'Santa Tereza do Oeste'),
           estado = coalesce(nullif(estado, ''), 'PR')
     where igreja_id = v_igreja_id;
  end if;
end $$;
