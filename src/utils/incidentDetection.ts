import { IncidentType, IncidentStatus } from '@prisma/client';

export interface IncidentCreationData {
  type: IncidentType;
  planId: string;
  description: string;
  carrierId?: string;
  warehouseId?: string;
}

/**
 * Determine if a carrier refusal should trigger incident
 * Called when carrier refuses a transport plan
 */
export function createRefusalIncident(
  planId: string,
  carrierId: string,
  reason: string
): IncidentCreationData {
  return {
    type: 'REFUSAL',
    planId,
    carrierId,
    description: `Carrier refused transport: ${reason}`
  };
}

/**
 * Determine if a delay should trigger incident
 * Called when plan is running more than 30 minutes late
 */
export function createDelayIncident(
  planId: string,
  estimatedTime: Date,
  actualTime: Date,
  delayMinutes: number
): IncidentCreationData {
  return {
    type: 'DELAY',
    planId,
    description: `Plan delayed by ${delayMinutes} minutes. Expected: ${estimatedTime.toISOString()}, Actual: ${actualTime.toISOString()}`
  };
}

/**
 * Determine if a unit count imbalance should trigger incident
 * Called when CMR form shows different units than planned
 */
export function createImbalanceIncident(
  planId: string,
  warehouseId: string,
  plannedUnits: number,
  actualUnits: number
): IncidentCreationData {
  return {
    type: 'IMBALANCE',
    planId,
    warehouseId,
    description: `Unit count mismatch. Planned: ${plannedUnits}, Actual: ${actualUnits}, Difference: ${Math.abs(actualUnits - plannedUnits)}`
  };
}

/**
 * Check if incident is critical (requires immediate escalation)
 */
export function isIncidentCritical(type: IncidentType, details: string): boolean {
  // IMBALANCE with large discrepancy is critical
  if (type === 'IMBALANCE') {
    const match = details.match(/Difference: (\d+)/);
    if (match) {
      const difference = parseInt(match[1], 10);
      return difference > 10; // Critical if more than 10 units difference
    }
  }

  // DELAY more than 2 hours is critical
  if (type === 'DELAY') {
    const match = details.match(/delayed by (\d+) minutes/);
    if (match) {
      const delayMinutes = parseInt(match[1], 10);
      return delayMinutes > 120; // Critical if more than 2 hours
    }
  }

  // REFUSAL is always treated seriously
  if (type === 'REFUSAL') {
    return true;
  }

  return false;
}

/**
 * Suggest resolution status based on incident type
 */
export function suggestResolutionAction(
  type: IncidentType
): string {
  switch (type) {
    case 'REFUSAL':
      return 'Propose alternative carrier or adjust plan parameters';
    case 'DELAY':
      return 'Monitor progress or accept delay with store notification';
    case 'IMBALANCE':
      return 'Investigate with warehouse and adjust CMR or proceed with variance';
    default:
      return 'Review and take appropriate action';
  }
}
