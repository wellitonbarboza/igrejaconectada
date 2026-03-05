# Igreja Conectada

Aplicação web para gestão de igrejas com módulos de membros, congregações, departamentos, relatórios, cartas e cartões integrada ao Supabase para autenticação, banco de dados e armazenamento de arquivos.

## Tecnologias

- [React](https://react.dev/) com Vite
- [React Router](https://reactrouter.com/)
- [@tanstack/react-query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)
- [lucide-react](https://lucide.dev/)

## Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn

## Instalação

```bash
npm install
```

## Executar em desenvolvimento

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:5173`.

## Build de produção

```bash
npm run build
```

## Estrutura principal

- `src/api` – cliente para Supabase (autenticação, tabelas e storage)
- `src/pages` – páginas principais da aplicação
- `src/components` – componentes reutilizáveis (ui e modais)
- `entities` – definições dos modelos utilizados pelo backend

## Variáveis de ambiente

- `VITE_SUPABASE_URL`: URL do projeto no Supabase (ex.: `https://xxxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: chave pública `anon` gerada pelo Supabase
- `VITE_SUPABASE_STORAGE_BUCKET` (opcional): nome do bucket público usado para uploads (padrão `documentos`)

Crie um arquivo `.env` na raiz seguindo o exemplo:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=chave-publica
VITE_SUPABASE_STORAGE_BUCKET=documentos
```

## Configuração do Supabase

1. Importe o script `supabase/schema.sql` no painel SQL do Supabase para criar tabelas, políticas e buckets necessários.
2. Ative o modo "auto confirm" para cadastros de usuários em **Authentication → Providers → Email** para que novos cadastros recebam sessão imediatamente.
3. Em **Storage**, confirme que existe um bucket público com o mesmo nome definido na variável `VITE_SUPABASE_STORAGE_BUCKET` (por padrão, `documentos`).
4. Para administrar usuários pela aplicação, utilize perfis com `role = 'admin'`. O primeiro usuário pode ser promovido diretamente no painel SQL atualizando a coluna `role` da tabela `profiles`.

5. A funcionalidade de histórico de cartas depende das migrations:
   - `supabase/migrations/20250615103000_create_cartas_emitidas.sql`
   - `supabase/migrations/20250615113000_add_emitido_por_cartas_emitidas.sql`
   - Se você usa Supabase CLI: `supabase db push`
   - Se aplica manualmente: execute esses arquivos no SQL Editor antes de usar a tela de Cartas.

> Observação: a exclusão de usuários na tela administrativa remove apenas o registro em `profiles`. Remoções definitivas do usuário (auth.users) devem ser feitas pelo painel do Supabase utilizando uma `service_role` key.

## Governança de acesso (Admin x Usuário)

- O frontend agora aplica permissões por página em `src/utils/accessControl.js`.
- Para reforçar segurança no backend, aplique a migration `supabase/migrations/20260605100000_restore_rls_roles.sql` para restaurar RLS e limitar mutações sensíveis ao perfil `admin` (sem depender da coluna `congregacao_id` em `profiles`).
- Recomenda-se manter uma matriz de acesso por funcionalidade (ex.: membros, congregações, configurações) e revisar semestralmente.
- Para suportar classificação operacional de usuários, aplique também `supabase/migrations/20260605103000_add_cargo_to_profiles.sql` e utilize o campo `cargo` no cadastro de usuários.

## Upload de fotos de membros

- O fluxo de cadastro foi ajustado para:
  1. validar arquivo (`JPG/PNG/WEBP`, até `5MB`),
  2. criar o membro,
  3. enviar a foto com caminho definitivo baseado no `id` real do membro,
  4. atualizar o registro com `foto_url`, `foto_path` e `foto_bucket`.
- Essa sequência evita inconsistência de caminho e melhora rastreabilidade dos arquivos.
- Como boa prática operacional, recomenda-se:
  - padronizar resolução (ex.: 512x512 já aplicada no editor),
  - monitorar falhas de upload (logs),
  - e criar rotina de limpeza para fotos órfãs no bucket.

## Licença

Distribuído para fins educacionais/demonstrativos.
