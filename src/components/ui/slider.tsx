import * as React from 'react'
import { Slider as RadixSlider } from 'radix-ui'
import { cn } from '@/lib/utils'

export const Slider = React.forwardRef<
  React.ElementRef<typeof RadixSlider.Root>,
  React.ComponentPropsWithoutRef<typeof RadixSlider.Root>
>(({ className, ...props }, ref) => (
  <RadixSlider.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center cursor-pointer', className)}
    {...props}
  >
    <RadixSlider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
      <RadixSlider.Range className="absolute h-full bg-primary" />
    </RadixSlider.Track>
    <RadixSlider.Thumb className="block h-4 w-4 rounded-full border border-primary bg-background shadow transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50" />
  </RadixSlider.Root>
))
Slider.displayName = RadixSlider.Root.displayName
