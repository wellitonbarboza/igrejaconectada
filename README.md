# Igreja Conectada

Aplicação web para gestão de igrejas com módulos de membros, congregações, departamentos, relatórios, cartas e cartões.

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

- `src/api` – clientes de API (Base44)
- `src/pages` – páginas principais da aplicação
- `src/components` – componentes reutilizáveis (ui e modais)
- `entities` – definições dos modelos utilizados pelo backend

## Variáveis de ambiente

- `VITE_BASE44_API_URL`: URL base do backend Base44 (opcional, padrão `/api`).

## Licença

Distribuído para fins educacionais/demonstrativos.
