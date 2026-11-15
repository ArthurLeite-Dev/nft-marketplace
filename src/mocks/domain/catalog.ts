import type { DbNft } from '../db/types'
import { getDbRaw } from '../db/store'
import { compareEth } from '../../lib/eth'

export interface CatalogFilters {
  q?: string
  collections?: string[]
  networks?: string[]
  minPrice?: string
  maxPrice?: string
  tab?: 'all' | 'new' | 'trending'
  sort?: 'recent' | 'price-asc' | 'price-desc' | 'name'
  page?: number
  pageSize?: number
}

export interface CatalogPage {
  items: DbNft[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function normalizeCollection(value: string): string {
  return value.trim().toLowerCase().replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/ç/g, 'c')
}

export function matchesText(nft: DbNft, query: string): boolean {
  const q = normalizeCollection(query)
  return (
    normalizeCollection(nft.name).includes(q) ||
    normalizeCollection(nft.collection).includes(q)
  )
}

export function matchesCollection(nft: DbNft, collections: string[]): boolean {
  if (collections.length === 0) return true
  const normalized = collections.map(normalizeCollection)
  return normalized.some((c) => normalizeCollection(nft.collection) === c)
}

export function matchesNetwork(nft: DbNft, networks: string[]): boolean {
  if (networks.length === 0) return true
  return networks.some((n) => n === nft.network)
}

export function matchesPrice(nft: DbNft, minPrice?: string, maxPrice?: string): boolean {
  const price = nft.priceEth
  if (minPrice) {
    if (compareEth(price, minPrice) < 0) return false
  }
  if (maxPrice) {
    if (compareEth(price, maxPrice) > 0) return false
  }
  return true
}

export function matchesTab(nft: DbNft, tab: CatalogFilters['tab']): boolean {
  if (tab === 'all') return true
  if (tab === 'new') return nft.isNew
  return nft.isTrending
}

export function sortNfts(items: DbNft[], sort: CatalogFilters['sort']): DbNft[] {
  const sorted = [...items]
  if (sort === 'price-asc') {
    sorted.sort((a, b) => compareEth(a.priceEth, b.priceEth))
  } else if (sort === 'price-desc') {
    sorted.sort((a, b) => compareEth(b.priceEth, a.priceEth))
  } else if (sort === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  } else {
    sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  }
  return sorted
}

export function getCatalogPage(filters: CatalogFilters): CatalogPage {
  const db = getDbRaw()
  let items = db.nfts.filter((nft) =>
    matchesText(nft, filters.q ?? '') &&
    matchesCollection(nft, filters.collections ?? []) &&
    matchesNetwork(nft, filters.networks ?? []) &&
    matchesPrice(nft, filters.minPrice, filters.maxPrice) &&
    matchesTab(nft, filters.tab ?? 'all')
  )

  const totalItems = items.length
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = filters.pageSize ?? 9
  const sorted = sortNfts(items, filters.sort ?? 'recent')
  const totalPages = Math.ceil(totalItems / pageSize)
  const clampedPage = Math.min(page, totalPages || 1)
  const start = (clampedPage - 1) * pageSize
  const pageItems = sorted.slice(start, start + pageSize)

  return {
    items: pageItems,
    pagination: {
      page: clampedPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: clampedPage < totalPages,
      hasPreviousPage: clampedPage > 1,
    },
  }
}

export function getNftById(nftId: string): DbNft | undefined {
  return getDbRaw().nfts.find((n) => n.id === nftId)
}

export function getRelatedNfts(nftId: string, limit = 4): DbNft[] {
  return getDbRaw().nfts.filter((n) => n.id !== nftId).slice(0, limit)
}

export function getHighlights(limit = 4): DbNft[] {
  return getDbRaw().nfts.filter((n) => n.isRare || n.isNew || n.isTrending).slice(0, limit)
}

export function getFacets() {
  const db = getDbRaw()
  const collectionCounts: Record<string, number> = {}
  const networkCounts: Record<string, number> = {}
  const prices: number[] = []
  for (const nft of db.nfts) {
    collectionCounts[nft.collection] = (collectionCounts[nft.collection] ?? 0) + 1
    networkCounts[nft.network] = (networkCounts[nft.network] ?? 0) + 1
    prices.push(parseFloat(nft.priceEth))
  }
  return {
    collections: Object.entries(collectionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    networks: Object.entries(networkCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
  }
}
