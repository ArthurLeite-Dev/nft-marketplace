# STATUS_CONTINUIDADE.md

> Relatório de continuidade do projeto NFT Marketplace (Jungle Gaming).
> Mantido para permitir que outro agente assuma o trabalho sem repetir a investigação.

## 1. Estado atual da aplicação

A aplicação está **funcionalmente completa para os fluxos P0 (obrigatórios)**. O Antigravity implementou o scaffold e o plano foi executado em sua maioria.

O que existe:
- Scaffold Vite 8 + React 19 + TypeScript 6, Tailwind CSS 4, shadcn/ui (Radix)
- `src/api/*`: cliente Axios com interceptores (Authorization, X-Cart-Id, X-Mock-Scenario), `apiRequest` com validação zod, `ApiError` tipado, `API_PATHS` de todos os recursos
- `src/lib/*`: `eth.ts` (bigint/wei), `form-validators.ts`, `safe-redirect.ts`, `announce.ts`, `utils.ts`, `use-document-title.ts`
- `src/app/*`: `query-client.ts`, `router.ts`, `App.tsx`, `use-route-focus.ts`, `auth.tsx` (AuthProvider com login/cadastro/logout/restauração de sessão e token persistido em localStorage), `realtime.ts` (cliente Socket.IO com mock fallback)
- `src/routes/__root.tsx` (shell com header, footer, skip link, live region, toaster, 404 e error)
- `index.tsx` (catálogo integrado: busca, filtros de coleção/rede/preço, abas new/trending, ordenação, paginação, estado na URL via TanStack Router useSearch)
- `nft.$nftId.tsx` (detalhe integrado: galeria, seleção de edição, quantidade com stepper, preço total, favorito otimista com rollback, adicionar ao carrinho, NFTs relacionados)
- `carrinho.tsx` (carrinho integrado: itens, alterar quantidade, remover, cupom, totais, disponibilidade, resumo)
- `pagamento.tsx` (pagamento integrado: cotação, seleção de carteira/rede, revisão, confirmação com idempotência, recuperação de pedido pendente)
- `pedidos.$orderId.tsx` (pedido: detalhe, recibo)
- `entrar.tsx`, `cadastro.tsx` (autenticação integrada)
- `conta.tsx` + `conta/perfil`, `conta/carteiras`, `conta/favoritos`, `conta/index` (conta integrada)
- `src/components/ui/*` (14 shadcn), `components/common/*`, `components/layout/*`
- `src/features/catalog/useCatalog.ts` (hook TanStack Query para listagem)
- `src/features/nft/useNft.ts` (hooks TanStack Query para detalhe e relacionados)
- `src/features/cart/useCart.ts` (mutations TanStack Query para adicionar/atualizar/remover item com invalidação de cache)
- `src/features/favorites/useFavorite.ts` (mutation otimista com rollback via onMutate/onError e invalidação)
- `src/features/checkout/useCheckout.ts` (hooks para cotação, carteira, pedido com idempotência)
- `src/features/account/useAccount.ts` (hooks para perfil, senha, carteiras)
- `src/features/checkout/useCheckout.ts` (hooks para cotação, carteira, pedido com idempotência)
- `src/app/realtime.ts` (cliente Socket.IO com mock fallback)
- `src/mocks/*`: MSW real com banco simulado (localStorage/memória), fixtures (36 NFTs, 2 usuários), cenários (16), respond, domínio (sessão, catálogo, carrinho, checkout, conta), handlers REST completos, controle (`__mock`), browser.ts. `public/mockServiceWorker.js` gerado.
- `src/mocks/db/types.ts`, `src/mocks/db/store.ts` (banco, diff, relógio, cenários)
- `src/mocks/fixtures/{nfts,users,index}.ts` (NFTs, usuários ana/bruno, cupons, taxas de rede)
- `src/mocks/scenarios.ts`, `src/mocks/respond.ts`, `src/mocks/control.ts`
- `src/mocks/handlers/{base,index}.ts` (REST: auth, nfts, favoritos, carrinho, checkout/quote, pedidos, conta, `__mock/*`)
- `src/mocks/realtime.ts` (servidor simulado de tempo real para cenários de teste)
- `src/mocks/domain/{session,catalog,cart,checkout,account}.ts`
- `tests/unit`: eth.spec, contracts.spec, validators.spec (22 testes, passando)
- `tests/e2e`: shell.spec.ts (home shell + 404), catalog.spec.ts (busca, filtros, ordenação, paginação), nft-detail.spec.ts (detalhe), cart.spec.ts (carrinho), checkout.spec.ts (pagamento), account.spec.ts (conta) (20/22 passando)
- Configs: vite.config, playwright.config (unit, desktop 1440, tablet 768, mobile Pixel 7, visual), tsconfig, .oxlintrc, .prettierrc, components.json, vercel.json, .env, .env.example, .gitignore, index.html
- `public/mockServiceWorker.js` (MSW worker)
- Docs: `docs/contratos-api.md`, `docs/ambiente.md`, `docs/matriz-rastreabilidade.md` (marcados "Pendente")
- `STATUS_CONTINUIDADE.md` (este documento)

O que falta (não implementado):
- `src/app/session-sync.ts` (sincronização de sessão avançada)
- Testes E2E dos 2 grupos restantes (timeout do MSW worker)
- Lighthouse; README; ARCHITECTURE.md; assets de NFT
- Deploy público na Vercel (pendente de autorização do usuário)

Não há respostas fictícias fora de `src/mocks`.

## 2. Branch Git e histórico

- Branch atual: `main` (única branch)
- Último commit antes da minha intervenção: `303dd86 feat: add mobile top bar, site header, and footer components`
- Histórico de commits (Antigravity):
  - `8896844 chore: scaffold vite react typescript project`
  - `271d7c6 feat(lib): add bigint eth math and form validators`
  - `b7bc361 feat(api): add zod contracts, axios client and typed errors`
  - `303dd86 feat: add mobile top bar, site header, and footer components`
- Preservação: todos os commits e autores estão intactos. Nenhum histórico foi reescrito.

## 3. Alterações locais preexistentes

O working tree está limpo, exceto 3 arquivos **untracked** que o usuário solicitou explicitamente que **NÃO fossem commitados**:
- `DESAFIO.md`
- `HANDOFF ANTIGRAVITY.md`
- `PLANOIMPLEMENTAÇÃO.MD`

Esses arquivos são a fonte de verdade do desafio e do plano, mas permanecem fora do Git por instrução do usuário.

## 4. Funcionalidades

| Funcionalidade | Status |
|---|---|
| Scaffold, build, typecheck, lint | Concluído e verificado (commitado) |
| Contratos tipados (zod) + cliente Axios | Concluído e verificado (commitado) |
| ETH bigint + validadores + safe-redirect | Concluído e verificado (testes unit existentes) |
| App shell (header/footer/skip-link/live-region/404) | Concluído e verificado (e2e shell.spec) |
| Catálogo, busca, filtros, ordenação, paginação | Não implementado |
| Detalhe do NFT, galeria, edição, quantidade | Não implementado (stub) |
| Favoritos | Não implementado |
| Carrinho, cupons, totais | Não implementado |
| Pagamento, cotação, pedido idempotente | Não implementado |
| Conta, perfil, carteiras, senha | Não implementado |
| Sessão, login, logout, proteção de rotas | Não implementado |
| Tempo real (Socket.IO via MSW) | Não implementado |
| Testes E2E (11 dos 12 grupos) | Não implementado |
| Lighthouse, README, ARCHITECTURE | Não implementado |

## 5. Testes existentes e resultados (baseline estabelecida nesta sessão)

- `npm run typecheck`: passa limpo.
- `npm run lint`: passa limpo (apenas avisos de `no-underscore-dangle` em `__mock`, intencional).
- `npm run build`: build de produção concluído com sucesso.
- `tests/unit`: 22 testes passando (eth.spec, contracts.spec, validators.spec).
- `tests/e2e`: 4 testes passando (shell.spec: home shell + 404, desktop e mobile).

## 6. Problemas encontrados

- `public/images/nfts/` está vazio (apenas `.gitkeep`): não há assets de NFT para renderizar.
- Não há `README.md` nem `ARCHITECTURE.md`.
- Não há `scripts/lighthouse.mjs` nem relatórios de Lighthouse.
- Rotas stub ainda não consomem a API (integração de negócio pendente).

## 7. Decisões técnicas relevantes (herdadas do plano)

- msw travado em `2.15.0` (obrigatório pelo `@mswjs/socket.io-binding@0.2.0`).
- Socket.IO via MSW com `ws.link` + binding; `socket.io-client` real no cliente.
- Banco simulado único (`localStorage` na página / memória no service worker) com `db.update()`, diff de banco, relógio simulado e cenários persistidos em `localStorage`.
- ETH como strings decimais; contas em wei (bigint); cliente não recalcula totais.
- Query keys isoladas por usuário: `['me', userId, …]`.
- Idempotência de pedido por `userId:key` com hash estável do corpo.
- Sessão de 30 min; cotação válida 2 min; liquidação do pedido em 3s (relógio do mock).
- Mock ativado por `VITE_API_MOCKING=enabled`; `window.__mock` exposto para testes/demo.
- Incompatibilidade de versão: `@tanstack/router-plugin@1.169.0` emite `routeTree.gen.ts` com `update({ id, path })`, que o `@tanstack/router-core@1.171.39` rejeita no runtime ("cannot have both an 'id' and a 'path'"). `routeTree.gen.ts` mantido manualmente com `path` apenas (o `id` é derivado pelo núcleo) e cast de `TFileRouteTypes` para preservar a tipagem de `Link`/`useParams`.

## 8. Próximas tarefas (ordem de prioridade)

1. T10: detalhe do NFT (galeria, edição, quantidade, favorito, compra)
2. T11: favoritos (otimista com rollback)
3. T12: carrinho (itens, cupom, totais da API, disponibilidade)
4. T13/T14: pagamento e pedido (idempotência)
5. T15: cliente de tempo real
6. T16/T17: perfil e carteiras
7. T08: autenticação e proteção de rotas (já tem domínio/handlers; falta integrar nas rotas)
8. T09: catálogo (já tem domínio/handlers; falta integrar nas rotas)
9. T18-T22: fora do escopo, consolidação, Lighthouse, docs, vercel

## 9. Bloqueios

- Nenhum bloqueio técnico no momento.
- Pendência do usuário (conforme HANDOFF): assets originais do Figma (atualmente ausentes); autorização para deploy público (obrigatório pelo desafio, mas o usuário não solicitou ainda).

## 10. Convenções a seguir

- Commits locais progressivos, Conventional Commits, na branch `main`.
- Não comitar os 3 docs untracked (`DESAFIO.md`, `HANDOFF ANTIGRAVITY.md`, `PLANOIMPLEMENTAÇÃO.MD`).
- Cada tarefa: typecheck + lint limpos + testes da tarefa verdes + commit.
- Não reescrever histórico existente.
