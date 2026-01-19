import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/middleware/withAuth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const user = (req as any).user;

  // Only STORE role can access
  if (user.role !== 'STORE') {
    return res.status(403).json({ success: false, error: 'Access denied - STORE role required' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Notification ID required' });
  }

  // Find notification - must belong to current user
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId: user.userId,
      is_deleted: false
    }
  });

  if (!notification) {
    return res.status(404).json({ success: false, error: 'Notification not found' });
  }

  // Mark as acknowledged
  const updated = await prisma.notification.update({
    where: { id },
    data: { acknowledged: true }
  });

  return res.status(200).json({
    success: true,
    data: {
      notification: {
        id: updated.id,
        acknowledged: updated.acknowledged
      }
    }
  });
}

export default withAuth(handler);
