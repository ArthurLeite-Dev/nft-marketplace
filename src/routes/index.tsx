import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { announce } from '@/lib/announce'
import { useCatalog, useHighlights } from '@/features/catalog/useCatalog'
import type { NftSummary } from '@/api/contracts/nfts'

const COLLECTIONS = ['Jungle Warriors', 'Cyber Safari', 'Neon Tropics', 'Pixel Fauna', 'Golden Canopy', 'Shadow Grove', 'Emerald Hive', 'Desert Mirage', 'Frost Tundra']
const NETWORKS = ['Ethereum', 'Polygon', 'Base']
const TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Novos' },
  { value: 'trending', label: 'Em alta' },
] as const
const SORTS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'price-asc', label: 'Preço menor' },
  { value: 'price-desc', label: 'Preço maior' },
  { value: 'name', label: 'Nome' },
] as const

type Tab = (typeof TABS)[number]['value']
type Sort = (typeof SORTS)[number]['value']

/**
 * Estado do catálogo na URL (busca, filtros combináveis, ordenação e paginação). Valores padrão
 * (tab=all, sort=recent, page=1) ficam FORA da URL, então ela sempre descreve exatamente a consulta
 * enviada à API e sobrevive a refresh e a navegação pelo histórico.
 */
export interface CatalogSearch {
  q?: string
  tab?: Exclude<Tab, 'all'>
  sort?: Exclude<Sort, 'recent'>
  page?: number
  collections?: string
  networks?: string
  minPrice?: string
  maxPrice?: string
}

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

const asPrice = (value: unknown): string | undefined => {
  const s = asString(value)
  return s && /^\d+(\.\d+)?$/.test(s) ? s : undefined
}

export function validateCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const page = Number(raw.page)
  return {
    q: asString(raw.q),
    tab: raw.tab === 'new' || raw.tab === 'trending' ? raw.tab : undefined,
    sort: raw.sort === 'price-asc' || raw.sort === 'price-desc' || raw.sort === 'name' ? raw.sort : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
    collections: asString(raw.collections),
    networks: asString(raw.networks),
    minPrice: asPrice(raw.minPrice),
    maxPrice: asPrice(raw.maxPrice),
  }
}

export const Route = createFileRoute('/')({
  validateSearch: validateCatalogSearch,
  component: CatalogPage,
})

const splitList = (value: string | undefined): string[] => (value ? value.split(',').filter(Boolean) : [])

function compact(search: CatalogSearch): CatalogSearch {
  const out: CatalogSearch = {}
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined && value !== '') (out as Record<string, unknown>)[key] = value
  }
  return out
}

function CatalogPage() {
  const search = Route.useSearch() as CatalogSearch
  const navigate = useNavigate()

  const tab: Tab = search.tab ?? 'all'
  const sort: Sort = search.sort ?? 'recent'
  const page = search.page ?? 1
  const collections = splitList(search.collections)
  const networks = splitList(search.networks)
  const q = search.q ?? ''

  /** Atualiza a URL. Qualquer mudança de filtro reinicia a paginação. */
  const update = (patch: Partial<CatalogSearch>, options: { keepPage?: boolean; replace?: boolean } = {}) => {
    void navigate({
      to: '/',
      replace: options.replace ?? false,
      search: ((prev: CatalogSearch) => compact({ ...prev, ...patch, ...(options.keepPage ? {} : { page: undefined }) })) as never,
    })
  }

  // Campo de busca: estado local com debounce (evita uma requisição e uma entrada de histórico por tecla).
  const [qInput, setQInput] = useState(q)
  useEffect(() => setQInput(q), [q])
  useEffect(() => {
    if (qInput.trim() === q) return
    const id = window.setTimeout(() => update({ q: qInput.trim() || undefined }, { replace: true }), 300)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput])

  const { data, isPending, isFetching, error, refetch } = useCatalog({
    q: q || undefined,
    collections,
    networks,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    tab,
    sort,
    page,
    pageSize: 9,
  })
  const highlights = useHighlights()

  const items = data?.items ?? []
  const pagination = data?.pagination
  const hasFilters = Boolean(q || tab !== 'all' || sort !== 'recent' || collections.length || networks.length || search.minPrice || search.maxPrice)

  useEffect(() => {
    if (error) announce(`Erro ao carregar o catálogo: ${error.message}`, 'assertive')
    else if (data) announce(items.length === 0 ? 'Nenhum NFT encontrado' : `${pagination?.totalItems ?? items.length} NFTs encontrados`, 'polite')
  }, [error, data, items.length, pagination?.totalItems])

  const toggle = (list: string[], name: string) => (list.includes(name) ? list.filter((x) => x !== name) : [...list, name])

  return (
    <div className="text-foreground">
      <div className="mx-auto max-w-7xl px-4 pt-8">
        <h1 className="font-mono text-2xl font-bold sm:text-3xl">Descubra, colecione e negocie arte digital</h1>
        <p className="mt-1 text-sm text-muted-foreground">Explore coleções raras na rede Ethereum, Polygon e Base.</p>
      </div>

      {!hasFilters && page === 1 && (
        <section aria-labelledby="destaques" className="mx-auto max-w-7xl px-4 pt-8">
          <h2 id="destaques" className="mb-4 font-mono text-xl font-bold">Destaques</h2>
          {highlights.isPending ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : highlights.data && highlights.data.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.data.slice(0, 3).map((nft) => (
                <li key={nft.id}>
                  <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-md">
                    <img src={nft.artwork.url} alt={nft.artwork.alt} width={64} height={64} className="h-16 w-16 rounded-md object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate font-mono font-bold">{nft.name}</span>
                      <span className="block text-xs text-muted-foreground">{nft.collection}</span>
                      <span className="block font-mono text-sm">{nft.priceEth} ETH</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      <div role="search" aria-label="Buscar e filtrar NFTs" className="sticky top-16 z-20 mt-6 w-full border-y border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
          <div className="max-w-sm flex-1">
            <label htmlFor="catalog-search" className="sr-only">Buscar NFTs ou coleções</label>
            <Input id="catalog-search" type="search" placeholder="Buscar NFTs ou coleções…" value={qInput} onChange={(e) => setQInput(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={tab} onValueChange={(value) => update({ tab: value === 'all' ? undefined : (value as Tab as CatalogSearch['tab']) })}>
              <SelectTrigger aria-label="Filtrar por tipo"><SelectValue placeholder="Filtro" /></SelectTrigger>
              <SelectContent>
                {TABS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => update({ sort: value === 'recent' ? undefined : (value as CatalogSearch['sort']) })}>
              <SelectTrigger aria-label="Ordenar por"><SelectValue placeholder="Ordenar" /></SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={!hasFilters} onClick={() => update({ q: undefined, tab: undefined, sort: undefined, collections: undefined, networks: undefined, minPrice: undefined, maxPrice: undefined })}>
              Limpar filtros
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside aria-label="Filtros" className="flex-shrink-0 space-y-6 lg:w-64">
            <FilterGroup title="Coleções">
              {COLLECTIONS.map((c) => {
                const active = collections.includes(c)
                return (
                  <Button key={c} variant={active ? 'default' : 'outline'} size="sm" aria-pressed={active} onClick={() => update({ collections: toggle(collections, c).join(',') || undefined })} className="w-full justify-between text-left">
                    {c}
                    <Badge variant={active ? 'default' : 'outline'} className="ml-auto" aria-hidden="true">{active ? '✓' : ''}</Badge>
                  </Button>
                )
              })}
            </FilterGroup>
            <FilterGroup title="Rede">
              {NETWORKS.map((n) => {
                const active = networks.includes(n)
                return (
                  <Button key={n} variant={active ? 'default' : 'outline'} size="sm" aria-pressed={active} onClick={() => update({ networks: toggle(networks, n).join(',') || undefined })} className="w-full justify-between text-left">
                    {n}
                    <Badge variant={active ? 'default' : 'outline'} className="ml-auto" aria-hidden="true">{active ? '✓' : ''}</Badge>
                  </Button>
                )
              })}
            </FilterGroup>
            <FilterGroup title="Preço (ETH)">
              <label htmlFor="min-price" className="sr-only">Preço mínimo em ETH</label>
              <Input id="min-price" type="number" min="0" step="0.01" placeholder="Mín." defaultValue={search.minPrice ?? ''} key={`min-${search.minPrice ?? ''}`} onBlur={(e) => update({ minPrice: asPrice(e.target.value) })} className="h-9 w-full text-xs" />
              <label htmlFor="max-price" className="sr-only">Preço máximo em ETH</label>
              <Input id="max-price" type="number" min="0" step="0.01" placeholder="Máx." defaultValue={search.maxPrice ?? ''} key={`max-${search.maxPrice ?? ''}`} onBlur={(e) => update({ maxPrice: asPrice(e.target.value) })} className="h-9 w-full text-xs" />
            </FilterGroup>
          </aside>

          <section aria-labelledby="mercado" className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <h2 id="mercado" className="font-mono text-xl font-bold">Mercado</h2>
              <span className="font-mono text-sm text-muted-foreground" aria-live="polite">{pagination?.totalItems ?? 0} itens</span>
            </div>

            {error ? (
              <div role="alert" className="py-12 text-center">
                <h3 className="font-mono text-lg font-bold text-destructive">Não foi possível carregar o catálogo</h3>
                <p className="mt-2 text-muted-foreground">{error.message}</p>
                <Button className="mt-4" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
              </div>
            ) : isPending ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Carregando NFTs">
                {Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-72 w-full" />)}
              </div>
            ) : items.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-muted-foreground">Nenhum NFT encontrado com os filtros selecionados.</p>
                {hasFilters && (
                  <Button className="mt-4" variant="outline" onClick={() => update({ q: undefined, tab: undefined, sort: undefined, collections: undefined, networks: undefined, minPrice: undefined, maxPrice: undefined })}>
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <ul className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? 'opacity-70 transition-opacity' : ''}`} aria-busy={isFetching}>
                {items.map((nft) => <NftCard key={nft.id} nft={nft} />)}
              </ul>
            )}

            {pagination && pagination.totalPages > 1 && (
              <nav aria-label="Paginação" className="mt-8 flex items-center justify-between">
                <Button size="sm" variant="outline" disabled={!pagination.hasPreviousPage} onClick={() => update({ page: pagination.page - 1 }, { keepPage: true })}>Anterior</Button>
                <span className="font-mono text-sm text-muted-foreground">Página {pagination.page} de {pagination.totalPages}</span>
                <Button size="sm" variant="outline" disabled={!pagination.hasNextPage} onClick={() => update({ page: pagination.page + 1 }, { keepPage: true })}>Próxima</Button>
              </nav>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function NftCard({ nft }: { nft: NftSummary }) {
  return (
    <li>
      <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block">
        <article className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
          <div className="relative mb-3 aspect-square overflow-hidden rounded-md bg-secondary/40">
            <img src={nft.artwork.url} alt={nft.artwork.alt} width={400} height={400} className="block h-full w-full object-cover" loading="lazy" />
            {nft.isRare && <Badge className="absolute right-2 top-2">Raro</Badge>}
            {nft.isNew && <Badge variant="outline" className="absolute left-2 top-2">Novo</Badge>}
            {nft.isTrending && <Badge variant="trending" className="absolute bottom-2 right-2">Tendência</Badge>}
          </div>
          <h3 className="line-clamp-1 font-mono font-bold text-foreground">{nft.name}</h3>
          <p className="text-xs text-muted-foreground">{nft.collection}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-mono font-bold">{nft.priceEth} ETH</span>
            {nft.previousPriceEth && <span className="text-xs text-muted-foreground line-through">{nft.previousPriceEth} ETH</span>}
          </div>
        </article>
      </Link>
    </li>
  )
}
