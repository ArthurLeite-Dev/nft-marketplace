import type { QueryClient } from '@tanstack/react-query'
import type { NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from '@/api/contracts/events'
import type { NftDetail, NftListResponse } from '@/api/contracts/nfts'
import type { OrderResponse } from '@/api/contracts/orders'
import { announce } from '@/lib/announce'
import { queryKeys } from '@/app/query-keys'
import { emitSignal } from './signals'

/** Aplica o evento no detalhe do NFT em cache. Ignora se o REST já tem versão igual ou mais nova. */
export function patchNftDetail(old: NftDetail, event: NftUpdatedEvent): NftDetail {
  if (typeof old.version === 'number' && event.version <= old.version) return old
  return {
    ...old,
    priceEth: event.data.priceEth,
    ...(event.data.previousPriceEth ? { previousPriceEth: event.data.previousPriceEth } : {}),
    version: event.version,
    editions: old.editions.map((edition) => {
      const next = event.data.editions.find((e) => e.id === edition.id)
      if (!next) return edition
      return {
        ...edition,
        ...(next.priceEth ? { priceEth: next.priceEth } : {}),
        available: next.available,
        isSoldOut: next.isSoldOut,
      }
    }),
  }
}

/** Aplica o evento nas listagens de catálogo em cache (preço e versão do card). */
export function patchNftList(old: NftListResponse, event: NftUpdatedEvent): NftListResponse {
  if (!old.items.some((item) => item.id === event.data.nftId)) return old
  return {
    ...old,
    items: old.items.map((item) =>
      item.id !== event.data.nftId || (typeof item.version === 'number' && event.version <= item.version)
        ? item
        : {
            ...item,
            priceEth: event.data.priceEth,
            ...(event.data.previousPriceEth ? { previousPriceEth: event.data.previousPriceEth } : {}),
            version: event.version,
          },
    ),
  }
}

export function patchOrder(old: OrderResponse, event: OrderUpdatedEvent): OrderResponse {
  if (typeof old.version === 'number' && event.version <= old.version) return old
  return {
    ...old,
    status: event.data.status,
    transactionHash: event.data.transactionHash,
    failureReason: event.data.failureReason ?? null,
    settledAt: event.data.settledAt,
    version: event.version,
  }
}

/**
 * Efeitos de um evento já validado/deduplicado/ordenado (ver event-processor.ts):
 *  - nft.updated  -> catálogo, detalhe e carrinho (o carrinho é relido: o servidor recalcula totais e status);
 *  - order.updated -> pedido, lista de pedidos e carrinho;
 *  - wallet.disconnected -> sinal para o checkout.
 */
export function applyRealtimeEvent(queryClient: QueryClient, event: RealtimeEvent): void {
  switch (event.type) {
    case 'nft.updated': {
      const { nftId } = event.data
      queryClient.setQueryData<NftDetail>(queryKeys.nft.detail(nftId), (old) => (old ? patchNftDetail(old, event) : old))
      queryClient.setQueriesData<NftListResponse>({ queryKey: ['nfts', 'list'] }, (old) => (old ? patchNftList(old, event) : old))
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.root })
      const soldOutEditionIds = event.data.editions.filter((e) => e.isSoldOut).map((e) => e.id)
      emitSignal({
        type: 'nft-changed',
        nftId,
        priceEth: event.data.priceEth,
        soldOutEditionIds,
        ...(event.data.previousPriceEth ? { previousPriceEth: event.data.previousPriceEth } : {}),
      })
      break
    }
    case 'order.updated': {
      const { orderId, userId, status } = event.data
      queryClient.setQueryData<OrderResponse>(queryKeys.user.order(userId, orderId), (old) => (old ? patchOrder(old, event) : old))
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.orders(userId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.root })
      emitSignal({ type: 'order-settled', orderId, status })
      announce(status === 'confirmed' ? 'Pedido confirmado.' : status === 'refused' ? 'Pedido recusado.' : 'Pedido atualizado.', 'assertive')
      break
    }
    case 'wallet.disconnected': {
      emitSignal({ type: 'wallet-disconnected', connectionId: event.data.connectionId })
      announce('A carteira foi desconectada.', 'assertive')
      break
    }
  }
}

/** Após reconexão: relê do REST tudo que está ativo na tela (eventos podem ter sido perdidos). */
export function reconcileActiveQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => ['nfts', 'nft', 'cart', 'u'].includes(String(query.queryKey[0])),
    refetchType: 'active',
  })
}
