import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import { NftListResponseSchema, NftSummarySchema, type NftListResponse, type NftSummary } from '@/api/contracts/nfts'
import { queryKeys } from '@/app/query-keys'

export interface CatalogParams {
  q?: string
  collections?: string[]
  networks?: string[]
  minPrice?: string
  maxPrice?: string
  tab?: 'all' | 'new' | 'trending'
  sort?: 'recent' | 'price-asc' | 'price-desc' | 'name'
  page?: number
  pageSize?: number
}

/** Serializa os parâmetros na MESMA ordem e forma que a API recebe: é também a chave de cache. */
export function toCatalogQueryString(params: CatalogParams): string {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.collections?.length) sp.set('collections', params.collections.join(','))
  if (params.networks?.length) sp.set('networks', params.networks.join(','))
  if (params.minPrice) sp.set('minPrice', params.minPrice)
  if (params.maxPrice) sp.set('maxPrice', params.maxPrice)
  if (params.tab && params.tab !== 'all') sp.set('tab', params.tab)
  if (params.sort && params.sort !== 'recent') sp.set('sort', params.sort)
  if (params.page && params.page > 1) sp.set('page', String(params.page))
  return sp.toString()
}

export function useCatalog(params: CatalogParams) {
  const queryString = toCatalogQueryString(params)
  return useQuery<NftListResponse, Error>({
    // A chave carrega todos os parâmetros: respostas de consultas diferentes nunca se misturam,
    // então uma resposta que chega fora de ordem é guardada na SUA chave e descartada da tela atual.
    queryKey: queryKeys.nfts.list(queryString),
    queryFn: ({ signal }) => apiRequest(NftListResponseSchema, { method: 'GET', url: `${API_PATHS.nfts.list}?${queryString}`, signal }),
    staleTime: 30 * 1000,
    placeholderData: (previous) => previous,
  })
}

const HighlightsSchema = z.object({ items: z.array(NftSummarySchema) })

export function useHighlights() {
  return useQuery<NftSummary[], Error>({
    queryKey: queryKeys.nfts.highlights,
    queryFn: ({ signal }) => apiRequest(HighlightsSchema, { method: 'GET', url: API_PATHS.nfts.highlights, signal }).then((r) => r.items),
    staleTime: 60 * 1000,
  })
}
