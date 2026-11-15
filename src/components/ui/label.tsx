import * as React from 'react'
import { Label as RadixLabel } from 'radix-ui'
import { cn } from '@/lib/utils'

export type LabelProps = React.ComponentPropsWithoutRef<typeof RadixLabel.Root>

export const Label = React.forwardRef<React.ElementRef<typeof RadixLabel.Root>, LabelProps>(
  ({ className, ...props }, ref) => (
    <RadixLabel.Root
      ref={ref}
      className={cn(
        'text-xs font-mono font-medium tracking-wide text-muted-foreground uppercase peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  ),
)

Label.displayName = 'Label'
