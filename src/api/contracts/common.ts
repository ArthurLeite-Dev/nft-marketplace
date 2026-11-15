import { z } from 'zod'

export const EthAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH deve ser uma string decimal válida com até 18 casas')

export const ArtworkSchema = z.object({
  url: z.string().min(1, 'URL da arte é obrigatória'),
  alt: z.string().min(1, 'Texto alternativo da arte é obrigatório para acessibilidade'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    retryable: z.boolean().optional(),
  }),
})

export function createPaginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      totalItems: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  })
}

export type EthAmount = z.infer<typeof EthAmountSchema>
export type Artwork = z.infer<typeof ArtworkSchema>
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>
