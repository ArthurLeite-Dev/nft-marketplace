import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import { NftDetailSchema, NftSummarySchema, type NftDetail, type NftSummary } from '@/api/contracts/nfts'

const RelatedResponseSchema = z.object({
  items: z.array(NftSummarySchema),
})

export function useNft(nftId: string | undefined) {
  return useQuery<NftDetail, Error>({
    queryKey: ['nft', nftId],
    queryFn: () =>
      apiRequest(NftDetailSchema, {
        method: 'GET',
        url: API_PATHS.nfts.detail(nftId!),
      }),
    enabled: !!nftId,
    staleTime: 60 * 1000,
  })
}

export function useRelatedNfts(nftId: string | undefined) {
  return useQuery<NftSummary[], Error>({
    queryKey: ['nfts', 'related', nftId],
    queryFn: () =>
      apiRequest(RelatedResponseSchema, {
        method: 'GET',
        url: API_PATHS.nfts.related(nftId!),
      }).then((res) => res.items),
    enabled: !!nftId,
    staleTime: 60 * 1000,
  })
}

