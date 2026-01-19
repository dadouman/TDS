import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAuth } from '@/middleware/withAuth';

const prisma = new PrismaClient();

type TripDetailsResponse = {
  success?: boolean;
  data?: any;
  error?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<TripDetailsResponse>) {
  const user = (req as any).user;
  const { id } = req.query;

  // Only CARRIER role can view trip details
  if (user.role !== 'CARRIER') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - CARRIER role required'
    });
  }

  try {
    if (req.method === 'GET') {
      // Find trip with all related data
      const trip = await prisma.trip.findFirst({
        where: {
          id: id as string,
          is_deleted: false
        },
        select: {
          id: true,
          planId: true,
          carrierId: true,
          status: true,
          acceptedAt: true,
          refusedAt: true,
          refusalReason: true,
          createdAt: true,
          updatedAt: true,
          plan: {
            select: {
              id: true,
              supplierId: true,
              destinationId: true,
              hubId: true,
              unitCount: true,
              plannedLoadingTime: true,
              estimatedHubTime: true,
              estimatedDeliveryTime: true,
              status: true,
              notes: true,
              version: true,
              createdAt: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  address: true,
                  latitude: true,
                  longitude: true
                }
              },
              destination: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  address: true,
                  latitude: true,
                  longitude: true
                }
              },
              hub: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  address: true
                }
              }
            }
          },
          carrier: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
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
          error: 'Forbidden - You can only view your own trips'
        });
      }

      console.log('[TripDetails] Success:', {
        tripId: trip.id,
        carrierId: user.userId
      });

      return res.status(200).json({
        success: true,
        data: trip
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  } catch (error: any) {
    console.error('[TripDetails] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default withAuth(handler);
