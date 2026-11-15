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

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [couponCode, setCouponCode] = useState('')
  const {
    data: cart,
    isPending,
    error,
    updateQuantity,
    removeLine,
    applyCoupon,
    removeCoupon,
    isPending: mutating,
  } = useCart()

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
        <h2 className="text-xl font-mono font-bold text-destructive">
          Não foi possível carregar o carrinho
        </h2>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
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
    navigate({ to: '/pagamento' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main id="main-content" className="flex-1 px-4 py-8 max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-mono font-bold">Carrinho</h1>
            <p className="text-muted-foreground">
              Revise seus itens antes de finalizar a compra.
            </p>
          </div>
          <Link to="/" className="button">Continuar comprando</Link>
        </div>

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
                  <div className="relative aspect-square flex-shrink-0 overflow-hidden rounded-md bg-secondary/40">
                    <img
                      src={line.artwork.url}
                      alt={line.artwork.alt}
                      className="block w-full h-full object-cover"
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
                      <p className="mt-2 text-xs text-destructive">
                        {line.status === 'unavailable'
                          ? 'Esta edição está esgotada.'
                          : 'O preço desta edição foi atualizado. Revise a quantidade.'}
                      </p>
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
                  {cart.coupon?.code && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 font-mono">
                        Desconto ({cart.coupon?.code})
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
                  <label className="text-sm font-mono text-foreground">Código do cupom</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
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
                  {cart.coupon?.code && (
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
                  {mutating ? 'Processando…' : hasBlocked ? 'Itens indisponíveis' : 'Finalizar compra'}
                </Button>
                {!user && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full mt-2 text-sm text-muted-foreground"
                    disabled
                  >
                    Faça login para finalizar a compra
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
