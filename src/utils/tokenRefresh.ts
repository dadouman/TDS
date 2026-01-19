/**
 * Token Refresh Mechanism
 * Allows clients to refresh expired tokens without re-authentication
 * 
 * Source: Story 1-032 Task 8 - Token Refresh Mechanism
 */

import * as jwt from 'jsonwebtoken';
import { createToken, verifyToken, type TokenPayload } from '../middleware/auth';
import { env } from './env';

/**
 * Refresh an expired JWT token
 * 
 * Scenario:
 * - User logged in with 7-day JWT token
 * - After 6 days, token is about to expire
 * - Client detects token expiry and calls refresh endpoint
 * - Server validates token (ignoring expiry), issues new token
 * - User continues without re-login
 * 
 * @param expiredToken - JWT token that is expired or about to expire
 * @returns New JWT token with fresh expiry, or null if token is too old
 * 
 * @security
 * - Grace period: Accepts tokens up to 1 day past expiry
 * - Beyond grace period: Requires re-login for security
 * - Token signature MUST be valid (verifies against JWT_SECRET)
 * - Uses 'ignoreExpiration' only for checking grace period, still validates signature
 * 
 * Grace Period Logic:
 * - If token expired < 1 day ago: Issue new token
 * - If token expired > 1 day ago: Reject, require re-login
 * - This prevents unauthorized use of very old stolen tokens
 * 
 * Example:
 * ```typescript
 * // Client detects token expiry
 * const newToken = refreshToken(oldToken);
 * if (newToken) {
 *   // Update cookie/header with new token
 *   setSecureCookie(res, newToken, 7_days_in_ms);
 * } else {
 *   // Redirect to login
 *   res.redirect('/login');
 * }
 * ```
 */
export function refreshToken(expiredToken: string): string | null {
  try {
    // Verify signature even though token is expired
    // This ensures malicious tokens are rejected
    // jwt.verify() throws on invalid signature, we catch below
    const decodedWithExpiry = jwt.decode(expiredToken, { complete: true });

    if (!decodedWithExpiry || !decodedWithExpiry.payload) {
      // Token format invalid
      return null;
    }

    // Verify signature by attempting to verify with ignoreExpiration
    // If signature is wrong, this will throw and we'll catch it
    const decoded = jwt.verify(expiredToken, env.JWT_SECRET, {
      ignoreExpiration: true,
    }) as TokenPayload;

    // Extract issued-at and expiration timestamps
    const issuedAt = decodedWithExpiry.payload.iat || Math.floor(Date.now() / 1000);
    const expiredAt = decodedWithExpiry.payload.exp || 0;
    const now = Math.floor(Date.now() / 1000);

    // Check if token is too old (beyond grace period)
    // Grace period: 1 day (86400 seconds)
    const GRACE_PERIOD_SECONDS = 86400; // 1 day

    if (now - expiredAt > GRACE_PERIOD_SECONDS) {
      // Token is beyond grace period, require re-login
      if (env.NODE_ENV === 'development') {
        console.debug(
          `[tokenRefresh.ts] Token refresh rejected - beyond grace period. Expired: ${new Date(
            expiredAt * 1000
          ).toISOString()}, Now: ${new Date(now * 1000).toISOString()}`
        );
      }
      return null;
    }

    // Token is within grace period, issue new token
    const newToken = createToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    if (env.NODE_ENV === 'development') {
      console.debug('[tokenRefresh.ts] Token refreshed successfully');
    }

    return newToken;
  } catch (error) {
    // Token signature invalid, format wrong, or other JWT error
    if (env.NODE_ENV === 'development') {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.debug('[tokenRefresh.ts] Token refresh failed:', errorMessage);
    }
    return null;
  }
}

/**
 * Calculate token expiry from JWT_EXPIRY environment variable
 * Converts strings like "7d", "1h" to milliseconds
 * 
 * @param expiryFormat - Format from environment (e.g., "7d", "1h", "15m")
 * @returns Milliseconds until expiry
 * 
 * Returns null if format is invalid
 */
export function getTokenExpiryMs(expiryFormat: string = env.JWT_EXPIRY): number | null {
  const match = expiryFormat.match(/^(\d+)([smhdwy])$/);
  if (!match) {
    return null;
  }

  const [, amount, unit] = match;
  const num = parseInt(amount, 10);

  const unitToMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };

  return num * (unitToMs[unit] || 0);
}

/**
 * Check if token is expiring soon (within threshold)
 * Useful for client-side decision to refresh
 * 
 * @param token - JWT token to check
 * @param thresholdMs - How many ms before expiry to consider "expiring soon"
 * @returns true if token expires within threshold, false otherwise
 * 
 * Example:
 * ```typescript
 * const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes
 * if (isTokenExpiringSoon(token, REFRESH_THRESHOLD)) {
 *   const newToken = refreshToken(token);
 * }
 * ```
 */
export function isTokenExpiringSoon(token: string, thresholdMs: number = 5 * 60 * 1000): boolean {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.payload.exp) {
      return true; // If we can't decode, treat as expiring
    }

    const expiryTime = decoded.payload.exp * 1000; // Convert to ms
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    return timeUntilExpiry < thresholdMs;
  } catch {
    return true; // If error decoding, treat as expiring
  }
}
