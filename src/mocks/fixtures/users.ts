import type { DbUser, DbWallet } from '../db/types'

const ANA_WALLET_PRINCIPAL: DbWallet = {
  slot: 'principal',
  nickname: 'Carteira Principal',
  displayName: 'Ana Coleção',
  profileName: 'ana_colecao',
  network: 'Ethereum',
  address: '0x71C84517C3743301AE53675C7FB78B2CE7756CF4',
  walletType: 'MetaMask',
  referralCode: null,
  email: null,
  ensName: null,
}

const ANA_WALLET_SECUNDARIA: DbWallet = {
  slot: 'secundaria',
  nickname: 'Reserva',
  displayName: 'Ana Reserva',
  profileName: 'ana_reserva',
  network: 'Polygon',
  address: '0x9Bc22e9073D3f4b5C751e3e2c9f3A12bD4e5F6a7',
  walletType: 'WalletConnect',
  referralCode: null,
  email: null,
  ensName: null,
}

const BRUNO_WALLET_PRINCIPAL: DbWallet = {
  slot: 'principal',
  nickname: 'Carteira Principal',
  displayName: 'Bruno Galeria',
  profileName: 'bruno_galeria',
  network: 'Ethereum',
  address: '0x4e3f3b7c1D98a6F2C5dE4B7a8C9f0123456789AB',
  walletType: 'Coinbase',
  referralCode: null,
  email: null,
  ensName: null,
}

const BRUNO_WALLET_SECUNDARIA: DbWallet = {
  slot: 'secundaria',
  nickname: 'Reserva',
  displayName: 'Bruno Reserva',
  profileName: 'bruno_reserva',
  network: 'Polygon',
  address: '0xDc8aE3B1f7C4d5E6f9a0B1C2d3E4f5A6b7C8d9E0',
  walletType: 'MetaMask',
  referralCode: null,
  email: null,
  ensName: null,
}

export const USER_FIXTURES: DbUser[] = [
  {
    id: 'usr_ana',
    username: 'ana_colecionadora',
    email: 'ana@jungle.test',
    passwordHash: '0354783adae9d693f77cf5b49a81be98514a84b50b36bcb1d15495bfad20f4c0',
    salt: 'jungle-ana-salt',
    wallets: { principal: ANA_WALLET_PRINCIPAL, secundaria: ANA_WALLET_SECUNDARIA },
    favorites: ['nft_01', 'nft_08'],
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'usr_bruno',
    username: 'bruno_galeria',
    email: 'bruno@jungle.test',
    passwordHash: '5240e28d396dbdae663cc9eea6132f56cbe8de941092657162f9461f6795cc1a',
    salt: 'jungle-bruno-salt',
    wallets: { principal: BRUNO_WALLET_PRINCIPAL, secundaria: BRUNO_WALLET_SECUNDARIA },
    favorites: [],
    createdAt: '2026-09-05T00:00:00.000Z',
  },
]

export const CREDENTIALS = [
  { email: 'ana@jungle.test', password: 'Colecao@2026', label: 'Ana (com carteiras e favoritos)' },
  { email: 'bruno@jungle.test', password: 'Galeria@2026', label: 'Bruno (carrinho vazio)' },
]

export const EXISTING_USER_FOR_CONFLICT = {
  username: 'ana_colecionadora',
  email: 'ana@jungle.test',
  password: 'Colecao@2026',
}

export const COUPON_JUNGLE10 = { code: 'JUNGLE10', discountBasisPoints: 1000, valid: true }
export const COUPON_EARLY25 = { code: 'EARLY25', discountBasisPoints: 2500, valid: false }
