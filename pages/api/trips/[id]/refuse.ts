import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, TripStatus, IncidentType, IncidentStatus } from '@prisma/client';
import { withAuth } from '@/middleware/withAuth';

const prisma = new PrismaClient();

type RefuseTripResponse = {
  success?: boolean;
  data?: any;
  error?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<RefuseTripResponse>) {
  const user = (req as any).user;
  const { id } = req.query;

  // Only CARRIER role can refuse trips
  if (user.role !== 'CARRIER') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - CARRIER role required'
    });
  }

  try {
    if (req.method === 'POST') {
      const { reason } = req.body || {};

      // Validate reason length
      if (reason && reason.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Refusal reason must not exceed 500 characters'
        });
      }

      // Find trip
      const trip = await prisma.trip.findFirst({
        where: {
          id: id as string,
          is_deleted: false
        },
        include: {
          plan: true
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
          error: 'Forbidden - You can only refuse your own trips'
        });
      }

      // Idempotent - if already refused, return success
      if (trip.status === TripStatus.CANCELLED && trip.refusedAt) {
        console.log('[RefuseTrip] Already refused (idempotent):', {
          tripId: trip.id,
          carrierId: user.userId
        });

        // Find existing incident
        const existingIncident = await prisma.incident.findFirst({
          where: {
            type: IncidentType.REFUSAL,
            planId: trip.planId,
            carrierId: user.userId
          }
        });

        return res.status(200).json({
          success: true,
          data: {
            trip,
            incident: existingIncident
          }
        });
      }

      // ATOMIC TRANSACTION: Update trip + Create incident
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update trip status to CANCELLED
        const updatedTrip = await tx.trip.update({
          where: { id: trip.id },
          data: {
            status: TripStatus.CANCELLED,
            refusedAt: new Date(),
            refusalReason: reason || null
          }
        });

        // 2. Create REFUSAL incident (Story 3.010)
        const incident = await tx.incident.create({
          data: {
            type: IncidentType.REFUSAL,
            status: IncidentStatus.OPEN,
            planId: trip.planId,
            carrierId: user.userId,
            description: reason
              ? `Carrier refused trip: ${reason}`
              : 'Carrier refused trip'
          }
        });

        return { trip: updatedTrip, incident };
      });

      console.log('[RefuseTrip] Success:', {
        tripId: result.trip.id,
        carrierId: user.userId,
        planId: trip.planId,
        incidentId: result.incident.id
      });

      // TODO: Trigger SSE notification to freighter (story 3-013)
      // await broadcastIncident({
      //   type: 'incident',
      //   data: {
      //     incidentType: IncidentType.REFUSAL,
      //     planId: trip.planId,
      //     carrierId: user.userId,
      //     incidentId: result.incident.id
      //   }
      // });

      // TODO: Trigger re-proposal logic (story 2-008)
      // await regenerateCarrierProposals(trip.planId, {
      //   excludeCarriers: [user.userId]
      // });

      return res.status(200).json({
        success: true,
        data: result
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  } catch (error: any) {
    console.error('[RefuseTrip] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default withAuth(handler);
