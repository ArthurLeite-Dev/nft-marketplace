# Jungle Gaming — NFT Marketplace

Marketplace de NFTs (descoberta, compra e conta do colecionador) feito com a stack do desafio:
React 19, TypeScript, Vite, TanStack Router, TanStack Query, Axios, Socket.IO, Tailwind CSS,
shadcn/ui, MSW, Playwright e Lighthouse. Toda a "API" e o tempo real são **simulados na camada de
rede com MSW**; não há backend, blockchain, extensão de carteira nem gateway de pagamento reais.

> **Estado da validação.** Este projeto passou por uma curadoria técnica (ver `CURADORIA_TECNICA.md`,
> `MATRIZ_CONFORMIDADE.md` e `PENDENCIAS_FINAIS.md`). O servidor simulado, os contratos, a lógica de
> eventos em tempo real e a chave de idempotência foram **executados** em testes unitários
> (`npm run test:unit`). A interface, o transporte MSW/Socket.IO no navegador, os testes E2E e o
> Lighthouse **ainda precisam ser executados na sua máquina** (a curadoria rodou sem rede e sem
> `npm install`). Rode a sequência de "Verificação" abaixo antes de entregar.

## Setup

Requisitos: Node.js ≥ 22.19 e npm.

```bash
npm ci                    # instala exatamente o que está no package-lock.json
npx playwright install chromium   # navegador dos testes E2E / Lighthouse
npm run dev               # http://localhost:5173 com mocks ativados
```

### Variáveis de ambiente (`.env` / `.env.example`)

| Variável | Valor padrão | Função |
|---|---|---|
| `VITE_API_MOCKING` | `enabled` | Liga o MSW (REST + Socket.IO simulado). Deixe `enabled` também no build de demonstração/deploy. |
| `VITE_API_URL` | `/api/v1` | Base das chamadas REST (interceptadas pelo MSW). |
| `VITE_SOCKET_URL` | `wss://realtime.jungle.test` | Host Socket.IO. No ambiente de mocks é um host fictício interceptado pelo MSW; nenhum tráfego real é feito. Valores relativos (`/`) caem no host simulado. |

`public/mockServiceWorker.js` precisa ser a versão do MSW instalado. Se atualizar o MSW: `npx msw init public --save`.

## Credenciais fictícias

| Usuário | E-mail | Senha | Observação |
|---|---|---|---|
| Ana | `ana@jungle.test` | `Colecao@2026` | 2 favoritos e 2 carteiras cadastradas (principal e secundária) |
| Bruno | `bruno@jungle.test` | `Galeria@2026` | sem favoritos |

Cupons: `JUNGLE10` (10 %, válido), `EARLY25` (expirado), qualquer outro código é inválido.
Senhas ficam como `sha256(salt + senha)` no banco simulado (nunca em claro).

## Cenários e reset

O servidor simulado tem cenários determinísticos. Escolha um de três formas:

1. Na URL: `http://localhost:5173/?scenario=slow` (o cenário é **persistido** em `localStorage`; `?scenario=default` volta ao normal);
2. No console do navegador: `__mock.setScenario('payment-refused')`;
3. Nos testes: `window.__mock` (veja `tests/e2e/helpers.ts`).

| Cenário | Efeito |
|---|---|
| `default` | Tudo funciona; latência 120–400 ms |
| `empty` | Listagens vazias |
| `slow` | Latência 1,5–3 s (skeletons) |
| `out-of-order` | Latência variável 50–2500 ms (respostas fora de ordem) |
| `offline` | Falha de conexão (erro de rede) em tudo |
| `server-error` | HTTP 503 em tudo |
| `flaky` | Cada requisição falha 3× (503) e funciona na 4ª |
| `forbidden` | Rotas autenticadas respondem 403 |
| `session-expired` | Sessões abertas antes da ativação respondem 401 `SESSION_EXPIRED` |
| `coupon-expired` | Todo cupom é recusado como expirado |
| `price-changed` | Na 2ª cotação o preço do 1º item do carrinho sobe (e emite `nft.updated`) |
| `sold-out` | Na 2ª cotação a edição do 1º item esgota (e emite `nft.updated`) |
| `wallet-rejected` | A 1ª conexão de carteira é recusada |
| `order-timeout` | O pedido é criado, mas a 1ª resposta se perde; reenviar com a mesma chave recupera o mesmo pedido |
| `payment-refused` | Pedidos são liquidados como recusados |
| `duplicate-events` | Cada evento Socket.IO é reenviado e uma versão anterior chega depois |

**Reset:** `__mock.reset()` (ou apagar o `localStorage` do site) restaura integralmente o cenário
conhecido das fixtures (banco, relógio simulado, cenário e contadores). Os dados persistem entre
refreshes (`localStorage`), por isso sessão e carrinho sobrevivem ao reload.

Controles de teste em `window.__mock`: `setScenario`, `reset`, `advanceClock(ms)` (liquida pedidos
vencidos), `updateNft(nftId, { priceEth | editions })` (muda REST **e** emite `nft.updated`),
`disconnectWallet()` (emite `wallet.disconnected`), `setRealtimeOnline(false|true)` (derruba/restaura
o servidor Socket.IO simulado), `snapshot()`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento com mocks |
| `npm run build` / `npm run preview` | Build otimizado e servidor de preview (`localhost:4173`) — mocks incluídos |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` / `npm run format:check` | oxlint / prettier |
| `npm run test:unit` | Testes unitários (contratos, servidor simulado, eventos, idempotência) |
| `npm run test:e2e` | E2E em Chromium, viewports desktop e mobile (sobe build + preview sozinho) |
| `npm run test:visual` | Regressão visual (início, detalhe, carrinho, pagamento) |
| `npm run test:visual:update` | Gera/atualiza os baselines (**ainda não existem; gere e versione**) |
| `npm run lighthouse` | Auditoria Lighthouse (início e detalhe; mobile e desktop; 3 medições; mediana). Requer `npm run build && npm run preview -- --port 4176` em outro terminal. Relatórios em `lighthouse/report/` |
| `npx playwright show-report` | Relatório HTML dos testes (traces das falhas ficam em `test-results/`) |

### Verificação antes de entregar

```bash
npm ci && npm run typecheck && npm run lint
npm run test:unit
npm run build
npm run test:e2e
npm run test:visual:update    # 1ª vez: gera baselines; commite tests/e2e/visual.spec.ts-snapshots/
npm run test:visual
npm run lighthouse            # com o preview na porta 4176
```

## Reproduzir os fluxos de falha

- **Timeout após criar o pedido:** `?scenario=order-timeout` → finalize a compra → aparece "Não recebemos a confirmação…" → "Tentar novamente" recupera o **mesmo** pedido (mesma `Idempotency-Key`).
- **Pagamento recusado:** `?scenario=payment-refused` → ao liquidar (≈3 s, ou `__mock.advanceClock(3500)`) a tela mostra "Pagamento recusado" e o carrinho permanece.
- **Preço/disponibilidade mudando no checkout:** `?scenario=price-changed` (ou `__mock.updateNft('nft_07', { priceEth: '0.95' })` com o checkout aberto) → a cotação é invalidada e é preciso aceitar os novos valores e confirmar de novo.
- **Sessão expirada:** `__mock.setScenario('session-expired')` com usuário logado → próxima navegação privada vai a `/entrar?redirect=…` com aviso.
- **Queda do tempo real:** `__mock.setRealtimeOnline(false)` → altere dados (`updateNft`) → `__mock.setRealtimeOnline(true)`: o app reconecta e reconcilia com o REST.
- **Eventos duplicados/antigos:** `?scenario=duplicate-events`.
- **Rede:** `slow`, `out-of-order`, `offline`, `server-error`, `flaky`.

## Documentação

- `ARCHITECTURE.md` — arquitetura, sessão, carrinho, cache, reconciliação REST × Socket.IO, decisões de UX, limitações e desvios.
- `docs/contratos-api.md` — contratos REST e eventos Socket.IO.
- `CURADORIA_TECNICA.md`, `MATRIZ_CONFORMIDADE.md`, `ARQUIVOS_REMOVIDOS.md`, `PENDENCIAS_FINAIS.md` — resultado da auditoria.
- `DESAFIO.md` — enunciado oficial (arquivo local, ignorado pelo Git).

## Deploy (Vercel)

`vercel.json` já reescreve todas as rotas para `/index.html` (acesso direto e refresh funcionam).
Build: `npm run build`; saída: `dist/`. Mantenha `VITE_API_MOCKING=enabled` nas variáveis do projeto
para que mocks e tempo real funcionem na URL pública. **O deploy não foi feito nesta curadoria.**
