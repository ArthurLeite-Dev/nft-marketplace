import * as React from 'react'
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface StatusMessageProps {
  title: string
  description?: string
  icon?: 'empty' | 'error' | React.ReactNode
  action?: {
    label: string
    onClick: () => void
    loading?: boolean
  }
  role?: 'alert' | 'status'
  className?: string
}

export function StatusMessage({
  title,
  description,
  icon = 'empty',
  action,
  role = 'status',
  className,
}: StatusMessageProps) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border bg-card/40 my-4',
        className,
      )}
    >
      <div className="mb-4 rounded-full bg-secondary p-3 text-muted-foreground">
        {icon === 'empty' && <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
        {icon === 'error' && <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />}
        {React.isValidElement(icon) && icon}
      </div>

      <h3 className="text-base font-mono font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm font-mono text-muted-foreground max-w-md">{description}</p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          disabled={action.loading}
          variant="outline"
          size="sm"
          className="mt-4 gap-2"
        >
          {action.loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {action.label}
        </Button>
      )}
    </div>
  )
}
