export interface DomainError {
  code: string
  message: string
  status: number
  fields?: Record<string, string>
  details?: Record<string, unknown>
}

export function domainError(status: number, code: string, message: string, fields?: Record<string, string>, details?: Record<string, unknown>): { ok: false; error: DomainError } {
  return { ok: false, error: { status, code, message, ...(fields ? { fields } : {}), ...(details ? { details } : {}) } }
}
