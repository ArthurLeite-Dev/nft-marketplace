import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-mono text-sm font-medium transition-colors cursor-pointer select-none',
          'rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-gradient-to-r from-[#d68d4c] to-[#b0703f] text-[#140d0a] font-semibold hover:brightness-110 active:brightness-95 shadow-sm':
              variant === 'default',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border':
              variant === 'secondary',
            'border border-border bg-transparent text-foreground hover:bg-card hover:text-foreground':
              variant === 'outline',
            'bg-transparent text-muted-foreground hover:bg-card hover:text-foreground':
              variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90':
              variant === 'destructive',
            'text-primary underline-offset-4 hover:underline p-0 h-auto font-normal':
              variant === 'link',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-8 rounded-md px-3 text-xs': size === 'sm',
            'h-12 rounded-md px-6 text-base': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
          },
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
