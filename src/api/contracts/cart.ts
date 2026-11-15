import { z } from 'zod'
import { ArtworkSchema, EthAmountSchema } from './common'

export const LineItemStatusSchema = z.enum(['available', 'price-changed', 'unavailable'])

export const CartLineItemSchema = z.object({
  lineId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  editionLabel: z.string(),
  unitPriceEth: EthAmountSchema,
  previousUnitPriceEth: EthAmountSchema.optional(),
  quantity: z.number().int().positive(),
  maxQuantity: z.number().int().nonnegative(),
  status: LineItemStatusSchema,
  statusReason: z.string().optional(),
  artwork: ArtworkSchema,
})

export const CartTotalsSchema = z.object({
  subtotalEth: EthAmountSchema,
  discountEth: EthAmountSchema,
  networkFeeEth: EthAmountSchema,
  totalEth: EthAmountSchema,
})

export const CartCouponSchema = z.object({
  code: z.string(),
  discountPercent: z.number().min(1).max(100),
  discountBasisPoints: z.number().int().positive(),
})

export const CartResponseSchema = z.object({
  version: z.number().int().nonnegative(),
  lines: z.array(CartLineItemSchema),
  coupon: CartCouponSchema.nullable(),
  network: z.enum(['Ethereum', 'Polygon', 'Base']),
  totals: CartTotalsSchema,
})

export const AddItemInputSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
})

export const UpdateItemInputSchema = z.object({
  quantity: z.number().int().positive().optional(),
  acceptPrice: z.boolean().optional(),
})

export const ApplyCouponInputSchema = z.object({
  code: z.string().min(1, 'Código de cupom é obrigatório'),
})

export const MergeCartResponseSchema = z.object({
  cart: CartResponseSchema,
  adjustments: z.array(
    z.object({
      nftId: z.string(),
      editionId: z.string(),
      originalQuantity: z.number().int(),
      adjustedQuantity: z.number().int(),
      reason: z.string(),
    }),
  ),
})

export type LineItemStatus = z.infer<typeof LineItemStatusSchema>
export type CartLineItem = z.infer<typeof CartLineItemSchema>
export type CartTotals = z.infer<typeof CartTotalsSchema>
export type CartCoupon = z.infer<typeof CartCouponSchema>
export type CartResponse = z.infer<typeof CartResponseSchema>
export type AddItemInput = z.infer<typeof AddItemInputSchema>
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>
export type ApplyCouponInput = z.infer<typeof ApplyCouponInputSchema>
export type MergeCartResponse = z.infer<typeof MergeCartResponseSchema>
