import { copy } from '@/copy'

/**
 * Stable error codes returned by the API (see api/openapi.yaml), plus client-side
 * `network_error`. Each one has a Spanish message in `copy.apiErrors`.
 */
export const apiErrorCodes = [
  'network_error',
  'internal_error',
  'not_found',
  'method_not_allowed',
  'invalid_json',
  'unsupported_media_type',
  'payload_too_large',
  'validation_failed',
  'rate_limited',
  'unauthorized',
  'forbidden',
  'email_taken',
  'invalid_credentials',
  'invalid_refresh_token',
  'invalid_google_token',
  'google_account_conflict',
  'google_signin_unavailable',
  'invalid_reset_token',
  'not_ready',
] as const

export type ApiErrorCode = (typeof apiErrorCodes)[number]

/** Validation rules the API reports per field. Each has a Spanish message in `copy.validation`. */
export const validationRules = ['required', 'email', 'min', 'max', 'maxbytes', 'oneof'] as const
export type ValidationRule = (typeof validationRules)[number]

// Typed views of the copy: a code or rule without a message fails to compile.
const apiErrorMessages: Readonly<Record<ApiErrorCode, string>> = copy.apiErrors
const validationMessages: Readonly<
  Record<ValidationRule | 'invalid', string | ((param: string) => string)>
> = copy.validation

export interface FieldError {
  field: string
  rule: string
  param?: string
}

function isApiErrorCode(code: string): code is ApiErrorCode {
  return (apiErrorCodes as readonly string[]).includes(code)
}

function isValidationRule(rule: string): rule is ValidationRule {
  return (validationRules as readonly string[]).includes(rule)
}

/** An error answered by the API, or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number
  /** Raw code as sent by the API. */
  readonly code: string
  readonly fields: readonly FieldError[]

  constructor(status: number, code: string, fields: readonly FieldError[] = []) {
    super(`API error ${String(status)}: ${code}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }

  /** Spanish message for the user; unknown codes fall back to the generic server error. */
  get userMessage(): string {
    return apiErrorMessages[isApiErrorCode(this.code) ? this.code : 'internal_error']
  }

  /** True when the request never reached the API (offline, DNS, CORS). */
  get isNetworkError(): boolean {
    return this.status === 0
  }
}

/**
 * Spanish message for a field error. Unknown rules, and rules that need a parameter
 * the API did not send, fall back to a generic "invalid value".
 */
export function fieldErrorMessage(e: FieldError): string {
  const message = validationMessages[isValidationRule(e.rule) ? e.rule : 'invalid']
  if (typeof message === 'string') return message
  return e.param === undefined ? copy.validation.invalid : message(e.param)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isFieldError(v: unknown): v is FieldError {
  return (
    isRecord(v) &&
    typeof v.field === 'string' &&
    typeof v.rule === 'string' &&
    (v.param === undefined || typeof v.param === 'string')
  )
}

/** Builds an ApiError from a failed response, tolerating non-JSON bodies (proxies, gateways). */
export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = undefined
  }
  const error = isRecord(body) && isRecord(body.error) ? body.error : undefined
  const code = typeof error?.code === 'string' ? error.code : 'internal_error'
  const fields = Array.isArray(error?.fields) ? error.fields.filter(isFieldError) : []
  return new ApiError(res.status, code, fields)
}
