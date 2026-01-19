/**
 * Logout API Endpoint
 * Clears authentication cookie and terminates user session
 * 
 * Source: Story 1-003 - User Logout with Session Termination
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/middleware/withAuth';
import { clearSecureCookie } from '@/utils/cookies';

type LogoutResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogoutResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Extract user info for audit logging
  const userId = (req as any).user?.userId;
  const email = (req as any).user?.email;
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // Clear authentication cookie
  clearSecureCookie(res);
  
  // Log logout event
  console.log('[Logout] Success:', { 
    userId, 
    email, 
    clientIP, 
    timestamp: new Date().toISOString() 
  });
  
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}

// Wrap with authentication (requires valid token)
export default withAuth(handler);
