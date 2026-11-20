const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const ENS_REGEX = /^[a-zA-Z0-9-]+\.eth$/

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  return EMAIL_REGEX.test(email.trim())
}

export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false
  const trimmed = username.trim()
  return trimmed.length >= 3 && trimmed.length <= 30 && /^[a-zA-Z0-9_.-]+$/.test(trimmed)
}

export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false
  // Password must have at least 8 characters, at least one letter and one number
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password)
}

export function isValidEvmAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false
  return EVM_ADDRESS_REGEX.test(address.trim())
}

export function isValidEnsName(ens: string): boolean {
  if (!ens || typeof ens !== 'string') return false
  return ENS_REGEX.test(ens.trim())
}
