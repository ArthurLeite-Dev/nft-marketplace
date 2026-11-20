const WEI_PER_ETH = 10n ** 18n
const ETH_DECIMAL_REGEX = /^\d+(\.\d{1,18})?$/

export function isValidEthAmount(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  return ETH_DECIMAL_REGEX.test(value.trim())
}

export function parseEthToWei(eth: string): bigint {
  const trimmed = eth.trim()
  if (!isValidEthAmount(trimmed)) {
    throw new Error(`Invalid ETH decimal string: "${eth}"`)
  }

  const [whole = '0', fraction = ''] = trimmed.split('.')
  const wholePartWei = BigInt(whole) * WEI_PER_ETH
  const paddedFraction = fraction.padEnd(18, '0').slice(0, 18)
  const fractionPartWei = BigInt(paddedFraction)

  return wholePartWei + fractionPartWei
}

export function formatWeiToEth(wei: bigint): string {
  if (wei < 0n) {
    throw new Error(`Negative wei value not supported: ${wei}`)
  }

  const whole = wei / WEI_PER_ETH
  const remainder = wei % WEI_PER_ETH

  if (remainder === 0n) {
    return whole.toString()
  }

  const fractionString = remainder.toString().padStart(18, '0')
  const trimmedFraction = fractionString.replace(/0+$/, '')

  return `${whole}.${trimmedFraction}`
}

export function addEth(a: string, b: string): string {
  const weiA = parseEthToWei(a)
  const weiB = parseEthToWei(b)
  return formatWeiToEth(weiA + weiB)
}

export function subtractEth(a: string, b: string): string {
  const weiA = parseEthToWei(a)
  const weiB = parseEthToWei(b)
  if (weiA < weiB) {
    throw new Error(`Resulting ETH amount would be negative: ${a} - ${b}`)
  }
  return formatWeiToEth(weiA - weiB)
}

export function multiplyEth(eth: string, quantity: number): string {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error(`Quantity must be a non-negative integer: ${quantity}`)
  }
  const wei = parseEthToWei(eth)
  return formatWeiToEth(wei * BigInt(quantity))
}

/**
 * Calculates a percentage of ETH using basis points (1 bp = 0.01%, 100 bp = 1%, 10000 bp = 100%)
 * Rounds down to the nearest wei.
 */
export function percentOfEth(eth: string, basisPoints: number): string {
  if (!Number.isInteger(basisPoints) || basisPoints < 0) {
    throw new Error(`Basis points must be a non-negative integer: ${basisPoints}`)
  }
  const wei = parseEthToWei(eth)
  const discountWei = (wei * BigInt(basisPoints)) / 10000n
  return formatWeiToEth(discountWei)
}

export function compareEth(a: string, b: string): number {
  const weiA = parseEthToWei(a)
  const weiB = parseEthToWei(b)
  if (weiA < weiB) return -1
  if (weiA > weiB) return 1
  return 0
}
