import type { QueryClient } from '@tanstack/react-query'

/**
 * Chaves de cache.
 *
 * Isolamento por usuário: tudo que é privado fica sob a raiz `['u', <userId>, ...]` e o carrinho
 * sob `['cart', <userId | 'guest'>]`. Dois usuários nunca compartilham chave e, na troca de
 * identidade, `purgePrivateQueries` remove todo o cache privado. Dados públicos (catálogo, NFT)
 * não dependem de usuário.
 */
export const queryKeys = {
  nfts: {
    root: ['nfts'] as const,
    list: (queryString: string) => ['nfts', 'list', queryString] as const,
    highlights: ['nfts', 'highlights'] as const,
  },
  nft: {
    detail: (id: string) => ['nft', id] as const,
    related: (id: string) => ['nft', id, 'related'] as const,
  },
  cart: {
    root: ['cart'] as const,
    scoped: (scope: string) => ['cart', scope] as const,
  },
  user: {
    favorites: (userId: string) => ['u', userId, 'favorites'] as const,
    profile: (userId: string) => ['u', userId, 'profile'] as const,
    orders: (userId: string) => ['u', userId, 'orders'] as const,
    order: (userId: string, orderId: string) => ['u', userId, 'orders', orderId] as const,
  },
}

export function isPrivateQueryKey(key: readonly unknown[]): boolean {
  return key[0] === 'u' || key[0] === 'cart'
}

/** Descarta o cache privado (logout, expiração de sessão e troca de usuário). */
export async function purgePrivateQueries(queryClient: QueryClient): Promise<void> {
  const predicate = (query: { queryKey: readonly unknown[] }) => isPrivateQueryKey(query.queryKey)
  await queryClient.cancelQueries({ predicate })
  queryClient.removeQueries({ predicate })
}
