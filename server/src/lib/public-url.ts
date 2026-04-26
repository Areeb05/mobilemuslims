/**
 * Returns the public browser origin for the SPA (scheme + host + port, no path).
 *
 * Uses `RAILWAY_PUBLIC_DOMAIN` when set (Railway injects this at deploy). Otherwise
 * `http://localhost:3000` for local development.
 *
 * @returns The origin URL with no trailing slash.
 */
export function getPublicAppOrigin(): string {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim()
  if (domain) {
    const host = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
    return `https://${host}`
  }
  return 'http://localhost:3000'
}
