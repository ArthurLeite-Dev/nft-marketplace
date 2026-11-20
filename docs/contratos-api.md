# Contratos REST e eventos

Base: `/api/v1`. Todas as respostas são validadas no cliente com Zod (`src/api/contracts/*`).
Erros: `{ "error": { "code", "message", "fields?", "details?", "retryable?" } }`.
Autenticação: `Authorization: Bearer <token>`. Carrinho de visitante: `X-Cart-Id`. Pedido: `Idempotency-Key`.

## Erros

| Status | `code` | Quando |
|---|---|---|
| 401 | `UNAUTHENTICATED` / `SESSION_EXPIRED` / `INVALID_CREDENTIALS` | sem sessão / sessão inválida ou expirada / login errado |
| 403 | `FORBIDDEN` | sem permissão |
| 404 | `NOT_FOUND` | recurso inexistente (inclui pedido de outro usuário) |
| 409 | `AVAILABILITY_CONFLICT`, `QUOTE_CHANGED`, `IDEMPOTENCY_KEY_REUSED`, `EMAIL_TAKEN`, `USERNAME_TAKEN`, `WALLET_REJECTED`, `WALLET_DISCONNECTED`, `ADDRESS_IN_USE`, `CONFLICT` | conflitos |
| 410 | `QUOTE_EXPIRED` | cotação vencida |
| 422 | `VALIDATION_ERROR` (com `fields`), `COUPON_INVALID`, `COUPON_EXPIRED`, `INVALID_CURRENT_PASSWORD` | validação |
| 503 | `SERVER_ERROR` (`retryable: true`) | falha transitória |

## Recursos

| Recurso | Operações |
|---|---|
| Sessão e conta | `POST /auth/register` (201, já autentica) · `POST /auth/login` · `GET /auth/session` · `POST /auth/logout` |
| NFTs | `GET /nfts?q&collections&networks&minPrice&maxPrice&tab&sort&page` · `GET /nfts/highlights` · `GET /nfts/:id` · `GET /nfts/:id/related` (`version` monotônica no item) |
| Favoritos | `GET /me/favorites` → `{items, nftIds, updatedAt}` · `PUT/DELETE /me/favorites/:nftId` |
| Carrinho | `GET /cart` · `POST /cart/items` · `PATCH /cart/items/:lineId` (`quantity` ou `acceptPrice`) · `DELETE /cart/items/:lineId` · `PUT/DELETE /cart/coupon` · `POST /cart/merge` |
| Cotação | `POST /checkout/quote {network}` → `{quoteId, cartVersion, network, lines, couponCode, totals, expiresAt}` |
| Carteira (checkout) | `POST /wallet-connections {address, provider, network}` · `DELETE /wallet-connections/:id` |
| Pedidos | `POST /orders` (`Idempotency-Key`; `{quoteId, walletConnectionId, collector}` → `{order, created}`) · `GET /orders/:id` · `GET /me/orders?status=` |
| Perfil | `GET/PATCH /me/profile` · `PUT/DELETE /me/avatar` · `POST /me/password` |
| Carteiras (conta) | `GET /me/wallets` · `PUT /me/wallets/:principal\|secundaria` |

`totals = { subtotalEth, discountEth, networkFeeEth, totalEth }` (strings decimais). `OrderResponse.status`:
`pending | confirmed | refused`; `transactionHash` só existe em pedido confirmado; `lines/totals/collector`
são snapshot.

## Eventos Socket.IO

O **nome** do evento no socket é o `type`; o payload é o objeto completo.

```jsonc
// nft.updated (público)
{ "type":"nft.updated", "eventId":"nft:nft_07@3", "version":3, "occurredAt":"…", "resource":{"type":"nft","id":"nft_07"},
  "data":{ "nftId":"nft_07", "priceEth":"0.95", "previousPriceEth":"0.50",
           "editions":[{"id":"ed_07_2","priceEth":"0.95","available":null,"isSoldOut":false}] } }
// order.updated (só para o dono)
{ "type":"order.updated", "eventId":"order:ord_000012@2", "version":2, …, "resource":{"type":"order","id":"ord_000012"},
  "data":{ "orderId":"ord_000012", "userId":"usr_ana", "status":"confirmed", "transactionHash":"0x…", "failureReason":null, "settledAt":"…" } }
// wallet.disconnected (só para o dono)
{ "type":"wallet.disconnected", …, "data":{ "connectionId":"wc_000004", "userId":"usr_ana", "address":"0x…", "reason":"wallet" } }
```

Cliente → servidor: `session.attach { token }`. Regras do cliente: ignora malformados, duplicatas
(`eventId`), versões ≤ à já aplicada e eventos de outro usuário; reconcilia com o REST ao reconectar.
