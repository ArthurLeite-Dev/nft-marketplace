import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@tanstack/react-router'
import { announce } from '@/lib/announce'
import { useCatalog } from '@/features/catalog/useCatalog'

const COLLECTIONS = [
  'Jungle Warriors',
  'Cyber Safari',
  'Neon Tropics',
  'Pixel Fauna',
  'Golden Canopy',
  'Shadow Grove',
  'Emerald Hive',
  'Desert Mirage',
  'Frost Tundra',
]

const NETWORKS = ['Ethereum', 'Polygon', 'Base']

const TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Novos' },
  { value: 'trending', label: 'Em alta' },
]

const SORTS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'price-asc', label: 'Preço menor' },
  { value: 'price-desc', label: 'Preço maior' },
  { value: 'name', label: 'Nome' },
]

export const Route = createFileRoute('/')({
  component: CatalogPage,
})

function CatalogPage() {
  const search = useSearch({
    from: '/',
  })

  const q = (search.q as string) || ''
  const tab = (search.tab as 'all' | 'new' | 'trending') || 'all'
  const sort = (search.sort as
    | 'recent'
    | 'price-asc'
    | 'price-desc'
    | 'name') || 'recent'
  const page = Math.max(1, Number(search.page) || 1)
  const collections = (search.collections as string | undefined)
    ?.split(',')
    .filter(Boolean)
  const networks = (search.networks as string | undefined)
    ?.split(',')
    .filter(Boolean)
  const minPrice = (search.minPrice as string) || ''
  const maxPrice = (search.maxPrice as string) || ''

  const { data, isPending, error, refetch } = useCatalog({
    q: q || undefined,
    collections,
    networks,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    tab,
    sort,
    page,
    pageSize: 9,
  })

  const items = data?.items ?? []
  const pagination = data?.pagination

  useEffect(() => {
    if (error) {
      announce(`Erro ao carregar o catálogo: ${error.message}`, 'assertive')
    } else {
      announce(
        items.length === 0 ? 'Nenhum NFT encontrado' : `${items.length} NFTs encontrados`,
        'polite',
      )
    }
  }, [error, items.length])

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h2 className="text-xl font-mono font-bold text-destructive">
          Não foi possível carregar o catálogo
        </h2>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <Button onClick={() => refetch()} variant="outline">
          Tentar novamente
        </Button>
      </div>
    )
  }

  const onTabChange = (value: string) => {
    search.setSearchParam('tab', value as any)
  }

  const onSortChange = (value: string) => {
    search.setSearchParam('sort', value as any)
    search.setSearchParam('page', '1')
  }

  const onClearFilters = () => {
    search.setSearchParam('q', '')
    search.setSearchParam('tab', 'all')
    search.setSearchParam('sort', 'recent')
    search.setSearchParam('collections', '')
    search.setSearchParam('networks', '')
    search.setSearchParam('minPrice', '')
    search.setSearchParam('maxPrice', '')
    search.setSearchParam('page', '1')
  }

  const onToggleCollection = (name: string, active: boolean) => {
    const next = active
      ? (collections ?? []).filter((x) => x !== name)
      : [...(collections ?? []), name]
    search.setSearchParam('collections', next.join(','))
    search.setSearchParam('page', '1')
  }

  const onToggleNetwork = (name: string, active: boolean) => {
    const next = active
      ? (networks ?? []).filter((x) => x !== name)
      : [...(networks ?? []), name]
    search.setSearchParam('networks', next.join(','))
    search.setSearchParam('page', '1')
  }

  const onPrevPage = () => {
    if (!pagination) return
    search.setSearchParam('page', String(pagination.page - 1))
  }

  const onNextPage = () => {
    if (!pagination) return
    search.setSearchParam('page', String(pagination.page + 1))
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="sticky top-0 z-20 w-full border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg tracking-tight">JUNGLE</span>
            <span className="text-primary font-normal">NFT</span>
          </div>

          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Buscar NFTs ou coleções…"
              value={q}
              onChange={(e) => {
                search.setSearchParam('q', e.target.value)
                search.setSearchParam('page', '1')
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Select defaultValue={tab} onValueChange={onTabChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filtro" />
              </SelectTrigger>
              <SelectContent>
                {TABS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue={sort} onValueChange={onSortChange}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={onClearFilters}>
              Limpar filtros
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-8 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 flex-shrink-0 space-y-6">
            <section className="space-y-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Coleções
              </h3>
              <div className="space-y-2">
                {COLLECTIONS.map((c) => {
                  const active = !!collections?.includes(c)
                  return (
                    <Button
                      key={c}
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onToggleCollection(c, active)}
                      className="w-full text-left justify-between"
                    >
                      {c}
                      <Badge variant={active ? 'default' : 'outline'} className="ml-auto">
                        {active ? '✓' : ''}
                      </Badge>
                    </Button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Rede
              </h3>
              <div className="space-y-2">
                {NETWORKS.map((n) => {
                  const active = !!networks?.includes(n)
                  return (
                    <Button
                      key={n}
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onToggleNetwork(n, active)}
                      className="w-full text-left justify-between"
                    >
                      {n}
                      <Badge variant={active ? 'default' : 'outline'} className="ml-auto">
                        {active ? '✓' : ''}
                      </Badge>
                    </Button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Preço (ETH)
              </h3>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Mín."
                  value={minPrice}
                  onChange={(e) => {
                    search.setSearchParam('minPrice', e.target.value)
                    search.setSearchParam('page', '1')
                  }}
                  className="w-full h-9 text-xs"
                />
                <Input
                  type="number"
                  placeholder="Máx."
                  value={maxPrice}
                  onChange={(e) => {
                    search.setSearchParam('maxPrice', e.target.value)
                    search.setSearchParam('page', '1')
                  }}
                  className="w-full h-9 text-xs"
                />
              </div>
            </section>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-mono text-xl font-bold">Mercado</h2>
              <span className="font-mono text-sm text-muted-foreground">
                {pagination?.totalItems ?? 0} itens
              </span>
            </div>

            {isPending && items.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[1] h-64" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-muted-foreground">
                  Nenhum NFT encontrado com os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((nft) => (
                  <Link
                    key={nft.id}
                    to="/nft/$nftId"
                    params={{ nftId: nft.id }}
                    className="block"
                  >
                    <article
                      className="rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow group"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-md mb-3 bg-secondary/40">
                        <img
                          src={nft.artwork.url}
                          alt={nft.artwork.alt}
                          className="block w-full h-full object-cover"
                          loading="lazy"
                        />
                        {nft.isRare && <Badge className="absolute top-2 right-2">Raro</Badge>}
                        {nft.isNew && (
                          <Badge variant="outline" className="absolute top-2 left-2">
                            Novo
                          </Badge>
                        )}
                        {nft.isTrending && (
                          <Badge variant="trending" className="absolute bottom-2 right-2">
                            Tendência
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-mono font-bold text-foreground line-clamp-1">
                        {nft.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{nft.collection}</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="font-mono font-bold">{nft.priceEth} ETH</span>
                        {nft.previousPriceEth && (
                          <span className="text-xs text-muted-foreground line-through">
                            {nft.previousPriceEth} ETH
                          </span>
                        )}
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!pagination.hasPreviousPage}
                  onClick={onPrevPage}
                >
                  Anterior
                </Button>
                <span className="font-mono text-sm text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!pagination.hasNextPage}
                  onClick={onNextPage}
                >
                  Próxima
                </Button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
