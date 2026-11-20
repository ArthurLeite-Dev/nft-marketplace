import * as React from 'react'
import { Avatar as RadixAvatar } from 'radix-ui'
import { cn } from '@/lib/utils'

export const Avatar = React.forwardRef<
  React.ElementRef<typeof RadixAvatar.Root>,
  React.ComponentPropsWithoutRef<typeof RadixAvatar.Root>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Root
    ref={ref}
    className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-secondary', className)}
    {...props}
  />
))
Avatar.displayName = RadixAvatar.Root.displayName

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof RadixAvatar.Image>,
  React.ComponentPropsWithoutRef<typeof RadixAvatar.Image>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
))
AvatarImage.displayName = RadixAvatar.Image.displayName

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof RadixAvatar.Fallback>,
  React.ComponentPropsWithoutRef<typeof RadixAvatar.Fallback>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Fallback
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center font-mono text-xs font-semibold uppercase text-muted-foreground', className)}
    {...props}
  />
))
AvatarFallback.displayName = RadixAvatar.Fallback.displayName
