import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, TripStatus } from '@prisma/client';
import { withAuth } from '@/middleware/withAuth';

const prisma = new PrismaClient();

type ListTripsResponse = {
  success?: boolean;
  data?: any[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<ListTripsResponse>) {
  const user = (req as any).user;

  // Only CARRIER role can list trips
  if (user.role !== 'CARRIER') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - CARRIER role required'
    });
  }

  try {
    if (req.method === 'GET') {
      // Parse query parameters
      const status = req.query.status as string | undefined;
      const sort = req.query.sort as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

      // Build where clause - CRITICAL: only show trips for this carrier
      const where: any = {
        carrierId: user.userId,
        is_deleted: false
      };

      // Add status filter if provided
      if (status && Object.values(TripStatus).includes(status as TripStatus)) {
        where.status = status as TripStatus;
      }

      // Build orderBy clause
      let orderBy: any = { createdAt: 'desc' };
      if (sort === 'loadingTime') {
        orderBy = { plan: { plannedLoadingTime: 'asc' } };
      } else if (sort === 'deliveryTime') {
        orderBy = { plan: { estimatedDeliveryTime: 'asc' } };
      } else if (sort === 'status') {
        orderBy = { status: 'asc' };
      }

      // Execute parallel queries for total count and paginated results
      const [trips, total] = await Promise.all([
        prisma.trip.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            planId: true,
            carrierId: true,
            status: true,
            acceptedAt: true,
            createdAt: true,
            updatedAt: true,
            plan: {
              select: {
                id: true,
                supplierId: true,
                destinationId: true,
                unitCount: true,
                plannedLoadingTime: true,
                estimatedDeliveryTime: true,
                status: true,
                supplier: {
                  select: { id: true, name: true, type: true }
                },
                destination: {
                  select: { id: true, name: true, type: true }
                }
              }
            }
          }
        }),
        prisma.trip.count({ where })
      ]);

      console.log('[ListTrips] Success:', {
        carrierId: user.userId,
        tripCount: trips.length,
        totalTrips: total,
        page
      });

      return res.status(200).json({
        success: true,
        data: trips,
        total,
        page,
        limit
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  } catch (error: any) {
    console.error('[ListTrips] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default withAuth(handler);
