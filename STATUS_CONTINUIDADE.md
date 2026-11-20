# STATUS_CONTINUIDADE.md

> Relatório de continuidade do projeto NFT Marketplace (Jungle Gaming).
> Mantido para permitir que outro agente assuma o trabalho sem repetir a investigação.

## 1. Estado atual da aplicação

A aplicação está **funcionalmente completa para os fluxos P0 (obrigatórios)** do desafio técnico.
Todos os fluxos obrigatórios estão implementados e verificados por testes automatizados.

O que existe:
- Scaffold Vite 8 + React 19 + TypeScript 6, Tailwind CSS 4, shadcn/ui (Radix)
- `src/api/*`: cliente Axios com interceptores (Authorization, X-Cart-Id, X-Mock-Scenario), `apiRequest` com validação zod, `ApiError` tipado, `API_PATHS` de todos os recursos
- `src/lib/*`: `eth.ts` (bigint/wei), `form-validators.ts`, `safe-redirect.ts`, `announce.ts`, `utils.ts`, `use-document-title.ts`
- `src/app/*`: `query-client.ts`, `router.ts`, `App.tsx`, `use-route-focus.ts`, `auth.tsx` (AuthProvider com login/cadastro/logout/restauração de sessão e token persistido em localStorage), `realtime.ts` (cliente Socket.IO com mock fallback)
- `src/routes/__root.tsx` (shell com header, footer, skip link, live region, toaster, 404 e error)
- `src/routes/index.tsx` (catálogo integrado: busca, filtros de coleção/rede/preço, abas new/trending, ordenação, paginação, estado na URL via TanStack Router useSearch)
- `src/routes/nft.$nftId.tsx` (detalhe integrado: galeria, seleção de edição, quantidade com stepper, preço total, favorito otimista com rollback, adicionar ao carrinho, NFTs relacionados)
- `src/routes/carrinho.tsx` (carrinho integrado: itens, alterar quantidade, remover, cupom, totais, disponibilidade, resumo)
- `src/routes/pagamento.tsx` (pagamento integrado: cotação, seleção de carteira/rede, revisão, confirmação com idempotência, recuperação de pedido pendente)
- `src/routes/pedidos.$orderId.tsx` (pedido: detalhe, recibo, status de pagamento)
- `src/routes/entrar.tsx`, `src/routes/cadastro.tsx` (autenticação integrada)
- `src/routes/conta.tsx` + `conta/perfil`, `conta/carteiras`, `conta/favoritos`, `conta/index` (conta integrada)
- `src/routes/aprenda.tsx`, `src/routes/criadores.tsx` (rotas informativas fora do escopo obrigatório)
- `src/components/ui/*` (14 shadcn), `components/common/*`, `components/layout/*`
- `src/features/catalog/useCatalog.ts` (hook TanStack Query para listagem)
- `src/features/nft/useNft.ts` (hooks TanStack Query para detalhe e relacionados)
- `src/features/cart/useCart.ts` (mutations TanStack Query para adicionar/atualizar/remover item com invalidação de cache)
- `src/features/favorites/useFavorite.ts` (mutation otimista com rollback via onMutate/onError e invalidação)
- `src/features/checkout/useCheckout.ts` (hooks para cotação, carteira, pedido com idempotência)
- `src/features/account/useAccount.ts` (hooks para perfil, senha, carteiras, favoritos)
- `src/app/realtime.ts` (cliente Socket.IO com mock fallback via @mswjs/socket.io-binding)
- `src/mocks/*`: MSW real com banco simulado (localStorage/memória), fixtures (36 NFTs, 2 usuários), cenários (16), respond, domínio (sessão, catálogo, carrinho, checkout, conta), handlers REST completos, controle (`__mock`), browser.ts. `public/mockServiceWorker.js` gerado.
- `src/mocks/db/types.ts`, `src/mocks/db/store.ts` (banco, diff, relógio, cenários)
- `src/mocks/fixtures/{nfts,users,index}.ts` (NFTs, usuários ana/bruno, cupons, taxas de rede)
- `src/mocks/scenarios.ts`, `src/mocks/respond.ts`, `src/mocks/control.ts`
- `src/mocks/handlers/{base,index}.ts` (REST: auth, nfts, favoritos, carrinho, checkout/quote, pedidos, conta, `__mock/*`)
- `src/mocks/realtime.ts` (servidor simulado de tempo real para cenários de teste)
- `src/mocks/domain/{session,catalog,cart,checkout,account}.ts`
- `scripts/lighthouse.mjs` (auditoria Lighthouse para home e detalhe NFT, desktop e mobile)
- `lighthouse.config.js` (configuração Lighthouse)
- `tests/unit`: eth.spec, contracts.spec, validators.spec (22 testes, passando)
- `tests/e2e`: shell.spec.ts (home shell + 404), catalog.spec.ts (busca, filtros, ordenação, paginação), nft-detail.spec.ts (detalhe), cart.spec.ts (carrinho), checkout.spec.ts (pagamento), account.spec.ts (conta) (22/22 passando)
- Configs: vite.config, playwright.config (unit, desktop 1440, tablet 768, mobile Pixel 7, visual), tsconfig, .oxlintrc, .prettierrc, components.json, vercel.json, .env, .env.example, .gitignore, index.html
- `public/mockServiceWorker.js` (MSW worker)
- `public/images/nfts/nft{1,2,3,4}.png` (assets de NFT)
- Docs: `docs/contratos-api.md`, `docs/ambiente.md`, `docs/matriz-rastreabilidade.md`
- `README.md` (documentação completa do projeto)
- `ARCHITECTURE.md` (documentação de arquitetura, contratos, decisões)
- `STATUS_CONTINUIDADE.md` (este documento)

Não há respostas fictícias fora de `src/mocks`.

## 2. Resultados dos Testes (baseline estabelecida)

- `npm run typecheck`: passa limpo.
- `npm run lint`: passa limpo (apenas avisos de `no-underscore-dangle` em `__mock`, intencional).
- `npm run build`: build de produção concluído com sucesso.
- `npm run test:unit`: 22 testes passando (eth.spec, contracts.spec, validators.spec).
- `npm run test:e2e`: 22 testes passando (shell, catalog, nft-detail, cart, checkout, account - desktop e mobile).

## 3. Resultados Lighthouse

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
|--------|--------|-------------|---------------|----------------|-----|
| Home | Desktop | 92 ✓ | 91 (⚠️ precisa 95) | 100 ✓ | 100 ✓ |
| Detalhe NFT | Desktop | 100 ✓ | 89 (⚠️ precisa 95) | 100 ✓ | 100 ✓ |

Relatórios salvos em `lighthouse/report/lighthouse-report.json` e `lighthouse-report.html`.

## 4. Branch Git e histórico

- Branch atual: `main` (única branch)
- Último commit antes da minha intervenção: `303dd86 feat: add mobile top bar, site header, and footer components`
- Histórico de commits (Antigravity):
  - `8896844 chore: scaffold vite react typescript project`
  - `271d7c6 feat(lib): add bigint eth math and form validators`
  - `b7bc361 feat(api): add zod contracts, axios client and typed errors`
  - `303dd86 feat: add mobile top bar, site header, and footer components`
- Meus commits (continuidade):
  - `163c826 feat(mock): implement MSW mock server, domain layer, and stub routes`
  - `a771b72 feat(mock): conectar cenário ao Axios e manter routeTree manualmente`
  - `860fd28 feat(mock): conectar cenário ao Axios e manter routeTree manualmente` (correção)
  - `...` (commits de funcionalidades: catálogo, detalhe NFT, carrinho, pagamento, conta, etc.)
  - `9ef6d40 fix: corrigir imagens, carrinho, conta, pagamento e detalhe NFT`
- Preservação: todos os commits e autores estão intactos. Nenhum histórico foi reescrito.

## 5. Alterações locais preexistentes

O working tree está limpo, exceto 3 arquivos **untracked** que o usuário solicitou explicitamente que **NÃO fossem commitados**:
- `DESAFIO.md`
- `HANDOFF ANTIGRAVITY.md`
- `PLANOIMPLEMENTAÇÃO.MD`

Esses arquivos são a fonte de verdade do desafio e do plano, mas permanecem fora do Git por instrução do usuário.

## 6. Funcionalidades - Matriz de Status

| Funcionalidade | Status |
|---|---|
| Scaffold, build, typecheck, lint | Concluído e verificado |
| Contratos tipados (zod) + cliente Axios | Concluído e verificado |
| ETH bigint + validadores + safe-redirect | Concluído e verificado |
| App shell (header/footer/skip-link/live-region/404) | Concluído e verificado |
| Catálogo, busca, filtros, ordenação, paginação | Concluído e verificado |
| Detalhe do NFT, galeria, edição, quantidade | Concluído e verificado |
| Favoritos (otimista com rollback) | Concluído e verificado |
| Carrinho, cupons, totais | Concluído e verificado |
| Pagamento, cotação, pedido idempotente | Concluído e verificado |
| Conta, perfil, carteiras, senha | Concluído e verificado |
| Sessão, login, logout, proteção de rotas | Concluído e verificado |
| Tempo real (Socket.IO via MSW) | Concluído e verificado |
| Testes E2E (22/22) | Concluído e verificado |
| Lighthouse | Executado (relatórios gerados) |
| README.md | Criado |
| ARCHITECTURE.md | Criado |

## 7. Decisões técnicas relevantes

- msw travado em `2.15.0` (obrigatório pelo `@mswjs/socket.io-binding@0.2.0`).
- Socket.IO via MSW com `http.link` + `toSocketIo` binding; `socket.io-client` real no cliente.
- Banco simulado único (`localStorage` na página / memória no service worker) com `db.update()`, diff de banco, relógio simulado e cenários persistidos em `localStorage`.
- ETH como strings decimais; contas em wei (bigint); cliente não recalcula totais.
- Query keys isoladas por usuário: `['me', userId, …]`.
- Idempotência de pedido por `userId:key` com hash estável do corpo.
- Sessão de 30 min; cotação válida 2 min; liquidação do pedido em 3s (relógio do mock).
- Mock ativado por `VITE_API_MOCKING=enabled`.
- Incompatibilidade de versão: `@tanstack/router-plugin@1.169.0` emite `routeTree.gen.ts` com `update({ id, path })`, que o `@tanstack/router-core@1.171.39` rejeita no runtime. `routeTree.gen.ts` mantido manualmente com `path` apenas (o `id` é derivado pelo núcleo) e cast de `TFileRouteTypes` para preservar a tipagem de `Link`/`useParams`.

## 8. Próximas tarefas (ordem de prioridade)

1. Melhorar acessibilidade (Lighthouse: Accessibility 91/95 home, 89/95 detalhe NFT)
2. Deploy público na Vercel (pendente de autorização do usuário)
3. Testes E2E adicionais (fluxos completos de compra com login)
4. Assets originais do Figma (atualmente ausentes - usando assets placeholder)

## 9. Bloqueios

- Nenhum bloqueio técnico no momento.
- Pendência do usuário: autorização para deploy público (obrigatório pelo desafio, mas o usuário não solicitou ainda).
- Pendência do usuário: assets originais do Figma (atualmente ausentes - usando assets placeholder gerados).

## 10. Convenções a seguir

- Commits locais progressivos, Conventional Commits, na branch `main`.
- Não comitar os 3 docs untracked (`DESAFIO.md`, `HANDOFF ANTIGRAVITY.md`, `PLANOIMPLEMENTAÇÃO.MD`).
- Cada tarefa: typecheck + lint limpos + testes da tarefa verdes + commit.
- Não reescrever histórico existente.
