/**
 * Pre-Arrival Notification Job - Story 5.021
 * 
 * Polls for plans where delivery is approximately 30 minutes away (±5 min tolerance)
 * and sends SSE notifications to store managers.
 * 
 * Runs every 5 minutes to check for approaching deliveries.
 * Prevents duplicate notifications with preArrivalNotified flag.
 */

import { PrismaClient, PlanStatus } from '@prisma/client';
import { sseManager, type DeliveryStatusEvent } from '@/utils/sseManager';

const prisma = new PrismaClient();

const PRE_ARRIVAL_WINDOW_START_MIN = 35; // 35 minutes before ETA
const PRE_ARRIVAL_WINDOW_END_MIN = 25;   // 25 minutes before ETA
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check for plans that are approximately 30 minutes from arrival
 * Send SSE notification to store managers if found
 */
export async function checkPreArrivalNotifications(): Promise<void> {
  try {
    const now = new Date();
    // Calculate windows FORWARD in time (when delivery will arrive)
    const windowStart = new Date(now.getTime() + PRE_ARRIVAL_WINDOW_END_MIN * 60 * 1000);   // 25 min from now
    const windowEnd = new Date(now.getTime() + PRE_ARRIVAL_WINDOW_START_MIN * 60 * 1000);   // 35 min from now

    console.log('[PreArrival] Checking for approaching deliveries...', {
      now: now.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString()
    });

    // Find plans that are:
    // 1. IN_TRANSIT status (delivery is happening)
    // 2. Not yet notified (preArrivalNotified = false)
    // 3. ETA is between 25-35 minutes from now
    const approachingPlans = await prisma.transportPlan.findMany({
      where: {
        status: 'IN_TRANSIT' as PlanStatus,
        preArrivalNotified: false,
        estimatedDeliveryTime: {
          gte: windowStart,
          lte: windowEnd
        },
        is_deleted: false
      },
      select: {
        id: true,
        unitCount: true,
        estimatedDeliveryTime: true,
        destinationId: true,
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
    });

    console.log('[PreArrival] Found approaching deliveries:', {
      count: approachingPlans.length,
      plans: approachingPlans.map(p => ({
        id: p.id,
        eta: p.estimatedDeliveryTime?.toISOString()
      }))
    });

    // Process each approaching plan
    for (const plan of approachingPlans) {
      try {
        // Get store managers for this destination
        const storeManagers = await prisma.user.findMany({
          where: {
            storeLocationId: plan.destination.id,
            role: 'STORE',
            is_deleted: false
          },
          select: {
            id: true
          }
        });

        const storeManagerIds = storeManagers.map(sm => sm.id);

        console.log('[PreArrival] Store managers to notify:', {
          planId: plan.id,
          destinationId: plan.destination.id,
          managerCount: storeManagerIds.length,
          managerIds: storeManagerIds
        });

        // Create SSE event
        const event: DeliveryStatusEvent = {
          id: `pre-arrival-${plan.id}-${Date.now()}`,
          eventType: 'DELIVERY_STATUS',
          planId: plan.id,
          status: 'IN_TRANSIT',
          eta: plan.estimatedDeliveryTime?.toISOString() || new Date().toISOString(),
          timestamp: new Date().toISOString()
        };

        // Broadcast to all store managers at this destination
        if (storeManagerIds.length > 0) {
          sseManager.broadcastEvent(event, 'pre-arrival', storeManagerIds);

          console.log('[PreArrival] Event broadcasted:', {
            planId: plan.id,
            eventId: event.id,
            recipients: storeManagerIds.length
          });
        }

        // Mark as notified to prevent duplicate notifications
        await prisma.transportPlan.update({
          where: { id: plan.id },
          data: { preArrivalNotified: true }
        });

        console.log('[PreArrival] Plan marked as notified:', { planId: plan.id });

      } catch (error) {
        console.error('[PreArrival] Error processing plan:', {
          planId: plan.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue with next plan even if this one fails
      }
    }

    console.log('[PreArrival] Check complete:', {
      processed: approachingPlans.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[PreArrival] Job failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Schedule the pre-arrival check job to run every 5 minutes
 * This should be called during app initialization
 */
export function schedulePreArrivalCheckJob(): NodeJS.Timeout {
  console.log('[PreArrival] Scheduling job to run every 5 minutes...');

  // Run immediately
  checkPreArrivalNotifications().catch(error => {
    console.error('[PreArrival] Initial check failed:', error);
  });

  // Then run every 5 minutes
  const interval = setInterval(() => {
    checkPreArrivalNotifications().catch(error => {
      console.error('[PreArrival] Scheduled check failed:', error);
    });
  }, CHECK_INTERVAL_MS);

  return interval;
}

/**
 * For testing: reset preArrivalNotified flag
 */
export async function resetPreArrivalNotifications(): Promise<void> {
  await prisma.transportPlan.updateMany({
    data: { preArrivalNotified: false }
  });
}
