import { test, expect } from '@playwright/test'
import { clearAttempt, loadAttempt, loadCollectorDraft, resolveAttempt, sameBody, saveAttempt, saveCollectorDraft, toCollectorPayload } from '../../src/features/checkout/attempt'

class MemoryStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

const body = (name = 'Ana') => ({
  quoteId: 'qte_1',
  walletConnectionId: 'wc_1',
  collector: { displayName: name, username: 'ana_c', email: 'ana@jungle.test' },
})

test.describe('Tentativa de pedido (chave de idempotência)', () => {
  test('conteúdo idêntico reaproveita a MESMA chave (clique repetido / reenvio após timeout)', () => {
    let n = 0
    const newKey = () => `key-${++n}`
    const first = resolveAttempt(null, body(), newKey)
    const second = resolveAttempt(first, body(), newKey)
    expect(second.key).toBe(first.key)
    expect(n).toBe(1)
  })

  test('a ordem das chaves do objeto não muda a identidade do conteúdo', () => {
    const a = { quoteId: 'q', walletConnectionId: 'w', collector: { displayName: 'A', username: 'abc', email: 'a@b.co' } }
    const b = { walletConnectionId: 'w', collector: { email: 'a@b.co', username: 'abc', displayName: 'A' }, quoteId: 'q' }
    expect(sameBody(a, b)).toBe(true)
  })

  test('conteúdo diferente (nova cotação, outro dado) gera NOVA chave', () => {
    let n = 0
    const first = resolveAttempt(null, body('Ana'), () => `key-${++n}`)
    const changed = resolveAttempt(first, body('Outra'), () => `key-${++n}`)
    expect(changed.key).not.toBe(first.key)
  })

  test('a tentativa persiste por usuário e não vaza entre usuários', () => {
    const storage = new MemoryStorage()
    saveAttempt(storage, 'usr_ana', { key: 'k1', body: body() })
    expect(loadAttempt(storage, 'usr_ana')?.key).toBe('k1')
    expect(loadAttempt(storage, 'usr_bruno')).toBeNull()
    clearAttempt(storage, 'usr_ana')
    expect(loadAttempt(storage, 'usr_ana')).toBeNull()
  })

  test('rascunho do colecionador persiste por usuário; storage corrompido não quebra', () => {
    const storage = new MemoryStorage()
    saveCollectorDraft(storage, 'usr_ana', { displayName: 'Ana' })
    expect(loadCollectorDraft(storage, 'usr_ana')).toEqual({ displayName: 'Ana' })
    expect(loadCollectorDraft(storage, 'usr_bruno')).toBeNull()
    storage.setItem('jungle-checkout-attempt:usr_x', '{lixo')
    expect(loadAttempt(storage, 'usr_x')).toBeNull()
  })

  test('toCollectorPayload remove opcionais vazios e apara espaços', () => {
    expect(toCollectorPayload({ displayName: ' Ana ', username: 'ana_c', email: 'a@b.co', note: '  ', ensName: 'ana.eth' })).toEqual({
      displayName: 'Ana', username: 'ana_c', email: 'a@b.co', ensName: 'ana.eth',
      profileName: undefined, secondaryWallet: undefined, walletType: undefined, referralCode: undefined, note: undefined,
    })
  })
})
