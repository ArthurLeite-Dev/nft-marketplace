import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import { NftDetailSchema, NftSummarySchema, type NftDetail, type NftSummary } from '@/api/contracts/nfts'
import { queryKeys } from '@/app/query-keys'

const RelatedResponseSchema = z.object({ items: z.array(NftSummarySchema) })

export function useNft(nftId: string | undefined) {
  return useQuery<NftDetail, Error>({
    queryKey: queryKeys.nft.detail(nftId ?? ''),
    queryFn: ({ signal }) => apiRequest(NftDetailSchema, { method: 'GET', url: API_PATHS.nfts.detail(nftId!), signal }),
    enabled: !!nftId,
    staleTime: 60 * 1000,
  })
}

export function useRelatedNfts(nftId: string | undefined) {
  return useQuery<NftSummary[], Error>({
    queryKey: queryKeys.nft.related(nftId ?? ''),
    queryFn: ({ signal }) => apiRequest(RelatedResponseSchema, { method: 'GET', url: API_PATHS.nfts.related(nftId!), signal }).then((res) => res.items),
    enabled: !!nftId,
    staleTime: 60 * 1000,
  })
}
