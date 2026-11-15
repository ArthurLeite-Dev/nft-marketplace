import * as React from 'react'
import { Checkbox as RadixCheckbox } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof RadixCheckbox.Root>,
  React.ComponentPropsWithoutRef<typeof RadixCheckbox.Root>
>(({ className, ...props }, ref) => (
  <RadixCheckbox.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-xs border border-border bg-card transition-colors cursor-pointer',
      'focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary data-[state=checked]:text-[#140d0a] data-[state=checked]:border-primary',
      className,
    )}
    {...props}
  >
    <RadixCheckbox.Indicator className={cn('flex items-center justify-center text-current')}>
      <Check className="h-3.5 w-3.5 stroke-[3]" />
    </RadixCheckbox.Indicator>
  </RadixCheckbox.Root>
))
Checkbox.displayName = RadixCheckbox.Root.displayName
