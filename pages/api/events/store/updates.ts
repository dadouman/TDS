/**
 * Real-Time Delivery Status Updates SSE Endpoint - Story 5.019
 * 
 * GET /api/events/store/updates
 * 
 * Establishes SSE connection for authenticated store managers to receive
 * real-time updates on delivery status changes for their store's locations.
 * 
 * Response Events:
 * - ACCEPTED: Plan has been accepted by warehouse
 * - IN_TRANSIT: Delivery is in transit to store
 * - DELAYED: Delivery has been delayed
 * - DELIVERED: Delivery has been completed
 * - CANCELLED: Plan has been cancelled
 * 
 * Event Format:
 * id: <event-id>
 * data: {"planId":"...", "status":"...", "eta":"...", "timestamp":"..."}
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAuth, AuthenticatedApiRequest } from '@/middleware/withAuth';
import { sseManager } from '@/utils/sseManager';

const prisma = new PrismaClient();

async function handler(req: AuthenticatedApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // User is already authenticated by withAuth middleware
  const userId = req.user.userId;
  const userRole = req.user.role;

  // Verify user is STORE role
  if (userRole !== 'STORE') {
    return res.status(403).json({ error: 'Forbidden: Only store managers can access this endpoint' });
  }

  // Load user to verify they have a store location assigned
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      storeLocationId: true
    }
  });

  if (!user || !user.storeLocationId) {
    return res.status(400).json({ error: 'Bad Request: User must have a store location assigned' });
  }

  // Subscribe to SSE stream via sseManager
  try {
    const subscriberId = sseManager.subscribe(userId, userRole, res);

    if (!subscriberId) {
      // Connection limit reached, sseManager already sent error
      return;
    }

    // Handle client disconnect
    req.on('close', () => {
      sseManager.disconnect(subscriberId);
    });

    // Send initial connection confirmation
    res.write('data: {"connected":true,"message":"Connected to store updates stream"}\n\n');

  } catch (error) {
    console.error('SSE subscription error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Export handler wrapped with authentication
export default withAuth(handler, 'STORE');

