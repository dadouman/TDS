/**
 * JWT Authentication Middleware
 * Handles JWT token verification, creation, and extraction from requests
 * 
 * Source: Story 1-032 Task 2 - JWT Middleware & Token Verification
 */

import * as jwt from 'jsonwebtoken';
import type { NextApiRequest } from 'next';
import { env } from '../utils/env';

/**
 * Token payload structure - decoded JWT contains these claims
 * userId: unique identifier of the authenticated user
 * email: user's email address
 * role: role-based access control (freighter, carrier, warehouse, store, admin)
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number; // issued at (unix timestamp)
  exp?: number; // expiration (unix timestamp)
}

/**
 * Verify a JWT token and return the decoded payload
 * 
 * @param token - JWT token string to verify
 * @returns Decoded TokenPayload if valid, null if token is missing, invalid, or expired
 * @security Token signature is verified using JWT_SECRET from environment
 * @security Expiry is automatically checked by jwt.verify()
 * 
 * Notes:
 * - No exceptions thrown; returns null on any verification failure
 * - Invalid tokens are caught and logged (development only)
 * - Supports both access tokens and refresh tokens
 */
export function verifyToken(token: string | undefined): TokenPayload | null {
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    // Token is invalid, expired, or has wrong signature
    // Log in development for debugging, but don't expose error details to client
    if (env.NODE_ENV === 'development') {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.debug('[auth.ts] Token verification failed:', errorMessage);
    }
    return null;
  }
}

/**
 * Create a signed JWT token with the given payload
 * 
 * @param payload - User claims to encode in token (userId, email, role)
 * @returns Signed JWT token string
 * @security Token is signed using JWT_SECRET from environment
 * @security Token expiry is set from JWT_EXPIRY environment variable
 * 
 * Notes:
 * - Token includes 'iat' (issued at) and 'exp' (expiration) claims automatically
 * - Signature uses HS256 algorithm (HMAC with SHA-256)
 * - Expiry format: '7d', '15m', '1h', etc (see jsonwebtoken docs)
 */
export function createToken(payload: TokenPayload): string {
  const token = jwt.sign(payload, env.JWT_SECRET as string, {
    expiresIn: env.JWT_EXPIRY as string,
    algorithm: 'HS256' as const,
  } as any);
  return token;
}

/**
 * Extract JWT token from request (cookie or Authorization header)
 * 
 * Searches for token in this order:
 * 1. Cookie 'token' (secure HttpOnly cookie, preferred for web browsers)
 * 2. Authorization header 'Bearer <token>' (for API clients)
 * 
 * @param req - NextApiRequest with cookies and headers
 * @returns Token string if found, undefined otherwise
 * 
 * Security Notes:
 * - HttpOnly cookies are automatically sent by browsers, not accessible to JavaScript
 * - Bearer tokens are for API clients that cannot use cookies
 * - Both are extracted without logging or validation (validation happens in verifyToken)
 */
export function extractToken(req: NextApiRequest): string | undefined {
  // Try to get token from HttpOnly cookie first
  const fromCookie = req.cookies.token;
  if (fromCookie) {
    return fromCookie;
  }

  // Try to get token from Authorization header (Bearer scheme)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Remove 'Bearer ' prefix (7 characters)
    return authHeader.slice(7);
  }

  // Token not found in either location
  return undefined;
}

/**
 * Convenience function: Extract and verify token in one call
 * Combines extractToken() + verifyToken() for common auth pattern
 * 
 * @param req - NextApiRequest with cookies and headers
 * @returns Decoded TokenPayload if token exists and is valid, null otherwise
 */
export function getTokenPayload(req: NextApiRequest): TokenPayload | null {
  const token = extractToken(req);
  return verifyToken(token);
}
