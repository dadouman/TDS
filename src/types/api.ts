/**
 * TypeScript Module Augmentation for Authenticated Requests
 * Extends NextApiRequest type to include user payload after authentication
 * 
 * Source: Story 1-032 Task 6 - TypeScript Type Augmentation
 */

import type { NextApiRequest } from 'next';
import type { TokenPayload } from '../middleware/auth';

/**
 * Augment Express.Request (used by Next.js internally) to include user field
 * This allows TypeScript to recognize req.user after withAuth() middleware
 * 
 * Note: While we're in a Next.js context, Next.js uses Express-compatible types internally
 */
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Extended NextApiRequest that includes authenticated user
 * Used for handlers that are protected by withAuth middleware
 * 
 * Example:
 * ```typescript
 * const handler = (req: AuthenticatedRequest, res: NextApiResponse) => {
 *   const userId = req.user.userId; // TypeScript knows this exists
 * };
 * ```
 */
export interface AuthenticatedRequest extends NextApiRequest {
  user: TokenPayload;
}

/**
 * Partial authenticated request (user might exist)
 * Use when user presence is optional
 */
export interface PartiallyAuthenticatedRequest extends NextApiRequest {
  user?: TokenPayload;
}

/**
 * Response with standard API error structure
 * Used for consistent error responses across handlers
 */
export interface ApiErrorResponse {
  error: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

/**
 * Response with standard success structure
 * Used for consistent success responses across handlers
 */
export interface ApiSuccessResponse<T = any> {
  success: boolean;
  data: T;
  timestamp: string;
}

export {};
