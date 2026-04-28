# Automação CI/CD

## Workflows ativos

| Workflow | Trigger | O que faz |
|----------|---------|-----------|
| `ci.yml` | PR + push main | Build + bundle size + (futuro) testes |
| `deploy-pages.yml` | push main | Deploy GitHub Pages |
| `auto-merge.yml` | PR labels | Auto-merge PRs com label `auto-merge` quando CI passar |
| `dependabot.yml` | semanal seg 09h | Bump de dependências (PRs com label auto-merge) |

## Auto-merge

Adiciona o label `auto-merge` num PR. Quando o CI passar e tiver aprovação, ele faz squash merge sozinho.

Setting necessário: GitHub repo → Settings → General → "Allow auto-merge" ✓

## Secrets necessários

Em Settings → Secrets and variables → Actions:

- `SUPABASE_URL` (para teste de isolamento tenant em CI — opcional)
- `SUPABASE_ANON_KEY` (idem)
- `SUPABASE_SERVICE_ROLE_KEY` (idem)
- `NETLIFY_AUTH_TOKEN` (já configurado no painel Netlify, deploy direto via integração — não precisa aqui)

## Branch protection (recomendado)

Settings → Branches → Add rule para `main`:
- Require pull request before merging
- Require status checks: `Build & Lint`
- Require branches up to date
- Do not allow bypassing
