import { cn } from '@/lib/utils'

export interface EthAmountProps {
  amount: string
  showSymbol?: boolean
  className?: string
  symbolClassName?: string
}

export function EthAmount({
  amount,
  showSymbol = true,
  className,
  symbolClassName,
}: EthAmountProps) {
  return (
    <span className={cn('inline-flex items-baseline font-mono font-bold text-primary', className)}>
      <span>{amount}</span>
      {showSymbol && (
        <span className={cn('ml-1 text-xs font-normal text-muted-foreground', symbolClassName)}>
          ETH
        </span>
      )}
    </span>
  )
}
