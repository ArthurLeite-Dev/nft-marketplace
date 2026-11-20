import * as React from 'react'
import { Tabs as RadixTabs } from 'radix-ui'
import { cn } from '@/lib/utils'

export const Tabs = RadixTabs.Root

export const TabsList = React.forwardRef<
  React.ElementRef<typeof RadixTabs.List>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className, ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-secondary/60 p-1 text-muted-foreground border border-border/50',
      className,
    )}
    {...props}
  />
))
TabsList.displayName = RadixTabs.List.displayName

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className, ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer',
      'focus-visible:outline-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-primary data-[state=active]:text-[#140d0a] data-[state=active]:font-semibold data-[state=active]:shadow-xs',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = RadixTabs.Trigger.displayName

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={cn('mt-2 focus-visible:outline-2 focus-visible:outline-primary', className)}
    {...props}
  />
))
TabsContent.displayName = RadixTabs.Content.displayName
