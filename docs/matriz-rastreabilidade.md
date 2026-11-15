# Matriz de Rastreabilidade de Requisitos — NFT Marketplace

Data de atualização: 14/11/2026  
Status geral: Em desenvolvimento

## 1. Requisitos Técnicos e de Integração

| ID | Requisito | Tarefa | Implementado | Testado | Evidência / Arquivos |
|---|---|---|---|---|---|
| TEC-01 | Stack obrigatória utilizada de forma efetiva | T01-T15 | Em progresso | Parcial | `package.json`, Vite, React, TS, TanStack, Tailwind, MSW |
| TEC-02 | Contratos tipados entre transporte, estado e interface | T03 | Pendente | Pendente | `src/api/contracts/*`, `src/api/client.ts` |
| TEC-03 | Estados: carregamento, vazio, erro, sucesso, segundo plano | T04, T09 | Pendente | Pendente | `src/components/common/status-message.tsx`, skeletons |
| TEC-04 | Invalidação coerente após mutations e eventos | T12, T15 | Pendente | Pendente | `src/app/realtime.ts`, hooks de feature |
| TEC-05 | Descarte de respostas obsoletas (AbortSignal, version) | T09, T12 | Pendente | Pendente | Axios signal, version checks |
| TEC-06 | Isolamento de dados por usuário e parâmetros | T08 | Pendente | Pendente | Query keys com userId, sessionStorage |
| TEC-07 | Recuperação de falhas sem duplicar operações | T13 | Pendente | Pendente | Idempotência em checkout |
| TEC-08 | Tratamento de 404 e acesso direto / refresh de rota | T04, T22 | Pendente | Pendente | TanStack Router notFound, `vercel.json` |
| TEC-09 | Atualização otimista com rollback em falha | T11, T12 | Pendente | Pendente | Favoritos e quantidade do carrinho |
| TEC-10 | Documentação de cache, retries e sincronização | T21 | Pendente | Pendente | `ARCHITECTURE.md` |
| TEC-11 | Documentação de contratos REST e erros padronizados | T03, T21 | Pendente | Pendente | `docs/contratos-api.md` |
| TEC-12 | Idempotência na mutação de pedidos (hash estável) | T06, T13 | Pendente | Pendente | `mocks/domain/checkout.ts`, `Idempotency-Key` |

## 2. Requisitos Funcionais

| ID | Requisito | Tarefa | Implementado | Testado | Evidência / Arquivos |
|---|---|---|---|---|---|
| RF-01 | Início: destaques, catálogo, busca, filtros, ordenação | T09 | Pendente | Pendente | `src/routes/index.tsx`, catálogo |
| RF-02 | Estado na URL sobrevive a refresh e histórico | T09 | Pendente | Pendente | TanStack Router `validateSearch` |
| RF-03 | Filtros combináveis com reinício de página | T09 | Pendente | Pendente | `useCatalogSearch` |
| RF-04 | Consultas refletem parâmetros; vazio, falha, fora de ordem | T09 | Pendente | Pendente | Cenários determinísticos |
| RF-05 | Detalhe: galeria, informações, edição, quantidade, favoritos, compra | T10 | Pendente | Pendente | `src/routes/nft.$nftId.tsx` |
| RF-06 | Detalhe: acesso direto, 404, edição esgotada, limites | T10 | Pendente | Pendente | Tratamento de borda |
| RF-07 | Favoritos persistentes por usuário autenticado | T11 | Pendente | Pendente | `src/features/favorites` |
| RF-08 | Carrinho: adicionar, alterar, remover com limite de edição | T12 | Pendente | Pendente | `src/features/cart` |
| RF-09 | Carrinho persiste pós-refresh; merge de visitante no login | T12 | Pendente | Pendente | `guest-cart.ts`, `/cart/merge` |
| RF-10 | Cupom: aplicar, remover, inválido e expirado | T12 | Pendente | Pendente | Handlers de cupom |
| RF-11 | Resumo de valores calculado pelo servidor simulado | T12 | Pendente | Pendente | Totais em wei via API |
| RF-12 | Carrinho aberto reage a mudanças de preço e estoque em tempo real | T12, T15 | Pendente | Pendente | Evento `nft.updated` |
| RF-13 | ETH como string decimal, cálculos em bigint wei | T02 | Pendente | Pendente | `src/lib/eth.ts` |
| RF-14 | Pagamento: validação do layout e revisão antes do envio | T13 | Pendente | Pendente | Formulário RHF + diálogo de revisão |
| RF-15 | Seleção de carteira, rede, conexão, recusa e desconexão | T13 | Pendente | Pendente | Simulação de provedores |
| RF-16 | Revalidação de preço/taxas antes de confirmar; nova confirmação | T13 | Pendente | Pendente | Re-quote na confirmação |
| RF-17 | Prevenção de duplicidade em cliques repetidos ou timeout | T13 | Pendente | Pendente | Desabilitação + idempotency key |
| RF-18 | Estados do pedido: pendente, confirmado, recusado | T14 | Pendente | Pendente | `src/routes/pedidos.$orderId.tsx` |
| RF-19 | Confirmação exibida SOMENTE para pedido confirmado na simulação | T14 | Pendente | Pendente | Validação de estado terminal |
| RF-20 | Falha preserva itens; confirmação remove itens comprados | T14 | Pendente | Pendente | Liquidação de carrinho |
| RF-21 | Recibo é snapshot imutável do momento da compra | T14 | Pendente | Pendente | Snapshot em mock store |
| RF-22 | Conteúdo da confirmação: hash, itens, taxas, total | T14 | Pendente | Pendente | Tela de recibo |
| RF-23 | Cadastro, login, logout, sessão; rotas privadas protegidas | T08 | Pendente | Pendente | `beforeLoad` guards |
| RF-24 | Sessão recuperável após refresh | T08 | Pendente | Pendente | `session-store.ts` |
| RF-25 | Expiração durante navegação e checkout preservando contexto | T08, T13 | Pendente | Pendente | Redirect seguro com retorno |
| RF-26 | Limpeza de cache privado e subscriptions no logout/troca | T08, T15 | Pendente | Pendente | `removeQueries(['me'])` |
| RF-27 | Login com validação e retorno ao fluxo anterior | T08 | Pendente | Pendente | `redirect` interno validado |
| RF-28 | Cadastro com validação e tratamento de conflito (409) | T08 | Pendente | Pendente | Feedback em campos |
| RF-29 | Perfil: edição de dados, avatar e alteração de senha | T16 | Pendente | Pendente | `/conta/perfil` |
| RF-30 | Carteiras: principal e secundária | T17 | Pendente | Pendente | `/conta/carteiras` |
| RF-31 | Validação de formulários e persistência confirmada | T08, T16, T17 | Pendente | Pendente | Schemas Zod + RHF |
| RF-32 | Credenciais fictícias; senhas em hash (sem texto claro) | T05, T21 | Pendente | Pendente | SHA-256 + salt Web Crypto |
| RF-33 | Layouts responsivos desktop e mobile (390, 768, 1440 px) | T04-T18 | Pendente | Pendente | Media queries e tailwind |
| RF-34 | Ações fora do escopo indicam "indisponível" sem simular sucesso | T18 | Pendente | Pendente | `notifyUnavailable` |

## 3. Mocking e Tempo Real

| ID | Requisito | Tarefa | Implementado | Testado | Evidência / Arquivos |
|---|---|---|---|---|---|
| MOC-01 | MSW na camada de rede; sem dados fictícios fora de `mocks/` | T05 | Pendente | Pendente | `src/mocks/` |
| MOC-02 | Banco único persistente em localStorage com reset integral | T05 | Pendente | Pendente | `src/mocks/db/store.ts` |
| MOC-03 | Simulação de lentidão, offline, 503, flaky com semente determinística | T05 | Pendente | Pendente | `src/mocks/scenarios.ts` |
| MOC-04 | Fixtures variadas (>= 30 NFTs, 2 usuários, 16 cenários) | T05, T06 | Pendente | Pendente | `src/mocks/fixtures/` |
| MOC-05 | Socket.IO simulado via MSW (`@mswjs/socket.io-binding`) | T07 | Pendente | Pendente | `src/mocks/realtime.ts` |
| MOC-06 | Mocks ativados por config e disponíveis em build demo | T05 | Sim (scaffold) | Pendente | `VITE_API_MOCKING=enabled` |
| RT-01 | Evento `nft.updated` atualiza catálogo, detalhe e carrinho | T15 | Pendente | Pendente | `app/realtime.ts` |
| RT-02 | Evento `order.updated` atualiza pedido sem polling desnecessário | T15 | Pendente | Pendente | `app/realtime.ts` |
| RT-03 | Ledger de eventos para tolerar duplicatas e versões antigas | T15 | Pendente | Pendente | `app/event-ledger.ts` |
| RT-04 | Reconciliação pós-reconexão e isolamento de eventos entre usuários | T15 | Pendente | Pendente | Token em CONNECT packet |
| RT-05 | Mudança de preço no carrinho bloqueia checkout com cotação velha | T13, T15 | Pendente | Pendente | Cotação com validação estrita |
| RT-06 | Recuperação de pedido pendente sem conexão ou após refresh | T14, T15 | Pendente | Pendente | Polling fallback 1.5s |

## 4. Interface, Acessibilidade, Testes e Performance

| ID | Requisito | Tarefa | Implementado | Testado | Evidência / Arquivos |
|---|---|---|---|---|---|
| UI-01 | Fidelidade ao design e tema escuro com tokens | T04 | Em progresso | Pendente | `src/index.css` |
| UI-02 | Responsividade em 390px, 768px e 1440px | T19 | Em progresso | Pendente | Playwright viewports |
| UI-03 | Skeletons com shimmer sem CLS; prefers-reduced-motion | T04 | Em progresso | Pendente | Shimmer utility |
| UI-04 | Assets locais e fontes acessíveis sem dependência de internet | T01, T20 | Sim | Pendente | `@fontsource-variable/roboto-mono` |
| A11Y-01 | Navegação por teclado e foco visível | T04, T19 | Em progresso | Pendente | `:focus-visible` |
| A11Y-02 | Controle de foco em diálogos e gavetas | T04, T19 | Pendente | Pendente | Radix dialog / sheet |
| A11Y-03 | Semântica, labels, aria-describedby para erros | T08, T13 | Pendente | Pendente | `form-field.tsx` |
| A11Y-04 | Alt text descritivo em imagens | T09, T10 | Pendente | Pendente | `artwork.alt` |
| A11Y-05 | Contraste legível sem depender apenas de cor | T04, T19 | Pendente | Pendente | Verificação axe |
| A11Y-06 | Feedback acessível em live region e toasts | T04 | Pendente | Pendente | `live-region.tsx`, sonner |
| A11Y-07 | Ausência de overflow horizontal e quebra em zoom | T19 | Pendente | Pendente | `responsive.spec.ts` |
| TST-01 | 12 grupos de testes E2E do README | T19 | Pendente | Pendente | `tests/e2e/*.spec.ts` |
| TST-02 | Testes em viewports desktop e mobile + regressão visual | T19 | Pendente | Pendente | Baselines snapshots |
| TST-03 | Estado isolado com fixture de reset e controle de relógio/latência | T05, T19 | Pendente | Pendente | `tests/fixtures/mock.ts` |
| TST-04 | Verificações observam a UI; sem stubs de rede | T19 | Pendente | Pendente | Testes ponta a ponta |
| PER-01 | Lighthouse mobile e desktop (Perf>=90, A11y>=95, BP>=95, SEO>=90) | T20 | Pendente | Pendente | `lighthouse/RESULTADOS.md` |
| PER-02 | Mediana de 3 medições com relatórios HTML/JSON | T20 | Pendente | Pendente | `scripts/lighthouse.mjs` |
| PER-03 | Métricas LCP, CLS, TBT reportadas com análise de causas | T20 | Pendente | Pendente | Relatórios versionados |
| ENT-01 | Código-fonte, lockfile, mocks, testes entregues | T01-T22 | Em progresso | Pendente | Repositório |
| ENT-02 | Deploy publicado e acessível com mocks e tempo real | T22 | Pendente | Pendente | Vercel / Netlify (após aprovação) |
| ENT-03 | README completo com setup, credenciais, cenários e comandos | T21 | Pendente | Pendente | `README.md` |
| ENT-04 | ARCHITECTURE.md com decisões, cache, contratos e tempo real | T21 | Pendente | Pendente | `ARCHITECTURE.md` |
| ENT-05 | Comandos padronizados de execução, verificação e teste | T01 | Sim | Sim | `package.json` |
| ENT-06 | Execução garantida a partir de checkout limpo | T22 | Em progresso | Pendente | Instruções reproduzíveis |
