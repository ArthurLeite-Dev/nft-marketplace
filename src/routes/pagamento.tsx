import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EthAmount } from '@/components/common/eth-amount'
import { Link } from '@tanstack/react-router'
import { announce } from '@/lib/announce'
import { multiplyEth } from '@/lib/eth'
import { useCart } from '@/features/cart/useCart'
import { useCheckout } from '@/features/checkout/useCheckout'
import { useAuth } from '@/app/auth'

const PROVIDERS = [
  { value: 'MetaMask', label: 'MetaMask' },
  { value: 'Coinbase', label: 'Coinbase Wallet' },
  { value: 'WalletConnect', label: 'WalletConnect' },
]

const NETWORKS = [
  { value: 'Ethereum', label: 'Ethereum' },
  { value: 'Polygon', label: 'Polygon' },
  { value: 'Base', label: 'Base' },
]

export const Route = createFileRoute('/pagamento')({
  component: PagamentoPage,
})

function PagamentoPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    data: cart,
    isPending: cartPending,
    error: cartError,
  } = useCart()
  const {
    createQuote,
    connectWallet,
    createOrder,
  } = useCheckout()

  const [quote, setQuote] = useState<any>(null)
  const [wallet, setWallet] = useState<{ provider: string; network: string; address: string } | null>(null)
  const [order, setOrder] = useState<any>(null)
  const [step, setStep] = useState<'quote' | 'wallet' | 'review' | 'processing' | 'result'>('quote')
  const [result, setResult] = useState<'confirmed' | 'refused' | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState('')

  useEffect(() => {
    if (cartError) {
      announce(`Erro ao carregar o carrinho: ${cartError.message}`, 'assertive')
    }
  }, [cartError])

  useEffect(() => {
    if (!cart || cart.lines.length === 0) {
      navigate({ to: '/carrinho' })
      return
    }
    createQuote.mutate(
      { network: wallet?.network ?? 'Ethereum', cartVersion: cart.version },
      {
        onSuccess: (data) => {
          setQuote(data)
          setStep('wallet')
        },
      }
    )
  }, [cart, wallet?.network, createQuote, navigate])

  const onConnectWallet = () => {
    if (!wallet) {
      connectWallet.mutate(
        {
          address: `0x${Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`,
          provider: PROVIDERS[0]!.value,
          network: NETWORKS[0]!.value,
        },
        {
          onSuccess: (data) => {
            setWallet({
              provider: data.provider,
              network: data.network,
              address: data.address,
            })
            setStep('review')
          },
        }
      )
    }
  }

  const onConfirmOrder = () => {
    if (!quote || !wallet || !user) return
    const key = `order_${user.id}_${Date.now()}`
    setIdempotencyKey(key)
    createOrder.mutate(
      {
        idempotencyKey: key,
        network: wallet.network,
        provider: wallet.provider,
        walletAddress: wallet.address,
        quote,
      },
      {
        onSuccess: (res) => {
          setOrder(res.order)
          setStep('processing')
          setTimeout(() => {
            const status = res.order.status
            if (status === 'confirmed') {
              setResult('confirmed')
              setStep('result')
            } else if (status === 'refused') {
              setResult('refused')
              setStep('result')
            } else {
              setStep('result')
              setResult(null)
            }
          }, 1500)
        },
      }
    )
  }

  const onRetryOrder = () => {
    if (!quote || !wallet || !user || !idempotencyKey) return
    createOrder.mutate(
      {
        idempotencyKey,
        network: wallet.network,
        provider: wallet.provider,
        walletAddress: wallet.address,
        quote,
      },
      {
        onSuccess: (res) => {
          setOrder(res.order)
          setStep('processing')
          setTimeout(() => {
            const status = res.order.status
            if (status === 'confirmed') {
              setResult('confirmed')
              setStep('result')
            } else if (status === 'refused') {
              setResult('refused')
              setStep('result')
            } else {
              setStep('result')
              setResult(null)
            }
          }, 1500)
        },
      }
    )
  }

  if (cartError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h2 className="text-xl font-mono font-bold text-destructive">Erro ao carregar o carrinho</h2>
        <p className="mt-2 text-muted-foreground">{cartError.message}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (cartPending || !cart) {
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

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h2 className="text-xl font-mono font-bold">Faça login para continuar</h2>
        <p className="mt-2 text-muted-foreground">
          É necessário estar autenticado para finalizar a compra.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Button type="button" onClick={() => navigate({ to: '/entrar' })}>
            Entrar
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/cadastro' })}>
            Criar conta
          </Button>
        </div>
      </div>
    )
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Seu carrinho está vazio.</p>
        <Link to="/" className="button">Ir para o catálogo</Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main id="main-content" className="flex-1 px-4 py-8 max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-mono font-bold">Pagamento</h1>
            <p className="text-muted-foreground">
              Revise seu pedido e confirme a compra.
            </p>
          </div>
          <Link to="/carrinho" className="button">Voltar ao carrinho</Link>
        </div>

        {/* Passo 1: Cotação */}
        {step === 'quote' && (
          <div className="space-y-6">
            <h2 className="font-mono text-lg font-bold">Cotação</h2>
            <p className="text-muted-foreground">
              Calculando totais do seu pedido…
            </p>
            {createQuote.isPending && (
              <div className="flex flex-col gap-4">
                <div className="h-6 w-48 rounded-xl bg-secondary/40 shimmer" />
                <div className="h-16 w-full rounded-xl bg-secondary/40 shimmer" />
              </div>
            )}
          </div>
        )}

        {/* Passo 2: Carteira */}
        {step === 'wallet' && (
          <div className="space-y-6">
            <h2 className="font-mono text-lg font-bold">Carteira e rede</h2>
            <p className="text-muted-foreground">
              Selecione a carteira e a rede para pagamento.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-mono text-foreground">Provedor</label>
                <div className="flex flex-col gap-2">
                  {PROVIDERS.map((p) => (
                    <Button
                      key={p.value}
                      type="button"
                      variant={wallet?.provider === p.value ? 'default' : 'outline'}
                      onClick={() => {
                        const nextNetwork = wallet?.network ?? NETWORKS[0]!.value
                        connectWallet.mutate(
                          {
                            address: wallet?.address ?? `0x${Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`,
                            provider: p.value,
                            network: nextNetwork,
                          },
                          {
                            onSuccess: (data) => {
                              setWallet({
                                provider: data.provider,
                                network: data.network,
                                address: data.address,
                              })
                              setStep('review')
                            },
                          }
                        )
                      }}
                      className="w-full text-left justify-between"
                    >
                      {p.label}
                      <Badge variant={wallet?.provider === p.value ? 'default' : 'outline'}>
                        {wallet?.provider === p.value ? '✓' : ''}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-mono text-foreground">Rede</label>
                <div className="flex flex-col gap-2">
                  {NETWORKS.map((n) => (
                    <Button
                      key={n.value}
                      type="button"
                      variant={wallet?.network === n.value ? 'default' : 'outline'}
                      onClick={() => {
                        const nextProvider = wallet?.provider ?? PROVIDERS[0]!.value
                        connectWallet.mutate(
                          {
                            address: wallet?.address ?? `0x${Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`,
                            provider: nextProvider,
                            network: n.value,
                          },
                          {
                            onSuccess: (data) => {
                              setWallet({
                                provider: data.provider,
                                network: data.network,
                                address: data.address,
                              })
                              setStep('review')
                            },
                          }
                        )
                      }}
                      className="w-full text-left justify-between"
                    >
                      {n.label}
                      <Badge variant={wallet?.network === n.value ? 'default' : 'outline'}>
                        {wallet?.network === n.value ? '✓' : ''}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                disabled={connectWallet.isPending || !wallet}
                onClick={() => {
                  if (!wallet) onConnectWallet()
                  else setStep('review')
                }}
              >
                {connectWallet.isPending ? 'Conectando…' : wallet ? 'Revisar pedido' : 'Conectar carteira'}
              </Button>
            </div>
          </div>
        )}

        {/* Passo 3: Revisão do pedido */}
        {step === 'review' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="font-mono text-lg font-bold mb-4">Itens do pedido</h2>
              <div className="space-y-4">
                {cart.lines.map((line) => (
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
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono font-bold text-foreground line-clamp-1">
                        {line.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{line.editionLabel}</p>
                      <div className="mt-1 flex items-baseline gap-1">
                        <EthAmount amount={line.unitPriceEth} showSymbol />
                        <span className="text-xs text-muted-foreground ml-1">× {line.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <EthAmount
                        amount={multiplyEth(line.unitPriceEth, line.quantity)}
                        showSymbol
                        className="font-mono font-bold"
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="rounded-lg border border-border bg-card p-6 sticky top-24">
                <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  Resumo do pedido
                </h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <EthAmount amount={quote.totals.subtotalEth} showSymbol />
                  </div>
                  {quote.couponCode && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 font-mono">
                        Desconto ({quote.couponCode})
                      </span>
                      <span className="text-emerald-600 font-mono">-</span>
                      <EthAmount amount={quote.totals.discountEth} showSymbol />
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de rede ({wallet?.network ?? 'Ethereum'})</span>
                    <EthAmount amount={quote.totals.networkFeeEth} showSymbol />
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between text-xl font-mono font-bold">
                    <span>Total</span>
                    <EthAmount amount={quote.totals.totalEth} showSymbol />
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-xs text-muted-foreground mb-2">
                    Chave de idempotência: <span className="font-mono text-xs">{idempotencyKey || 'gerada ao confirmar'}</span>
                  </p>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={createOrder.isPending || !quote || !wallet || !user}
                    onClick={onConfirmOrder}
                  >
                    {createOrder.isPending ? 'Processando pedido…' : 'Confirmar compra'}
                  </Button>
                  {createOrder.isError && (
                    <div className="mt-3 p-3 rounded-lg border border-destructive bg-destructive/10">
                      <p className="text-sm text-destructive font-mono">
                        {createOrder.error.message}
                        {idempotencyKey && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onRetryOrder}
                            className="mt-2"
                          >
                            Tentar novamente (mesma chave)
                          </Button>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Passo 4: Processamento */}
        {step === 'processing' && (
          <div className="py-20 text-center">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-4 animate-spin" />
            <h2 className="font-mono text-xl font-bold">Processando pagamento</h2>
            <p className="text-muted-foreground mt-2">
              Aguarde enquanto confirmamos sua transação na {wallet?.network ?? 'Ethereum'}.
            </p>
          </div>
        )}

        {/* Passo 5: Resultado */}
        {step === 'result' && (
          <div className="py-20 text-center">
            {result === 'confirmed' ? (
              <>
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-4 font-mono font-bold text-xl">
                  ✓
                </div>
                <h2 className="font-mono text-2xl font-bold">Pagamento confirmado</h2>
                <p className="text-muted-foreground mt-2">
                  Seu pedido foi confirmado com sucesso.
                </p>
                <div className="mt-8 p-6 rounded-lg border border-border bg-card">
                  <h3 className="font-mono text-lg font-bold mb-4">Recibo do pedido</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Número do pedido</span>
                      <span className="font-mono">{order?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-mono text-emerald-600">Confirmado</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-mono font-bold">
                        <EthAmount amount={order.totals.totalEth} showSymbol />
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transação</span>
                      <span className="font-mono text-xs">{order.transactionHash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data</span>
                      <span className="font-mono text-xs">{order.createdAt}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate({ to: '/' })}
                  >
                    Voltar ao catálogo
                  </Button>
                </div>
              </>
            ) : result === 'refused' ? (
              <>
                <div className="h-16 w-16 rounded-full bg-destructive/20 text-destructive flex items-center justify-center mx-auto mb-4 font-mono font-bold text-xl">
                  !
                </div>
                <h2 className="font-mono text-2xl font-bold text-destructive">Pagamento recusado</h2>
                <p className="text-muted-foreground mt-2">
                  Sua transação não pôde ser concluída. Os itens permanecem no seu carrinho.
                </p>
                <div className="mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate({ to: '/carrinho' })}
                  >
                    Voltar ao carrinho
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-mono text-2xl font-bold">Pedido pendente</h2>
                <p className="text-muted-foreground mt-2">
                  Seu pedido está sendo processado. Acompanhe o status abaixo.
                </p>
                <div className="mt-8 p-6 rounded-lg border border-border bg-card">
                  <h3 className="font-mono text-lg font-bold mb-4">Pedido {order?.id}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-mono text-yellow-600">Pendente</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-mono font-bold">
                        <EthAmount amount={order.totals.totalEth} showSymbol />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-8">
                  <Link to={`/pedidos/${order.id}`} className="button">
                    Ver detalhes do pedido
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
