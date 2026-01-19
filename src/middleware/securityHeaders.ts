/**
 * Security Headers Middleware
 * Adds OWASP-recommended security headers to all API responses
 * 
 * Source: Story 1-032 Task 7 - Security Headers Middleware
 */

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { env } from '../utils/env';

/**
 * Wrap API handler with security headers
 * Adds protective headers to all responses
 * 
 * Usage:
 * ```typescript
 * const handler = (req, res) => {
 *   res.json({ data: 'protected' });
 * };
 * export default withSecurityHeaders(handler);
 * ```
 * 
 * Headers added:
 * - X-Content-Type-Options: nosniff (prevent MIME sniffing attacks)
 * - X-Frame-Options: DENY (prevent clickjacking)
 * - X-XSS-Protection: 1; mode=block (XSS protection, legacy but supported)
 * - Strict-Transport-Security: (production only) force HTTPS
 * 
 * @param handler - API route handler
 * @returns Wrapped handler with security headers applied
 */
export function withSecurityHeaders(handler: NextApiHandler): NextApiHandler {
  return (req: NextApiRequest, res: NextApiResponse) => {
    // Prevent MIME type sniffing attacks
    // Browser should trust Content-Type header, not try to guess
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking by disallowing page embedding in iframes
    // DENY: Page cannot be embedded in any iframe
    // SAMEORIGIN: Can be embedded in iframe only on same origin
    // ALLOW-FROM url: Can be embedded in iframe only on specified origin (deprecated)
    res.setHeader('X-Frame-Options', 'DENY');

    // XSS protection (modern browsers have built-in XSS filters)
    // 1: Enable filter and block page if XSS detected (legacy, some modern use)
    // mode=block: Block instead of sanitizing
    // Most modern browsers ignore this in favor of CSP
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Content Security Policy - restrict resource loading
    // This is recommended but requires careful configuration per app
    // For now, we rely on XSS protection above
    // Can be enabled in next.config.js via headers config

    // HTTPS enforcement (production only)
    if (env.NODE_ENV === 'production') {
      // Strict-Transport-Security (HSTS)
      // max-age: Tell browser to use HTTPS for this many seconds (1 year)
      // includeSubDomains: Apply to all subdomains too
      // preload: Allow browser preload list inclusion (optional)
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );

      // Referrer-Policy: Control what referrer info is sent
      // strict-origin-when-cross-origin: Send only origin for cross-origin requests
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      // Permissions-Policy (formerly Feature-Policy)
      // Disable various browser features that could be security risks
      res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
      );
    }

    // Call the actual handler
    return handler(req, res);
  };
}

/**
 * Set individual security headers on a response
 * Use when you need more granular control
 * 
 * @param res - Response object
 * @param production - Whether to apply production-only headers (HSTS)
 */
export function setSecurityHeaders(res: NextApiResponse, production: boolean = false): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (production) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
    );
  }
}

/**
 * Security headers configuration
 * Use in next.config.js for application-wide headers
 * 
 * Example in next.config.js:
 * ```typescript
 * async headers() {
 *   return [
 *     {
 *       source: '/api/:path*',
 *       headers: SECURITY_HEADERS_CONFIG,
 *     },
 *   ];
 * }
 * ```
 */
export const SECURITY_HEADERS_CONFIG = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

/**
 * Production security headers
 * Includes HSTS and additional hardening
 */
export const PRODUCTION_SECURITY_HEADERS_CONFIG = [
  ...SECURITY_HEADERS_CONFIG,
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
  },
];
