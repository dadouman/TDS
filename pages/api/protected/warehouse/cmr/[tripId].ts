/**
 * GET CMR Form Endpoint - Story 6.022
 * 
 * GET /api/protected/warehouse/cmr/[tripId]
 * 
 * Returns CMR form template with pre-filled trip and plan details
 * Warehouse manager can view what they need to fill out for this trip
 */
/**
 * CMR Form Endpoint - Story 6.022 (GET) & 6.024 (PATCH)
 * 
 * GET /api/protected/warehouse/cmr/[tripId]
 *   Returns CMR form template with pre-filled trip and plan details
 * 
 * PATCH /api/protected/warehouse/cmr/[tripId]
 *   Auto-save CMR data with optimistic locking
 *   Handles field updates with version conflict detection
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAuth, AuthenticatedApiRequest } from '@/middleware/withAuth';

const prisma = new PrismaClient();

type CMRFormResponse = {
  success?: boolean;
  data?: {
    tripId: string;
    planDetails: {
      supplier: {
        id: string;
        name: string;
      };
      destination: {
        id: string;
        name: string;
      };
      unitCount: number;
      estimatedDeliveryTime: string | null;
    };
    cmrForm: {
      tripId: string;
      receivedCount: number | null;
      damageDeclared: boolean;
      damageNotes: string | null;
      inspectorName: string | null;
      status: string;
    };
  };
  error?: string;

type CMRUpdateRequest = {
  receivedCount?: number | null;
  damageDeclared?: boolean;
  damageNotes?: string | null;
  inspectorName?: string | null;
  version: number;
};

type CMRUpdateResponse = {
  success?: boolean;
  data?: {
    id: string;
    tripId: string;
    receivedCount: number | null;
    damageDeclared: boolean;
    damageNotes: string | null;
    inspectorName: string | null;
    status: string;
    version: number;
    lastUpdatedBy: string;
    updatedAt: string;
  };
  error?: string;
  conflict?: {
    serverVersion: number;
    clientVersion: number;
    currentData: any;
  };
};
};

async function handler(
  req: AuthenticatedApiRequest,
  res: NextApiResponse<CMRFormResponse>
) {
  // Allow GET and PATCH requests
  if (!['GET', 'PATCH'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tripId } = req.query;

  if (!tripId || typeof tripId !== 'string') {
    return res.status(400).json({ error: 'Trip ID is required' });

    // Handle GET request
    if (req.method === 'GET') {
      return handleGetCMR(req, res, tripId);
    }

    // Handle PATCH request
    if (req.method === 'PATCH') {
      return handlePatchCMR(req, res, tripId);
    }
  }

  async function handleGetCMR(
    req: AuthenticatedApiRequest,
    res: NextApiResponse<CMRFormResponse>,
    tripId: string
  ) {
  }

  try {
    // Fetch trip with plan details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        planId: true,
        status: true,
        plan: {
          select: {
            id: true,
            supplierId: true,
            destinationId: true,
            unitCount: true,
            estimatedDeliveryTime: true,
            supplier: {
              select: {
                id: true,
                name: true
              }
            },
            destination: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if CMR already exists for this trip
    let cmr = await prisma.cMR.findUnique({
      where: { tripId }
    });

    // If CMR doesn't exist, create a new one in DRAFT status
    if (!cmr) {
      cmr = await prisma.cMR.create({
        data: {
          tripId,
          warehouseId: req.user.userId,
          status: 'DRAFT',
          version: 1
        }
      });
    }

    // Return form data
    return res.status(200).json({
      success: true,
      data: {
        tripId,
        planDetails: {
          supplier: trip.plan.supplier,
          destination: trip.plan.destination,
          unitCount: trip.plan.unitCount,
          estimatedDeliveryTime: trip.plan.estimatedDeliveryTime?.toISOString() || null
        },
        cmrForm: {
          tripId: cmr.tripId,
          receivedCount: cmr.receivedCount,
          damageDeclared: cmr.damageDeclared,
          damageNotes: cmr.damageNotes,
          inspectorName: cmr.inspectorName,
          status: cmr.status
        }
      }
    });
  } catch (error) {
    console.error('Error fetching CMR form:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }

  async function handlePatchCMR(
    req: AuthenticatedApiRequest,
    res: NextApiResponse<CMRUpdateResponse>,
    tripId: string
  ) {
    try {
      const body: CMRUpdateRequest = req.body;

      if (!body.version || typeof body.version !== 'number') {
        return res.status(400).json({ error: 'Version field is required' });
      }

      // Fetch current CMR
      const currentCMR = await prisma.cMR.findUnique({
        where: { tripId }
      });

      if (!currentCMR) {
        return res.status(404).json({ error: 'CMR not found' });
      }

      // Check version for optimistic locking
      if (currentCMR.version !== body.version) {
        // Version mismatch - conflict
        return res.status(409).json({
          error: 'Version conflict - CMR has been modified',
          conflict: {
            serverVersion: currentCMR.version,
            clientVersion: body.version,
            currentData: {
              id: currentCMR.id,
              tripId: currentCMR.tripId,
              receivedCount: currentCMR.receivedCount,
              damageDeclared: currentCMR.damageDeclared,
              damageNotes: currentCMR.damageNotes,
              inspectorName: currentCMR.inspectorName,
              status: currentCMR.status,
              version: currentCMR.version,
              updatedAt: currentCMR.updatedAt
            }
          }
        });
      }

      // Update CMR with new values
      // Auto-transition to IN_PROGRESS if updating from DRAFT
      const newStatus =
        currentCMR.status === 'DRAFT' ? 'IN_PROGRESS' : currentCMR.status;

      const updatedCMR = await prisma.cMR.update({
        where: { tripId },
        data: {
          ...(typeof body.receivedCount !== 'undefined' && {
            receivedCount: body.receivedCount
          }),
          ...(typeof body.damageDeclared !== 'undefined' && {
            damageDeclared: body.damageDeclared
          }),
          ...(typeof body.damageNotes !== 'undefined' && {
            damageNotes: body.damageNotes
          }),
          ...(typeof body.inspectorName !== 'undefined' && {
            inspectorName: body.inspectorName
          }),
          status: newStatus,
          version: {
            increment: 1
          },
          lastUpdatedBy: req.user.userId
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          id: updatedCMR.id,
          tripId: updatedCMR.tripId,
          receivedCount: updatedCMR.receivedCount,
          damageDeclared: updatedCMR.damageDeclared,
          damageNotes: updatedCMR.damageNotes,
          inspectorName: updatedCMR.inspectorName,
          status: updatedCMR.status,
          version: updatedCMR.version,
          lastUpdatedBy: updatedCMR.lastUpdatedBy || '',
          updatedAt: updatedCMR.updatedAt.toISOString()
        }
      });
    } catch (error) {
      console.error('Error updating CMR:', error);
      return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export handler wrapped with WAREHOUSE role authentication
export default withAuth(handler, 'WAREHOUSE');
