# Igreja Conectada

Aplicação web para gestão de igrejas com módulos de **Secretaria** (membros, congregações, departamentos, relatórios, cartas, cartões), **Tesouraria** (lançamentos, fluxo de caixa e relatórios), **EBD** (classes, presença, caixa e ranking) e **Presença de Setores**. Inclui arquitetura multi-tenant (várias igrejas na mesma instância) com painel Super Admin para liberar módulos por igreja. Integração com Supabase para autenticação, banco de dados e armazenamento de arquivos.

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

6. Para liberar os novos módulos (multi-tenant, Tesouraria, EBD, Presença de Setores) aplique:
   - `supabase/migrations/20260416120000_fix_photo_upload_authenticated.sql` – corrige políticas de storage (upload de fotos com usuário autenticado, sem depender de service_role no frontend).
   - `supabase/migrations/20260416130000_modules_multitenancy_tesouraria_ebd_setores.sql` – cria `igrejas`, `igreja_modulos`, `lancamentos_financeiros`, tabelas da EBD (`ebd_classes`, `ebd_matriculas`, `ebd_aulas`, `ebd_presencas`, `ebd_financeiro`), tabelas de setores (`setor_reunioes`, `setor_presencas`), colunas `igreja_id`, `participa_ebd` em `membros`, `is_super_admin` em `profiles` e cria uma "Igreja Principal" migrando registros legados.

7. Super Admin: defina a variável `VITE_SUPABASE_SUPER_ADMIN_EMAIL` com o e-mail do super administrador (padrão `welliton.tec@hotmail.com`). A migration `20260416130000` já promove esse usuário automaticamente.

> Observação: a exclusão de usuários na tela administrativa remove apenas o registro em `profiles`. Remoções definitivas do usuário (auth.users) devem ser feitas pelo painel do Supabase utilizando uma `service_role` key.

## Governança de acesso (Admin x Usuário)

- O frontend agora aplica permissões por página em `src/utils/accessControl.js`.
- Para reforçar segurança no backend, aplique a migration `supabase/migrations/20260605100000_restore_rls_roles.sql` para restaurar RLS e limitar mutações sensíveis ao perfil `admin` (sem depender da coluna `congregacao_id` em `profiles`).
- Recomenda-se manter uma matriz de acesso por funcionalidade (ex.: membros, congregações, configurações) e revisar semestralmente.
- Para suportar classificação operacional de usuários, aplique também `supabase/migrations/20260605103000_add_cargo_to_profiles.sql` e utilize o campo `cargo` no cadastro de usuários.
- Em cenários de conflito `409` no cadastro de usuários, o fluxo administrativo agora trata e-mail duplicado como atualização do registro existente, reduzindo falhas operacionais de cadastro.
- Para criação de novos usuários (auth + profile) via painel administrativo, defina `VITE_SUPABASE_SERVICE_ROLE_KEY`; sem ela, o app não consegue criar registros em `auth.users`.
- Em cenários de conflito `409` no cadastro de usuários, o fluxo administrativo agora trata e-mail duplicado como atualização do registro existente, reduzindo falhas operacionais de cadastro.

## Upload de fotos de membros

- O fluxo de cadastro foi ajustado para:
  1. validar arquivo (`JPG/PNG/WEBP`, até `5MB`),
  2. criar o membro,
  3. enviar a foto com caminho definitivo baseado no `id` real do membro,
  4. atualizar o registro com `foto_url`, `foto_path` e `foto_bucket`.
- Essa sequência evita inconsistência de caminho e melhora rastreabilidade dos arquivos.
- **Correção de upload (abril/2026)**: o frontend agora usa sempre o token da sessão autenticada (não utiliza mais `service_role` no client, o que era um risco de segurança). As políticas do storage foram ajustadas via `supabase/migrations/20260416120000_fix_photo_upload_authenticated.sql` para permitir qualquer usuário autenticado gravar nos buckets `fotos-membros`, `avatares` e `documentos`, resolvendo o erro de upload para usuários não-admin.
- Como boa prática operacional, recomenda-se:
  - padronizar resolução (ex.: 512x512 já aplicada no editor),
  - monitorar falhas de upload (logs),
  - e criar rotina de limpeza para fotos órfãs no bucket.

## Módulos do sistema

### Secretaria
Agrupa membros, congregações, departamentos, arquivo morto, cartas, cartões e relatórios. No cadastro de membros há a flag **Participa da EBD?** que alimenta as sugestões de matrícula nas classes.

### Tesouraria
- **Lançamentos** (`/tesouraria-lancamentos`): cadastro de dízimos, ofertas, votos, entradas e saídas; puxa dados dos membros para vincular ao dizimista/ofertante.
- **Fluxo de Caixa** (`/tesouraria-fluxo-caixa`): totais por período, saldo acumulado e movimento diário.
- **Relatórios** (`/tesouraria-relatorios`): Relatório mensal de entradas e saídas detalhadas e relatório de **dizimistas do mês sem exposição de valores individuais** (só nome + contagem de contribuições).

### EBD
- **Classes** (`/ebd-classes`): cadastro das classes com faixa etária e professor.
- **Aulas & Presença** (`/ebd-aulas`): registra aula, chama presença dos matriculados, adiciona visitantes, contabiliza revistas, bíblias e oferta. A oferta registrada na aula é automaticamente lançada no Caixa EBD.
- **Caixa EBD** (`/ebd-caixa`): controle financeiro específico do setor EBD (entradas/saídas por mês).
- **Relatórios** (`/ebd-relatorios`): ranking mensal das classes (score = frequência×2 + revistas + bíblias + visitantes), frequência detalhada e matriculados por classe.

### Presença de Setores
- `/presenca-setores`: lista de presença para reuniões dos departamentos/setores já cadastrados. Só aparece quem está vinculado ao setor no cadastro do membro.

### Administração Geral (Super Admin)
- **Igrejas** (`/admin-igrejas`): CRUD das igrejas (multi-tenant). Ao criar, todos os módulos são ativados por padrão.
- **Módulos por Igreja** (`/admin-modulos`): matriz Igreja × Módulo. Libere apenas o que cada equipe vai utilizar.
- **Usuários** (`/usuarios`): com super admin logado, aparece coluna extra "Igreja" para vincular usuários a igrejas.

O super admin (definido por `VITE_SUPABASE_SUPER_ADMIN_EMAIL` ou `profiles.is_super_admin = true`) vê todos os módulos independente da ativação e tem um seletor de igreja ativa na sidebar. Usuários comuns só enxergam os módulos ativos para a igreja à qual o `profile.igreja_id` pertence.

## Sugestões de evolução

Pensando em uma plataforma escalável para gestão de igrejas, considere estas próximas fases:

- **Aniversariantes & comunicação**: módulo para aniversariantes do mês, envio de e-mail/SMS/WhatsApp em datas importantes (via webhook ou integração Twilio/Zenvia).
- **Agenda & eventos**: cadastro de cultos, reuniões e eventos com confirmação de presença (RSVP).
- **Visitantes & discipulado**: ficha do visitante com acompanhamento pós-culto e trilhas de discipulado por etapa.
- **Células / GCs**: módulo dedicado a células com relatório semanal, visitantes, decisões e ofertas.
- **Missões & campanhas**: campanhas financeiras com metas, doações nominais e prestação de contas pública.
- **Patrimônio & almoxarifado**: controle de bens, inventário e solicitações de compra ligadas à Tesouraria.
- **Documentos e atas**: repositório de atas de assembleia, estatutos e documentos oficiais com versionamento.
- **Notificações internas**: inbox/push para avisos da liderança às equipes.
- **Dashboard analítico**: KPIs consolidados (evolução de membresia, dízimos mensais, frequência EBD, retenção de visitantes).
- **Auditoria**: log de alterações em membros, finanças e módulos administrativos para compliance.
- **App mobile PWA**: versão mobile com lista de presença offline para EBD e setores (sincronização em background).
- **RLS por igreja**: hoje as tabelas estão com RLS desabilitada e o isolamento multi-tenant é feito na camada de aplicação filtrando por `igreja_id`. Para endurecer, reabilitar RLS criando policies que comparam `igreja_id` com `auth.jwt() ->> 'igreja_id'` (ou com uma join em `profiles`).

## Licença

Distribuído para fins educacionais/demonstrativos.
