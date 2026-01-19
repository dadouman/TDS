import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/middleware/withAuth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const user = (req as any).user;

  // Only STORE role can access
  if (user.role !== 'STORE') {
    return res.status(403).json({ success: false, error: 'Access denied - STORE role required' });
  }

  // Parse pagination params
  const limit = parseInt(req.query.limit as string) || 20;
  const cursor = req.query.cursor as string | undefined;

  // Build query - only unacknowledged notifications by default
  const where = {
    userId: user.userId,
    acknowledged: false,
    is_deleted: false
  };

  // Get total count
  const total = await prisma.notification.count({ where });

  // Get notifications
  const notifications = await prisma.notification.findMany({
    where,
    include: {
      plan: {
        select: {
          id: true,
          status: true,
          estimatedDeliveryTime: true,
          destination: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  });

  return res.status(200).json({
    success: true,
    data: {
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        planId: n.planId,
        message: n.message,
        acknowledged: n.acknowledged,
        createdAt: n.createdAt,
        plan: n.plan
      })),
      pagination: {
        total,
        limit,
        cursor: notifications.length > 0 ? notifications[notifications.length - 1].id : null,
        hasMore: notifications.length === limit
      }
    }
  });
}

export default withAuth(handler);
