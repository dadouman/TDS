import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/middleware/withAuth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const user = (req as any).user;

  // Only STORE role can access this endpoint
  if (user.role !== 'STORE') {
    return res.status(403).json({ success: false, error: 'Access denied - STORE role required' });
  }

  // Get user's store location
  const storeUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { storeLocationId: true }
  });

  if (!storeUser?.storeLocationId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Store location not configured for this user' 
    });
  }

  // Parse pagination params
  const limit = parseInt(req.query.limit as string) || 20;
  const cursor = req.query.cursor as string | undefined;

  // Build query
  const where = {
    destinationId: storeUser.storeLocationId,
    is_deleted: false
  };

  // Get total count
  const total = await prisma.transportPlan.count({ where });

  // Get deliveries with incident count
  const deliveries = await prisma.transportPlan.findMany({
    where,
    include: {
      incidents: {
        where: {
          type: { in: ['DELAY', 'IMBALANCE'] }
        },
        select: { id: true }
      },
      trips: {
        select: { status: true }
      }
    },
    orderBy: {
      estimatedDeliveryTime: 'asc'
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  });

  // Map to response format
  const mappedDeliveries = deliveries.map(plan => ({
    id: plan.id,
    status: plan.status,
    supplierId: plan.supplierId,
    destinationId: plan.destinationId,
    estimatedDeliveryTime: plan.estimatedDeliveryTime,
    incidentCount: plan.incidents.length,
    tripStatus: plan.trips[0]?.status || 'PROPOSED',
    unitCount: plan.unitCount
  }));

  return res.status(200).json({
    success: true,
    data: {
      deliveries: mappedDeliveries,
      pagination: {
        total,
        limit,
        cursor: deliveries.length > 0 ? deliveries[deliveries.length - 1].id : null,
        hasMore: deliveries.length === limit
      }
    }
  });
}

export default withAuth(handler);
