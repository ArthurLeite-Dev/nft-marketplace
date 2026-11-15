# AGENTS.md

# NFT Marketplace Jungle Gaming - Guia para Agentes

## Visão Geral

Este é um marketplace de NFTs construído com React, TypeScript, TanStack Router, TanStack Query, Axios, Socket.IO (via MSW), Tailwind CSS, shadcn/ui, MSW e Playwright.

## Stack Obrigatória

| Camada | Tecnologia |
|--------|------------|
| Interface | React 19 |
| Linguagem | TypeScript |
| Roteamento | TanStack Router |
| Estado remoto | TanStack Query |
| Cliente HTTP | Axios |
| Integração | REST APIs |
| Tempo real | Socket.IO (via MSW binding) |
| Estilização | Tailwind CSS 4 |
| Componentes | shadcn/ui (Radix) |
| Mocking | MSW 2.15.0 |
| Testes E2E | Playwright |
| Auditoria | Lighthouse |

## Comandos

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview de produção
npm run preview -- --port 4176

# Verificação de tipos
npm run typecheck

# Lint
npm run lint

# Testes unitários
npm run test:unit

# Testes E2E
npm run test:e2e

# Auditoria Lighthouse (precisa do preview rodando)
npm run lighthouse
```

## Variáveis de Ambiente

Crie um arquivo `.env` baseado em `.env.example`:

```env
VITE_API_MOCKING=enabled
```

## Credenciais de Teste

| E-mail | Senha |
|--------|-------|
| ana@jungle.test | Colecao@2026 |
| bruno@jungle.test | Galeria@2026 |

## Cenários de Mock

Use o parâmetro de URL `?scenario=<nome>` para alternar cenários:

- `default` - Tudo funciona normalmente
- `empty` - Listagem vazia
- `slow` - Latência alta
- `offline` - Falha de rede
- `server-error` - HTTP 503
- `flaky` - Falhas intermitentes
- `session-expired` - Sessão expirada
- `coupon-expired` - Cupom vencido
- `price-changed` - Preço mudou
- `sold-out` - Edição esgotada
- `wallet-rejected` - Carteira recusada
- `order-timeout` - Timeout de pedido
- `payment-refused` - Pagamento recusado

## Estrutura do Projeto

```
src/
  api/              # Cliente Axios, contratos Zod, caminhos
  app/              # QueryClient, Router, App, Auth, Realtime
  features/         # Hooks de negócio (catalog, nft, cart, favorites, checkout, account)
  lib/              # Utilitários (ETH, validadores, redirect, announce)
  mocks/            # MSW mocks (banco, fixtures, handlers, domínio, controle)
  routes/           # Páginas do TanStack Router
  components/       # Componentes UI (shadcn) e comuns
```

## Convenções

- Commits: Conventional Commits (feat:, fix:, test:, docs:, etc.)
- Branch: main (única branch)
- Não comitar: DESAFIO.md, HANDOFF ANTIGRAVITY.md, PLANOIMPLEMENTAÇÃO.MD
- Cada tarefa: typecheck + lint limpos + testes verdes + commit

## Arquitetura

- Banco simulado em localStorage (página) / memória (service worker)
- ETH como strings decimais para evitar erros de ponto flutuante
- Idempotência de pedido por userId:idempotencyKey
- Query keys isoladas por usuário: ['me', userId, ...]
- Sessão de 30 min com expiração automática

## Documentação

- README.md - Setup, credenciais, cenários, comandos
- ARCHITECTURE.md - Contratos, políticas, decisões de arquitetura
- STATUS_CONTINUIDADE.md - Estado atual para continuidade
- AUDITORIA_FINAL.md - Matriz de conformidade com o desafio
- RELATORIO_CORRECOES.md - Relatório de problemas e correções
