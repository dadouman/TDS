/**
 * Incident Broadcaster
 * Determines who should be notified of incidents and broadcasts to connected SSE subscribers
 */

import { PrismaClient } from '@prisma/client';
import { sseManager, type IncidentEvent } from './sseManager';

const prisma = new PrismaClient();

export type IncidentType = 'REFUSAL' | 'DELAY' | 'IMBALANCE';

/**
 * Broadcast an incident to relevant subscribers based on incident type and RBAC
 * @param incidentType - Type of incident (REFUSAL, DELAY, IMBALANCE)
 * @param planId - Transport plan ID
 * @param description - Incident description
 * @param carrierId - Carrier ID (for REFUSAL incidents)
 * @param warehouseId - Warehouse ID (for IMBALANCE incidents)
 */
export async function broadcastIncident(
  incidentType: IncidentType,
  planId: string,
  description: string,
  carrierId?: string,
  warehouseId?: string
): Promise<void> {
  try {
    // Load plan with creator (freighter)
    const plan = await prisma.transportPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        createdBy: true,
        destinationId: true
      }
    });

    if (!plan) {
      console.warn('[Broadcaster] Plan not found:', { planId });
      return;
    }

    // Determine target users based on incident type and RBAC
    const targetUserIds = new Set<string>();

    // Freighter who created plan always gets notified
    targetUserIds.add(plan.createdBy);

    // Additional targets based on incident type
    if (incidentType === 'REFUSAL' && carrierId) {
      // Carrier who refused (optional - for their awareness)
      // targetUserIds.add(carrierId);
    } else if (incidentType === 'DELAY') {
      // Store destination gets notified (for E5.020 - store delay alerts)
      // Load store location owner
      const storeLocation = await prisma.location.findUnique({
        where: { id: plan.destinationId },
        select: { id: true }
      });
      // Note: Store user lookup would happen here in full implementation
      // For MVP, we notify freighter only
    } else if (incidentType === 'IMBALANCE' && warehouseId) {
      // Warehouse who completed CMR (optional)
      // targetUserIds.add(warehouseId);
    }

    // Create incident event
    const event: IncidentEvent = {
      id: `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: incidentType,
      planId,
      description,
      timestamp: new Date().toISOString()
    };

    // Broadcast to connected subscribers
    sseManager.broadcast(event, Array.from(targetUserIds));

    console.log('[Broadcaster] Incident broadcast:', {
      incidentType,
      planId,
      targetCount: targetUserIds.size,
      targets: Array.from(targetUserIds)
    });
  } catch (error) {
    console.error('[Broadcaster] Error broadcasting incident:', {
      incidentType,
      planId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get list of users who should receive notifications for a plan
 * Useful for debugging and testing RBAC
 */
export async function getIncidentTargets(planId: string): Promise<string[]> {
  try {
    const plan = await prisma.transportPlan.findUnique({
      where: { id: planId },
      select: { createdBy: true }
    });

    if (!plan) {
      return [];
    }

    return [plan.createdBy];
  } catch (error) {
    console.error('[Broadcaster] Error getting targets:', {
      planId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
}

/**
 * Check if a user should have access to a plan's incidents (RBAC)
 * @param userId - User ID
 * @param userRole - User role
 * @param planId - Plan ID
 * @returns true if user has access
 */
export async function canUserAccessPlanIncidents(
  userId: string,
  userRole: string,
  planId: string
): Promise<boolean> {
  // Admin can access anything
  if (userRole === 'ADMIN') {
    return true;
  }

  // Freighter can see own plans only
  if (userRole === 'FREIGHTER') {
    const plan = await prisma.transportPlan.findFirst({
      where: {
        id: planId,
        createdBy: userId
      },
      select: { id: true }
    });
    return !!plan;
  }

  // Other roles: implement as needed
  return false;
}
