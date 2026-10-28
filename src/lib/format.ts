const dateFormat = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' })

/** Formats an RFC 3339 timestamp as a date in the admin's time zone, e.g. "20 oct 2026". */
export function formatDate(rfc3339: string): string {
  return dateFormat.format(new Date(rfc3339))
}
