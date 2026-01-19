/**
 * User Profile API Handler
 * Demonstrates usage of JWT token for authentication
 * 
 * Handles GET /api/user/profile to retrieve current user's profile
 * Requires valid JWT token in cookie or Authorization header
 * 
 * Source: Story 1-001 Task 5 - Integration with withAuth Middleware
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { extractToken, verifyToken } from '@/middleware/auth';

/**
 * Type definition for profile response
 */
type ProfileResponse = {
  userId?: string;
  email?: string;
  role?: string;
  error?: string;
};

/**
 * GET /api/user/profile
 * 
 * Protected endpoint - requires valid JWT token
 * Returns the authenticated user's profile information from the token
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProfileResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract token from request (cookie or Authorization header)
  const token = extractToken(req);

  // Verify token
  const payload = verifyToken(token);

  // Check if token is valid
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized - Invalid or missing token' });
  }

  // Return user profile information from token
  return res.status(200).json({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  });
}
