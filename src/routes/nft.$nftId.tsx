import { createFileRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { QuantityStepper } from '@/components/common/quantity-stepper'
import { EthAmount } from '@/components/common/eth-amount'
import { Link } from '@tanstack/react-router'
import { announce } from '@/lib/announce'
import { useNft, useRelatedNfts } from '@/features/nft/useNft'
import { useFavorites } from '@/features/favorites/useFavorite'
import { useCart } from '@/features/cart/useCart'
import { useAuth } from '@/app/auth'
import { ApiError } from '@/api/errors'
import { useRealtimeSignal } from '@/realtime/signals'

export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: nft, isPending: nftPending, error: nftError, refetch } = useNft(nftId)
  const { data: related, isPending: relatedPending } = useRelatedNfts(nftId)
  const { isFavorite, toggleFavorite, isToggling } = useFavorites()
  const { addItem } = useCart()

  // A edição selecionada é DERIVADA: enquanto o usuário não escolhe, vale a edição padrão do NFT
  // carregado (antes o estado era inicializado com o NFT ainda indefinido e todos apareciam "Esgotado").
  const [pickedEditionId, setPickedEditionId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setPickedEditionId('')
    setQuantity(1)
    setImageIndex(0)
    setNotice(null)
  }, [nftId])

  // Alterações recebidas via Socket.IO enquanto a página está aberta.
  useRealtimeSignal((signal) => {
    if (signal.type !== 'nft-changed' || signal.nftId !== nftId) return
    setNotice(
      signal.soldOutEditionIds.length > 0
        ? 'A disponibilidade deste NFT mudou: uma edição esgotou.'
        : signal.previousPriceEth
          ? `O preço deste NFT mudou de ${signal.previousPriceEth} ETH para ${signal.priceEth} ETH.`
          : 'Os dados deste NFT foram atualizados.',
    )
  })

  const selectedEditionId =
    nft?.editions.find((e) => e.id === pickedEditionId)?.id ??
    (nft?.editions.find((e) => e.id === nft.defaultEditionId) ?? nft?.editions[0])?.id ??
    ''
  const selectedEdition = nft?.editions.find((e) => e.id === selectedEditionId)
  const editionMax = selectedEdition ? (selectedEdition.isSoldOut ? 0 : Math.min(selectedEdition.maxPerOrder, selectedEdition.available ?? selectedEdition.maxPerOrder)) : 0

  // Mantém a quantidade dentro do limite quando edição ou disponibilidade mudam.
  useEffect(() => {
    if (editionMax > 0 && quantity > editionMax) setQuantity(editionMax)
  }, [editionMax, quantity])

  const isFavorited = nft ? isFavorite(nft.id) : false

  useEffect(() => {
    if (nftError) {
      announce(`Erro ao carregar o NFT: ${nftError.message}`, 'assertive')
    } else if (nft) {
      announce(`Detalhe de ${nft.name} carregado`, 'polite')
    }
  }, [nftError, nft?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (nftError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h1 className="text-xl font-mono font-bold text-destructive">
          {nftError instanceof ApiError && nftError.status === 404 ? 'NFT não encontrado' : 'Não foi possível carregar o NFT'}
        </h1>
        <p className="mt-2 text-muted-foreground">{nftError.message}</p>
        <div className="mt-4 flex justify-center gap-3">
          {!(nftError instanceof ApiError && nftError.status === 404) && <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button>}
          <Link to="/" className="button">Voltar ao catálogo</Link>
        </div>
      </div>
    )
  }

  if (nftPending || !nft) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-secondary/40 shimmer" />
            ))}
          </div>
          <div className="lg:col-span-5 space-y-4">
            <div className="h-16 rounded-xl bg-secondary/40 shimmer" />
            <div className="h-10 rounded-xl bg-secondary/40 shimmer" />
            <div className="h-8 rounded-xl bg-secondary/40 shimmer" />
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-3 rounded-xl bg-secondary/40 shimmer" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const edition = selectedEdition
  const images = [nft.artwork, ...nft.gallery]
  const maxQty = editionMax
  const isSoldOut = edition ? edition.isSoldOut || maxQty <= 0 : true
  // Visitantes podem montar o carrinho; o login é exigido no checkout (os itens são preservados).
  const canBuy = !isSoldOut && quantity > 0 && !!edition

  const handleToggleFavorite = () => {
    if (!user) {
      void navigate({ to: '/entrar', search: { redirect: location.href } as never })
      return
    }
    toggleFavorite.mutate({ nftId: nft.id, currentlyFavorited: isFavorited })
  }

  const handleAddToCart = () => {
    if (!edition) return
    addItem.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => announce(`${nft.name} adicionado ao carrinho.`),
        onError: (error) => announce(error.message, 'assertive'),
      },
    )
  }

  return (
    <div className="text-foreground">
      <div className="mx-auto max-w-7xl flex-1 px-4 py-8">
        {notice && (
          <p role="status" className="mb-6 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
            {notice}
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Galeria */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary/40">
              <img
                src={images[imageIndex]?.url ?? nft.artwork.url}
                alt={images[imageIndex]?.alt ?? nft.artwork.alt}
                width={800}
                height={800}
                className="block h-full w-full object-cover"
              />
              {nft.isRare && <Badge className="absolute right-3 top-3">Raro</Badge>}
              {nft.isNew && (
                <Badge variant="outline" className="absolute left-3 top-3">
                  Novo
                </Badge>
              )}
            </div>
            <ul className="flex gap-2 overflow-x-auto pb-2" aria-label="Imagens do NFT">
              {images.map((img, i) => (
                <li key={`${img.url}-${i}`}>
                  <button
                    type="button"
                    onClick={() => setImageIndex(i)}
                    aria-label={`Ver imagem ${i + 1} de ${images.length}`}
                    aria-pressed={i === imageIndex}
                    className={`block rounded-md border-2 focus-visible:outline-2 focus-visible:outline-primary ${i === imageIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img.url} alt="" width={64} height={64} className="h-16 w-16 rounded-md object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Informações e ação */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <Badge variant={nft.isRare ? 'rare' : 'default'}>{nft.network}</Badge>
              <Badge variant={nft.isTrending ? 'trending' : 'outline'}>
                {nft.collection}
              </Badge>
            </div>
            <h1 className="text-2xl font-mono font-bold">{nft.name}</h1>
            <p className="text-muted-foreground">{nft.description ?? 'Sem descrição disponível.'}</p>

            <div className="space-y-3">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Edição
              </h3>
              <RadioGroup
                value={selectedEditionId}
                onValueChange={setPickedEditionId}
                className="grid grid-cols-1 gap-2"
              >
                {nft.editions.map((ed) => {
                  const available = ed.available ?? null
                  const disabled = ed.isSoldOut || (available !== null && available <= 0)
                  return (
                    <RadioGroupItem
                      key={ed.id}
                      value={ed.id}
                      disabled={disabled}
                      className="peer"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 peer-checked:bg-primary/10 peer-checked:border-primary">
                        <div>
                          <span className="font-mono font-semibold">{ed.label}</span>
                          <p className="text-xs text-muted-foreground">
                            {ed.type === 'open' ? 'Aberta' : ed.type}
                          </p>
                        </div>
                        <div className="text-right">
                          <EthAmount amount={ed.priceEth} />
                          {disabled ? (
                            <span className="text-xs text-destructive">Esgotado</span>
                          ) : available !== null ? (
                            <span className="text-xs text-muted-foreground">
                              {available} disponível
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </RadioGroupItem>
                  )
                })}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Quantidade
              </h3>
              <QuantityStepper
                value={quantity}
                min={1}
                max={maxQty > 0 ? maxQty : 1}
                onChange={setQuantity}
                disabled={isSoldOut || !edition}
              />
              <p className="text-xs text-muted-foreground">
                Limite por pedido: {edition ? edition.maxPerOrder : 0}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Total
              </h3>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-lg font-bold">
                  <EthAmount amount={edition ? edition.priceEth : '0'} showSymbol />
                  {quantity > 1 && (
                    <span className="ml-1 text-xs text-muted-foreground font-normal">
                      × {quantity}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {isSoldOut ? 'Esgotado' : 'Disponível'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                disabled={addItem.isPending || !canBuy}
                className="w-full"
              >
                {addItem.isPending ? 'Adicionando…' : isSoldOut ? 'Esgotado' : 'Adicionar ao carrinho'}
              </Button>

              <Button
                onClick={handleToggleFavorite}
                disabled={isToggling}
                aria-pressed={isFavorited}
                variant="outline"
                className="w-full"
              >
                {isToggling ? (isFavorited ? 'Removendo…' : 'Adicionando…') : isFavorited ? 'Favoritado' : 'Favoritar'}
              </Button>

              {!user && (
                <p className="text-center text-xs text-muted-foreground">
                  Você pode montar o carrinho agora; o login é pedido ao finalizar a compra.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Relacionados */}
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-mono text-lg font-bold mb-4">Você também pode gostar</h2>
          {relatedPending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-secondary/40 shimmer" />
              ))}
            </div>
          ) : (related?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground">Sem relacionados no momento.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related?.map((item) => (
                <Link
                  key={item.id}
                  to="/nft/$nftId"
                  params={{ nftId: item.id }}
                  className="block"
                >
                  <article className="rounded-lg border border-border bg-card p-3">
                    <div className="aspect-square overflow-hidden rounded-md mb-2 bg-secondary/40">
                      <img
                        src={item.artwork.url}
                        alt={item.artwork.alt}
                        width={300}
                        height={300}
                        loading="lazy"
                        className="block w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-mono font-bold text-sm line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">{item.collection}</p>
                    <div className="mt-1 font-mono font-bold">
                      <EthAmount amount={item.priceEth} showSymbol />
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
