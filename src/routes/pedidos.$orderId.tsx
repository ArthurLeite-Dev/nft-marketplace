import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EthAmount } from '@/components/common/eth-amount'
import { RequireAuth } from '@/components/common/require-auth'
import { ApiError } from '@/api/errors'
import { useOrder } from '@/features/checkout/useCheckout'

export const Route = createFileRoute('/pedidos/$orderId')({
  component: () => (
    <RequireAuth>
      <OrderPage />
    </RequireAuth>
  ),
})

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—')

/**
 * Confirmação do pedido. A tela só mostra "confirmado" para um pedido CONFIRMADO pela simulação;
 * pendente e recusado têm telas próprias. O recibo vem do snapshot do pedido (não do catálogo atual)
 * e o estado é atualizado por order.updated (Socket.IO) e, como rede de segurança, por polling.
 */
function OrderPage() {
  const { orderId } = Route.useParams()
  const { data: order, isPending, error, refetch } = useOrder(orderId)
  const [copied, setCopied] = useState(false)

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12" aria-busy="true" aria-label="Carregando pedido">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !order) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" role="alert">
        <h1 className="font-mono text-2xl font-bold">{notFound ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}</h1>
        <p className="mt-2 text-muted-foreground">{error?.message}</p>
        <div className="mt-6 flex justify-center gap-3">
          {!notFound && <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button>}
          <Link to="/" className="button">Voltar ao catálogo</Link>
        </div>
      </div>
    )
  }

  const onCopy = async () => {
    if (!order.transactionHash) return
    try {
      await navigator.clipboard.writeText(order.transactionHash)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-foreground">
      {order.status === 'pending' && (
        <div role="status" className="mb-8 text-center">
          <h1 className="font-mono text-2xl font-bold">Aguardando confirmação</h1>
          <p className="mt-2 text-muted-foreground">Estamos confirmando seu pagamento na rede {order.network}. Você pode recarregar a página: o pedido será recuperado.</p>
          <div className="mx-auto mt-4 h-2 w-48 overflow-hidden rounded bg-secondary"><div className="shimmer h-full w-full" /></div>
        </div>
      )}
      {order.status === 'confirmed' && (
        <div role="status" className="mb-8 text-center">
          <h1 className="font-mono text-2xl font-bold text-primary">Pedido confirmado</h1>
          <p className="mt-2 text-muted-foreground">Seu pagamento foi confirmado na simulação. Guarde o comprovante abaixo.</p>
        </div>
      )}
      {order.status === 'refused' && (
        <div role="alert" className="mb-8 text-center">
          <h1 className="font-mono text-2xl font-bold text-destructive">Pagamento recusado</h1>
          <p className="mt-2 text-muted-foreground">{order.failureReason ?? 'O pagamento não foi aprovado.'} Seus itens continuam no carrinho e nada foi cobrado.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link to="/carrinho" className="button">Voltar ao carrinho</Link>
            <Link to="/pagamento" className="button">Tentar novamente</Link>
          </div>
        </div>
      )}

      <section aria-labelledby="receipt" className="rounded-lg border border-border bg-card p-5">
        <h2 id="receipt" className="mb-4 font-mono text-lg font-bold">Comprovante</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Pedido</dt><dd className="font-mono">{order.id}</dd></div>
          <div><dt className="text-muted-foreground">Status</dt><dd>{order.status === 'confirmed' ? 'Confirmado' : order.status === 'pending' ? 'Pendente' : 'Recusado'}</dd></div>
          <div><dt className="text-muted-foreground">Rede</dt><dd>{order.network}</dd></div>
          <div><dt className="text-muted-foreground">Carteira</dt><dd>{order.provider}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted-foreground">Endereço</dt><dd className="break-all font-mono text-xs">{order.walletAddress}</dd></div>
          <div><dt className="text-muted-foreground">Criado em</dt><dd>{formatDate(order.createdAt)}</dd></div>
          <div><dt className="text-muted-foreground">Liquidado em</dt><dd>{formatDate(order.settledAt)}</dd></div>
          {order.status === 'confirmed' && order.transactionHash && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Transação (simulada)</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <span className="break-all font-mono text-xs">{order.transactionHash}</span>
                <Button type="button" size="sm" variant="outline" onClick={onCopy}>{copied ? 'Copiado' : 'Copiar hash'}</Button>
              </dd>
            </div>
          )}
        </dl>

        <h3 className="mb-2 mt-6 font-mono font-bold">Itens</h3>
        <ul className="space-y-2 text-sm">
          {order.lines.map((l) => (
            <li key={l.lineId} className="flex justify-between gap-2">
              <span>{l.name} <span className="text-muted-foreground">({l.editionLabel}) × {l.quantity} · {l.unitPriceEth} ETH</span></span>
              <EthAmount amount={l.subtotalEth} />
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd><EthAmount amount={order.totals.subtotalEth} /></dd></div>
          <div className="flex justify-between"><dt>Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd><EthAmount amount={order.totals.discountEth} /></dd></div>
          <div className="flex justify-between"><dt>Taxa de rede</dt><dd><EthAmount amount={order.totals.networkFeeEth} /></dd></div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Total</dt><dd><EthAmount amount={order.totals.totalEth} /></dd></div>
        </dl>
      </section>

      {order.status === 'confirmed' && (
        <div className="mt-6 text-center"><Link to="/" className="button">Continuar explorando</Link></div>
      )}
    </div>
  )
}
