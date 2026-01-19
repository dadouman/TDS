/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces role-based authorization on protected routes
 * 
 * Source: Story 1-032 Task 3 - RBAC Middleware Implementation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, extractToken, type TokenPayload } from './auth';

/**
 * Require one or more specific roles to access an endpoint
 * 
 * Usage:
 * ```typescript
 * const freighterOnly = requireRole('freighter');
 * const adminOrWarehouse = requireRole('admin', 'warehouse');
 * 
 * if (!freighterOnly(req, res)) {
 *   return; // Response already sent by middleware
 * }
 * const user = (req as any).user; // User is now attached to request
 * ```
 * 
 * @param allowedRoles - One or more role strings (freighter, carrier, warehouse, store, admin)
 * @returns Middleware function that checks role and returns user payload or null
 * 
 * Returns null if:
 * - No token found in request (401 Unauthorized)
 * - Token is invalid or expired (401 Unauthorized)
 * - User's role is not in allowed list (403 Forbidden)
 * 
 * Returns TokenPayload if authorization succeeds
 * 
 * @security All responses are sent by this middleware; handler should not re-send response
 */
export function requireRole(...allowedRoles: string[]): (
  req: NextApiRequest,
  res: NextApiResponse
) => TokenPayload | null {
  return (req: NextApiRequest, res: NextApiResponse): TokenPayload | null => {
    const token = extractToken(req);

    // No token provided
    if (!token) {
      res.status(401).json({ error: 'Unauthorized - No token provided' });
      return null;
    }

    // Token is invalid or expired
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
      return null;
    }

    // Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(payload.role)) {
      res.status(403).json({
        error: 'Forbidden - Insufficient role',
        required_roles: allowedRoles,
        current_role: payload.role,
      });
      return null;
    }

    // Authorization successful - return payload for handler to use
    return payload;
  };
}

/**
 * Middleware to check if a role is in allowed list
 * Returns true if authorized, false if not
 * 
 * Does NOT send response; use with requireRole() or withAuth() for automatic response
 * 
 * @param userRole - The user's current role from token
 * @param allowedRoles - Array of roles that are allowed
 * @returns true if userRole is in allowedRoles, false otherwise
 */
export function isAuthorizedRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Verify authorization without sending response
 * Useful for conditional logic within handlers
 * 
 * @param req - NextApiRequest with potential token
 * @param allowedRoles - Array of allowed roles
 * @returns TokenPayload if authorized, null if not
 * 
 * Does NOT send response; caller must handle null case
 */
export function checkAuthorization(
  req: NextApiRequest,
  ...allowedRoles: string[]
): TokenPayload | null {
  const token = extractToken(req);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  if (!allowedRoles.includes(payload.role)) {
    return null;
  }

  return payload;
}
