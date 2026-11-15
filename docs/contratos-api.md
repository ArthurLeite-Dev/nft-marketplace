# Documentação de Contratos REST e Eventos em Tempo Real

Versão: 1.0.0  
Base URL: `/api/v1`  
Protocolos: REST (JSON) + Socket.IO (WebSocket)

## 1. Padrões Globais

### Headers HTTP
- `Authorization: Bearer <token>`: enviado para rotas autenticadas.
- `X-Cart-Id: <uuid>`: identifica o carrinho da sessão de visitante.
- `Idempotency-Key: <uuid>`: chave obrigatória na criação de pedidos para garantir idempotência.

### Formato de Erro Padronizado
Todas as respostas de erro HTTP (4xx e 5xx) utilizam o envelope padrão:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mensagem legível e descritiva do erro",
    "fields": {
      "campo": "Mensagem específica do campo"
    },
    "details": {
      "available": 2
    },
    "retryable": false
  }
}
```

### Códigos de Erro da Aplicação
| Código | HTTP Status | Descrição | Retryable |
|---|---|---|---|
| `VALIDATION_ERROR` | 422 | Erro na validação de campos do formulário | Não |
| `UNAUTHENTICATED` | 401 | Credenciais ausentes ou inválidas | Não |
| `SESSION_EXPIRED` | 401 | Sessão expirada por inatividade/tempo limite | Não |
| `FORBIDDEN` | 403 | Permissão insuficiente para o recurso | Não |
| `NOT_FOUND` | 404 | Recurso solicitado não foi encontrado | Não |
| `AVAILABILITY_CONFLICT` | 409 | Estoque ou edição indisponível na quantidade desejada | Não |
| `IDEMPOTENCY_KEY_REUSED`| 409 | Reutilização da mesma chave com corpo/parâmetros divergentes | Não |
| `QUOTE_EXPIRED` | 410 | A cotação expirou (> 2 min) | Não |
| `QUOTE_CHANGED` | 409 | Preço ou disponibilidade mudou entre cotação e pagamento | Não |
| `COUPON_INVALID` | 422 | Código de cupom inexistente | Não |
| `COUPON_EXPIRED` | 422 | Código de cupom com validade expirada | Não |
| `ADDRESS_IN_USE` | 409 | Endereço de carteira já utilizado em outro slot | Não |
| `EMAIL_TAKEN` | 409 | E-mail já cadastrado | Não |
| `USERNAME_TAKEN` | 409 | Nome de usuário já cadastrado | Não |
| `INVALID_RESPONSE` | 200/N/A | Falha na validação do schema da resposta | Não |
| `TIMEOUT` | 0/408 | Tempo limite de rede atingido | Sim |
| `NETWORK_ERROR` | 0 | Falha de conectividade / offline | Sim |
| `SERVER_ERROR` | 503 | Falha temporária do serviço | Sim |

---

## 2. Endpoints de Autenticação e Sessão

### `POST /auth/register`
Cadastro de novo colecionador.
- **Body**: `{ username, email, password }`
- **Response (201)**: `{ token, expiresAt, user: { id, username, email } }`

### `POST /auth/login`
Autenticação de colecionador.
- **Body**: `{ email, password }`
- **Response (200)**: `{ token, expiresAt, user: { id, username, email } }`

### `POST /auth/logout`
Encerramento de sessão.
- **Response (200)**: `{ success: true }`

### `GET /auth/session`
Consulta do status da sessão ativa.
- **Response (200)**: `{ authenticated: boolean, user: UserSummary | null }`

---

## 3. Endpoints de NFTs e Catálogo

### `GET /nfts`
Listagem paginada com busca, filtros e ordenação.
- **Query Params**: `q`, `collections`, `networks`, `minPrice`, `maxPrice`, `tab`, `sort`, `page`, `pageSize`
- **Response (200)**: `{ items: NftSummary[], pagination: {...}, facets: { collections, networks, priceRange } }`

### `GET /nfts/highlights`
Destaques para o carrossel da home.
- **Response (200)**: `{ highlights: NftSummary[], featured: NftSummary }`

### `GET /nfts/:id`
Detalhe completo de um NFT com galeria e edições.
- **Response (200)**: `NftDetail`

### `GET /nfts/:id/related`
NFTs recomendados da mesma coleção.
- **Response (200)**: `{ items: NftSummary[] }`

---

## 4. Endpoints de Favoritos

### `GET /me/favorites`
Favoritos do usuário autenticado.
- **Response (200)**: `{ items: NftSummary[], nftIds: string[], updatedAt: string }`

### `PUT /me/favorites/:nftId`
Adiciona NFT aos favoritos (idempotente).
- **Response (200)**: `{ success: true, nftId: string }`

### `DELETE /me/favorites/:nftId`
Remove NFT dos favoritos (idempotente).
- **Response (200)**: `{ success: true, nftId: string }`

---

## 5. Endpoints de Carrinho

### `GET /cart`
Consulta o carrinho atual (do usuário ou do visitante).
- **Response (200)**: `CartResponse { version, lines, coupon, network, totals }`

### `POST /cart/items`
Adiciona item ao carrinho.
- **Body**: `{ nftId, editionId, quantity }`
- **Response (200)**: `CartResponse`

### `PATCH /cart/items/:lineId`
Altera quantidade ou aceita alteração de preço.
- **Body**: `{ quantity?: number, acceptPrice?: boolean }`
- **Response (200)**: `CartResponse`

### `DELETE /cart/items/:lineId`
Remove item do carrinho.
- **Response (200)**: `CartResponse`

### `PUT /cart/coupon`
Aplica cupom de desconto.
- **Body**: `{ code: string }`
- **Response (200)**: `CartResponse`

### `DELETE /cart/coupon`
Remove cupom aplicado.
- **Response (200)**: `CartResponse`

### `POST /cart/merge`
Mescla itens do carrinho de visitante ao carrinho do usuário autenticado no momento do login.
- **Header**: `X-Cart-Id`
- **Response (200)**: `MergeCartResponse { cart: CartResponse, adjustments: [...] }`

---

## 6. Endpoints de Cotação e Checkout

### `POST /checkout/quote`
Gera cotação oficial e imutável para a compra com validade de 2 minutos.
- **Body**: `{ network, cartVersion }`
- **Response (200)**: `QuoteResponse { quoteId, lines, couponCode, totals, expiresAt }`

### `POST /wallet-connections`
Simula conexão com carteira digital do usuário.
- **Body**: `{ address, provider, network }`
- **Response (200)**: `WalletConnectionResponse { connectionId, address, provider, network, connectedAt, expiresAt }`

---

## 7. Endpoints de Pedidos

### `POST /orders`
Criação idempotente de pedido.
- **Header obrigatório**: `Idempotency-Key: <uuid>`
- **Body**: `{ quoteId, walletConnectionId, collectorProfile }`
- **Response (201 ou 200)**: `OrderResponse { id, status: 'pending', ... }`

### `GET /orders/:id`
Consulta o status e o recibo de um pedido.
- **Response (200)**: `OrderResponse`

### `GET /me/orders`
Consulta os pedidos do usuário autenticado (filtro opcional `?status=pending`).
- **Response (200)**: `{ items: OrderResponse[] }`

---

## 8. Endpoints de Conta e Perfil

### `GET /me/profile` | `PATCH /me/profile`
Consulta e atualização de dados do perfil.

### `PUT /me/avatar` | `DELETE /me/avatar`
Upload multipart/form-data do avatar recortado (WebP) ou remoção.

### `POST /me/password`
Alteração de senha com validação da senha atual.

### `GET /me/wallets`
Consulta das carteiras cadastradas nos slots `principal` e `secundaria`.

### `PUT /me/wallets/:slot`
Cadastro ou atualização de carteira por slot.

---

## 9. Eventos em Tempo Real (Socket.IO)

Envelope padrão de eventos:
```json
{
  "eventId": "nft:nft_01:2",
  "type": "nft.updated",
  "version": 2,
  "occurredAt": "2026-11-14T10:00:00.000Z",
  "resource": {
    "type": "nft",
    "id": "nft_01"
  },
  "data": { ... }
}
```

### Eventos Suportados
1. `nft.updated` (Broadcast): emitido quando preço ou estoque de uma edição é alterado.
2. `order.updated` (Privado por usuário): emitido quando a liquidação da compra muda o status de `pending` para `confirmed` ou `refused`.
3. `wallet.disconnected` (Privado por usuário): emitido quando a carteira simulada sofre desconexão.
