import { Link } from '@tanstack/react-router'
import { ShieldCheck, Zap, RefreshCw } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-border bg-card/60 pb-20 md:pb-12 pt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 3 Key Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12 border-b border-border/60">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-secondary p-2.5 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-semibold text-foreground">Autenticidade Garantida</h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Todas as obras e coleções são cunhadas e verificadas com proveniência comprovada.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-md bg-secondary p-2.5 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-semibold text-foreground">Liquidez Instantânea</h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Compre e venda edições limitadas com liquidação rápida e cotações transparentes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-md bg-secondary p-2.5 text-primary">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-semibold text-foreground">Múltiplas Redes</h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Suporte integrado para transações nas redes Ethereum e Polygon.
              </p>
            </div>
          </div>
        </div>

        {/* Links and Brand info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-b border-border/60">
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              Mercado
            </h4>
            <ul className="space-y-2 font-mono text-xs text-muted-foreground">
              <li>
                <Link to="/" search={{ tab: 'all' }} className="hover:text-primary transition-colors">
                  Todos os NFTs
                </Link>
              </li>
              <li>
                <Link to="/" search={{ tab: 'new' }} className="hover:text-primary transition-colors">
                  Novos Lançamentos
                </Link>
              </li>
              <li>
                <Link to="/" search={{ tab: 'trending' }} className="hover:text-primary transition-colors">
                  Em Alta
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              Colecionador
            </h4>
            <ul className="space-y-2 font-mono text-xs text-muted-foreground">
              <li>
                <Link to="/conta" className="hover:text-primary transition-colors">
                  Minha Conta
                </Link>
              </li>
              <li>
                <Link to="/carrinho" className="hover:text-primary transition-colors">
                  Carrinho
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              Recursos
            </h4>
            <ul className="space-y-2 font-mono text-xs text-muted-foreground">
              <li>
                <Link to="/aprenda" className="hover:text-primary transition-colors">
                  Aprenda sobre NFTs
                </Link>
              </li>
              <li>
                <Link to="/criadores" className="hover:text-primary transition-colors">
                  Para Criadores
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              Redes Compatíveis
            </h4>
            <p className="font-mono text-xs text-muted-foreground">
              Ethereum Mainnet e Polygon Network suportadas por meio de simulação de carteira.
            </p>
          </div>
        </div>

        {/* Bottom copyright and compliance */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-muted-foreground/80">
          <p>© 2026 Jungle Gaming NFT Marketplace. Demonstração técnica.</p>
          <p>Ambiente simulado via MSW. Nenhuma transação financeira real é realizada.</p>
        </div>
      </div>
    </footer>
  )
}
