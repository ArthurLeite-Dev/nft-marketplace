# Arquitetura

> Este documento descreve o que o código **faz**, não o que se pretendia fazer. Onde algo não foi
> executado durante a curadoria, está marcado como **não verificado**.

## Visão geral

```
UI (routes/*, components/*)
  └─ hooks por feature (features/*)         TanStack Query: queries, mutations, cache
       └─ api/client.ts + contracts/*        Axios + validação Zod de TODA resposta
            └─ rede ── MSW ── handlers/index.ts (adaptador fino: latência, falhas, Request/Response)
                              └─ mocks/api.ts (servidor REST puro, testável)
                                   └─ mocks/domain/* + mocks/db/store.ts (estado persistido)
                                        └─ mocks/events.ts (barramento) ──► mocks/realtime/socket-server.ts
                                                                              (MSW + @mswjs/socket.io-binding)
realtime/* (socket.io-client) ◄── WebSocket interceptado pelo MSW
```

- **Nenhum componente, hook ou o cliente Axios contém resposta fictícia ou regra de negócio dos mocks.**
  (Verificado por `grep`: não há `scenario`, `__mock` ou `X-Mock` fora de `src/mocks/`.)
- `src/mocks/api.ts` é uma função pura `handleApi(request) → {status, body}`. O MSW é só transporte.
  Por isso o servidor simulado é testado sem navegador (`tests/unit/mocks-core.spec.ts`).
- O mesmo `window.__mock` serve ao desenvolvimento, à demonstração e aos testes E2E.

## Sessão

- Login/cadastro devolvem `{ token, expiresAt, user }`; o token fica em `localStorage` (`jungle-auth-token`).
  Senhas são `sha256(salt + senha)` no banco simulado; o perfil nunca expõe hash/salt.
- Refresh: `AuthProvider` chama `GET /auth/session` com o token guardado.
- **Expiração** (401 `SESSION_EXPIRED`/`UNAUTHENTICATED` em qualquer chamada): a sessão local é encerrada,
  o aviso é anunciado e as rotas privadas (`RequireAuth`) redirecionam para `/entrar?redirect=<destino>`.
  Um 401 de credenciais erradas no login **não** derruba a sessão.
- **Retomada do checkout:** a tentativa de pedido (chave de idempotência + corpo) e o rascunho dos dados do
  colecionador ficam em `sessionStorage`, por usuário (`features/checkout/attempt.ts`).
- **Logout / troca de usuário / expiração:** `purgePrivateQueries` cancela e remove todo o cache privado
  (`['u', userId, …]` e `['cart', …]`), o carrinho de visitante recebe novo id e a conexão Socket.IO é
  encerrada e recriada para a nova identidade.
- Rotas privadas (`/pagamento`, `/pedidos/:id`, `/conta/*`) usam o componente `RequireAuth`.
  *Decisão/limitação:* a guarda é um componente (a sessão vive no estado React), não `beforeLoad` do router.
  O conteúdo privado não é renderizado sem sessão, mas a migração para `beforeLoad` com contexto de
  autenticação é uma melhoria recomendada.

## Carrinho

- Visitante: carrinho identificado por `X-Cart-Id` (`jungle-guest-cart-id`). Autenticado: carrinho do usuário.
  **Todas** as operações (ler, adicionar, alterar, remover, cupom, cotação, pedido) resolvem o carrinho pelo
  mesmo dono (`mocks/domain/cart.ts`).
- Ao autenticar, `POST /cart/merge` move os itens do visitante para o carrinho do usuário (idempotente;
  quantidades limitadas ao máximo por pedido, com `adjustments` informados).
- Persistência: o banco simulado grava em `localStorage` a cada mutação; o carrinho sobrevive a refresh e login.
- Totais (`subtotal`, `desconto`, `taxa de rede`, `total`) vêm sempre da API; o cliente não os recalcula.
  Valores em ETH trafegam como **strings decimais** e usam aritmética de inteiros (`lib/eth.ts`).
- Linhas têm status: `available`, `price-changed` (exige "Aceitar novo preço") e `unavailable`.

## Pedido, cotação e idempotência

1. `POST /checkout/quote` (rede) → cotação com `quoteId`, `totals` e `expiresAt` (5 min). Recusa com
   `QUOTE_CHANGED` se houver preço alterado não aceito e `AVAILABILITY_CONFLICT` se houver item indisponível.
2. `POST /wallet-connections` simula conexão/recusa; `DELETE` e o evento `wallet.disconnected` simulam desconexão.
3. `POST /orders` com `Idempotency-Key`: mesma chave + mesmo conteúdo → o **mesmo** pedido (`created:false`);
   conteúdo diferente → 409 `IDEMPOTENCY_KEY_REUSED`. Antes de criar, **revalida** contra o estado atual
   (preço, disponibilidade, cupom, taxa, quantidades) e expiração; qualquer mudança → 409 `QUOTE_CHANGED`/
   `QUOTE_EXPIRED`, e a UI exige nova cotação e **nova confirmação**.
4. O pedido nasce `pending`; é liquidado (relógio simulado, ≈3 s) em `confirmed` ou `refused` (cenário).
   Na confirmação baixa o estoque (edições limitadas), remove do carrinho **só** o comprado e emite
   `nft.updated` + `order.updated`. Estados `confirmed`/`refused` são terminais.
5. O recibo é um **snapshot** (linhas, totais, colecionador): mudanças posteriores no catálogo não o alteram.
6. A chave de idempotência pertence à *tentativa*: é reutilizada enquanto o conteúdo é idêntico (clique
   repetido, reenvio após timeout/refresh) e renovada se o conteúdo mudar.

## Política de cache, retries e sincronização (TanStack Query)

| Dado | Chave | `staleTime` | Observações |
|---|---|---|---|
| Catálogo | `['nfts','list', <querystring>]` | 30 s | `placeholderData` mantém a lista anterior; a chave inclui todos os parâmetros, então respostas fora de ordem ficam na sua própria chave |
| Detalhe / relacionados | `['nft', id]`, `['nft', id, 'related']` | 60 s | Atualizados in-place por `nft.updated` |
| Carrinho | `['cart', userId\|'guest']` | 15 s | Relido após `nft.updated`/`order.updated` e após reconexão |
| Favoritos / perfil / pedidos | `['u', userId, …]` | 30 s / 30 s / 0 | Isolados por usuário; pedido pendente tem `refetchInterval` de 2 s |

- `signal` do TanStack Query é repassado ao Axios: consultas obsoletas são **canceladas**.
- Retries: o `QueryClient` repete no máximo 2 vezes, com backoff `500·2ⁿ ms` (teto 4 s), e só erros marcados como transitórios (`retryable`: rede, timeout, 5xx);
  4xx (404, 409, 422, 401) não são repetidos. Mutations não repetem automaticamente: a recuperação de
  pedido é explícita e idempotente.
- **Atualização otimista:** favoritos (`useFavorites`). A UI muda na hora; em falha, rollback ao snapshot e
  anúncio "A alteração foi desfeita"; ao final a consulta é invalidada.
- Invalidação: mutations atualizam o cache com a resposta; eventos e reconexão invalidam por prefixo.

## Tempo real (Socket.IO) e reconciliação com REST

- Cliente: `src/realtime/` (`socket.io-client`, transporte `websocket`). Uma conexão por identidade;
  `session.attach {token}` identifica o dono. `dispose()` remove todos os listeners e fecha o socket
  ao trocar de usuário ou desmontar.
- Servidor simulado: `mocks/realtime/socket-server.ts` usa `ws.link` do MSW + `toSocketIo` de
  `@mswjs/socket.io-binding`. **Nunca** notifica a UI diretamente: o único caminho é WebSocket → socket.io-client.
  Eventos: `nft.updated` (público), `order.updated` e `wallet.disconnected` (só para o dono).
- Cada evento tem `eventId` estável (`<recurso>@<versão>`) e `version` monotônica por recurso
  (`realtime/event-processor.ts`, lógica pura e testada):
  descarta malformados, **duplicatas**, **versões antigas/iguais** e **eventos de outro usuário**.
  O REST de NFT e pedido também carrega `version`, e `patchNftDetail/patchOrder` ignoram eventos mais antigos
  que o REST já aplicado.
- Efeitos: `nft.updated` → patch no detalhe e nos cards do catálogo + invalidação do carrinho + aviso
  (banner `role="status"`); `order.updated` → patch do pedido + invalidação de pedidos/carrinho.
- **Reconciliação:** a cada `connect` após `disconnect`/`connect_error`, as consultas ativas
  (`nfts`, `nft`, `cart`, `u`) são invalidadas e relidas do REST. A página do pedido ainda faz polling
  enquanto o pedido está `pending`, de modo que a retomada funciona mesmo sem evento.
- **Limitações do ambiente de mocks:** só o transporte WebSocket é simulado (sem long-polling); não há rooms
  nem recuperação de sessão do Socket.IO; um único "servidor" em memória por aba; o relógio de liquidação é o
  relógio simulado (`advanceClock`). **O binding e a URL `wss://realtime.jungle.test/socket.io/` não puderam
  ser executados na curadoria (sem rede/`npm install`) — validar com `npm run test:realtime`.**

## Mocks e cenários

Ver README. Persistência em `localStorage` (`jungle-mock-db:v2`), semeada uma vez; `reset()` restaura as
fixtures. IDs são determinísticos (`ord_000001`…). Latência vem de um PRNG com semente fixa por cenário.

## Acessibilidade

Uma única landmark `<main id="main-content">` (raiz); link "pular para o conteúdo"; labels associados
(`FormField`/`htmlFor`), erros com `aria-describedby`/`role="alert"`; regiões ao vivo para mutations,
eventos em tempo real e erros; diálogo de revisão do pagamento usa Radix Dialog (foco preso, Esc fecha);
skeletons com shimmer respeitam `prefers-reduced-motion`. Links com aparência de botão usam `<Link className="button">`
(sem `<button><a/></button>`). **Contraste e Lighthouse de acessibilidade: não verificados.**

## Decisões de UX e desvios conhecidos do Figma

- **O Figma não pôde ser acessado na curadoria**; a fidelidade visual **não foi verificada**. Os frames de
  tablet/perfil/carteiras/confirmação seguem o padrão visual existente.
- Apenas 4 imagens de NFT existem nos assets (`public/images/nfts`); as 36 fixtures as reutilizam.
- A confirmação de pedido tem tela própria `/pedidos/:id` (pendente, confirmado, recusado).
- Visitantes podem montar o carrinho; o login é pedido ao finalizar a compra e os itens são preservados.
- Páginas fora do escopo (criadores, aprenda…) não existem e caem na página 404 (não simulam sucesso).
- `routeTree.gen.ts` é mantido **manualmente** (`@ts-nocheck`) e `@tanstack/router-plugin@1.169.0` está
  desalinhado de `@tanstack/react-router@1.170.46`. Recomendado: alinhar versões e regenerar com o plugin.
