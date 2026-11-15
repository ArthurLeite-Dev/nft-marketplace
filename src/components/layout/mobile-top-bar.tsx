import { ArrowLeft } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export interface MobileTopBarProps {
  title: string
  fallbackTo?: string
  rightAction?: React.ReactNode
}

export function MobileTopBar({ title, fallbackTo = '/', rightAction }: MobileTopBarProps) {
  const router = useRouter()

  function handleBack() {
    if (window.history.length > 1) {
      router.history.back()
    } else {
      router.navigate({ to: fallbackTo })
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleBack}
          aria-label="Voltar para a página anterior"
          className="h-9 w-9 text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-mono text-sm font-bold text-foreground truncate max-w-[200px]">
          {title}
        </h1>
      </div>

      {rightAction && <div className="flex items-center">{rightAction}</div>}
    </header>
  )
}
