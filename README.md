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

## Licença

Distribuído para fins educacionais/demonstrativos.
