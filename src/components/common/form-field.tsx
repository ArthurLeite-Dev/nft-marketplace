import * as React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactElement<{
    id?: string
    'aria-invalid'?: boolean
    'aria-describedby'?: string
  }>
  className?: string
}

export function FormField({
  id,
  label,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="flex items-center gap-1">
        <span>{label}</span>
        {required ? <span className="text-destructive font-bold" aria-hidden="true">*</span> : null}
      </Label>

      {React.cloneElement(children, {
        id,
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs font-mono text-muted-foreground/80">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs font-mono font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
