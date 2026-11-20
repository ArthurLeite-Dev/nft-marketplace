import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { QuantityStepper } from '@/components/common/quantity-stepper'
import { EthAmount } from '@/components/common/eth-amount'
import { Link } from '@tanstack/react-router'
import { announce } from '@/lib/announce'
import { multiplyEth } from '@/lib/eth'
import { useCart } from '@/features/cart/useCart'
import { useAuth } from '@/app/auth'
import { ApiError } from '@/api/errors'
import { useRealtimeSignal } from '@/realtime/signals'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [couponCode, setCouponCode] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const {
    data: cart,
    isPending,
    error,
    refetch,
    updateQuantity,
    removeLine,
    applyCoupon,
    removeCoupon,
    acceptPrice,
  } = useCart()
  const mutating = updateQuantity.isPending || removeLine.isPending || applyCoupon.isPending || removeCoupon.isPending || acceptPrice.isPending

  // Alteração de preço/disponibilidade recebida (Socket.IO) enquanto o carrinho está aberto:
  // o resumo é relido do servidor e o usuário é informado.
  useRealtimeSignal((signal) => {
    if (signal.type !== 'nft-changed') return
    if (cart?.lines.some((l) => l.nftId === signal.nftId)) {
      setNotice('Um item do seu carrinho mudou de preço ou disponibilidade. O resumo foi atualizado; revise antes de continuar.')
    }
  })

  useEffect(() => {
    if (error) {
      announce(`Erro ao carregar o carrinho: ${error.message}`, 'assertive')
    } else if (cart) {
      const nItens = cart.lines.reduce((acc, l) => acc + l.quantity, 0)
      announce(`Carrinho com ${nItens} item${nItens !== 1 ? 's' : ''}`, 'polite')
    }
  }, [error, cart])

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h1 className="text-xl font-mono font-bold text-destructive" role="alert">
          Não foi possível carregar o carrinho
        </h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <Button onClick={() => refetch()} variant="outline" className="mt-4">
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (isPending || !cart || !cart.lines) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-4">
          <div className="h-6 w-48 rounded-xl bg-secondary/40 shimmer" />
          <div className="h-16 w-full rounded-xl bg-secondary/40 shimmer" />
          <div className="h-6 w-96 rounded-xl bg-secondary/40 shimmer" />
        </div>
      </div>
    )
  }

  const lines = cart?.lines ?? []
  const hasBlocked = lines.some((l) => l.status !== 'available')
  const hasUnavailable = lines.some((l) => l.status === 'unavailable')
  const cartTotals = cart?.totals ?? { subtotalEth: '0', discountEth: '0', networkFeeEth: '0', totalEth: '0' }

  const onChangeQty = (lineId: string, qty: number) => {
    updateQuantity.mutate({ lineId, quantity: qty })
  }

  const onRemove = (lineId: string) => {
    removeLine.mutate(lineId)
  }

  const onApplyCoupon = () => {
    if (couponCode.trim()) applyCoupon.mutate({ code: couponCode.trim() })
  }

  const onRemoveCoupon = () => {
    setCouponCode('')
    removeCoupon.mutate()
  }

  const onCheckout = () => {
    // O checkout exige autenticação; os itens do visitante são preservados ao entrar (merge do carrinho).
    if (!user) {
      void navigate({ to: '/entrar', search: { redirect: '/pagamento' } as never })
      return
    }
    void navigate({ to: '/pagamento' })
  }

  const couponError = applyCoupon.error instanceof ApiError ? (applyCoupon.error.fields?.code ?? applyCoupon.error.message) : applyCoupon.error?.message

  return (
    <div className="text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-mono font-bold">Carrinho</h1>
            <p className="text-muted-foreground">
              Revise seus itens antes de finalizar a compra.
            </p>
          </div>
          <Link to="/" className="button">Continuar comprando</Link>
        </div>

        {notice && (
          <p role="status" className="mb-6 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
            {notice}
          </p>
        )}

        {lines.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">Seu carrinho está vazio.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => navigate({ to: '/' })}
            >
              Ir para o catálogo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              {lines.map((line) => (
                <article
                  key={line.lineId}
                  className="rounded-lg border border-border bg-card p-4 flex gap-4 items-start"
                >
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-secondary/40">
                    <img
                      src={line.artwork.url}
                      alt={line.artwork.alt}
                      width={96}
                      height={96}
                      className="block h-full w-full object-cover"
                    />
                    {line.status === 'unavailable' && (
                      <Badge className="absolute top-2 right-2 text-destructive border-destructive">
                        Indisponível
                      </Badge>
                    )}
                    {line.status === 'price-changed' && (
                      <Badge variant="outline" className="absolute top-2 right-2">
                        Preço atualizado
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-mono font-bold text-foreground line-clamp-1">
                      {line.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{line.editionLabel}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <EthAmount amount={line.unitPriceEth} showSymbol />
                      {line.previousUnitPriceEth && (
                        <span className="text-xs text-muted-foreground line-through ml-1">
                          {line.previousUnitPriceEth} ETH
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <QuantityStepper
                        value={line.quantity}
                        min={1}
                        max={line.maxQuantity}
                        onChange={(qty) => onChangeQty(line.lineId, qty)}
                        disabled={line.status !== 'available' || mutating}
                        ariaLabel={`Quantidade de ${line.name}`}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRemove(line.lineId)}
                        disabled={mutating}
                        aria-label="Remover item"
                      >
                        <span className="sr-only">Remover item</span>
                        ×
                      </Button>
                    </div>
                    {line.status !== 'available' && (
                      <div className="mt-2 space-y-2" role="status">
                        <p className="text-xs text-destructive">
                          {line.statusReason ?? (line.status === 'unavailable' ? 'Esta edição está indisponível.' : 'O preço desta edição foi atualizado.')}
                        </p>
                        {line.status === 'price-changed' && (
                          <Button type="button" size="sm" variant="outline" disabled={mutating} onClick={() => acceptPrice.mutate({ lineId: line.lineId })}>
                            Aceitar novo preço
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <EthAmount
                      amount={multiplyEth(line.unitPriceEth, line.quantity)}
                      showSymbol
                      className="text-lg"
                    />
                  </div>
                </article>
              ))}
              {hasUnavailable && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                  <p className="text-sm text-destructive font-mono">
                    Alguns itens do carrinho estão indisponíveis. Remova-os antes de seguir para o pagamento.
                  </p>
                </div>
              )}
            </div>
            <div className="lg:col-span-1">
              <div className="rounded-lg border border-border bg-card p-6 sticky top-24">
                <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  Resumo
                </h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <EthAmount amount={cartTotals.subtotalEth} showSymbol />
                  </div>
                  {cart.couponCode && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 font-mono">
                        Desconto ({cart.couponCode})
                      </span>
                      <span className="text-emerald-600 font-mono">-</span>
                      <EthAmount amount={cartTotals.discountEth} showSymbol />
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de rede</span>
                    <EthAmount amount={cartTotals.networkFeeEth} showSymbol />
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between text-lg font-mono font-bold">
                    <span>Total</span>
                    <EthAmount amount={cartTotals.totalEth} showSymbol />
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <label htmlFor="coupon-code" className="text-sm font-mono text-foreground">Código do cupom</label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon-code"
                      type="text"
                      aria-invalid={!!couponError}
                      aria-describedby={couponError ? 'coupon-error' : undefined}
                      value={couponCode}
                      placeholder="Digite o cupom"
                      onChange={(e) => setCouponCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && onApplyCoupon()}
                      disabled={mutating || !cart}
                      className="h-9 text-sm flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={onApplyCoupon}
                      disabled={mutating || !cart || !couponCode.trim()}
                    >
                      Aplicar
                    </Button>
                  </div>
                  {couponError && (
                    <p id="coupon-error" role="alert" className="text-xs font-mono text-destructive">{couponError}</p>
                  )}
                  {cart.couponCode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onRemoveCoupon}
                      disabled={mutating}
                      className="mt-2"
                    >
                      Remover cupom
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  className="w-full mt-4"
                  disabled={hasBlocked || mutating || !cart || lines.length === 0}
                  onClick={onCheckout}
                >
                  {mutating ? 'Processando…' : hasBlocked ? 'Revise os itens do carrinho' : 'Finalizar compra'}
                </Button>
                {!user && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Você será levado ao login para finalizar a compra; seus itens serão mantidos.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
