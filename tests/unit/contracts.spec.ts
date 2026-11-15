import { test, expect } from '@playwright/test'
import { ApiError, normalizeError, isStatusRetryable } from '../../src/api/errors'
import { EthAmountSchema, ArtworkSchema } from '../../src/api/contracts/common'
import { RegisterInputSchema, LoginInputSchema } from '../../src/api/contracts/auth'
import { NftSummarySchema, EditionSchema } from '../../src/api/contracts/nfts'
import { CartResponseSchema } from '../../src/api/contracts/cart'
import { OrderResponseSchema } from '../../src/api/contracts/orders'
import { RealtimeEventSchema } from '../../src/api/contracts/events'

test.describe('Zod Contracts & API Error Handling', () => {
  test('EthAmountSchema validates strictly', () => {
    expect(EthAmountSchema.safeParse('0.5').success).toBe(true)
    expect(EthAmountSchema.safeParse('100.000000000000000001').success).toBe(true)
    expect(EthAmountSchema.safeParse('100.0000000000000000001').success).toBe(false) // 19 decimals
    expect(EthAmountSchema.safeParse('-1').success).toBe(false)
    expect(EthAmountSchema.safeParse('abc').success).toBe(false)
  })

  test('ArtworkSchema requires url and alt', () => {
    const valid = { url: '/images/nfts/1.webp', alt: 'Arte digital de tigre cyberpunk' }
    expect(ArtworkSchema.safeParse(valid).success).toBe(true)

    const invalid = { url: '/images/nfts/1.webp' } // missing alt
    expect(ArtworkSchema.safeParse(invalid).success).toBe(false)
  })

  test('Auth input schemas validate correctly', () => {
    const validRegister = {
      username: 'ana_crypto',
      email: 'ana@jungle.test',
      password: 'StrongPassword123',
    }
    expect(RegisterInputSchema.safeParse(validRegister).success).toBe(true)

    const weakPassword = {
      username: 'ana_crypto',
      email: 'ana@jungle.test',
      password: 'weak',
    }
    expect(RegisterInputSchema.safeParse(weakPassword).success).toBe(false)

    expect(LoginInputSchema.safeParse({ email: 'valid@email.com', password: '123' }).success).toBe(true)
    expect(LoginInputSchema.safeParse({ email: 'invalid-email', password: '123' }).success).toBe(false)
  })

  test('Nft and Edition contracts validate expected structure', () => {
    const edition = {
      id: 'ed_1',
      type: 'limited_10',
      label: '1/10',
      priceEth: '0.75',
      available: 5,
      maxPerOrder: 3,
      isSoldOut: false,
    }
    expect(EditionSchema.safeParse(edition).success).toBe(true)

    const nftSummary = {
      id: 'nft_01',
      name: 'Cyber Jaguar #01',
      collection: 'Jungle Warriors',
      network: 'Ethereum',
      priceEth: '1.5',
      artwork: { url: '/images/1.webp', alt: 'Cyber Jaguar' },
      isRare: true,
      isNew: false,
      isTrending: true,
      defaultEditionId: 'ed_1',
      createdAt: '2026-11-14T00:00:00.000Z',
    }
    expect(NftSummarySchema.safeParse(nftSummary).success).toBe(true)
  })

  test('CartResponse contract validates with totals and lines', () => {
    const cart = {
      version: 1,
      lines: [
        {
          lineId: 'line_1',
          nftId: 'nft_01',
          editionId: 'ed_1',
          name: 'Cyber Jaguar #01',
          editionLabel: '1/10',
          unitPriceEth: '1.5',
          quantity: 2,
          maxQuantity: 5,
          status: 'available',
          artwork: { url: '/img.webp', alt: 'Alt' },
        },
      ],
      couponCode: 'JUNGLE10',
      couponDiscountBp: 1000,
      network: 'Ethereum',
      totals: {
        subtotalEth: '3.0',
        discountEth: '0.3',
        networkFeeEth: '0.012',
        totalEth: '2.712',
      },
    }
    expect(CartResponseSchema.safeParse(cart).success).toBe(true)
  })

  test('OrderResponse contract validates terminal states', () => {
    const order = {
      id: 'ord_123',
      userId: 'usr_01',
      status: 'confirmed',
      network: 'Ethereum',
      provider: 'MetaMask',
      walletAddress: '0x71C84517C3743301AE53675C7FB78B2CE7756CF4',
      transactionHash: '0xabc123',
      lines: [
        {
          lineId: 'l1',
          nftId: 'nft_1',
          editionId: 'ed_1',
          name: 'NFT 1',
          editionLabel: '1/1',
          unitPriceEth: '1.0',
          quantity: 1,
          subtotalEth: '1.0',
        },
      ],
      couponCode: null,
      totals: {
        subtotalEth: '1.0',
        discountEth: '0',
        networkFeeEth: '0.012',
        totalEth: '1.012',
      },
      createdAt: '2026-11-14T10:00:00Z',
      settledAt: '2026-11-14T10:00:03Z',
    }
    expect(OrderResponseSchema.safeParse(order).success).toBe(true)
  })

  test('RealtimeEvent contract validates discriminated unions', () => {
    const nftEvent = {
      eventId: 'nft:nft_01:2',
      version: 2,
      occurredAt: '2026-11-14T10:00:00Z',
      resource: { type: 'nft', id: 'nft_01' },
      type: 'nft.updated',
      data: {
        nftId: 'nft_01',
        priceEth: '1.8',
        previousPriceEth: '1.5',
        editions: [{ id: 'ed_1', available: 4, isSoldOut: false }],
      },
    }
    expect(RealtimeEventSchema.safeParse(nftEvent).success).toBe(true)

    const orderEvent = {
      eventId: 'order:ord_1:3',
      version: 3,
      occurredAt: '2026-11-14T10:00:03Z',
      resource: { type: 'order', id: 'ord_1' },
      type: 'order.updated',
      data: {
        orderId: 'ord_1',
        userId: 'usr_01',
        status: 'confirmed',
        transactionHash: '0x123',
        settledAt: '2026-11-14T10:00:03Z',
      },
    }
    expect(RealtimeEventSchema.safeParse(orderEvent).success).toBe(true)
  })

  test('ApiError retryability classification', () => {
    expect(isStatusRetryable(500)).toBe(true)
    expect(isStatusRetryable(503)).toBe(true)
    expect(isStatusRetryable(408)).toBe(true)
    expect(isStatusRetryable(429)).toBe(true)
    expect(isStatusRetryable(400)).toBe(false)
    expect(isStatusRetryable(401)).toBe(false)
    expect(isStatusRetryable(404)).toBe(false)
    expect(isStatusRetryable(409)).toBe(false)
    expect(isStatusRetryable(422)).toBe(false)
    expect(isStatusRetryable(200, 'INVALID_RESPONSE')).toBe(false)
    expect(isStatusRetryable(0, 'NETWORK_ERROR')).toBe(true)
    expect(isStatusRetryable(0, 'TIMEOUT')).toBe(true)
  })

  test('normalizeError converts Axios-like responses to structured ApiError', () => {
    const mockAxiosError = {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            code: 'AVAILABILITY_CONFLICT',
            message: 'Quantidade indisponível.',
            fields: { edition: 'Estoque esgotado' },
            details: { available: 0 },
          },
        },
      },
    }

    const apiErr = normalizeError(mockAxiosError)
    expect(apiErr instanceof ApiError).toBe(true)
    expect(apiErr.code).toBe('AVAILABILITY_CONFLICT')
    expect(apiErr.status).toBe(409)
    expect(apiErr.retryable).toBe(false)
    expect(apiErr.fields?.edition).toBe('Estoque esgotado')
    expect(apiErr.details?.available).toBe(0)
  })
})
