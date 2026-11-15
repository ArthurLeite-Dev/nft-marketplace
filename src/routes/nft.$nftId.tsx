import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailRouteComponent,
})

function NftDetailRouteComponent() {
  const { nftId } = Route.useParams()
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-xl font-mono font-bold">NFT Detalhe: {nftId}</h1>
    </div>
  )
}
