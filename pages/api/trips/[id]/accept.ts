import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, TripStatus } from '@prisma/client';
import { withAuth } from '@/middleware/withAuth';

const prisma = new PrismaClient();

type AcceptTripResponse = {
  success?: boolean;
  data?: any;
  error?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<AcceptTripResponse>) {
  const user = (req as any).user;
  const { id } = req.query;

  // Only CARRIER role can accept trips
  if (user.role !== 'CARRIER') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - CARRIER role required'
    });
  }

  try {
    if (req.method === 'POST') {
      // Find trip
      const trip = await prisma.trip.findFirst({
        where: {
          id: id as string,
          is_deleted: false
        }
      });

      // Trip not found
      if (!trip) {
        return res.status(404).json({
          success: false,
          error: 'Trip not found'
        });
      }

      // CRITICAL: Verify carrier owns this trip
      if (trip.carrierId !== user.userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden - You can only accept your own trips'
        });
      }

      // Validate status - cannot accept DELIVERED or CANCELLED trips
      if (trip.status === TripStatus.DELIVERED || trip.status === TripStatus.CANCELLED) {
        return res.status(400).json({
          success: false,
          error: 'Cannot accept trip - invalid status'
        });
      }

      // Idempotent - if already accepted, return success
      if (trip.status === TripStatus.ACCEPTED) {
        console.log('[AcceptTrip] Already accepted (idempotent):', {
          tripId: trip.id,
          carrierId: user.userId
        });

        return res.status(200).json({
          success: true,
          data: trip
        });
      }

      // Update trip status to ACCEPTED atomically
      const updatedTrip = await prisma.trip.update({
        where: { id: trip.id },
        data: {
          status: TripStatus.ACCEPTED,
          acceptedAt: new Date()
        },
        include: {
          plan: {
            select: {
              id: true,
              supplierId: true,
              destinationId: true,
              unitCount: true,
              plannedLoadingTime: true,
              estimatedDeliveryTime: true
            }
          }
        }
      });

      console.log('[AcceptTrip] Success:', {
        tripId: updatedTrip.id,
        carrierId: user.userId,
        planId: updatedTrip.planId
      });

      // TODO: Trigger SSE notification to freighter (story 3-013)
      // await broadcastNotification({
      //   type: 'trip_accepted',
      //   data: {
      //     tripId: updatedTrip.id,
      //     planId: updatedTrip.planId,
      //     carrierId: user.userId
      //   }
      // });

      return res.status(200).json({
        success: true,
        data: updatedTrip
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  } catch (error: any) {
    console.error('[AcceptTrip] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default withAuth(handler);
