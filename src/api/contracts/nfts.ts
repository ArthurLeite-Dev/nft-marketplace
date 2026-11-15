import { z } from 'zod'
import { ArtworkSchema, EthAmountSchema, createPaginatedSchema } from './common'

export const EditionTypeSchema = z.enum(['unique_1_of_1', 'limited_10', 'limited_50', 'open'])

export const EditionSchema = z.object({
  id: z.string(),
  type: EditionTypeSchema,
  label: z.string(), // ex: "1/1", "1/10", "1/50", "Aberta"
  priceEth: EthAmountSchema,
  available: z.number().int().nonnegative().nullable(), // null means open edition (unlimited)
  maxPerOrder: z.number().int().positive(),
  isSoldOut: z.boolean(),
})

export const NftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  collection: z.string(),
  network: z.enum(['Ethereum', 'Polygon']),
  priceEth: EthAmountSchema,
  previousPriceEth: EthAmountSchema.optional(),
  artwork: ArtworkSchema,
  isRare: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  defaultEditionId: z.string(),
  createdAt: z.string(),
})

export const NftDetailSchema = NftSummarySchema.extend({
  description: z.string(),
  creator: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().optional(),
    verified: z.boolean().default(false),
  }),
  rating: z.object({
    average: z.number().min(0).max(5),
    count: z.number().int().nonnegative(),
  }),
  editions: z.array(EditionSchema),
  gallery: z.array(ArtworkSchema),
  attributes: z
    .array(
      z.object({
        trait_type: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  contractAddress: z.string().optional(),
  tokenId: z.string().optional(),
})

export const NftFilterParamsSchema = z.object({
  q: z.string().optional(),
  collections: z.string().optional(), // comma-separated
  networks: z.string().optional(), // comma-separated
  minPrice: EthAmountSchema.optional(),
  maxPrice: EthAmountSchema.optional(),
  tab: z.enum(['all', 'new', 'trending']).default('all').optional(),
  sort: z.enum(['recent', 'price-asc', 'price-desc', 'name']).default('recent').optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  pageSize: z.coerce.number().int().positive().default(9).optional(),
})

export const NftFacetsSchema = z.object({
  collections: z.array(
    z.object({
      name: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  networks: z.array(
    z.object({
      name: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  priceRange: z.object({
    min: EthAmountSchema,
    max: EthAmountSchema,
  }),
})

export const NftListResponseSchema = createPaginatedSchema(NftSummarySchema).extend({
  facets: NftFacetsSchema,
})

export type EditionType = z.infer<typeof EditionTypeSchema>
export type Edition = z.infer<typeof EditionSchema>
export type NftSummary = z.infer<typeof NftSummarySchema>
export type NftDetail = z.infer<typeof NftDetailSchema>
export type NftFilterParams = z.infer<typeof NftFilterParamsSchema>
export type NftFacets = z.infer<typeof NftFacetsSchema>
export type NftListResponse = z.infer<typeof NftListResponseSchema>
