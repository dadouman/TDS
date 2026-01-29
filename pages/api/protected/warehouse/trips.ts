import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/middleware/withAuth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const user = (req as any).user;

  // Only WAREHOUSE role can access this endpoint
  if (user.role?.toUpperCase() !== 'WAREHOUSE') {
    return res.status(403).json({ success: false, error: 'Access denied - WAREHOUSE role required' });
  }

  try {
    // Get all trips that need CMR (ACCEPTED or IN_TRANSIT status)
    const trips = await prisma.trip.findMany({
      where: {
        status: {
          in: ['ACCEPTED', 'IN_TRANSIT']
        },
        is_deleted: false
      },
      include: {
        plan: {
          select: {
            id: true,
            unitCount: true,
            estimatedDeliveryTime: true,
            supplier: {
              select: {
                name: true,
                address: true
              }
            },
            destination: {
              select: {
                name: true,
                address: true
              }
            },
            hub: {
              select: {
                name: true,
                address: true
              }
            }
          }
        },
        carrier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        cmr: {
          select: {
            id: true,
            status: true,
            submittedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const mappedTrips = trips.map(trip => ({
      id: trip.id,
      status: trip.status,
      planId: trip.planId,
      carrierId: trip.carrierId,
      carrierName: `${trip.carrier.firstName} ${trip.carrier.lastName}`,
      acceptedAt: trip.acceptedAt,
      plan: {
        id: trip.plan.id,
        unitCount: trip.plan.unitCount,
        estimatedDeliveryTime: trip.plan.estimatedDeliveryTime,
        supplier: trip.plan.supplier,
        destination: trip.plan.destination,
        hub: trip.plan.hub
      },
      cmr: trip.cmr ? {
        id: trip.cmr.id,
        status: trip.cmr.status,
        submittedAt: trip.cmr.submittedAt
      } : null,
      needsCMR: !trip.cmr || trip.cmr.status === 'IN_PROGRESS'
    }));

    return res.status(200).json({
      success: true,
      data: {
        trips: mappedTrips,
        total: mappedTrips.length
      }
    });
  } catch (error) {
    console.error('[WarehouseTrips] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAuth(handler, 'warehouse');
