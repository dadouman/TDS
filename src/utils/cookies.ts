/**
 * Secure Cookie Management Utilities
 * Handles secure cookie setting and clearing for JWT tokens
 * 
 * Source: Story 1-032 Task 5 - Secure Cookie Configuration
 */

import type { NextApiResponse } from 'next';
import { env } from './env';

/**
 * Set a secure JWT token cookie on the response
 * 
 * Cookie Security Attributes:
 * - HttpOnly: Prevents JavaScript (XSS) from accessing the cookie
 * - Secure: In production, cookie is only sent over HTTPS (prevents MITM)
 * - SameSite=Lax: Prevents CSRF attacks by blocking cross-site cookie submission (allows top-level navigation)
 * - Path=/api: Cookie is only sent for /api routes (limits exposure)
 * - Max-Age: Expires after duration in seconds
 * 
 * @param res - NextApiResponse to set cookie on
 * @param token - JWT token string to store in cookie
 * @param expiryMs - Expiration time in milliseconds (usually same as token expiry)
 * 
 * @security
 * - HttpOnly prevents XSS: JavaScript cannot access the cookie
 * - Secure flag forces HTTPS in production
 * - SameSite=Lax prevents CSRF: cross-site requests don't send cookie
 * - Scoped to /api: reduces attack surface
 * 
 * Development vs Production:
 * - Dev: Secure flag is omitted (allows http://localhost)
 * - Prod: Secure flag is set (requires https://)
 * 
 * Example:
 * ```typescript
 * const tokenExpiryMs = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
 * setSecureCookie(res, jwtToken, tokenExpiryMs);
 * ```
 */
export function setSecureCookie(
  res: NextApiResponse,
  token: string,
  expiryMs: number
): void {
  const isProduction = env.NODE_ENV === 'production';

  // Build cookie attributes
  const cookieAttrs: string[] = [];

  // Token value
  cookieAttrs.push(`token=${token}`);

  // HttpOnly: Prevents JavaScript access (XSS protection)
  cookieAttrs.push('HttpOnly');

  // Secure: Only send over HTTPS in production
  if (isProduction) {
    cookieAttrs.push('Secure');
  }

  // SameSite: CSRF protection (Lax allows top-level navigation, Strict doesn't)
  cookieAttrs.push('SameSite=Lax');

  // Max-Age: Expiration in seconds
  const expirySeconds = Math.floor(expiryMs / 1000);
  cookieAttrs.push(`Max-Age=${expirySeconds}`);

  // Path: Only send cookie for /api routes
  cookieAttrs.push('Path=/api');

  // Set the cookie header
  const cookieValue = cookieAttrs.join('; ');
  res.setHeader('Set-Cookie', cookieValue);
}

/**
 * Clear a JWT token cookie from the response
 * Called on logout or when token is revoked
 * 
 * Sets Max-Age=0 which tells browser to delete the cookie immediately
 * Client will no longer send the token on subsequent requests
 * 
 * @param res - NextApiResponse to clear cookie from
 * 
 * Security Note:
 * - Server-side: Token is now invalid (if you maintain a blacklist)
 * - Client-side: Cookie is deleted by browser
 * - No more cookies sent to /api routes
 * 
 * Example:
 * ```typescript
 * export default function logoutHandler(req, res) {
 *   clearSecureCookie(res);
 *   return res.status(200).json({ message: 'Logged out' });
 * }
 * ```
 */
export function clearSecureCookie(res: NextApiResponse): void {
  const isProduction = env.NODE_ENV === 'production';

  // Build cookie attributes for deletion
  const cookieAttrs: string[] = [];

  // Empty value (delete)
  cookieAttrs.push('token=');

  // HttpOnly
  cookieAttrs.push('HttpOnly');

  // Secure (match the set cookie)
  if (isProduction) {
    cookieAttrs.push('Secure');
  }

  // SameSite (match the set cookie)
  cookieAttrs.push('SameSite=Lax');

  // Max-Age=0 (delete immediately)
  cookieAttrs.push('Max-Age=0');

  // Path (match the set cookie)
  cookieAttrs.push('Path=/api');

  // Set the delete cookie
  const cookieValue = cookieAttrs.join('; ');
  res.setHeader('Set-Cookie', cookieValue);
}

/**
 * Get secure cookie configuration object
 * Useful for testing or logging cookie security properties
 * 
 * @returns Object with all cookie attributes
 */
export function getSecureCookieConfig() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api',
  };
}
