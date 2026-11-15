import { z } from 'zod'
import { NftSummarySchema } from './nfts'

export const FavoritesResponseSchema = z.object({
  items: z.array(NftSummarySchema),
  nftIds: z.array(z.string()),
  updatedAt: z.string(),
})

export type FavoritesResponse = z.infer<typeof FavoritesResponseSchema>
