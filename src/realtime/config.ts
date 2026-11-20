/**
 * URL do servidor Socket.IO. No ambiente de mocks (desenvolvimento, demonstração e testes) é um
 * host fictício interceptado pelo MSW com @mswjs/socket.io-binding; nenhum tráfego real é feito.
 */
export const DEFAULT_SOCKET_URL = 'wss://realtime.jungle.test'
export const SOCKET_PATH = '/socket.io'

export function resolveSocketUrl(raw: string | undefined): string {
  // Valores relativos ("/" no .env antigo) não servem para WebSocket: usa o host simulado.
  if (!raw || raw.startsWith('/')) return DEFAULT_SOCKET_URL
  return raw.replace(/\/+$/, '')
}

export const SOCKET_URL = resolveSocketUrl(import.meta.env.VITE_SOCKET_URL)
