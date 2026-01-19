/**
 * Delay Detection Utilities
 * Detects when transport plans are running behind schedule
 */

import { TransportPlan, PlanStatus } from '@prisma/client';

export const DELAY_THRESHOLD_MINUTES = 30; // Threshold before creating incident

/**
 * Check if a transport plan has a significant delay
 * @param plan - The transport plan to check
 * @returns true if plan is delayed by more than 30 minutes
 */
export function checkForDelay(plan: TransportPlan): boolean {
  // Only check delay for IN_TRANSIT plans
  if (plan.status !== PlanStatus.IN_TRANSIT) {
    return false;
  }

  // Plan must have an estimated delivery time
  if (!plan.estimatedDeliveryTime) {
    return false;
  }

  const now = new Date();
  const delayThresholdMs = DELAY_THRESHOLD_MINUTES * 60 * 1000;
  const eta = new Date(plan.estimatedDeliveryTime);
  
  // Current time exceeds estimated delivery + threshold
  return now.getTime() > eta.getTime() + delayThresholdMs;
}

/**
 * Calculate delay in minutes for a transport plan
 * @param plan - The transport plan
 * @returns Delay in minutes (0 if no delay or no ETA)
 */
export function calculateDelayMinutes(plan: TransportPlan): number {
  if (!plan.estimatedDeliveryTime) {
    return 0;
  }

  const now = new Date();
  const eta = new Date(plan.estimatedDeliveryTime);
  const delayMs = now.getTime() - eta.getTime();
  const delayMinutes = Math.floor(delayMs / (60 * 1000));
  
  // Return 0 if plan is early or on time
  return Math.max(0, delayMinutes);
}

/**
 * Check if delay exceeds threshold and should trigger incident
 * @param plan - The transport plan to check
 * @param thresholdMinutes - Delay threshold (default: 30 minutes)
 * @returns true if delay > threshold
 */
export function shouldTriggerDelayIncident(
  plan: TransportPlan,
  thresholdMinutes: number = DELAY_THRESHOLD_MINUTES
): boolean {
  return calculateDelayMinutes(plan) > thresholdMinutes;
}

/**
 * Generate delay incident description
 * @param plan - The transport plan
 * @param actualDeliveryTime - Actual/current time (optional, defaults to now)
 * @returns Human-readable description
 */
export function generateDelayDescription(
  plan: TransportPlan,
  actualDeliveryTime?: Date
): string {
  const delayMinutes = calculateDelayMinutes(plan);
  const delayHours = Math.floor(Math.abs(delayMinutes) / 60);
  const delayRemainder = Math.abs(delayMinutes) % 60;

  if (delayMinutes < 0) {
    // Early - shouldn't happen but handle it
    return `Plan ahead of schedule by ${Math.abs(delayMinutes)} minutes`;
  }

  const eta = plan.estimatedDeliveryTime;
  const actualTime = actualDeliveryTime || new Date();

  if (delayHours > 0) {
    return `Estimated delay: ${delayHours}h ${delayRemainder}m (${delayMinutes} minutes). Expected: ${eta?.toISOString()}, Actual: ${actualTime.toISOString()}`;
  }

  return `Estimated delay: ${delayMinutes} minutes. Expected: ${eta?.toISOString()}, Actual: ${actualTime.toISOString()}`;
}

/**
 * Check if incident already exists for a plan to avoid duplicates
 * @param planId - Transport plan ID
 * @param incidents - Array of existing incidents
 * @returns true if DELAY incident already exists for plan
 */
export function delayIncidentExists(
  planId: string,
  incidents: Array<{ type: string; planId: string }>
): boolean {
  return incidents.some(
    incident =>
      incident.type === 'DELAY' && incident.planId === planId
  );
}
