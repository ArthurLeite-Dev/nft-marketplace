import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import { NftListResponseSchema, type NftListResponse } from '@/api/contracts/nfts'

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

export function useCatalog(params: CatalogParams) {
  const searchParams = new URLSearchParams()
  if (params.q) searchParams.set('q', params.q)
  if (params.collections?.length) searchParams.set('collections', params.collections.join(','))
  if (params.networks?.length) searchParams.set('networks', params.networks.join(','))
  if (params.minPrice) searchParams.set('minPrice', params.minPrice)
  if (params.maxPrice) searchParams.set('maxPrice', params.maxPrice)
  if (params.tab && params.tab !== 'all') searchParams.set('tab', params.tab)
  if (params.sort && params.sort !== 'recent') searchParams.set('sort', params.sort)
  if (params.page && params.page > 1) searchParams.set('page', String(params.page))
  if (params.pageSize && params.pageSize !== 9) searchParams.set('pageSize', String(params.pageSize))

  return useQuery<NftListResponse, Error>({
    queryKey: ['nfts', searchParams.toString()],
    queryFn: () =>
      apiRequest(NftListResponseSchema, {
        method: 'GET',
        url: `${API_PATHS.nfts.list}?${searchParams.toString()}`,
      }),
    staleTime: 30 * 1000,
  })
}

export function useHighlights() {
  return useQuery<NftListResponse, Error>({
    queryKey: ['nfts', 'highlights'],
    queryFn: () =>
      apiRequest(NftListResponseSchema, {
        method: 'GET',
        url: API_PATHS.nfts.highlights,
      }),
    staleTime: 60 * 1000,
  })
}
