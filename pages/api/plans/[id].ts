import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, PlanStatus } from '@prisma/client';
import { withAuth } from '@/middleware/withAuth';
import { buildJourneyTimeline, calculateCostBreakdown } from '@/utils/planTimeline';
import {
  canModifyField,
  validateModification,
  getChangedFields,
  needsReProposal,
  type ModificationRequest
} from '@/utils/planModification';
import { proposeCarriers } from '@/utils/carrierProposal';

const prisma = new PrismaClient();

type PlanDetailsResponse = {
  success?: boolean;
  data?: any;
  error?: string;
  details?: string[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<PlanDetailsResponse>) {
  const user = (req as any).user;
  const { id: planId } = req.query;

  if (!planId || typeof planId !== 'string') {
    return res.status(400).json({ error: 'Invalid plan ID' });
  }

  try {
    // GET: View plan details
    if (req.method === 'GET') {
      const plan = await prisma.transportPlan.findFirst({
        where: { id: planId, is_deleted: false },
        include: {
          supplier: true,
          destination: true,
          hub: true,
          createdByUser: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      if (user.role !== 'ADMIN' && plan.createdBy !== user.userId) {
        return res.status(403).json({ error: 'Unauthorized: Cannot view this plan' });
      }

      // Build timeline only if plannedLoadingTime exists
      const timeline = plan.plannedLoadingTime ? buildJourneyTimeline(plan) : null;
      const costBreakdown = calculateCostBreakdown(plan, 45);

      return res.status(200).json({
        success: true,
        data: {
          id: plan.id,
          supplier: {
            id: plan.supplier.id,
            name: plan.supplier.name,
            type: plan.supplier.type,
            address: plan.supplier.address,
            coordinates: { latitude: plan.supplier.latitude, longitude: plan.supplier.longitude }
          },
          destination: {
            id: plan.destination.id,
            name: plan.destination.name,
            type: plan.destination.type,
            address: plan.destination.address,
            coordinates: { latitude: plan.destination.latitude, longitude: plan.destination.longitude }
          },
          hub: plan.hub
            ? { id: plan.hub.id, name: plan.hub.name, type: plan.hub.type, address: plan.hub.address }
            : null,
          journey: {
            plannedLoadingTime: plan.plannedLoadingTime,
            estimatedHubTime: plan.estimatedHubTime,
            estimatedDeliveryTime: plan.estimatedDeliveryTime,
            timeline: timeline
          },
          shipment: { unitCount: plan.unitCount, notes: plan.notes },
          costs: costBreakdown,
          status: plan.status,
          version: plan.version,
          createdBy: plan.createdByUser,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt
        }
      });
    }

    // PATCH: Modify plan
    if (req.method === 'PATCH') {
      const modifications: ModificationRequest = req.body;

      // Load plan
      const plan = await prisma.transportPlan.findFirst({
        where: { id: planId, is_deleted: false }
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      // Authorization: Must be owner
      if (user.role !== 'ADMIN' && plan.createdBy !== user.userId) {
        return res.status(403).json({ error: 'Unauthorized: Cannot modify this plan' });
      }

      // Check version for optimistic locking
      if (modifications.version !== undefined && modifications.version !== plan.version) {
        return res.status(409).json({
          error: 'Conflict: Plan was modified by another user. Please refresh and try again.',
          details: ['Version mismatch']
        });
      }

      // Check status: cannot modify terminal statuses
      const terminalStatuses: PlanStatus[] = ['ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
      if (terminalStatuses.includes(plan.status as PlanStatus)) {
        return res.status(400).json({
          error: `Cannot modify plan in ${plan.status} status`
        });
      }

      // Validate each field modification
      const fieldErrors: string[] = [];
      for (const field of Object.keys(modifications)) {
        if (field === 'version') continue; // Skip version field itself

        if (!canModifyField(field, plan.status as PlanStatus)) {
          fieldErrors.push(`Cannot modify ${field} in ${plan.status} status`);
        }
      }

      if (fieldErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: fieldErrors
        });
      }

      // Validate modification values
      const validationErrors = validateModification(plan, modifications);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors.map(e => `${e.field}: ${e.message}`)
        });
      }

      // Get changed fields
      const changedFields = getChangedFields(plan, modifications);
      const shouldRePropose = needsReProposal(changedFields);

      // Prepare update data
      const updateData: any = {};
      if (modifications.unitCount !== undefined) updateData.unitCount = modifications.unitCount;
      if (modifications.plannedLoadingTime !== undefined)
        updateData.plannedLoadingTime = new Date(modifications.plannedLoadingTime);
      if (modifications.destinationStoreId !== undefined) updateData.destinationId = modifications.destinationStoreId;
      if (modifications.notes !== undefined) updateData.notes = modifications.notes;
      updateData.version = plan.version + 1;

      // Re-propose carriers if needed
      let newProposals: any[] = [];
      if (shouldRePropose && updateData.plannedLoadingTime) {
        newProposals = await proposeCarriers(
          modifications.unitCount || plan.unitCount,
          updateData.plannedLoadingTime,
          modifications.destinationStoreId || plan.destinationId
        );
      }

      // Update plan
      const updatedPlan = await prisma.transportPlan.update({
        where: { id: planId },
        data: updateData,
        include: {
          supplier: true,
          destination: true,
          hub: true,
          createdByUser: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      console.log('[ModifyPlan] Success:', {
        planId: plan.id,
        userId: user.userId,
        changedFields,
        newVersion: updatedPlan.version
      });

      const timeline = buildJourneyTimeline(updatedPlan);
      const costBreakdown = calculateCostBreakdown(updatedPlan, 45);

      return res.status(200).json({
        success: true,
        data: {
          id: updatedPlan.id,
          supplier: {
            id: updatedPlan.supplier.id,
            name: updatedPlan.supplier.name,
            type: updatedPlan.supplier.type,
            address: updatedPlan.supplier.address,
            coordinates: { latitude: updatedPlan.supplier.latitude, longitude: updatedPlan.supplier.longitude }
          },
          destination: {
            id: updatedPlan.destination.id,
            name: updatedPlan.destination.name,
            type: updatedPlan.destination.type,
            address: updatedPlan.destination.address,
            coordinates: { latitude: updatedPlan.destination.latitude, longitude: updatedPlan.destination.longitude }
          },
          hub: updatedPlan.hub
            ? { id: updatedPlan.hub.id, name: updatedPlan.hub.name, type: updatedPlan.hub.type, address: updatedPlan.hub.address }
            : null,
          journey: {
            plannedLoadingTime: updatedPlan.plannedLoadingTime,
            estimatedHubTime: updatedPlan.estimatedHubTime,
            estimatedDeliveryTime: updatedPlan.estimatedDeliveryTime,
            timeline: timeline
          },
          shipment: { unitCount: updatedPlan.unitCount, notes: updatedPlan.notes },
          costs: costBreakdown,
          status: updatedPlan.status,
          version: updatedPlan.version,
          proposedCarriers: newProposals,
          changedFields: changedFields,
          createdBy: updatedPlan.createdByUser,
          createdAt: updatedPlan.createdAt,
          updatedAt: updatedPlan.updatedAt
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[PlanHandler] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAuth(handler, ['freighter', 'admin']);
