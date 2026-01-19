/**
 * Authentication Guard Wrapper for API Routes
 * Higher-order middleware that protects endpoints with JWT verification and optional RBAC
 * 
 * Source: Story 1-032 Task 6 - Auth Guard for API Routes
 */

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { extractToken, verifyToken, type TokenPayload } from './auth';

/**
 * Wrap an API handler with authentication and optional authorization
 * 
 * Usage - Any authenticated user:
 * ```typescript
 * const handler = (req, res) => {
 *   res.json({ userId: req.user.userId });
 * };
 * export default withAuth(handler);
 * ```
 * 
 * Usage - Specific role required:
 * ```typescript
 * export default withAuth(handler, 'freighter');
 * export default withAuth(handler, 'admin'); // Only admin
 * ```
 * 
 * Usage - Multiple roles allowed:
 * ```typescript
 * export default withAuth(handler, ['admin', 'warehouse']);
 * ```
 * 
 * @param handler - The API route handler to protect
 * @param requiredRole - Optional: single role string or array of roles
 * @returns Wrapped handler that performs auth checks before calling handler
 * 
 * @security
 * - Extracts token from cookie or Bearer header
 * - Verifies token signature and expiry
 * - Checks role if requiredRole is provided
 * - Returns 401 if no valid token
 * - Returns 403 if insufficient role
 * - Never exposes error details that could aid attackers
 */
export function withAuth(
  handler: NextApiHandler,
  requiredRole?: string | string[]
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Extract token from request
    const token = extractToken(req);

    // No token found
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
    }

    // Check role if required
    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowedRoles.includes(payload.role)) {
        return res.status(403).json({
          error: 'Forbidden - Insufficient role',
          required_roles: allowedRoles,
          current_role: payload.role,
        });
      }
    }

    // Attach user to request for handler to access
    (req as any).user = payload;

    // Call the actual handler
    return handler(req, res);
  };
}

/**
 * Type-safe extension of NextApiRequest with user payload
 * Use this for handlers that expect authenticated user
 * 
 * Example:
 * ```typescript
 * import { AuthenticatedApiRequest } from '@/src/middleware/withAuth';
 * 
 * const handler = (req: AuthenticatedApiRequest, res: NextApiResponse) => {
 *   // req.user is now properly typed
 *   const userId = req.user.userId;
 * };
 * ```
 */
export interface AuthenticatedApiRequest extends NextApiRequest {
  user: TokenPayload;
}

/**
 * Type-safe handler for authenticated routes
 * Ensures handler is typed with AuthenticatedApiRequest
 */
export type AuthenticatedApiHandler = (
  req: AuthenticatedApiRequest,
  res: NextApiResponse
) => void | Promise<void>;

/**
 * Advanced: Wrap handler with custom auth logic
 * Allows handlers to access user without requiring role
 * 
 * @param handler - Handler typed as AuthenticatedApiHandler
 * @returns Wrapped handler with full auth validation
 */
export function withAuthOptional(handler: AuthenticatedApiHandler): NextApiHandler {
  return withAuth(handler as any);
}

/**
 * Advanced: Wrap handler with role requirement
 * More type-safe than passing string to withAuth
 * 
 * @param handler - Handler typed as AuthenticatedApiHandler
 * @param roles - One or more required roles
 * @returns Wrapped handler that checks role before calling
 * 
 * Example:
 * ```typescript
 * const freighterOnlyHandler: AuthenticatedApiHandler = (req, res) => {
 *   res.json({ message: 'Hello freighter!' });
 * };
 * export default withRole(freighterOnlyHandler, 'freighter');
 * ```
 */
export function withRole(
  handler: AuthenticatedApiHandler,
  ...roles: string[]
): NextApiHandler {
  return withAuth(handler as any, roles);
}
