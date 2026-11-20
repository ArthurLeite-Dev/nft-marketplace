import * as React from 'react'
import { cn } from '@/lib/utils'

export interface FixedBottomBarProps {
  children: React.ReactNode
  className?: string
}

export function FixedBottomBar({ children, className }: FixedBottomBarProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 p-4 backdrop-blur-md md:hidden',
        className,
      )}
    >
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  )
}
