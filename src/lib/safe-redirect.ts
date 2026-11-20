/**
 * Validates and sanitizes a redirect target URL.
 * Only internal paths starting with a single '/' are allowed.
 * Schemes, protocol-relative URLs (//) and auth routes are rejected.
 */
export function getSafeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target || typeof target !== 'string') {
    return fallback
  }

  const trimmed = target.trim()

  // Must start with '/' and must not start with '//' (protocol-relative)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback
  }

  // Must not contain colon before slash (scheme-like: javascript:, https:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback
  }

  // Must not redirect to authentication routes
  const pathOnly = trimmed.split('?')[0] || ''
  if (pathOnly === '/entrar' || pathOnly === '/cadastro') {
    return fallback
  }

  return trimmed
}
