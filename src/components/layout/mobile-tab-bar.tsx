import { Home, Compass, ShoppingBag, User } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export interface MobileTabBarProps {
  cartCount?: number
}

export function MobileTabBar({ cartCount = 0 }: MobileTabBarProps) {
  return (
    <nav
      aria-label="Navegação móvel principal"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-border bg-card/95 backdrop-blur-md md:hidden"
    >
      <div className="grid h-full w-full grid-cols-4 mx-auto max-w-lg">
        <Link
          to="/"
          className={cn(
            'inline-flex flex-col items-center justify-center font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground',
            'focus-visible:outline-2 focus-visible:outline-primary',
          )}
          activeProps={{ className: 'text-primary font-bold' }}
          activeOptions={{ exact: true }}
        >
          <Home className="h-5 w-5 mb-1" />
          <span>Início</span>
        </Link>

        <Link
          to="/"
          search={{ tab: 'all' }}
          className={cn(
            'inline-flex flex-col items-center justify-center font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground',
            'focus-visible:outline-2 focus-visible:outline-primary',
          )}
        >
          <Compass className="h-5 w-5 mb-1" />
          <span>Mercado</span>
        </Link>

        <Link
          to="/carrinho"
          className={cn(
            'relative inline-flex flex-col items-center justify-center font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground',
            'focus-visible:outline-2 focus-visible:outline-primary',
          )}
          activeProps={{ className: 'text-primary font-bold' }}
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5 mb-1" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-[#140d0a]">
                {cartCount}
              </span>
            )}
          </div>
          <span>Carrinho</span>
        </Link>

        <Link
          to="/conta"
          className={cn(
            'inline-flex flex-col items-center justify-center font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground',
            'focus-visible:outline-2 focus-visible:outline-primary',
          )}
          activeProps={{ className: 'text-primary font-bold' }}
        >
          <User className="h-5 w-5 mb-1" />
          <span>Conta</span>
        </Link>
      </div>
    </nav>
  )
}
