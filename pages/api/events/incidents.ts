/**
 * GET /api/events/incidents
 * Server-Sent Events endpoint for real-time incident notifications
 * Story 3.013
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/middleware/withAuth';
import { sseManager } from '@/utils/sseManager';

type ErrorResponse = {
  error: string;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse>
): Promise<void> {
  // Only GET allowed for SSE
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;

  try {
    console.log('[SSE Events] User connecting:', {
      userId: user.userId,
      role: user.role
    });

    // Subscribe to SSE stream
    // sseManager handles connection lifecycle and keep-alive pings
    const subscriberId = sseManager.subscribe(user.userId, user.role, res);

    if (!subscriberId) {
      // Connection limit exceeded
      return;
    }

    // Log subscription stats
    console.log('[SSE Events] Subscription active:', {
      userId: user.userId,
      subscriberId,
      totalConnections: sseManager.getSubscriberCount()
    });

    // Connection is now managed by sseManager
    // Keep-alive pings sent automatically
    // Cleanup handled on 'close' event in sseManager.subscribe()
  } catch (error) {
    console.error('[SSE Events] Error in handler:', error);

    // Try to send error response if headers not sent
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error'
      });
    } else {
      try {
        res.end();
      } catch {
        // Connection already closed
      }
    }
  }
}

export default withAuth(handler, 'freighter');
