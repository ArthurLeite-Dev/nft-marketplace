import { test, expect } from '@playwright/test'
import {
  parseEthToWei,
  formatWeiToEth,
  addEth,
  subtractEth,
  multiplyEth,
  percentOfEth,
  compareEth,
  isValidEthAmount,
} from '../../src/lib/eth'

test.describe('ETH Math & BigInt Wei precision', () => {
  test('isValidEthAmount validates string formats', () => {
    expect(isValidEthAmount('0.1')).toBe(true)
    expect(isValidEthAmount('100')).toBe(true)
    expect(isValidEthAmount('0.000000000000000001')).toBe(true) // 18 decimals
    expect(isValidEthAmount('0.0000000000000000001')).toBe(false) // 19 decimals
    expect(isValidEthAmount('-0.1')).toBe(false)
    expect(isValidEthAmount('abc')).toBe(false)
    expect(isValidEthAmount('')).toBe(false)
  })

  test('0.1 + 0.2 equals exactly 0.3 without floating-point errors', () => {
    const sum = addEth('0.1', '0.2')
    expect(sum).toBe('0.3')
  })

  test('converts eth to wei and back with 18 decimal precision', () => {
    const oneEth = parseEthToWei('1')
    expect(oneEth).toBe(1000000000000000000n)
    expect(formatWeiToEth(oneEth)).toBe('1')

    const oneWei = parseEthToWei('0.000000000000000001')
    expect(oneWei).toBe(1n)
    expect(formatWeiToEth(oneWei)).toBe('0.000000000000000001')

    const complex = parseEthToWei('12.345678901234567890')
    expect(formatWeiToEth(complex)).toBe('12.34567890123456789')
  })

  test('subtractEth subtracts correctly and rejects negative result', () => {
    expect(subtractEth('1.5', '0.5')).toBe('1')
    expect(subtractEth('0.3', '0.1')).toBe('0.2')
    expect(() => subtractEth('0.1', '0.2')).toThrow(/negative/i)
  })

  test('multiplyEth multiplies by integer quantity', () => {
    expect(multiplyEth('0.45', 3)).toBe('1.35')
    expect(multiplyEth('1.25', 0)).toBe('0')
    expect(multiplyEth('0.000000000000000005', 2)).toBe('0.00000000000000001')
    expect(() => multiplyEth('0.45', 2.5)).toThrow(/integer/i)
    expect(() => multiplyEth('0.45', -1)).toThrow(/integer/i)
  })

  test('percentOfEth calculates basis points with floor rounding', () => {
    // 10% = 1000 basis points
    expect(percentOfEth('1.0', 1000)).toBe('0.1')
    // 25% = 2500 basis points
    expect(percentOfEth('2.0', 2500)).toBe('0.5')
    // 1 wei * 50% = 0 wei (floor)
    expect(percentOfEth('0.000000000000000001', 5000)).toBe('0')
  })

  test('compareEth orders values correctly', () => {
    expect(compareEth('0.1', '0.2')).toBe(-1)
    expect(compareEth('0.2', '0.1')).toBe(1)
    expect(compareEth('0.100', '0.1')).toBe(0)
  })
})
