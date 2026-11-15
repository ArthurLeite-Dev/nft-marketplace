import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'rare' | 'trending' | 'new'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase transition-colors',
        {
          'bg-primary/20 text-primary border border-primary/40': variant === 'default',
          'border border-border text-foreground': variant === 'outline',
          'bg-[#d28a4c]/20 text-[#d28a4c] border border-[#d28a4c]/50': variant === 'rare',
          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40': variant === 'trending',
          'bg-sky-500/20 text-sky-400 border border-sky-500/40': variant === 'new',
        },
        className,
      )}
      {...props}
    />
  )
}
