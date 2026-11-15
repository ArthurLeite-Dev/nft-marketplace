import { test, expect } from '@playwright/test'
import {
  isValidEmail,
  isValidUsername,
  isValidPassword,
  isValidEvmAddress,
  isValidEnsName,
} from '../../src/lib/form-validators'
import { getSafeRedirect } from '../../src/lib/safe-redirect'

test.describe('Form Validators & Safe Redirect', () => {
  test('email validator', () => {
    expect(isValidEmail('user@test.com')).toBe(true)
    expect(isValidEmail('ana@jungle.test')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
  })

  test('username validator', () => {
    expect(isValidUsername('arthur_dev')).toBe(true)
    expect(isValidUsername('ana-colecionadora')).toBe(true)
    expect(isValidUsername('ab')).toBe(false) // too short
    expect(isValidUsername('a'.repeat(31))).toBe(false) // too long
    expect(isValidUsername('invalid space')).toBe(false)
  })

  test('password validator requires 8 chars, letter and number', () => {
    expect(isValidPassword('Colecao@2026')).toBe(true)
    expect(isValidPassword('pass1234')).toBe(true)
    expect(isValidPassword('pass')).toBe(false) // too short
    expect(isValidPassword('passwordonly')).toBe(false) // no numbers
    expect(isValidPassword('12345678')).toBe(false) // no letters
  })

  test('EVM address validator', () => {
    expect(isValidEvmAddress('0x71C84517C3743301AE53675C7FB78B2CE7756CF4')).toBe(true)
    expect(isValidEvmAddress('0x0000000000000000000000000000000000000000')).toBe(true)
    expect(isValidEvmAddress('0x123')).toBe(false) // too short
    expect(isValidEvmAddress('71C84517C3743301AE53675C7FB78B2CE7756CF4')).toBe(false) // no 0x
    expect(isValidEvmAddress('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBe(false) // non-hex
  })

  test('ENS name validator', () => {
    expect(isValidEnsName('colecionador.eth')).toBe(true)
    expect(isValidEnsName('vitalik.eth')).toBe(true)
    expect(isValidEnsName('colecionador')).toBe(false)
    expect(isValidEnsName('colecionador.com')).toBe(false)
  })

  test('getSafeRedirect prevents open redirects and loops', () => {
    expect(getSafeRedirect('/carrinho')).toBe('/carrinho')
    expect(getSafeRedirect('/nft/1')).toBe('/nft/1')
    expect(getSafeRedirect('/conta/perfil')).toBe('/conta/perfil')

    // Open redirects rejected
    expect(getSafeRedirect('https://malicious.com')).toBe('/')
    expect(getSafeRedirect('http://evil.com')).toBe('/')
    expect(getSafeRedirect('//evil.com')).toBe('/')
    expect(getSafeRedirect('javascript:alert(1)')).toBe('/')

    // Auth routes rejected (loop prevention)
    expect(getSafeRedirect('/entrar')).toBe('/')
    expect(getSafeRedirect('/cadastro')).toBe('/')
    expect(getSafeRedirect('/entrar?redirect=/carrinho')).toBe('/')

    // Fallbacks
    expect(getSafeRedirect(null, '/carrinho')).toBe('/carrinho')
    expect(getSafeRedirect(undefined)).toBe('/')
  })
})
