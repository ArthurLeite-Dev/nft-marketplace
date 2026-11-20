import * as React from 'react'
import { RadioGroup as RadixRadioGroup } from 'radix-ui'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Root>,
  React.ComponentPropsWithoutRef<typeof RadixRadioGroup.Root>
>(({ className, ...props }, ref) => {
  return <RadixRadioGroup.Root className={cn('grid gap-2', className)} {...props} ref={ref} />
})
RadioGroup.displayName = RadixRadioGroup.Root.displayName

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Item>,
  React.ComponentPropsWithoutRef<typeof RadixRadioGroup.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadixRadioGroup.Item
      ref={ref}
      className={cn(
        'aspect-square h-4 w-4 rounded-full border border-border text-primary shadow-xs transition-colors cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary/20',
        className,
      )}
      {...props}
    >
      <RadixRadioGroup.Indicator className="flex items-center justify-center">
        <Circle className="h-2 w-2 fill-primary text-primary" />
      </RadixRadioGroup.Indicator>
    </RadixRadioGroup.Item>
  )
})
RadioGroupItem.displayName = RadixRadioGroup.Item.displayName
