import { test, expect } from '@playwright/test'
import { createEventProcessor } from '../../src/realtime/event-processor'
import { patchNftDetail, patchNftList, patchOrder } from '../../src/realtime/apply-event'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '../../src/api/contracts/events'
import type { NftDetail, NftListResponse } from '../../src/api/contracts/nfts'
import type { OrderResponse } from '../../src/api/contracts/orders'

const nftEvent = (version: number, priceEth: string, overrides: Partial<NftUpdatedEvent> = {}): NftUpdatedEvent => ({
  type: 'nft.updated',
  eventId: `nft:nft_01@${version}`,
  version,
  occurredAt: '2026-11-17T10:00:00.000Z',
  resource: { type: 'nft', id: 'nft_01' },
  data: { nftId: 'nft_01', priceEth, previousPriceEth: '1.50', editions: [{ id: 'ed_01_2', priceEth, available: 4, isSoldOut: false }] },
  ...overrides,
})

const orderEvent = (userId: string, version = 2): OrderUpdatedEvent => ({
  type: 'order.updated',
  eventId: `order:ord_1@${version}`,
  version,
  occurredAt: '2026-11-17T10:00:03.000Z',
  resource: { type: 'order', id: 'ord_1' },
  data: { orderId: 'ord_1', userId, status: 'confirmed', transactionHash: '0xabc', failureReason: null, settledAt: '2026-11-17T10:00:03.000Z' },
})

test.describe('Processador de eventos em tempo real', () => {
  test('aplica o primeiro evento e ignora a duplicata (mesmo eventId) sem reaplicar efeitos', () => {
    const p = createEventProcessor()
    expect(p.process(nftEvent(1, '1.60')).apply).toBe(true)
    expect(p.process(nftEvent(1, '1.60'))).toEqual({ apply: false, reason: 'duplicate' })
  })

  test('evento antigo/fora de ordem nunca regride o estado', () => {
    const p = createEventProcessor()
    expect(p.process(nftEvent(3, '1.80')).apply).toBe(true)
    expect(p.process(nftEvent(2, '1.70'))).toEqual({ apply: false, reason: 'stale' })
    expect(p.process(nftEvent(3, '1.80', { eventId: 'outro-id-mesma-versao' }))).toEqual({ apply: false, reason: 'stale' })
    expect(p.process(nftEvent(4, '1.90')).apply).toBe(true)
  })

  test('versões são independentes por recurso', () => {
    const p = createEventProcessor()
    expect(p.process(nftEvent(5, '1.00')).apply).toBe(true)
    const other = nftEvent(1, '2.00', { eventId: 'nft:nft_02@1', resource: { type: 'nft', id: 'nft_02' } })
    expect(p.process(other).apply).toBe(true)
  })

  test('versão já conhecida via REST faz o processador ignorar eventos mais antigos', () => {
    const p = createEventProcessor()
    p.observeVersion('nft:nft_01', 7)
    expect(p.process(nftEvent(6, '1.10'))).toEqual({ apply: false, reason: 'stale' })
    expect(p.process(nftEvent(8, '1.20')).apply).toBe(true)
  })

  test('evento privado de outro usuário é descartado; do próprio usuário é aplicado', () => {
    const p = createEventProcessor()
    p.setUser('usr_ana')
    expect(p.process(orderEvent('usr_bruno'))).toEqual({ apply: false, reason: 'other-user' })
    expect(p.process(orderEvent('usr_ana')).apply).toBe(true)
  })

  test('visitante (sem usuário) nunca aplica evento privado', () => {
    const p = createEventProcessor()
    p.setUser(null)
    expect(p.process(orderEvent('usr_ana'))).toEqual({ apply: false, reason: 'other-user' })
  })

  test('trocar de usuário zera o histórico (eventos da sessão anterior não bloqueiam a nova)', () => {
    const p = createEventProcessor()
    p.setUser('usr_ana')
    expect(p.process(orderEvent('usr_ana')).apply).toBe(true)
    p.setUser('usr_bruno')
    expect(p.process(orderEvent('usr_ana'))).toEqual({ apply: false, reason: 'other-user' })
    expect(p.process(orderEvent('usr_bruno')).apply).toBe(true)
  })

  test('evento malformado é descartado', () => {
    const p = createEventProcessor()
    expect(p.process({ type: 'nft.updated' })).toEqual({ apply: false, reason: 'invalid' })
    expect(p.process(null)).toEqual({ apply: false, reason: 'invalid' })
    expect(p.process('lixo')).toEqual({ apply: false, reason: 'invalid' })
  })

  test('nomes de evento seguem o enunciado: nft.updated e order.updated (com ponto)', () => {
    const p = createEventProcessor()
    expect(p.process({ ...nftEvent(1, '1.0'), type: 'nft:updated' })).toEqual({ apply: false, reason: 'invalid' })
  })
})

test.describe('Aplicação de eventos no cache', () => {
  const detail = {
    id: 'nft_01', name: 'x', collection: 'c', network: 'Ethereum', priceEth: '1.50', artwork: { url: '/a.png', alt: 'a' },
    isRare: false, isNew: false, isTrending: false, defaultEditionId: 'ed_01_2', createdAt: '2026-01-01T00:00:00.000Z', version: 1,
    description: 'd', creator: { id: 'c1', name: 'n', verified: false }, rating: { average: 4, count: 1 }, gallery: [],
    editions: [{ id: 'ed_01_2', type: 'limited_10', label: '1/10', priceEth: '1.50', available: 8, maxPerOrder: 3, isSoldOut: false }],
  } as NftDetail

  test('patchNftDetail atualiza preço e disponibilidade da edição e a versão', () => {
    const next = patchNftDetail(detail, nftEvent(2, '1.80'))
    expect(next.priceEth).toBe('1.80')
    expect(next.version).toBe(2)
    expect(next.editions[0]).toMatchObject({ priceEth: '1.80', available: 4, isSoldOut: false })
  })

  test('patchNftDetail ignora evento mais antigo que o REST', () => {
    expect(patchNftDetail({ ...detail, version: 5 }, nftEvent(5, '9.99'))).toEqual({ ...detail, version: 5 })
    expect(patchNftDetail({ ...detail, version: 5 }, nftEvent(4, '9.99')).priceEth).toBe('1.50')
  })

  test('patchNftList atualiza só o card do NFT afetado', () => {
    const list = {
      items: [{ ...detail }, { ...detail, id: 'nft_02', priceEth: '2.00' }],
      pagination: { page: 1, pageSize: 9, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      facets: { collections: [], networks: [], priceRange: { min: '0', max: '3' } },
    } as unknown as NftListResponse
    const next = patchNftList(list, nftEvent(2, '1.80'))
    expect(next.items[0]!.priceEth).toBe('1.80')
    expect(next.items[1]!.priceEth).toBe('2.00')
    expect(patchNftList(list, nftEvent(2, '1.80', { data: { nftId: 'nft_999', priceEth: '1', editions: [] } }))).toBe(list)
  })

  test('patchOrder aplica o estado terminal e respeita versão', () => {
    const order = { id: 'ord_1', status: 'pending', transactionHash: null, failureReason: null, settledAt: null, version: 1 } as unknown as OrderResponse
    const next = patchOrder(order, orderEvent('usr_ana', 2))
    expect(next.status).toBe('confirmed')
    expect(next.transactionHash).toBe('0xabc')
    expect(patchOrder({ ...order, version: 2 }, orderEvent('usr_ana', 2))).toEqual({ ...order, version: 2 })
  })
})
