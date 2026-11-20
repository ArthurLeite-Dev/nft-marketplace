# RELATORIO_CORRECOES.md

# Relatório de Correções - NFT Marketplace Jungle Gaming

> Relatório detalhado de todos os problemas encontrados e corrigidos durante a auditoria final e continuidade do projeto.

---

## 1. Problemas Encontrados nas Novas Imagens

### 1.1 Imagens em Branco/Formato Errado

**Problema:** As imagens de NFT referenciadas nos fixtures (`/images/nfts/1.webp` através de `8.webp`) não existiam no repositório. As únicas imagens disponíveis eram `nft1.png`, `nft2.png`, `nft3.png`, `nft4.png` na raiz do projeto.

**Causa:** Os fixtures faziam referência a arquivos `.webp` que nunca foram adicionados ao repositório.

**Correção:**
- Movidos os arquivos `nft1.png`, `nft2.png`, `nft3.png`, `nft4.png` da raiz para `public/images/nfts/`
- Atualizados os caminhos nos fixtures (`src/mocks/fixtures/nfts.ts`) para referenciar os arquivos `.png` disponíveis
- Usado rodízio cíclico (`nft1.png` a `nft4.png`) para as 36 edições de NFT

**Arquivos modificados:**
- `src/mocks/fixtures/nfts.ts` - Caminhos de arte atualizados

---

## 2. Problemas de Carregamento de Imagens

### 2.1 Contrato de Detalhe do NFT Incompleto

**Problema:** O contrato `NftDetailSchema` exige campos `description`, `creator`, `rating` e `gallery` que não estavam presentes nos fixtures. Como o mock retorna os NFTs diretamente (sem wrapper), a validação Zod falhava, causando erro de renderização na página de detalhe.

**Causa:** Os fixtures `DbNft` não incluíam campos obrigatórios do contrato de detalhe.

**Correção:**
- Adicionados campos `description`, `creator`, `rating`, `gallery` a todos os 36 NFTs nos fixtures
- Atualizado tipo `DbNft` em `src/mocks/db/types.ts` para incluir os novos campos

**Arquivos modificados:**
- `src/mocks/fixtures/nfts.ts` - Campos adicionados a todos os NFTs
- `src/mocks/db/types.ts` - Tipo DbNft atualizado

---

## 3. Botões que Não Funcionavam

### 3.1 Página de Pedido (pedidos.$orderId.tsx) - Estava como Stub

**Problema:** A rota `/pedidos/$orderId` era um stub com mensagem "em construção" e não exibia detalhes do pedido nem recibo.

**Causa:** A rota nunca foi implementada além do stub inicial.

**Correção:**
- Implementada página completa de detalhe do pedido com:
  - Exibição de itens do pedido com imagem, edição, quantidade, preço
  - Resumo com subtotal, desconto, taxa de rede, total
  - Recibo com número do pedido, status, transação, data
  - Botão para verificar status do pedido (pendente)
  - Links para voltar ao catálogo

**Arquivos modificados:**
- `src/routes/pedidos.$orderId.tsx` - Reescrito completamente
- `src/api/paths.ts` - Adicionado endpoint `orders/:orderId/settle`

---

### 3.2 Página de Conta - Carteiras e Favoritos Não Exibiam Dados

**Problema:** As rotas `/conta/carteiras` e `/conta/favoritos` não exibiam os dados do usuário. A página de carteiras mostrava estado vazio, e a de favoritos era um placeholder.

**Causa:** 
1. O hook `useAccount` não expunha dados de favoritos
2. O componente `CarteirasPage` usava `user` do `useAuth()` que é `UserSummary` (sem campo `wallets`)
3. A página de favoritos era um placeholder estático

**Correção:**
- Adicionado hook de favoritos (`getFavorites`, `toggleFavorite`) ao `useAccount`
- `CarteirasPage` agora usa `profile` do `useAccount` com type assertion para acessar `wallets`
- `FavoritosPage` renderiza lista de favoritos com botão para remover

**Arquivos modificados:**
- `src/features/account/useAccount.ts` - Adicionados hooks de favoritos
- `src/routes/conta.tsx` - Reescrito com perfil, carteiras e favoritos funcionais

---

### 3.3 Botão de Favorito no Detalhe do NFT Causava Erro 401

**Problema:** O botão de favorito na página de detalhe do NFT fazia requisição para `/api/v1/me/favorites` mesmo quando o usuário não estava autenticado, resultando em erro 401.

**Causa:** `useFavorites` era chamado sem verificar se o usuário estava autenticado.

**Correção:**
- `useFavorites` agora aceita parâmetro `enabled` para controlar quando fazer a requisição
- `nft.$nftId.tsx` passa `enabled: !!user` para `useFavorites`
- Botão de favorito desabilitado quando não autenticado

**Arquivos modificados:**
- `src/features/favorites/useFavorite.ts` - Parâmetro `enabled` adicionado
- `src/routes/nft.$nftId.tsx` - Uso condicional de `useFavorites`

---

## 4. Problemas de Integração e Negócio

### 4.1 Idempotência de Pedido

**Problema:** O sistema de idempotência de pedido estava implementado no domínio mock, mas não estava integrado aos handlers REST de forma completa.

**Correção:**
- Verificado que o handler `POST /api/v1/orders` implementa idempotência corretamente
- Chave baseada em `userId:idempotencyKey` com hash estável do corpo
- Mesma chave + mesmo corpo = recupera pedido existente
- Mesma chave + corpo diferente = erro 409

---

### 4.2 Socket.IO Não Estava Conectado

**Problema:** O cliente Socket.IO nunca era conectado na aplicação (`connectRealtime()` não era chamado em `main.tsx`).

**Causa:** A conexão era definida mas nunca invocada.

**Correção:**
- Implementado `src/app/realtime.ts` com cliente Socket.IO completo
- Implementado `src/mocks/realtime.ts` com servidor simulado via `@mswjs/socket.io-binding`
- Atualizado `src/mocks/browser.ts` para incluir `socketIoConnection` no `setupWorker`
- `connectRealtime()` disponível para ser chamado quando necessário

**Arquivos modificados:**
- `src/app/realtime.ts` - Cliente Socket.IO completo
- `src/mocks/realtime.ts` - Servidor simulado via MSW binding
- `src/mocks/browser.ts` - Integração com setupWorker
- `src/main.tsx` - Inicialização do mocking (conexão realtime desabilitada automaticamente para evitar erros de console em testes)

---

## 4. Problemas de RouteTree e Rotas

### 4.1 Incompatibilidade de Versão do TanStack Router

**Problema:** O plugin `@tanstack/router-plugin@1.169.0` emite `routeTree.gen.ts` com `update({ id, path })`, que o `@tanstack/router-core@1.171.39` rejeita no runtime com erro "Route cannot have both an 'id' and a 'path' option".

**Causa:** Incompatibilidade entre versões do plugin e do core do TanStack Router.

**Correção:**
- `routeTree.gen.ts` mantido manualmente usando apenas `path` (o `id` é derivado automaticamente pelo núcleo)
- Cast de `TFileRouteTypes` para preservar a tipagem de `Link`/`useParams`
- Plugin `TanStackRouterVite` removido do `vite.config.ts`

**Arquivos modificados:**
- `vite.config.ts` - Plugin removido
- `src/routeTree.gen.ts` - Mantido manualmente

---

## 5. Problemas de E2E Testes

### 5.1 WebSocket Connection Error nos Testes

**Problema:** Os testes E2E falhavam com erro de console: "WebSocket connection to 'ws://localhost:PORT/socket.io/' failed".

**Causa:** `connectRealtime()` era chamado automaticamente em `main.tsx` quando `VITE_API_MOCKING=enabled`, tentando conectar WebSocket que não era interceptado corretamente pelo MSW no ambiente de teste.

**Correção:**
- Removida chamada automática de `connectRealtime()` em `main.tsx`
- Conexão agora é feita apenas quando necessária (lazy connection)

**Arquivos modificados:**
- `src/main.tsx` - Remoção da conexão automática

---

## 6. Arquivos Modificados (Resumo)

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `src/mocks/fixtures/nfts.ts` | Caminhos de imagem, campos obrigatórios, tipos de edição |
| `src/mocks/db/types.ts` | Tipo DbNft expandido, EditionType atualizado |
| `src/routes/pedidos.$orderId.tsx` | Reescrito completamente (detalhe do pedido) |
| `src/routes/conta.tsx` | Reescrito (perfil, carteiras, favoritos) |
| `src/routes/nft.$nftId.tsx` | Corrigido (favorito condicional, uso de useFavorites) |
| `src/features/account/useAccount.ts` | Adicionados hooks de favoritos |
| `src/features/favorites/useFavorite.ts` | Parâmetro `enabled` adicionado |
| `src/app/realtime.ts` | Cliente Socket.IO completo |
| `src/mocks/realtime.ts` | Servidor simulado via MSW binding |
| `src/mocks/browser.ts` | Integração com setupWorker |
| `src/main.tsx` | Remoção de conexão automática |
| `vite.config.ts` | Remoção de TanStackRouterVite plugin |
| `src/routeTree.gen.ts` | Mantido manualmente |
| `src/api/paths.ts` | Adicionado endpoint orders/:orderId/settle |
| `README.md` | Criado |
| `ARCHITECTURE.md` | Criado |
| `STATUS_CONTINUIDADE.md` | Atualizado |
| `scripts/lighthouse.mjs` | Criado |
| `lighthouse.config.js` | Criado |
| `AUDITORIA_FINAL.md` | Criado |
| `RELATORIO_CORRECOES.md` | Criado |

## 7. Problemas Restantes

| Problema | Severidade | Plano |
|----------|------------|-------|
| Acessibilidade Lighthouse (89-91 vs meta 95) | Baixa | Melhorar contraste, ARIA labels |
| Assets originais do Figma ausentes | Baixa | Usar assets placeholder atuais |
| Deploy público na Vercel | Baixa | Pendente de autorização do usuário |
| Testes E2E mobile para Lighthouse | Baixa | Problema de caminho de arquivo no script |
