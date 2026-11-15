import { Link } from '@tanstack/react-router'
import { ShoppingBag, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SiteHeaderProps {
  cartCount?: number
  user?: {
    username: string
    displayName?: string
    avatarUrl?: string | null
  } | null
  onSignInClick?: () => void
}

export function SiteHeader({ cartCount = 0, user, onSignInClick }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and Brand */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-primary rounded-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-[#d28a4c] to-[#b0703f] text-[#140d0a] font-mono font-black text-lg shadow-sm">
              J
            </div>
            <span className="font-mono text-base font-bold tracking-tight text-foreground">
              JUNGLE<span className="text-primary font-normal">NFT</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={cn(
                'font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground',
                'focus-visible:outline-2 focus-visible:outline-primary rounded-xs',
              )}
              activeProps={{ className: 'text-primary font-bold' }}
              activeOptions={{ exact: true }}
            >
              Início
            </Link>
            <Link
              to="/"
              search={{ tab: 'all' }}
              className={cn(
                'font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground',
                'focus-visible:outline-2 focus-visible:outline-primary rounded-xs',
              )}
            >
              Mercado
            </Link>
            <Link
              to="/criadores"
              className={cn(
                'font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground',
                'focus-visible:outline-2 focus-visible:outline-primary rounded-xs',
              )}
            >
              Criadores
            </Link>
            <Link
              to="/aprenda"
              className={cn(
                'font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground',
                'focus-visible:outline-2 focus-visible:outline-primary rounded-xs',
              )}
            >
              Aprenda
            </Link>
          </nav>
        </div>

        {/* Right Actions: Cart and Account */}
        <div className="flex items-center gap-3">
          <Link
            to="/carrinho"
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary rounded-md"
            aria-label={`Carrinho com ${cartCount} itens`}
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-[#140d0a]">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <Link
              to="/conta"
              className="flex items-center gap-2 rounded-md border border-border bg-secondary/80 px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
            >
              <UserIcon className="h-3.5 w-3.5 text-primary" />
              <span className="truncate max-w-[120px]">{user.displayName || user.username}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSignInClick}
                className="hidden sm:inline-flex text-xs uppercase font-mono"
              >
                <Link to="/entrar">Entrar</Link>
              </Button>
              <Button size="sm" className="text-xs uppercase font-mono">
                <Link to="/cadastro">Cadastrar</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
