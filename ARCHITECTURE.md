# ARCHITECTURE.md

# Arquitetura — NFT Marketplace Jungle Gaming

Este documento descreve a arquitetura da aplicação, decisões de design, contratos de API, políticas de cache e estratégias de integração entre camadas.

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                   Cliente (React + TanStack Router)         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Páginas   │  │   Hooks     │  │   Componentes UI     │ │
│  │   (routes)  │  │   (features)│  │   (shadcn/ui)       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│           │                │                  │             │
│           └────────────────┴────────────────────┘           │
│                           │                                 │
│                    ┌────────▼────────────┐                  │
│                    │   TanStack Query    │                  │
│                    │  (estado remoto)    │                  │
│                    └────────┬────────────┘                  │
│                             │                               │
│                    ┌────────▼────────────┐                  │
│                    │   Axios Client      │                  │
│                    │  (interceptores)    │                  │
│                    └────────┬────────────┘                  │
│                             │                               │
│                    ┌────────▼────────────┐                  │
│                    │   MSW (service      │                  │
│                    │   worker)           │                  │
│                    │  + Socket.IO mock   │                  │
│                    └─────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## 2. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
| --- | --- | --- |
| Interface | React 19 | Framework de UI obrigatório |
| Linguagem | TypeScript | Tipagem estática obrigatória |
| Roteamento | TanStack Router | Gerenciamento de rotas, parâmetros de busca, proteção |
| Estado remoto | TanStack Query | Consultas, mutations, cache, invalidação |
| Cliente HTTP | Axios | Cliente REST com interceptores |
| Estilização | Tailwind CSS 4 | Utilitários CSS, design system |
| Componentes | shadcn/ui (Radix) | Componentes acessíveis, primitivos |
| Mocking | MSW 2.15.0 | Camada de rede, interceptação de requisições |
| Tempo real | Socket.IO (via MSW binding) | Eventos nft.updated, order.updated, ledger |
| Testes E2E | Playwright | Testes de fluxo completo |
| Auditoria | Lighthouse | Performance, acessibilidade, melhores práticas |

## 3. Estrutura de Diretórios

```
src/
  api/              # Camada de transporte
    client.ts       # Instância Axios, interceptores
    contracts/      # Contratos Zod (schemas de validação)
    paths.ts        # Constantes de caminhos da API
    errors.ts       # Classe ApiError
  app/              # Camada de aplicação
    query-client.ts # Configuração TanStack Query
    router.ts       # Configuração TanStack Router
    App.tsx         # Componente raiz
    auth.tsx        # AuthProvider (sessão, login, logout)
    realtime.ts     # Cliente Socket.IO com mock fallback
  features/         # Camada de negócio
    catalog/        # Hooks de catálogo
    nft/            # Hooks de detalhe do NFT
    cart/           # Hooks de carrinho
    favorites/      # Hooks de favoritos
    checkout/       # Hooks de checkout (cotação, pedido)
    account/        # Hooks de conta (perfil, senha, carteiras)
  lib/              # Utilitários
    eth.ts          # Matemática ETH (bigint, strings decimais)
    form-validators.ts  # Validadores de formulário
    safe-redirect.ts  # Redirecionamento seguro
    announce.ts     # Anúncios para leitores de tela
    utils.ts        # Utilitários gerais
  mocks/            # Camada de mocks (MSW)
    db/             # Banco simulado (tipos, store)
    fixtures/       # Dados de fixura (NFTs, usuários)
    scenarios.ts    # Cenários de mock
    respond.ts      # Utilitários de resposta de rede
    control.ts      # Controle de cenário (__mock)
    handlers/       # Handlers REST (base, index)
    realtime.ts     # Servidor simulado de tempo real
    domain/         # Domínio de negócio do mock
  routes/           # Páginas do TanStack Router
  components/       # Componentes UI e comuns
```

## 4. Contratos REST

### Autenticação

| Método | Endpoint | Descrição | Body | Resposta |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Cadastro de usuário | `{ username, email, password }` | `{ token, expiresAt, user }` |
| POST | `/api/v1/auth/login` | Autenticação | `{ email, password }` | `{ token, expiresAt, user }` |
| POST | `/api/v1/auth/logout` | Logout | — | `{ ok: true }` |
| GET | `/api/v1/auth/session` | Consulta sessão | — | `{ authenticated, user }` |

### NFTs

| Método | Endpoint | Descrição | Parâmetros | Resposta |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/nfts` | Listagem | `q, collections, networks, minPrice, maxPrice, tab, sort, page` | `{ items, pagination, facets }` |
| GET | `/api/v1/nfts/:nftId` | Detalhe | `nftId` (path) | `{ nft }` |
| GET | `/api/v1/nfts/:nftId/related` | Relacionados | `nftId` (path) | `{ items }` |
| GET | `/api/v1/nfts/highlights` | Destaques | — | `{ items }` |

### Favoritos

| Método | Endpoint | Descrição | Parâmetros | Resposta |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/me/favorites` | Listar favoritos | — | `{ items }` |
| PUT | `/api/v1/me/favorites/:nftId` | Alternar favorito | `nftId` (path) | `{ ok, favorited }` |
| DELETE | `/api/v1/me/favorites/:nftId` | Remover favorito | `nftId` (path) | `{ ok }` |

### Carrinho

| Método | Endpoint | Descrição | Parâmetros | Resposta |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/cart` | Consultar carrinho | `X-Cart-Id` (header) | `{ lines, totals, couponCode, ... }` |
| POST | `/api/v1/cart/items` | Adicionar item | `{ nftId, editionId, quantity }` | `{ lines, totals, ... }` |
| PATCH | `/api/v1/cart/items/:lineId` | Alterar quantidade | `lineId` (path), `{ quantity }` | `{ lines, totals, ... }` |
| DELETE | `/api/v1/cart/items/:lineId` | Remover item | `lineId` (path) | `{ lines, totals, ... }` |
| PUT | `/api/v1/cart/coupon` | Aplicar cupom | `{ code }` | `{ lines, totals, ... }` |
| DELETE | `/api/v1/cart/coupon` | Remover cupom | — | `{ lines, totals, ... }` |

### Checkout

| Método | Endpoint | Descrição | Parâmetros | Resposta |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/checkout/quote` | Cotação | `{ network, cartVersion }` | `{ subtotalEth, discountEth, networkFeeEth, totalEth, lines, expiresAt }` |
| POST | `/api/v1/wallet-connections` | Conectar carteira | `{ provider, walletAddress, network }` | `{ provider, walletAddress, connectedAt }` |

### Pedidos

| Método | Endpoint | Descrição | Parâmetros | Resposta |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/orders` | Criar pedido | `Idempotency-Key` (header), `{ network, provider, walletAddress, quote }` | `{ ok, order, created }` |
| GET | `/api/v1/orders/:orderId` | Consultar pedido | `orderId` (path) | `{ ok, order }` |
| GET | `/api/v1/me/orders` | Listar pedidos | `status` (query) | `{ ok, orders }` |

### Conta

| Método | Endpoint | Descrição | Parâmetros | Resposta |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/me/profile` | Perfil | — | `{ user }` |
| PATCH | `/api/v1/me/profile` | Atualizar perfil | `{ username, email, ... }` | `{ user }` |
| POST | `/api/v1/me/password` | Alterar senha | `{ currentPassword, newPassword, confirmPassword }` | `{ ok }` |
| GET | `/api/v1/me/wallets` | Listar carteiras | — | `{ wallets }` |
| PUT | `/api/v1/me/wallets/:slot` | Cadastrar/atualizar carteira | `slot` (path), `{ ... }` | `{ wallet }` |

## 5. Estratégia de Cache (TanStack Query)

### Configuração

```ts
queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 segundos
      gcTime: 5 * 60 * 1000,     // 5 minutos
      retry: 1,                    // 1 retry para mutations sem retry
    },
  },
});
```

### Isolamento de Dados por Usuário

As query keys incluem o `userId` para isolar dados entre usuários autenticados:

| Recurso | Query Key |
| --- | --- |
| Perfil | `['profile']` |
| Favoritos | `['favorites']` |
| Carrinho | `['cart']` |
| Pedidos pendentes | `['orders', 'pending']` |
| NFT | `['nft', nftId]` |
| Catálogo | `['nfts', searchParams.toString()]` |

### Invalidação

- **Após mutation de carrinho**: `queryClient.setQueryData(['cart'], data)` + `invalidateQueries(['cart'])`
- **Após mutation de favoritos**: `queryClient.setQueryData(['favorites'], data)` + `invalidateQueries(['favorites'])`
- **Após criação de pedido**: `invalidateQueries(['orders'])` + `invalidateQueries(['cart'])`

### Sincronização com Eventos Socket.IO

Eventos `nft.updated` e `order.updated` disparam invalidação seletiva:
- `nft.updated` → invalida `['nft', nftId]` e `['nfts', ...]`
- `order.updated` → invalida `['orders', ...]`

## 6. Idempotência de Pedido

### Chave de Idempotência

```
key = `userId:${idempotencyKey}`
hash = stableHash(corpoDaRequisição)
```

### Regras

1. **Mesma chave + mesmo corpo**: Retorna o mesmo pedido já criado (não duplica)
2. **Mesma chave + corpo diferente**: Retorna erro 409 (conflito)
3. **Chave diferente**: Cria novo pedido normalmente

### Recuperação após Timeout

Se o pedido criar mas a resposta se perder (timeout), o cliente reenvia com a mesma chave de idempotência. O servidor reconhece a chave e retorna o pedido existente sem duplicar.

## 7. Tempo Real (Socket.IO)

### Arquitetura do Mock

O serviço de mock usa `@mswjs/socket.io-binding` para interceptar conexões WebSocket no service worker do MSW.

### Eventos Implementados

| Evento | Direção | Descrição |
| --- | --- | --- |
| `nft.updated` | Servidor → Cliente | Preço ou disponibilidade de NFT mudou |
| `order.updated` | Servidor → Cliente | Estado do pedido mudou |
| `ledger.updated` | Servidor → Cliente | Evento do ledger financeiro |

### Sincronização com REST

Eventos de tempo real invalidam queries do TanStack Query correspondentes:

| Evento | Query Keys Invalidadas |
| --- | --- |
| `nft.updated` | `['nft', nftId]`, `['nfts', ...]` |
| `order.updated` | `['orders', ...]` |

### Reconexão

Após reconexão, o cliente:
1. Reconecta ao Socket.IO
2. Reinscreve nos tópicos ativos (NFTs, pedidos, ledger)
3. Reconcilia estado com a API REST via queries

### Limitações do Mock

- Socket.IO via MSW funciona em ambiente de demonstração local
- Eventos são simulados, não vindos de um servidor real
- Não há persistência de conexões entre sessões

## 8. Decisões de UX

### Estado de Carregamento

- Skeleton com efeito shimmer em componentes dependentes de dados
- Skeleton mantém dimensões para evitar deslocamento de layout (CLI)
- Respeita `prefers-reduced-motion` (animação desabilitada)

### Estados de Erro

- Mensagens de erro claras associadas aos campos de formulário
- Botão "Tentar novamente" para falhas de rede
- Erros de validação exibidos inline nos campos

### Acessibilidade

- Navegação por teclado em todos os fluxos
- Foco visível em elementos interativos
- Labels associados a campos de formulário
- Alternativas textuais para imagens
- Contraste legível (WCAG AA)
- Feedback de mudanças em tempo real (live regions)

### Desvios do Figma

- Assets de NFT não incluídos (pendente de autorização)
- Algumas variações de fonte/cor podem diferir ligeiramente do Figma original

## 9. Limitações Conhecidas

| Limitação | Descrição | Mitigação |
| --- | --- | --- |
| Assets de NFT | Imagens não incluídas no repositório | Placeholder usado; assets pendentes de autorização do Figma |
| Deploy público | Pendente de autorização do usuário | Pode ser deployado em Vercel/Netlify/Cloudflare Pages |
| Tempo real | Simulado em ambiente de demo | Socket.IO real requer backend dedicado |
| MSW | Service worker pode não ativar imediatamente | Primeira requisição pode falhar se worker não ativo |

## 10. Comandos de Desenvolvimento

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview de produção |
| `npm run typecheck` | Verificação de tipos TypeScript |
| `npm run lint` | Lint com oxlint |
| `npm run test:unit` | Testes unitários |
| `npm run test:e2e` | Testes E2E (Playwright) |
| `npm run test:lighthouse` | Auditoria Lighthouse |

## 11. Credenciais de Teste

| E-mail | Senha | Descrição |
| --- | --- | --- |
| ana@jungle.test | Colecao@2026 | Ana (com carteiras e favoritos) |
| bruno@jungle.test | Galeria@2026 | Bruno (carrinho vazio) |

## 12. Cenários de Mock

Use o parâmetro de URL `?scenario=<nome>` para alternar cenários:

| Cenário | Comportamento |
| --- | --- |
| `default` | Tudo funciona normalmente |
| `empty` | Listagem vazia |
| `slow` | Latência alta (1,5–3 s) |
| `offline` | Falha de rede |
| `server-error` | HTTP 503 |
| `flaky` | Falhas intermitentes |
| `session-expired` | Sessão expirada |
| `coupon-expired` | Cupom vencido |
| `price-changed` | Preço mudou durante navegação |
| `sold-out` | Edição esgotada |
| `wallet-rejected` | Carteira recusada |
| `order-timeout` | Timeout após criar pedido |
| `payment-refused` | Pagamento recusado |
