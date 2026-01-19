/**
 * CMR Submit Endpoint - Story 6.025 (Stub for 3.012 Integration)
 * Handles CMR (Consignment Note) submission and triggers imbalance detection
 * 
 * This is a minimal implementation supporting story 3.012: Detect Imbalance Incidents
 * Full CMR management (6.022-6.026) will be implemented in Epic 6
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, IncidentType } from '@prisma/client';
import { withAuth } from '@/middleware/withAuth';
import { detectImbalance, generateImbalanceDescription, validateUnitCounts } from '@/utils/imbalanceDetection';

const prisma = new PrismaClient();

type SubmitCmrRequest = {
  planId: string;
  actualUnits: number;
};

type SubmitCmrResponse = {
  success?: boolean;
  data?: any;
  error?: string;
  details?: string[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<SubmitCmrResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;
  const { planId, actualUnits } = req.body as SubmitCmrRequest;

  try {
    // Validate request
    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    if (actualUnits === undefined || actualUnits === null) {
      return res.status(400).json({ error: 'actualUnits is required' });
    }

    if (!Number.isInteger(actualUnits) || actualUnits < 0) {
      return res.status(400).json({ error: 'actualUnits must be a non-negative integer' });
    }

    // Fetch the plan
    const plan = await prisma.transportPlan.findFirst({
      where: { id: planId, is_deleted: false }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Verify authorization (Warehouse can submit, Freighter can view)
    if (user.role === 'WAREHOUSE') {
      // Warehouse can submit CMR for any plan
    } else if (user.role === 'FREIGHTER') {
      // Freighter can only view/submit for own plans
      if (plan.createdBy !== user.userId) {
        return res.status(403).json({ error: 'Unauthorized: Cannot submit CMR for this plan' });
      }
    } else if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only warehouse, freighter, or admin can submit CMR' });
    }

    // Validate unit counts
    const validationErrors = validateUnitCounts(plan.unitCount, actualUnits);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid unit counts',
        details: validationErrors
      });
    }

    // STORY 3.012: Detect imbalance and create incident if needed
    const hasImbalance = detectImbalance(plan.unitCount, actualUnits);

    let incident = null;
    if (hasImbalance) {
      // Check if incident already exists to avoid duplicates
      const existingIncident = await prisma.incident.findFirst({
        where: {
          planId: planId,
          type: 'IMBALANCE',
          is_deleted: false
        }
      });

      if (!existingIncident) {
        // Create new imbalance incident
        incident = await prisma.incident.create({
          data: {
            type: 'IMBALANCE' as IncidentType,
            status: 'OPEN',
            planId: planId,
            warehouseId: user.role === 'WAREHOUSE' ? user.userId : undefined,
            description: generateImbalanceDescription(plan.unitCount, actualUnits)
          }
        });
      } else {
        incident = existingIncident;
      }
    }

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        planId: planId,
        plannedUnits: plan.unitCount,
        actualUnits: actualUnits,
        imbalanceDetected: hasImbalance,
        incident: incident ? {
          id: incident.id,
          type: incident.type,
          status: incident.status,
          description: incident.description,
          createdAt: incident.createdAt
        } : null
      }
    });
  } catch (error) {
    console.error('CMR submit error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: [error instanceof Error ? error.message : 'Unknown error']
    });
  }
}

export default withAuth(handler, ['WAREHOUSE', 'FREIGHTER', 'ADMIN']);
