/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// Mantida manualmente: o plugin do TanStack Router emite `update({ id, path })`,
// que o @tanstack/router-core rejeita ("Route cannot have both an 'id' and a 'path' option").
// A árvore de rotas é, portanto, construída à mão usando apenas `path` (o `id` é derivado
// automaticamente pelo núcleo do roteador).

import { Route as rootRouteImport } from './routes/__root'
import type { Route as TRoute } from '@tanstack/react-router'
import { Route as IndexRouteImport } from './routes/index'
import { Route as nftRouteImport } from './routes/nft.$nftId'
import { Route as carrinhoRouteImport } from './routes/carrinho'
import { Route as pagamentoRouteImport } from './routes/pagamento'
import { Route as pedidosRouteImport } from './routes/pedidos.$orderId'
import { Route as entrarRouteImport } from './routes/entrar'
import { Route as cadastroRouteImport } from './routes/cadastro'
import { Route as contaRouteImport } from './routes/conta'
import {
  indexRoute as contaIndexRoute,
  perfilRoute as contaPerfilRoute,
  carteirasRoute as contaCarteirasRoute,
  favoritosRoute as contaFavoritosRoute,
} from './routes/conta'
import { Route as aprendaRouteImport } from './routes/aprenda'
import { Route as criadoresRouteImport } from './routes/criadores'

const IndexRoute = IndexRouteImport.update({
  path: '/',
  getParentRoute: () => rootRouteImport,
})

const NftRoute = nftRouteImport.update({
  path: '/nft/$nftId',
  getParentRoute: () => rootRouteImport,
})

const CarrinhoRoute = carrinhoRouteImport.update({
  path: '/carrinho',
  getParentRoute: () => rootRouteImport,
})

const PagamentoRoute = pagamentoRouteImport.update({
  path: '/pagamento',
  getParentRoute: () => rootRouteImport,
})

const PedidosRoute = pedidosRouteImport.update({
  path: '/pedidos/$orderId',
  getParentRoute: () => rootRouteImport,
})

const EntrarRoute = entrarRouteImport.update({
  path: '/entrar',
  getParentRoute: () => rootRouteImport,
})

const CadastroRoute = cadastroRouteImport.update({
  path: '/cadastro',
  getParentRoute: () => rootRouteImport,
})

const ContaRoute = contaRouteImport.update({
  path: '/conta',
  getParentRoute: () => rootRouteImport,
})
ContaRoute.addChildren([contaIndexRoute, contaPerfilRoute, contaCarteirasRoute, contaFavoritosRoute])

const AprendaRoute = aprendaRouteImport.update({
  path: '/aprenda',
  getParentRoute: () => rootRouteImport,
})

const CriadoresRoute = criadoresRouteImport.update({
  path: '/criadores',
  getParentRoute: () => rootRouteImport,
})

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/nft/$nftId': typeof NftRoute
  '/carrinho': typeof CarrinhoRoute
  '/pagamento': typeof PagamentoRoute
  '/pedidos/$orderId': typeof PedidosRoute
  '/entrar': typeof EntrarRoute
  '/cadastro': typeof CadastroRoute
  '/conta': typeof ContaRoute
  '/conta/perfil': typeof ContaPerfilRoute
  '/conta/carteiras': typeof ContaCarteirasRoute
  '/conta/favoritos': typeof ContaFavoritosRoute
  '/aprenda': typeof AprendaRoute
  '/criadores': typeof CriadoresRoute
}

export interface FileRoutesByTo {
  '/': {
    type: 'static'
    fullPath: '/'
    params: {}
    search: {}
    context: {}
    preLoaderRoute: typeof IndexRouteImport
    parentRoute: typeof rootRouteImport
  }
  '/nft/$nftId': {
    type: 'param'
    fullPath: '/nft/$nftId'
    params: { nftId: string }
    search: {}
    context: {}
    preLoaderRoute: typeof nftRouteImport
    parentRoute: typeof rootRouteImport
  }
  '/carrinho': {
    type: 'static'
    fullPath: '/carrinho'
    params: {}
    search: {}
    context: {}
    preLoaderRoute: typeof carrinhoRouteImport
    parentRoute: typeof rootRouteImport
  }
  '/pagamento': {
    type: 'static'
    fullPath: '/pagamento'
    params: {}
    search: {}
    context: {}
    preLoaderRoute: typeof pagamentoRouteImport
    parentRoute: typeof rootRouteImport
  }
  '/pedidos/$orderId': {
    type: 'param'
    fullPath: '/pedidos/$orderId'
    params: { orderId: string }
    search: {}
    context: {}
    preLoaderRoute: typeof pedidosRouteImport
    parentRoute: typeof rootRouteImport
  }
  '/entrar': {
    type: 'static'
    fullPath: '/entrar'
    params: {}
    search: {}
    context: {}
    preLoaderRoute: typeof entrarRouteImport
    parentRoute: typeof rootRouteImport
  }
  '/cadastro': {
    type: 'static'
    fullPath: '/cadastro'
    params: {}
    search: {}
    context: {}
    preLoaderRoute: typeof cadastroRouteImport
    parentRoute: typeof rootRouteImport
  }
  '/conta': {
    type: 'static'
    fullPath: '/conta'
    params: {}
    search: {}
    context: {}
    preLoaderRoute: typeof contaRouteImport
    parentRoute: typeof rootRouteImport
  }
  '/conta/perfil': {
    type: 'static'
    fullPath: '/conta/perfil'
    params: {}
    search: {}
    context: {}
    preLoaderRoute: typeof contaPerfilRoute
    parentRoute: typeof contaRouteImport
  }
  '/conta/carteiras': {
    type: 'static'
    fullPath: '/conta/carteiras'
    params: {}
    search: {}
    context: {}
    preLoaderRoute: typeof contaCarteirasRoute
    parentRoute: typeof contaRouteImport
  }
  '/conta/favoritos': {
    type: 'static'
    fullPath: '/conta/favoritos'
    params: {}
    search: {}
    context: {}
    preLoaderRoute: typeof contaFavoritosRoute
    parentRoute: typeof contaRouteImport
  }
  '/aprenda': {
    type: 'static'
    fullPath: '/aprenda'
    params: {}
    search: {}
    context: {}
    preLoaderRoute: typeof aprendaRouteImport
    parentRoute: typeof rootRouteImport
  }
  '/criadores': {
    type: 'static'
    fullPath: '/criadores'
    params: {}
    search: {}
    context: {}
    preLoaderRoute: typeof criadoresRouteImport
    parentRoute: typeof rootRouteImport
  }
}

export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/nft/$nftId': typeof NftRoute
  '/carrinho': typeof CarrinhoRoute
  '/pagamento': typeof PagamentoRoute
  '/pedidos/$orderId': typeof PedidosRoute
  '/entrar': typeof EntrarRoute
  '/cadastro': typeof CadastroRoute
  '/conta': typeof ContaRoute
  '/conta/perfil': typeof ContaPerfilRoute
  '/conta/carteiras': typeof ContaCarteirasRoute
  '/conta/favoritos': typeof ContaFavoritosRoute
  '/aprenda': typeof AprendaRoute
  '/criadores': typeof CriadoresRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/nft/$nftId'
    | '/carrinho'
    | '/pagamento'
    | '/pedidos/$orderId'
    | '/entrar'
    | '/cadastro'
    | '/conta'
    | '/conta/perfil'
    | '/conta/carteiras'
    | '/conta/favoritos'
    | '/aprenda'
    | '/criadores'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/nft/$nftId'
    | '/carrinho'
    | '/pagamento'
    | '/pedidos/$orderId'
    | '/entrar'
    | '/cadastro'
    | '/conta'
    | '/conta/perfil'
    | '/conta/carteiras'
    | '/conta/favoritos'
    | '/aprenda'
    | '/criadores'
  id: '__root__' | '/' | '/nft/$nftId' | '/carrinho' | '/pagamento' | '/pedidos/$orderId' | '/entrar' | '/cadastro' | '/conta' | '/conta/perfil' | '/conta/carteiras' | '/conta/favoritos' | '/aprenda' | '/criadores'
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      type: 'static'
      fullPath: '/'
      params: {}
      search: {}
      context: {}
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/nft/$nftId': {
      type: 'param'
      fullPath: '/nft/$nftId'
      params: { nftId: string }
      search: {}
      context: {}
      preLoaderRoute: typeof nftRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/carrinho': {
      type: 'static'
      fullPath: '/carrinho'
      params: {}
      search: {}
      context: {}
      preLoaderRoute: typeof carrinhoRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/pagamento': {
      type: 'static'
      fullPath: '/pagamento'
      params: {}
      search: {}
      context: {}
      preLoaderRoute: typeof pagamentoRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/pedidos/$orderId': {
      type: 'param'
      fullPath: '/pedidos/$orderId'
      params: { orderId: string }
      search: {}
      context: {}
      preLoaderRoute: typeof pedidosRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/entrar': {
      type: 'static'
      fullPath: '/entrar'
      params: {}
      search: {}
      context: {}
      preLoaderRoute: typeof entrarRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/cadastro': {
      type: 'static'
      fullPath: '/cadastro'
      params: {}
      search: {}
      context: {}
      preLoaderRoute: typeof cadastroRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/conta': {
      type: 'static'
      fullPath: '/conta'
      params: {}
      search: {}
      context: {}
      preLoaderRoute: typeof contaRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/conta/perfil': {
      type: 'static'
      fullPath: '/conta/perfil'
      params: {}
      search: {}
      context: {}
      preLoaderRoute: typeof contaPerfilRoute
      parentRoute: typeof contaRouteImport
    }
    '/conta/carteiras': {
      type: 'static'
      fullPath: '/conta/carteiras'
      params: {}
      search: {}
      context: {}
      preLoaderRoute: typeof contaCarteirasRoute
      parentRoute: typeof contaRouteImport
    }
    '/conta/favoritos': {
      type: 'static'
      fullPath: '/conta/favoritos'
      params: {}
      search: {}
      context: {}
      preLoaderRoute: typeof contaFavoritosRoute
      parentRoute: typeof contaRouteImport
    }
    '/aprenda': {
      type: 'static'
      fullPath: '/aprenda'
      params: {}
      search: {}
      context: {}
      preLoaderRoute: typeof aprendaRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/criadores': {
      type: 'static'
      fullPath: '/criadores'
      params: {}
      search: {}
      context: {}
      preLoaderRoute: typeof criadoresRouteImport
      parentRoute: typeof rootRouteImport
    }
  }
}

const rootRouteChildren: any = {
  IndexRoute,
  NftRoute,
  CarrinhoRoute,
  PagamentoRoute,
  PedidosRoute,
  EntrarRoute,
  CadastroRoute,
  ContaRoute,
  AprendaRoute,
  CriadoresRoute,
}
// @ts-expect-error _addFileTypes é um no-op no router-core 1.171.x; forçamos TFileRouteTypes para que
// InferFileRouteTypes / RoutePaths resolvam os caminhos corretamente (sem afetar o runtime).
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>() as unknown as TRoute<
  any, any, any, any, any, any, any, any, any, any, any, any, any, any,
  FileRouteTypes, any, any, any
>
