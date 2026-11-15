import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EthAmount } from '@/components/common/eth-amount'
import { Link } from '@tanstack/react-router'
import { announce } from '@/lib/announce'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import { z } from 'zod'

const OrderDetailSchema = z.object({
  ok: z.boolean(),
  order: z.object({
    id: z.string(),
    status: z.enum(['pending', 'confirmed', 'refused']),
    totals: z.object({
      subtotalEth: z.string(),
      discountEth: z.string(),
      networkFeeEth: z.string(),
      totalEth: z.string(),
    }),
    transactionHash: z.string(),
    failureReason: z.string().nullable(),
    createdAt: z.string(),
    settledAt: z.string().nullable(),
    lines: z.array(
      z.object({
        lineId: z.string(),
        nftId: z.string(),
        editionId: z.string(),
        name: z.string(),
        editionLabel: z.string(),
        unitPriceEth: z.string(),
        quantity: z.number(),
        subtotalEth: z.string(),
      }),
    ),
  }),
})

export const Route = createFileRoute('/pedidos/$orderId')({
  component: OrderDetailPage,
})

function OrderDetailPage() {
  const { orderId } = Route.useParams()

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await apiRequest(OrderDetailSchema, {
        method: 'GET',
        url: API_PATHS.orders.detail(orderId),
      })
      if (!res.ok) throw new Error('Pedido não encontrado')
      return res.order
    },
    enabled: !!orderId,
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (error) {
      announce(`Erro ao carregar o pedido: ${error.message}`, 'assertive')
    } else if (data) {
      announce(`Pedido ${data.id} carregado - ${data.status}`, 'polite')
    }
  }, [error, data, orderId])

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h2 className="text-xl font-mono font-bold text-destructive">Pedido não encontrado</h2>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <Link to="/" className="button">Voltar ao catálogo</Link>
      </div>
    )
  }

  if (isPending || !data) {
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

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    refused: 'Recusado',
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main id="main-content" className="flex-1 px-4 py-8 max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-mono font-bold">Pedido #{data.id}</h1>
            <p className="text-muted-foreground">
              Detalhes da sua compra na Jungle Gaming.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={data.status === 'confirmed' ? 'default' : data.status === 'refused' ? 'destructive' : 'outline'}
            >
              {statusLabels[data.status]}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={data.status !== 'pending'}
            >
              Atualizar status
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Itens do pedido */}
          <div className="lg:col-span-2">
            <h2 className="font-mono text-lg font-bold mb-4">Itens do pedido</h2>
            <div className="space-y-4">
              {data.lines.map((line) => (
                <article
                  key={line.lineId}
                  className="rounded-lg border border-border bg-card p-4 flex gap-4 items-start"
                >
                  <div className="relative aspect-square flex-shrink-0 overflow-hidden rounded-md bg-secondary/40">
                    <img
                      src={`/images/nfts/nft${((parseInt(line.nftId.replace('nft_', '')) - 1) % 4) + 1}.png`}
                      alt={line.name}
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
                    <EthAmount amount={line.subtotalEth} showSymbol className="text-lg" />
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Resumo e recibo */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-border bg-card p-6 sticky top-24">
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Resumo do pedido
              </h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <EthAmount amount={data.totals.subtotalEth} showSymbol />
                </div>
                {data.totals.discountEth !== '0' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 font-mono">Desconto</span>
                    <span className="text-emerald-600 font-mono">-</span>
                    <EthAmount amount={data.totals.discountEth} showSymbol />
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de rede</span>
                  <EthAmount amount={data.totals.networkFeeEth} showSymbol />
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex justify-between text-xl font-mono font-bold">
                  <span>Total</span>
                  <EthAmount amount={data.totals.totalEth} showSymbol />
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg border border-border bg-secondary/40">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Transação
                </h3>
                <div className="space-y-1 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground">Hash:</span>{' '}
                    <span className="text-foreground truncate max-w-[140px] block">
                      {data.transactionHash}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Criado em:</span>{' '}
                    <span className="text-foreground">
                      {new Date(data.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {data.settledAt && (
                    <div>
                      <span className="text-muted-foreground">Liquidado em:</span>{' '}
                      <span className="text-foreground">
                        {new Date(data.settledAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                  {data.failureReason && (
                    <div className="text-destructive">
                      <span className="text-muted-foreground">Motivo:</span>{' '}
                      <span className="text-foreground">{data.failureReason}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  className="w-full"
                  disabled={data.status !== 'pending'}
                  onClick={() => {
                    if (data.status === 'pending') {
                      void fetch(`${API_BASE}/orders/${data.id}/settle`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                      }).then(() => refetch())
                    }
                  }}
                >
                  {data.status === 'pending' ? 'Verificar pagamento' : 'Visualizar recibo'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    window.location.href = '/'
                  }}
                >
                  Voltar ao catálogo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const API_BASE = '/api/v1'
