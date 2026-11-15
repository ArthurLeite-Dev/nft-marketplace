export const API_BASE = '/api/v1'

export const API_PATHS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    session: '/auth/session',
  },
  nfts: {
    list: '/nfts',
    highlights: '/nfts/highlights',
    detail: (id: string) => `/nfts/${id}`,
    related: (id: string) => `/nfts/${id}/related`,
  },
  favorites: {
    list: '/me/favorites',
    item: (nftId: string) => `/me/favorites/${nftId}`,
  },
  cart: {
    get: '/cart',
    addItem: '/cart/items',
    item: (lineId: string) => `/cart/items/${lineId}`,
    coupon: '/cart/coupon',
    merge: '/cart/merge',
  },
  checkout: {
    quote: '/checkout/quote',
    walletConnections: '/wallet-connections',
  },
  orders: {
    create: '/orders',
    detail: (id: string) => `/orders/${id}`,
    myOrders: '/me/orders',
  },
  account: {
    profile: '/me/profile',
    avatar: '/me/avatar',
    password: '/me/password',
    wallets: '/me/wallets',
    walletSlot: (slot: 'principal' | 'secundaria') => `/me/wallets/${slot}`,
  },
} as const
