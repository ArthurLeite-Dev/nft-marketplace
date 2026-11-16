# Jungle Gaming NFT Marketplace

Marketplace de NFTs com catálogo, carrinho, pagamento, conta e tempo real, construído com a stack obrigatória do desafio técnico.

## Visão Geral

Aplicação completa de marketplace de NFTs com os seguintes fluxos:

- **Catálogo**: busca, filtros combináveis (coleção, rede, preço), ordenação, paginação com estado preservado na URL
- **Detalhe do NFT**: galeria, seleção de edição, quantidade, favorito com atualização otimista, compra
- **Carrinho**: inclusão, alteração e remoção de itens, cupons válidos/inválidos/expirados, subtotal, desconto, taxas e total coerentes
- **Pagamento**: revisão antes do envio, seleção de carteira e rede, simulação de conexão/recusa/desconexão, revalidação de preços, disponibilidade, cupom e taxas, prevenção de pedidos duplicados
- **Conta**: cadastro, login, logout, recuperação de sessão após refresh, expiração de sessão, proteção de rotas privadas, perfil, avatar, alteração de senha, carteiras (principal/secundária)
- **Tempo real**: eventos nft.updated e order.updated via Socket.IO (via MSW binding em ambiente de demonstração)

## Stack Obrigatória

| Responsabilidade | Tecnologia |
| --- | --- |
| Interface | React 19 |
| Linguagem | TypeScript |
| Roteamento | TanStack Router |
| Estado remoto | TanStack Query |
| Cliente HTTP | Axios |
| Integração de dados | REST APIs |
| Tempo real | Socket.IO (via MSW binding em demo) |
| Estilização | Tailwind CSS 4 |
| Componentes | shadcn/ui (Radix) |
| Mocking | MSW 2.15.0 |
| Testes E2E | Playwright |
| Auditoria de performance | Lighthouse |

As tecnologias participam efetivamente da solução. Não há caminhos alternativos de negócio fora da camada de mocks (MSW).

## Como Executar

### Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd marketplace-nft-jungleGaming

# Instale as dependências
npm install
```

### Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
VITE_API_MOCKING=enabled
```

| Variável | Valor | Descrição |
| --- | --- | --- |
| `VITE_API_MOCKING` | `enabled` | Ativa os mocks da camada de rede (MSW). Obrigatório para demonstração local. |

### Executar em Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

### Build de Produção

```bash
npm run build
```

### Preview de Produção

```bash
npm run preview
```

A aplicação estará disponível em `http://localhost:4173`.

### Verificação de Tipos

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

### Testes Unitários

```bash
npm run test:unit
```

### Testes E2E (Playwright)

```bash
# Executar todos os testes E2E
npm run test:e2e

# Executar apenas desktop
npx playwright test --project=desktop

# Executar apenas mobile
npx playwright test --project=mobile

# Abrir relatório HTML
npx playwright show-report
```

### Auditoria Lighthouse

```bash
npm run test:lighthouse
```

Relatórios são gerados em `lighthouse/report/`.

## Credenciais Fictícias

O mock inclui dois usuários pré-cadastrados:

| E-mail | Senha | Descrição |
| --- | --- | --- |
| ana@jungle.test | Colecao@2026 | Ana (com carteiras e favoritos pré-cadastrados) |
| bruno@jungle.test | Galeria@2026 | Bruno (carrinho vazio) |

Não armazene senhas em claro. As senhas são validadas contra o mock de autenticação.

## Cenários de Mock

O mock MSW suporta cenários configuráveis para testar diferentes comportamentos. Ative um cenário via parâmetro de URL ou painel de controle:

### Cenários Disponíveis

| Cenário | Descrição |
| --- | --- |
| `default` | Tudo funciona normalmente (latência 120–400 ms) |
| `empty` | Listagem, relacionados e recomendações vazios |
| `slow` | Latência alta (1,5–3 s) para testar skeletons |
| `out-of-order` | Latência variável (50–2500 ms), respostas fora de ordem |
| `offline` | Falha de rede em todas as requisições |
| `server-error` | HTTP 503 em todas as requisições |
| `flaky` | Cada requisição falha 3× e funciona na 4ª |
| `forbidden` | Rotas autenticadas respondem 403 |
| `session-expired` | Sessões anteriores respondem expiração |
| `coupon-expired` | Todo cupom é recusado como vencido |
| `price-changed` | Preço do 1º item do carrinho muda na 2ª cotação |
| `sold-out` | Edição do 1º item esgota na 2ª cotação |
| `wallet-rejected` | A 1ª conexão de carteira é recusada |
| `order-timeout` | Pedido é criado e a 1ª resposta se perde (timeout) |
| `payment-refused` | Pedidos são recusados no pagamento |
| `duplicate-events` | Cada evento é reenviado, o anterior chega depois |

### Como Alternar Cenários

No navegador, adicione o parâmetro de URL:

```
http://localhost:5173/?scenario=slow
```

Ou use o painel de controle de mocks (disponível em modo de demonstração).

### Reset de Cenário

Use o botão "Reset" no painel de mocks para restaurar o banco de fixtures ao estado inicial.

## Fluxos de Teste

### Compra Completa

1. Acesse `/`
2. Adicione um NFT ao carrinho
3. Vá para `/carrinho`
4. Aplique um cupom válido (ex: `JUNGLE10`)
5. Clique em "Finalizar compra"
6. Faça login (se não estiver autenticado)
7. Conecte uma carteira
8. Confirme o pedido
9. Acompanhe o pagamento (confirmado/recusado)
10. Acesse o recibo em `/pedidos/:id`

### Cadastro e Login

1. Acesse `/cadastro`
2. Preencha nome de usuário, e-mail e senha
3. Confirme o cadastro
4. Faça login em `/entrar`
5. Verifique que a sessão é recuperada após refresh

### Perfil e Carteiras

1. Faça login
2. Acesse `/conta`
3. Edite o perfil (nome, e-mail, ENS)
4. Altere a senha
5. Cadastre carteiras (principal e secundária)

### Favoritos

1. Faça login
2. Navegue até um NFT
3. Clique em "Favoritar"
4. Acesse `/conta/favoritos` para ver seus favoritos

## Estrutura do Projeto

```
src/
  api/              # Cliente Axios, contratos Zod, caminhos da API
  app/              # QueryClient, Router, App, Auth, Realtime
  features/         # Hooks de negócio (catalogo, nft, cart, favorites, cart, checkout, account)
  lib/              # Utilitários (ETH bigint, validadores, redirect, announce)
  mocks/            # MSW mocks (banco, fixtures, cenários, handlers, domínio, controle)
  routes/           # Páginas do TanStack Router
  components/       # Componentes UI (shadcn) e comuns
```

## Contratos REST

Os contratos estão definidos em `src/api/contracts/` utilizando Zod para validação:

- **Auth**: registro, login, sessão, logout
- **NFTs**: listagem com busca/filtros/ordenação/paginação, detalhe, relacionados, destaques
- **Favoritos**: listagem, alternar (adicionar/remover)
- **Carrinho**: consulta, adicionar item, alterar quantidade, remover, cupom
- **Checkout**: cotação, conexão de carteira
- **Orders**: criação idempotente, consulta por ID, listagem por usuário
- **Account**: perfil, senha, carteiras

### Exemplo de Resposta (NFT)

```json
{
  "id": "nft_01",
  "name": "Cyber Jaguar #01",
  "collection": "Jungle Warriors",
  "network": "Ethereum",
  "priceEth": "1.50",
  "previousPriceEth": "2.00",
  "artwork": {
    "url": "/images/nfts/1.webp",
    "alt": "Jaguar cibernético em neon sobre floresta",
    "width": 800,
    "height": 800
  },
  "isRare": true,
  "isNew": true,
  "isTrending": true,
  "defaultEditionId": "ed_01_1",
  "createdAt": "2026-10-01T00:00:00.000Z",
  "editions": [
    {
      "id": "ed_01_1",
      "type": "1/1",
      "label": "1/1",
      "priceEth": "2.00",
      "available": 1,
      "maxPerOrder": 1,
      "isSoldOut": false
    }
  ]
}
```

Projeto desenvolvido como parte de desafio técnico.
