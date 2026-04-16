-- Migration: corrige constraints NOT NULL legadas em ebd_presencas que
-- quebravam inserts vindos do app (erro 23502).
--
-- Contexto: em alguns ambientes a tabela ebd_presencas foi criada com colunas
-- extras (ex.: classe_id, igreja_id, oferta, revistas, biblias, visitantes,
-- data_aula) com NOT NULL, fora do schema oficial definido em
-- 20260416130000_*.sql. Como o app só envia aula_id/membro_id/presente/etc.,
-- qualquer coluna obrigatória adicional faz o PostgREST retornar 400.
-- Aqui afrouxamos essas constraints (NULL permitido) para restaurar o insert.

do $$
declare
  col record;
begin
  for col in
    select column_name
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'ebd_presencas'
       and is_nullable = 'NO'
       and column_name not in ('id', 'created_at')  -- mantém obrigatórios
  loop
    -- Só afrouxa colunas que NÃO pertencem ao schema canônico e podem faltar
    -- nos inserts do app. `aula_id`, `membro_id`, `membro_nome`, `presente`,
    -- `visitante`, `observacoes` nós já enviamos, então NOT NULL é aceitável
    -- nelas — mas no cliente enviamos e/ou elas possuem default.
    execute format(
      'alter table public.ebd_presencas alter column %I drop not null',
      col.column_name
    );
  end loop;
end $$;

-- Mesma ideia para setor_presencas, por segurança.
do $$
declare
  col record;
begin
  for col in
    select column_name
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'setor_presencas'
       and is_nullable = 'NO'
       and column_name not in ('id', 'created_at')
  loop
    execute format(
      'alter table public.setor_presencas alter column %I drop not null',
      col.column_name
    );
  end loop;
end $$;

-- Recarrega o schema no PostgREST
notify pgrst, 'reload schema';
