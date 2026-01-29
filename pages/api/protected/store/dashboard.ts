import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/middleware/withAuth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const user = (req as any).user;

  // Only STORE role can access this endpoint (token stores role in lowercase)
  if (user.role?.toUpperCase() !== 'STORE') {
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

  // Build query - find plans where any trip has destination = store location
  const where = {
    trips: {
      some: {
        arrival_location_id: storeUser.storeLocationId
      }
    },
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
        select: { 
          id: true,
          status: true,
          arrival_location_id: true,
          arrival_time: true,
          carrierId: true
        }
      }
    },
    orderBy: {
      plan_date: 'asc'
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  });

  // Map to response format
  const mappedDeliveries = deliveries.map(plan => {
    const firstTrip = plan.trips[0];
    return {
      id: plan.id,
      status: plan.status,
      estimatedDeliveryTime: plan.plan_date?.toISOString() || new Date().toISOString(),
      arrival_time: firstTrip?.arrival_time?.toISOString() || null,
      departure_location_id: firstTrip?.arrival_location_id || "Unknown",
      carrier_id: firstTrip?.carrierId || null,
      incidentCount: plan.incidents.length,
      tripStatus: firstTrip?.status || 'PROPOSED',
      unitCount: plan.total_units
    };
  });

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
