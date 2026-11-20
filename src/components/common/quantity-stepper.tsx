import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  onChange: (newValue: number) => void
  disabled?: boolean
  className?: string
  ariaLabel?: string
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
  className,
  ariaLabel = 'Quantidade',
}: QuantityStepperProps) {
  const canDecrease = !disabled && value > min
  const canIncrease = !disabled && value < max

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-card p-0.5',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-sm hover:bg-secondary cursor-pointer"
        disabled={!canDecrease}
        onClick={() => canDecrease && onChange(value - 1)}
        aria-label="Diminuir quantidade"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      <span
        className="w-10 text-center font-mono text-sm font-semibold text-foreground select-none"
        aria-live="polite"
      >
        {value}
      </span>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-sm hover:bg-secondary cursor-pointer"
        disabled={!canIncrease}
        onClick={() => canIncrease && onChange(value + 1)}
        aria-label="Aumentar quantidade"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
